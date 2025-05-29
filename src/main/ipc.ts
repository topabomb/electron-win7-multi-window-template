import { BrowserWindow, ipcMain } from 'electron'
import { sysLog, sysWarn, LogMessage } from './logger'
import type { ProcessState } from './process'

/**
 * 向监控窗口发送日志消息
 * @param winName 窗口名称，通常是 'monitor'
 * @param msg 日志消息对象
 */
const sendLoggerToMonitor = (winName: string, msg: LogMessage) => {
  const win = findWindowExec(winName)
  if (win && !win.isDestroyed()) {
    // 使用 system.logger 频道发送日志消息
    win.webContents.send('system.logger', msg)
  }
}

/**
 * 向监控窗口发送进程状态信息
 * @param winName 窗口名称，通常是 'monitor'
 * @param state 进程状态对象
 */
const sendProcessStateToMonitor = (winName: string, state: ProcessState) => {
  const win = findWindowExec(winName)
  if (win && !win.isDestroyed()) {
    // 使用 system.process 频道发送进程状态
    win.webContents.send('system.process', state)
  }
}

// 管理器对象，将在 createIpcManager 中被初始化
const manager = {
  sendLoggerToMonitor,
  sendProcessStateToMonitor
}
let findWindowExec: (id: string) => BrowserWindow | undefined
const createIpcManager = (
  findWindow: (id: string) => BrowserWindow | undefined
): IpcManagerType => {
  findWindowExec = findWindow
  sysLog('Initializing IPC manager')
  // 处理 ping 消息
  ipcMain.on('ping', (e, args) => {
    const mainWindow = findWindowExec('main')
    if (mainWindow) {
      sysLog('Pong message to main window:', args)
      mainWindow.webContents.send('pong', args)
    } else {
      sysWarn('Main window not found for ping-pong message')
    }
  })

  // 处理 invokeCall 消息
  ipcMain.handle('invokeCall', async (e, args) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return `invokeCall(${e.sender.id},${args})`
  })

  return manager
}

type IpcManagerType = typeof manager
export type { IpcManagerType }
export { createIpcManager }
