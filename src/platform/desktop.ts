const webFallback: JflowDesktopApi = {
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
  onReminderWindowPayload() {
    return () => {};
  },
  onNotificationClick() {
    return () => {};
  },
};

export const desktopBridge =
  typeof window !== 'undefined' && window.jflowDesktop ? window.jflowDesktop : webFallback;

export const isDesktopRuntime = () => desktopBridge.isElectron;
