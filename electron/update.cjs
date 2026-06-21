const fs = require('fs');

let content = fs.readFileSync('main.cjs', 'utf8');

// 1. Add tray config state variable
if (!content.includes('let trayConfig =')) {
  content = content.replace(
    /let tray = null;/,
    "let tray = null;\nlet trayConfig = { lang: 'zh', isNotificationEnabled: true, notificationInterval: 60 };"
  );
}

// 2. Define updateTrayMenu
const updateTrayMenuCode = `
function updateTrayMenu() {
  if (!tray) return;

  const t = (en, zh) => trayConfig.lang === 'zh' ? zh : en;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t('Enter Garden', '进入花园'),
      click: () => focusMainWindow(),
    },
    { type: 'separator' },
    {
      label: t('Enable Reminders', '开启/关闭 提醒'),
      type: 'checkbox',
      checked: trayConfig.isNotificationEnabled,
      click: (menuItem) => {
        trayConfig.isNotificationEnabled = menuItem.checked;
        if (mainWindow) {
          mainWindow.webContents.send('desktop:tray-settings-changed', trayConfig);
        }
      }
    },
    {
      label: t('Reminder Interval', '提醒间隔'),
      submenu: [30, 60, 120, 180].map(val => ({
        label: t(\`\${val}m\`, \`\${val}分钟\`),
        type: 'radio',
        checked: trayConfig.notificationInterval === val,
        click: () => {
          trayConfig.notificationInterval = val;
          if (mainWindow) {
            mainWindow.webContents.send('desktop:tray-settings-changed', trayConfig);
          }
        }
      }))
    },
    { type: 'separator' },
    {
      label: t('Quit', '退出程序'),
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}
`;

// 3. Replace createTray
const newCreateTray = `function createTray() {
  if (tray) {
    return;
  }

  tray = new Tray(getTrayIconPath());
  tray.setToolTip(DEFAULT_TITLE);
  
  updateTrayMenu();
  
  tray.on('click', () => {
    focusMainWindow();
  });
}`;

content = content.replace(/function createTray\(\) \{[\s\S]*?tray\.on\('click', \(\) => \{\s*focusMainWindow\(\);\s*\}\);\s*\}/, updateTrayMenuCode + "\n\n" + newCreateTray);

// 4. Add the ipcMain.handle
content = content.replace(
  /ipcMain\.handle\('desktop:show-main-window'[\s\S]*?\}\);/,
  `ipcMain.handle('desktop:show-main-window', () => {
      focusMainWindow();
      return { ok: true };
    });

    ipcMain.handle('desktop:update-tray-menu', (_event, payload) => {
      if (payload) {
        trayConfig = { ...trayConfig, ...payload };
        updateTrayMenu();
      }
      return { ok: true };
    });`
);

fs.writeFileSync('main.cjs', content, 'utf8');
console.log('Done');
