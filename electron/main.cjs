const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, Menu, Notification, Tray, screen } = require('electron');

const APP_ID = 'com.aia.todaysflower';
const DEFAULT_TITLE = "Today's Flower";
const DEFAULT_LANGUAGE = 'en';
const REMINDER_MIN_DELAY_MS = 1000;
const REMINDER_TASKS_PER_NOTIFICATION = 4;
const REMINDER_WINDOW_WIDTH = 430;
const REMINDER_WINDOW_HEIGHT = 320;
const USER_DATA_DIR_NAME = 'todays-flower';
const LEGACY_USER_DATA_DIR_NAMES = ['react-example', 'j-flow', "Today's Flower"];

const APP_DATA_PATH = app.getPath('appData');
const USER_DATA_PATH = path.join(APP_DATA_PATH, USER_DATA_DIR_NAME);

function hasProfileData(dirPath) {
  return ['Local Storage', 'Session Storage', 'Preferences'].some((entry) =>
    fs.existsSync(path.join(dirPath, entry)),
  );
}

function migrateLegacyUserData() {
  if (hasProfileData(USER_DATA_PATH)) {
    return;
  }

  for (const legacyName of LEGACY_USER_DATA_DIR_NAMES) {
    const sourcePath = path.join(APP_DATA_PATH, legacyName);

    if (sourcePath === USER_DATA_PATH || !hasProfileData(sourcePath)) {
      continue;
    }

    fs.mkdirSync(USER_DATA_PATH, { recursive: true });

    for (const entry of fs.readdirSync(sourcePath)) {
      const sourceEntryPath = path.join(sourcePath, entry);
      const targetEntryPath = path.join(USER_DATA_PATH, entry);

      if (fs.existsSync(targetEntryPath)) {
        continue;
      }

      fs.cpSync(sourceEntryPath, targetEntryPath, { recursive: true });
    }

    return;
  }
}

app.setPath('userData', USER_DATA_PATH);
migrateLegacyUserData();

let mainWindow = null;
let reminderWindow = null;
let reminderTimer = null;
let lastReminderAt = 0;
let tray = null;
let isQuitting = false;

const reminderState = {
  intervalMinutes: 0,
  language: DEFAULT_LANGUAGE,
  tasks: [],
};

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const gotSingleInstanceLock = app.requestSingleInstanceLock();

function buildRuntimeInfo() {
  return {
    isElectron: true,
    platform: process.platform,
    versions: {
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      node: process.versions.node,
    },
  };
}

function getLaunchAtLoginSettings() {
  const settings = app.getLoginItemSettings();

  return {
    openAtLogin: Boolean(settings.openAtLogin),
  };
}

function setLaunchAtLogin(openAtLogin) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(openAtLogin),
  });

  return getLaunchAtLoginSettings();
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function getTrayIconPath() {
  const pngPath = path.join(__dirname, '..', 'build', 'icon.png');
  const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');

  if (fs.existsSync(pngPath)) {
    return pngPath;
  }

  return icoPath;
}

function createTray() {
  if (tray) {
    return;
  }

  tray = new Tray(getTrayIconPath());
  tray.setToolTip(DEFAULT_TITLE);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '打开应用',
        click: () => {
          focusMainWindow();
        },
      },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', () => {
    focusMainWindow();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#f7f4ea',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function positionReminderWindow(win) {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const x = Math.round(workArea.x + workArea.width - REMINDER_WINDOW_WIDTH - 2);
  const y = Math.round(workArea.y + workArea.height - REMINDER_WINDOW_HEIGHT - 2);

  win.setBounds({
    x,
    y,
    width: REMINDER_WINDOW_WIDTH,
    height: REMINDER_WINDOW_HEIGHT,
  });
}

function closeReminderWindow() {
  if (!reminderWindow) {
    return;
  }

  const win = reminderWindow;
  reminderWindow = null;

  if (!win.isDestroyed()) {
    win.close();
  }
}

