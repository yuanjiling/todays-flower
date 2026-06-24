use serde::{Deserialize, Serialize};
use std::{
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::image::Image;
use tauri::webview::PageLoadEvent;
use tauri::window::Color;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalPosition, Manager, Position, RunEvent, State, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tokio::time::sleep;

const APP_ID: &str = "com.aia.todaysflower";
const DEFAULT_TITLE: &str = "Today's Flower";
const DEFAULT_LANGUAGE: &str = "en";
const MAIN_WINDOW_LABEL: &str = "main";
const REMINDER_WINDOW_LABEL: &str = "reminder";
const TRAY_ID: &str = "todays-flower";
const REMINDER_MIN_DELAY_MS: u64 = 1000;
const REMINDER_WINDOW_WIDTH: f64 = 430.0;
const REMINDER_WINDOW_HEIGHT: f64 = 320.0;
const DISABLE_CONTEXT_MENU_SCRIPT: &str = r#"
window.addEventListener('contextmenu', function (event) {
  event.preventDefault();
}, { capture: true });
"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DesktopOk {
    ok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReminderTaskSummary {
    id: String,
    title: String,
    importance: u8,
    flower_id: Option<String>,
    completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DesktopReminderStatePayload {
    interval_minutes: u64,
    language: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    total_task_count: Option<usize>,
    tasks: Vec<ReminderTaskSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrayConfigPayload {
    lang: String,
    is_notification_enabled: bool,
    notification_interval: u64,
}

struct DesktopState {
    reminder: Mutex<DesktopReminderStatePayload>,
    tray_config: Mutex<TrayConfigPayload>,
    reminder_generation: AtomicU64,
    last_reminder_at_ms: AtomicU64,
    is_quitting: AtomicBool,
}

type SharedDesktopState = Arc<DesktopState>;

impl Default for DesktopReminderStatePayload {
    fn default() -> Self {
        Self {
            interval_minutes: 0,
            language: DEFAULT_LANGUAGE.to_string(),
            total_task_count: None,
            tasks: Vec::new(),
        }
    }
}

impl Default for TrayConfigPayload {
    fn default() -> Self {
        Self {
            lang: DEFAULT_LANGUAGE.to_string(),
            is_notification_enabled: true,
            notification_interval: 60,
        }
    }
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            reminder: Mutex::new(DesktopReminderStatePayload::default()),
            tray_config: Mutex::new(TrayConfigPayload::default()),
            reminder_generation: AtomicU64::new(0),
            last_reminder_at_ms: AtomicU64::new(0),
            is_quitting: AtomicBool::new(false),
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn taskbar_icon() -> Option<Image<'static>> {
    Image::from_bytes(include_bytes!("../icons/icon-48.png")).ok()
}

fn tray_icon() -> Option<Image<'static>> {
    Image::from_bytes(include_bytes!("../icons/icon-32.png")).ok()
}

fn normalize_language(value: &str) -> String {
    if value == "zh" {
        "zh".to_string()
    } else {
        DEFAULT_LANGUAGE.to_string()
    }
}

fn normalize_reminder_state(payload: DesktopReminderStatePayload) -> DesktopReminderStatePayload {
    let tasks = payload
        .tasks
        .into_iter()
        .filter_map(|task| {
            let title = task.title.split_whitespace().collect::<Vec<_>>().join(" ");

            if title.is_empty() {
                return None;
            }

            Some(ReminderTaskSummary {
                id: if task.id.is_empty() {
                    title.clone()
                } else {
                    task.id
                },
                title,
                importance: task.importance.clamp(1, 3),
                flower_id: task.flower_id.filter(|value| !value.is_empty()),
                completed: task.completed,
            })
        })
        .collect::<Vec<_>>();

    DesktopReminderStatePayload {
        interval_minutes: payload.interval_minutes,
        language: normalize_language(&payload.language),
        total_task_count: None,
        tasks,
    }
}

fn build_reminder_window_payload(
    state: &DesktopReminderStatePayload,
) -> Option<DesktopReminderStatePayload> {
    if state.tasks.is_empty() {
        return None;
    }

    Some(DesktopReminderStatePayload {
        interval_minutes: state.interval_minutes,
        language: state.language.clone(),
        total_task_count: Some(state.tasks.len()),
        tasks: state.tasks.clone(),
    })
}

fn create_main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        return Ok(window);
    }

    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == MAIN_WINDOW_LABEL)
        .cloned()
        .ok_or_else(|| "main window config is missing".to_string())?;

    let mut builder =
        WebviewWindowBuilder::from_config(app, &config).map_err(|error| error.to_string())?;

    builder = builder.initialization_script(DISABLE_CONTEXT_MENU_SCRIPT);

    if let Some(icon) = taskbar_icon() {
        builder = builder.icon(icon).map_err(|error| error.to_string())?;
    }

    builder.build().map_err(|error| error.to_string())
}

