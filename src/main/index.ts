import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createManager } from './manager'
import { createIpcManager } from './ipc'
import { createProcessManager } from './process'
const closeApp = () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  const manager = createManager()
  createIpcManager(manager)
  const mainWindow = () => {
    const win = manager.createWindow('main', { devtools: is.dev })
    win.on('closed', () => closeApp())
  }
  mainWindow()
  manager.createWindow('monitor', {}, { width: 480, height: 360, x: 0, y: 0 })
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) mainWindow()
  })
  createProcessManager()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => closeApp())
