const { contextBridge, ipcRenderer } = require('electron');

const runtimeInfo = {
  isElectron: true,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
};

const desktopApi = {
  ...runtimeInfo,
  async getRuntimeInfo() {
    return ipcRenderer.invoke('desktop:get-runtime-info');
  },
  async getLaunchAtLogin() {
    return ipcRenderer.invoke('desktop:get-launch-at-login');
  },
  async setLaunchAtLogin(payload) {
    return ipcRenderer.invoke('desktop:set-launch-at-login', payload);
  },
  async notify(payload) {
    return ipcRenderer.invoke('desktop:notify', payload);
  },
  async updateReminderState(payload) {
    return ipcRenderer.invoke('desktop:update-reminder-state', payload);
  },
  async minimizeMainWindow() {
    return ipcRenderer.invoke('desktop:minimize-main-window');
  },
  async toggleMaximizeMainWindow() {
    return ipcRenderer.invoke('desktop:toggle-maximize-main-window');
  },
  async closeMainWindow() {
    return ipcRenderer.invoke('desktop:close-main-window');
  },
  async closeReminderWindow() {
    return ipcRenderer.invoke('desktop:close-reminder-window');
  },
  async showMainWindow() {
    return ipcRenderer.invoke('desktop:show-main-window');
  },
  onReminderWindowPayload(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on('desktop:reminder-window-payload', listener);

    return () => {
      ipcRenderer.removeListener('desktop:reminder-window-payload', listener);
    };
  },
  onNotificationClick(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, detail) => {
      callback(detail);
    };

    ipcRenderer.on('desktop:notification-clicked', listener);

    return () => {
      ipcRenderer.removeListener('desktop:notification-clicked', listener);
    };
  },
};

contextBridge.exposeInMainWorld('todaysFlowerDesktop', desktopApi);
contextBridge.exposeInMainWorld('jflowDesktop', desktopApi);