fn focus_main_window(app: &AppHandle) -> Result<(), String> {
    let window = create_main_window(app)?;
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

fn destroy_main_window(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window.destroy().map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn close_reminder_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(REMINDER_WINDOW_LABEL) {
        let _ = window.destroy();
    }
}

fn position_reminder_window(app: &AppHandle, window: &WebviewWindow) {
    let Ok(Some(monitor)) = app.primary_monitor() else {
        return;
    };

    let work_area = monitor.work_area();
    let scale = monitor.scale_factor().max(1.0);
    let x = (work_area.position.x as f64 + work_area.size.width as f64) / scale
        - REMINDER_WINDOW_WIDTH
        - 2.0;
    let y = (work_area.position.y as f64 + work_area.size.height as f64) / scale
        - REMINDER_WINDOW_HEIGHT
        - 2.0;

    let _ = window.set_position(Position::Logical(LogicalPosition::new(
        x.round(),
        y.round(),
    )));
}

fn show_reminder_window(app: AppHandle, payload: DesktopReminderStatePayload) {
    close_reminder_window(&app);

    let app_for_load = app.clone();
    let payload_for_load = payload.clone();
    let builder = WebviewWindowBuilder::new(
        &app,
        REMINDER_WINDOW_LABEL,
        WebviewUrl::App("notification.html".into()),
    )
    .title(DEFAULT_TITLE)
    .inner_size(REMINDER_WINDOW_WIDTH, REMINDER_WINDOW_HEIGHT)
    .decorations(false)
    .transparent(true)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .shadow(false)
    .background_color(Color(0, 0, 0, 0))
    .visible(false)
    .initialization_script(DISABLE_CONTEXT_MENU_SCRIPT)
    .on_page_load(move |window, event| {
        if event.event() != PageLoadEvent::Finished {
            return;
        }

        position_reminder_window(&app_for_load, &window);
        let _ = window.emit("desktop:reminder-window-payload", payload_for_load.clone());
        let _ = window.show();
    });

    if let Err(error) = builder.build() {
        eprintln!("failed to create reminder window: {error}");
    }
}

fn schedule_reminder_timer(app: AppHandle, state: SharedDesktopState, generation: u64) {
    let snapshot = state.reminder.lock().unwrap().clone();

    if snapshot.interval_minutes == 0 || snapshot.tasks.is_empty() {
        return;
    }

    let interval_ms = snapshot.interval_minutes.saturating_mul(60_000);
    let current_ms = now_ms();
    let last_ms = state.last_reminder_at_ms.load(Ordering::SeqCst);
    let due_at = if last_ms > 0 {
        last_ms.saturating_add(interval_ms)
    } else {
        current_ms.saturating_add(interval_ms)
    };
    let delay = due_at.saturating_sub(current_ms).max(REMINDER_MIN_DELAY_MS);

    tauri::async_runtime::spawn(async move {
        sleep(Duration::from_millis(delay)).await;

        if state.reminder_generation.load(Ordering::SeqCst) != generation {
            return;
        }

        let payload = {
            let reminder = state.reminder.lock().unwrap();
            if reminder.interval_minutes == 0 || reminder.tasks.is_empty() {
                return;
            }
            build_reminder_window_payload(&reminder)
        };

        if let Some(payload) = payload {
            state.last_reminder_at_ms.store(now_ms(), Ordering::SeqCst);
            show_reminder_window(app.clone(), payload);
        }

        schedule_reminder_timer(app, state, generation);
    });
}

fn t<'a>(lang: &str, en: &'a str, zh: &'a str) -> &'a str {
    if lang == "zh" {
        zh
    } else {
        en
    }
}

fn build_tray_menu(app: &AppHandle, config: &TrayConfigPayload) -> tauri::Result<Menu<tauri::Wry>> {
    let enter = MenuItem::with_id(
        app,
        "tray-enter-garden",
        t(&config.lang, "Enter Garden", "进入花园"),
        true,
        None::<&str>,
    )?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let reminders = CheckMenuItem::with_id(
        app,
        "tray-toggle-reminders",
        t(&config.lang, "Enable Reminders", "任务提醒"),
        true,
        config.is_notification_enabled,
        None::<&str>,
    )?;

    let interval_30 = CheckMenuItem::with_id(
        app,
        "tray-interval-30",
        t(&config.lang, "30 min", "30 分钟"),
        true,
        config.notification_interval == 30,
        None::<&str>,
    )?;
    let interval_60 = CheckMenuItem::with_id(
        app,
        "tray-interval-60",
        t(&config.lang, "1 hour", "1 小时"),
        true,
        config.notification_interval == 60,
        None::<&str>,
    )?;
    let interval_120 = CheckMenuItem::with_id(
        app,
        "tray-interval-120",
        t(&config.lang, "2 hours", "2 小时"),
        true,
        config.notification_interval == 120,
        None::<&str>,
    )?;
    let interval_180 = CheckMenuItem::with_id(
        app,
        "tray-interval-180",
        t(&config.lang, "3 hours", "3 小时"),
        true,
        config.notification_interval == 180,
        None::<&str>,
    )?;
    let separator_two = PredefinedMenuItem::separator(app)?;
    let interval_menu = Submenu::with_id_and_items(
        app,
        "tray-reminder-interval",
        t(&config.lang, "Reminder Interval", "提醒间隔"),
        true,
        &[&interval_30, &interval_60, &interval_120, &interval_180],
    )?;
    let separator_three = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(
        app,
        "tray-quit",
        t(&config.lang, "Quit", "退出程序"),
        true,
        None::<&str>,
    )?;

    Menu::with_items(
        app,
        &[
            &enter,
            &separator_one,
            &reminders,
            &separator_two,
            &interval_menu,
            &separator_three,
            &quit,
        ],
    )
}

fn rebuild_tray_menu(app: &AppHandle, state: &DesktopState) -> Result<(), String> {
    let config = state.tray_config.lock().unwrap().clone();
    let menu = build_tray_menu(app, &config).map_err(|error| error.to_string())?;

    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(menu))
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn emit_tray_settings(app: &AppHandle, state: &DesktopState) {
    let config = state.tray_config.lock().unwrap().clone();
    let _ = app.emit_to(MAIN_WINDOW_LABEL, "desktop:tray-settings-changed", config);
}

fn handle_tray_menu(app: &AppHandle, state: &DesktopState, id: &str) {
    match id {
        "tray-enter-garden" => {
            let _ = focus_main_window(app);
        }
        "tray-toggle-reminders" => {
            {
                let mut config = state.tray_config.lock().unwrap();
                config.is_notification_enabled = !config.is_notification_enabled;
            }
            let _ = rebuild_tray_menu(app, state);
            emit_tray_settings(app, state);
        }
        "tray-interval-30" | "tray-interval-60" | "tray-interval-120" | "tray-interval-180" => {
            if let Some(value) = id.strip_prefix("tray-interval-") {
                if let Ok(minutes) = value.parse::<u64>() {
                    {
                        let mut config = state.tray_config.lock().unwrap();
                        config.notification_interval = minutes;
                    }
                    let _ = rebuild_tray_menu(app, state);
                    emit_tray_settings(app, state);
                }
            }
        }
        "tray-quit" => {
            state.is_quitting.store(true, Ordering::SeqCst);
            close_reminder_window(app);
            app.exit(0);
        }
        _ => {}
    }
}

fn create_tray(app: &AppHandle, state: SharedDesktopState) -> Result<(), String> {
    if app.tray_by_id(TRAY_ID).is_some() {
        return Ok(());
    }

    let config = state.tray_config.lock().unwrap().clone();
    let menu = build_tray_menu(app, &config).map_err(|error| error.to_string())?;
    let icon = tray_icon();
    let state_for_menu = state.clone();
    let state_for_tray = state.clone();

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip(DEFAULT_TITLE)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| {
            handle_tray_menu(app, state_for_menu.as_ref(), event.id().as_ref());
        })
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = focus_main_window(tray.app_handle());
                let _ = rebuild_tray_menu(tray.app_handle(), state_for_tray.as_ref());
            }
        });

    if let Some(icon) = icon {
        builder = builder.icon(icon);
    }

    builder.build(app).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn desktop_quit(app: AppHandle, state: State<'_, SharedDesktopState>) {
    state.is_quitting.store(true, Ordering::SeqCst);
    close_reminder_window(&app);
    app.exit(0);
}