function normalizeNotificationPayload(payload) {
  const title =
    typeof payload?.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : DEFAULT_TITLE;
  const body =
    typeof payload?.body === 'string' && payload.body.trim()
      ? payload.body.trim()
      : '';

  return {
    title,
    body,
    silent: Boolean(payload?.silent),
  };
}

function clearReminderTimer() {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
}

function normalizeReminderState(payload) {
  const intervalMinutes = Number.isFinite(payload?.intervalMinutes)
    ? Math.max(0, Math.floor(payload.intervalMinutes))
    : 0;
  const language = payload?.language === 'zh' ? 'zh' : DEFAULT_LANGUAGE;
  const tasks = Array.isArray(payload?.tasks)
    ? payload.tasks
        .map((task) => {
          const title =
            typeof task?.title === 'string' ? task.title.trim().replace(/\s+/g, ' ') : '';
          const importance = Number.isFinite(task?.importance)
            ? Math.min(3, Math.max(1, Math.floor(task.importance)))
            : 1;

          if (!title) {
            return null;
          }

          return {
            id: typeof task?.id === 'string' ? task.id : title,
            title,
            importance,
            flowerId: typeof task?.flowerId === 'string' ? task.flowerId : undefined,
          };
        })
        .filter(Boolean)
    : [];

  return {
    intervalMinutes,
    language,
    tasks,
  };
}

function legacyBuildReminderNotificationDetails() {
  const tasks = reminderState.tasks;

  if (tasks.length === 0) {
    return [];
  }

  const toDisplayPriority = (importance) => Math.min(3, Math.max(1, 4 - importance));
  const getPriorityEmoji = (displayPriority) => {
    if (displayPriority === 1) {
      return '馃尯';
    }

    if (displayPriority === 2) {
      return '馃尲';
    }

    return '馃尡';
  };

  const chunks = [];

  for (let index = 0; index < tasks.length; index += REMINDER_TASKS_PER_NOTIFICATION) {
    chunks.push(tasks.slice(index, index + REMINDER_TASKS_PER_NOTIFICATION));
  }

  return chunks.map((chunk, chunkIndex) => {
    const bodyLines = chunk.map((task) => {
      const displayPriority = toDisplayPriority(task.importance);
      const emoji = getPriorityEmoji(displayPriority);

      return `${emoji} [P${displayPriority}] ${task.title}`;
    });

    const groupSuffix = chunks.length > 1 ? ` ${chunkIndex + 1}/${chunks.length}` : '';

    return {
      title:
        reminderState.language === 'zh'
          ? `浠婃棩鑺卞渻 陼?寰呯唤鏀?${tasks.length} 鏍?{groupSuffix}`
          : `Today's Flower Garden 陼?${tasks.length} Waiting to Bloom${groupSuffix}`,
      body: bodyLines.join('\n'),
      silent: chunkIndex > 0,
    };
  });
}

function legacyShowReminderNotification() {
  if (!Notification.isSupported()) {
    return;
  }

  const details = legacyBuildReminderNotificationDetails();

  if (details.length === 0) {
    return;
  }

  details.forEach((detail) => {
    const notification = new Notification(detail);

    notification.on('click', () => {
      focusMainWindow();

      if (mainWindow) {
        mainWindow.webContents.send('desktop:notification-clicked', detail);
      }
    });

    notification.show();
  });
}

function buildReminderWindowPayload() {
  if (reminderState.tasks.length === 0) {
    return null;
  }

  return {
    intervalMinutes: reminderState.intervalMinutes,
    language: reminderState.language,
    totalTaskCount: reminderState.tasks.length,
    tasks: reminderState.tasks.slice(0, REMINDER_TASKS_PER_NOTIFICATION),
  };
}

