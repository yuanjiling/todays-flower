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
    platform: string;
    versions: {
      chrome: string;
      electron: string;
      node: string;
    };
  };

  type DesktopLaunchAtLoginSettings = {
    openAtLogin: boolean;
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
