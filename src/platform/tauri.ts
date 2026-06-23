import { getTauriVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Window, getCurrentWindow } from '@tauri-apps/api/window';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import {
  isPermissionGranted,
  onAction,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

const DEFAULT_TITLE = "Today's Flower";

type TauriRuntimeInfo = DesktopRuntimeInfo & {
  isTauri: true;
  versions: DesktopRuntimeInfo['versions'] & {
    tauri: string;
  };
};

type TraySettingsListener = (payload: TrayConfigPayload) => void;

const runtimeInfo: TauriRuntimeInfo = {
  isElectron: false,
  isTauri: true,
  platform: typeof navigator === 'undefined' ? 'tauri' : navigator.platform,
  versions: {
    chrome: '',
    electron: '',
    node: '',
    tauri: '',
  },
};

const traySettingsListeners = new Set<TraySettingsListener>();

export const isTauriRuntime = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

const getMainWindow = async () => {
  return (await Window.getByLabel('main')) ?? getCurrentWindow();
};

const notifyTraySettingsChanged = (payload: TrayConfigPayload) => {
  traySettingsListeners.forEach((listener) => listener(payload));
};

const ensureNotificationPermission = async () => {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  return permissionGranted;
};

export const tauriBridge: TodaysFlowerDesktopApi = {
  ...runtimeInfo,
  async getRuntimeInfo() {
    return {
      ...runtimeInfo,
      platform: typeof navigator === 'undefined' ? 'tauri' : navigator.platform,
      versions: {
        ...runtimeInfo.versions,
        tauri: await getTauriVersion(),
      },
    };
  },
  async getLaunchAtLogin() {
    return {
      openAtLogin: await isEnabled(),
    };
  },
  async setLaunchAtLogin(payload) {
    if (payload.openAtLogin) {
      await enable();
    } else {
      await disable();
    }

    return {
      openAtLogin: await isEnabled(),
    };
  },
  async notify(payload) {
    const shown = await ensureNotificationPermission();

    if (!shown) {
      return {
        shown: false,
        reason: 'permission-denied',
      };
    }

    sendNotification({
      title: payload.title || DEFAULT_TITLE,
      body: payload.body,
      silent: payload.silent,
      autoCancel: true,
    });

    return {
      shown: true,
    };
  },
  async updateReminderState(payload) {
    await invoke('desktop_update_reminder_state', { payload });

    return {
      ok: true as const,
    };
  },
  async minimizeMainWindow() {
    const win = await getMainWindow();
    await win.minimize();

    return {
      ok: true as const,
    };
  },
  async toggleMaximizeMainWindow() {
    const win = await getMainWindow();
    await win.toggleMaximize();

    return {
      ok: true as const,
      isMaximized: await win.isMaximized(),
    };
  },
  async closeMainWindow() {
    await invoke('desktop_close_main_window');

    return {
      ok: true as const,
    };
  },
  async closeReminderWindow() {
    const win = await Window.getByLabel('reminder');

    if (win) {
      await win.destroy();
    }

    return {
      ok: true as const,
    };
  },
  async showMainWindow() {
    await invoke('desktop_show_main_window');

    return {
      ok: true as const,
    };
  },
  async updateTrayMenu(payload) {
    await invoke('desktop_update_tray_menu', { payload });

    return {
      ok: true as const,
    };
  },
  onTraySettingsChanged(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    traySettingsListeners.add(callback);

    let unlisten: (() => void) | null = null;
    let isDisposed = false;

    void listen<TrayConfigPayload>('desktop:tray-settings-changed', (event) => {
      notifyTraySettingsChanged(event.payload);
    }).then((nextUnlisten) => {
      if (isDisposed) {
        nextUnlisten();
        return;
      }

      unlisten = nextUnlisten;
    });

    return () => {
      isDisposed = true;
      traySettingsListeners.delete(callback);
      unlisten?.();
    };
  },
  onReminderWindowPayload(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    let isDisposed = false;

    void invoke<DesktopReminderStatePayload | null>('desktop_get_reminder_window_payload')
      .then((payload) => {
        if (!isDisposed && payload) {
          callback(payload);
        }
      })
      .catch(console.error);

    let unlisten: (() => void) | null = null;
    void listen<DesktopReminderStatePayload>('desktop:reminder-window-payload', (event) => {
      callback(event.payload);
    }).then((nextUnlisten) => {
      if (isDisposed) {
        nextUnlisten();
        return;
      }

      unlisten = nextUnlisten;
    });

    return () => {
      isDisposed = true;
      unlisten?.();
    };
  },
  onNotificationClick(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    let listener: { unregister: () => Promise<void> } | null = null;
    void onAction((payload) => {
      callback({
        title: payload.title || DEFAULT_TITLE,
        body: payload.body,
      });
    }).then((nextListener) => {
      listener = nextListener;
    });

    return () => {
      void listener?.unregister();
    };
  },
};