function showReminderNotification() {
  const payload = buildReminderWindowPayload();

  if (!payload) {
    return;
  }

  closeReminderWindow();

  reminderWindow = new BrowserWindow({
    width: REMINDER_WINDOW_WIDTH,
    height: REMINDER_WINDOW_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  positionReminderWindow(reminderWindow);

  reminderWindow.on('closed', () => {
    reminderWindow = null;
  });

  reminderWindow.webContents.once('did-finish-load', () => {
    if (!reminderWindow || reminderWindow.isDestroyed()) {
      return;
    }

    reminderWindow.webContents.send('desktop:reminder-window-payload', payload);
    reminderWindow.showInactive();
  });

  reminderWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'Escape') {
      closeReminderWindow();
    }
  });

  if (isDev) {
    reminderWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?notification=1`);
    return;
  }

  reminderWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
    query: { notification: '1' },
  });
}

function scheduleReminderTimer() {
  clearReminderTimer();

  if (reminderState.intervalMinutes <= 0 || reminderState.tasks.length === 0) {
    return;
  }

  const intervalMs = reminderState.intervalMinutes * 60 * 1000;
  const now = Date.now();
  const dueAt = lastReminderAt > 0 ? lastReminderAt + intervalMs : now + intervalMs;
  const delay = Math.max(REMINDER_MIN_DELAY_MS, dueAt - now);

  reminderTimer = setTimeout(() => {
    reminderTimer = null;

    if (reminderState.intervalMinutes > 0 && reminderState.tasks.length > 0) {
      showReminderNotification();
      lastReminderAt = Date.now();
    }

    scheduleReminderTimer();
  }, delay);
}

function getMainWindowFromEvent(event) {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  if (senderWindow === mainWindow) {
    return senderWindow;
  }

  return mainWindow;
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (app.isReady()) {
      focusMainWindow();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID);
    ipcMain.handle('desktop:get-runtime-info', () => buildRuntimeInfo());
    ipcMain.handle('desktop:get-launch-at-login', () => getLaunchAtLoginSettings());
    ipcMain.handle('desktop:set-launch-at-login', (_event, payload) =>
      setLaunchAtLogin(payload?.openAtLogin),
    );
    ipcMain.handle('desktop:notify', (_event, payload) => {
      if (!Notification.isSupported()) {
        return { shown: false, reason: 'unsupported' };
      }

      const detail = normalizeNotificationPayload(payload);
      const notification = new Notification(detail);

      notification.on('click', () => {
        focusMainWindow();

        if (mainWindow) {
          mainWindow.webContents.send('desktop:notification-clicked', detail);
        }
      });

      notification.show();

      return { shown: true };
    });
    ipcMain.handle('desktop:update-reminder-state', (_event, payload) => {
      const nextState = normalizeReminderState(payload);

      reminderState.intervalMinutes = nextState.intervalMinutes;
      reminderState.language = nextState.language;
      reminderState.tasks = nextState.tasks;

      scheduleReminderTimer();

      return { ok: true };
    });
    ipcMain.handle('desktop:minimize-main-window', (event) => {
      const win = getMainWindowFromEvent(event);

      if (win && !win.isDestroyed()) {
        win.minimize();
      }

      return { ok: true };
    });
    ipcMain.handle('desktop:toggle-maximize-main-window', (event) => {
      const win = getMainWindowFromEvent(event);

      if (!win || win.isDestroyed()) {
        return { ok: true, isMaximized: false };
      }

      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }

      return { ok: true, isMaximized: win.isMaximized() };
    });
    ipcMain.handle('desktop:close-main-window', (event) => {
      const win = getMainWindowFromEvent(event);

      if (win && !win.isDestroyed()) {
        win.close();
      }

      return { ok: true };
    });
    ipcMain.handle('desktop:close-reminder-window', () => {
      closeReminderWindow();
      return { ok: true };
    });
    ipcMain.handle('desktop:show-main-window', () => {
      focusMainWindow();
      return { ok: true };
    });

    createTray();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        return;
      }

      focusMainWindow();
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('window-all-closed', () => {
    if (isQuitting) {
      clearReminderTimer();
      closeReminderWindow();
    }
  });
}
