import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createManager } from './manager'
import { createIpcManager } from './ipc'
import { createProcessManager } from './process'
import { sysError, addLogHandler, sysLog } from './logger'
import { dirname, join } from 'node:path'
import fs from 'node:fs'

const getAppRoot = (): string => {
  if (is.dev) {
    return dirname(dirname(__dirname))
  }
  if (process.platform === 'win32') {
    return dirname(app.getPath('exe'))
  } else if (process.platform === 'darwin') {
    return dirname(app.getAppPath())
  } else {
    return dirname(app.getPath('exe'))
  }
}
const AppRoot = getAppRoot()
const PythonBinDir = join(AppRoot, '.py3.8.20_env', 'python.exe')
const BackendDir = join(AppRoot, 'backend')
const CheckBackendExists = false
if (CheckBackendExists && (!fs.existsSync(PythonBinDir) || !fs.existsSync(BackendDir))) {
  dialog.showErrorBox(
    'Runtime Error',
    `PythonBinDir(${PythonBinDir}) or BackendDir(${BackendDir}) is not exists`
  )
  process.exit()
}
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('cn.mrling')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  const manager = createManager()
  const mainWindow = () => {
    const win = manager.createWindow(
      'main',
      { devtools: is.dev },
      { title: '主窗口', width: 1024, height: 720 }
    )
    win.on('closed', () => app.quit())
  }
  mainWindow()
  manager.createWindow('monitor', {}, { title: '后端监视器', width: 680, height: 480, x: 0, y: 0 })
  const ipc = createIpcManager((id) => {
    return manager.findWindow(id)
  })
  addLogHandler((msg) => {
    ipc.sendLoggerToMonitor('monitor', msg)
  })
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) mainWindow()
  })
  const processCfgs = [
    { id: 'npm-test-loop', cmd: 'npm', args: ['run', 'test:loop'], options: { shell: true } }
    /*
    {
      id: 'python-loop',
      cmd: PythonBinDir,
      args: ['-u', join(BackendDir, 'loop.py')],
      options: { cwd: BackendDir, env: { PYTHONPATH: BackendDir } }
    }*/
  ]
  const processManager = createProcessManager(processCfgs)
  processManager.onProcessStat((state) => {
    ipc.sendProcessStateToMonitor('monitor', state)
  })
  const closeApp = async () => {
    try {
      BrowserWindow.getAllWindows().forEach((v) => v.close())
      await processManager.closeAll()
    } catch (err) {
      sysError('Shutdown error:', err)
    } finally {
      app.exit(0)
    }
  }
  app.on('before-quit', async (event) => {
    event.preventDefault()
    await closeApp()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
