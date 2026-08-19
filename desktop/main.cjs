const { app, BrowserWindow, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('node:path')

const setupAutoUpdates = () => {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-downloaded', async info => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Обновление LumiCRM готово',
      message: `Версия ${info.version} уже загружена. Перезапустить приложение и установить обновление?`,
      buttons: ['Перезапустить сейчас', 'Позже'],
      defaultId: 0,
      cancelId: 1,
    })
    if (result.response === 0) autoUpdater.quitAndInstall(false, true)
  })
  autoUpdater.on('error', () => undefined)
  const check = () => void autoUpdater.checkForUpdates().catch(() => undefined)
  setTimeout(check, 8_000)
  setInterval(check, 6 * 60 * 60 * 1_000)
}

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    title: 'LumiCRM',
    backgroundColor: '#070b14',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  await window.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'), {
    query: { desktop: '1' },
  })
}

app.whenReady().then(() => {
  void createWindow()
  setupAutoUpdates()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
