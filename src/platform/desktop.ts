const webFallback: TodaysFlowerDesktopApi = {
  isElectron: false,
  platform: 'web',
  versions: {
    chrome: '',
    electron: '',
    node: '',
  },
  async getRuntimeInfo() {
    return {
      isElectron: false,
      platform: 'web',
      versions: {
        chrome: '',
        electron: '',
        node: '',
      },
    };
  },
  async getLaunchAtLogin() {
    return {
      openAtLogin: false,
    };
  },
  async setLaunchAtLogin() {
    return {
      openAtLogin: false,
    };
  },
  async notify() {
    return {
      shown: false,
      reason: 'unavailable',
    };
  },
  async updateReminderState() {
    return {
      ok: true as const,
    };
  },
  async minimizeMainWindow() {
    return {
      ok: true as const,
    };
  },
  async toggleMaximizeMainWindow() {
    return {
      ok: true as const,
      isMaximized: false,
    };
  },
  async closeMainWindow() {
    return {
      ok: true as const,
    };
  },
  async closeReminderWindow() {
    return {
      ok: true as const,
    };
  },
  async showMainWindow() {
    return {
      ok: true as const,
    };
  },
  async updateTrayMenu() {
    return {
      ok: true as const,
    };
  },
  onTraySettingsChanged() {
    return () => {};
  },
  onReminderWindowPayload() {
    return () => {};
  },
  onNotificationClick() {
    return () => {};
  },
};

export const desktopBridge =
  typeof window !== 'undefined'
    ? (window.todaysFlowerDesktop ?? window.jflowDesktop ?? webFallback)
    : webFallback;

export const isDesktopRuntime = () => desktopBridge.isElectron;