#[tauri::command]
async fn desktop_close_main_window(app: AppHandle) -> Result<DesktopOk, String> {
    destroy_main_window(&app)?;
    Ok(DesktopOk { ok: true })
}

#[tauri::command]
async fn desktop_show_main_window(app: AppHandle) -> Result<DesktopOk, String> {
    focus_main_window(&app)?;
    Ok(DesktopOk { ok: true })
}

#[tauri::command]
fn desktop_update_reminder_state(
    app: AppHandle,
    state: State<'_, SharedDesktopState>,
    payload: DesktopReminderStatePayload,
) -> DesktopOk {
    let next_state = normalize_reminder_state(payload);

    {
        let mut reminder = state.reminder.lock().unwrap();
        *reminder = next_state;
    }

    let generation = state.reminder_generation.fetch_add(1, Ordering::SeqCst) + 1;
    schedule_reminder_timer(app, state.inner().clone(), generation);

    DesktopOk { ok: true }
}

#[tauri::command]
fn desktop_get_reminder_window_payload(
    state: State<'_, SharedDesktopState>,
) -> Option<DesktopReminderStatePayload> {
    let reminder = state.reminder.lock().unwrap();
    build_reminder_window_payload(&reminder)
}

#[tauri::command]
fn desktop_update_tray_menu(
    app: AppHandle,
    state: State<'_, SharedDesktopState>,
    payload: TrayConfigPayload,
) -> Result<DesktopOk, String> {
    {
        let mut config = state.tray_config.lock().unwrap();
        config.lang = normalize_language(&payload.lang);
        config.is_notification_enabled = payload.is_notification_enabled;
        config.notification_interval = payload.notification_interval;
    }

    rebuild_tray_menu(&app, state.as_ref())?;
    Ok(DesktopOk { ok: true })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let desktop_state = Arc::new(DesktopState::default());

    tauri::Builder::default()
        .manage(desktop_state.clone())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))?;

            let _ = APP_ID;

            create_tray(app.handle(), desktop_state.clone())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != MAIN_WINDOW_LABEL {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let app = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    let _ = destroy_main_window(&app);
                });
            }
        })
        .invoke_handler(tauri::generate_handler![
            desktop_quit,
            desktop_close_main_window,
            desktop_show_main_window,
            desktop_update_reminder_state,
            desktop_get_reminder_window_payload,
            desktop_update_tray_menu
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            RunEvent::ExitRequested { api, .. } => {
                let state = app.state::<SharedDesktopState>();
                if !state.is_quitting.load(Ordering::SeqCst) {
                    api.prevent_exit();
                }
            }
            RunEvent::Exit => {
                let state = app.state::<SharedDesktopState>();
                state.reminder_generation.fetch_add(1, Ordering::SeqCst);
                close_reminder_window(app);
            }
            _ => {}
        });
}
