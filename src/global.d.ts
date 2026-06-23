export {};

declare global {
  type DesktopNotificationPayload = {
    title: string;
    body?: string;
    silent?: boolean;
  };

  type ReminderTaskSummary = {
    id: string;
    title: string;
    importance: number;
    flowerId?: string;
    completed: boolean;
  };

  type DesktopReminderStatePayload = {
    intervalMinutes: number;
    language: 'en' | 'zh';
    totalTaskCount?: number;
    tasks: ReminderTaskSummary[];
  };

  type DesktopNotificationResult = {
    shown: boolean;
    reason?: string;
  };

  type DesktopRuntimeInfo = {
    isElectron: boolean;
    isTauri?: boolean;
    platform: string;
    versions: {
      chrome: string;
      electron: string;
      node: string;
      tauri?: string;
    };
  };

  type DesktopLaunchAtLoginSettings = {
    openAtLogin: boolean;
  };

  type TrayConfigPayload = {
    lang: string;
    isNotificationEnabled: boolean;
    notificationInterval: number;
  };

  interface TodaysFlowerDesktopApi extends DesktopRuntimeInfo {
    getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
    getLaunchAtLogin: () => Promise<DesktopLaunchAtLoginSettings>;
    setLaunchAtLogin: (
      payload: DesktopLaunchAtLoginSettings,
    ) => Promise<DesktopLaunchAtLoginSettings>;
    notify: (payload: DesktopNotificationPayload) => Promise<DesktopNotificationResult>;
    updateReminderState: (payload: DesktopReminderStatePayload) => Promise<{ ok: true }>;
    minimizeMainWindow: () => Promise<{ ok: true }>;
    toggleMaximizeMainWindow: () => Promise<{ ok: true; isMaximized: boolean }>;
    closeMainWindow: () => Promise<{ ok: true }>;
    closeReminderWindow: () => Promise<{ ok: true }>;
    showMainWindow: () => Promise<{ ok: true }>;
    updateTrayMenu: (payload: TrayConfigPayload) => Promise<{ ok: true }>;
    onTraySettingsChanged: (
      callback: (payload: TrayConfigPayload) => void,
    ) => () => void;
    onReminderWindowPayload: (
      callback: (payload: DesktopReminderStatePayload) => void,
    ) => () => void;
    onNotificationClick: (
      callback: (payload: DesktopNotificationPayload) => void,
    ) => () => void;
  }

  type JflowDesktopApi = TodaysFlowerDesktopApi;

  interface Window {
    todaysFlowerDesktop?: TodaysFlowerDesktopApi;
    jflowDesktop?: TodaysFlowerDesktopApi;
  }
}
