import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { BrowserWindow } from '@electron/remote'

// Custom APIs for renderer
const api = {
  openDevTools() {
    const win = BrowserWindow.getFocusedWindow()!
    if (!win.webContents.devToolsWebContents) win.webContents.openDevTools()
    else win.webContents.closeDevTools()
  },
  minimize() {
    BrowserWindow.getFocusedWindow()!.minimize()
  },
  toggleMaximize() {
    const win = BrowserWindow.getFocusedWindow()!
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  },
  close() {
    BrowserWindow.getFocusedWindow()!.close()
  },
  onPong: (callback: (val: any) => void) =>
    ipcRenderer.on('pong', (_event, value) => callback(value))
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
type ApiType = typeof api
export type { ApiType }
