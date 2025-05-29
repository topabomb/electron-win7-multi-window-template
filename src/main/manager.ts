import { shell, BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { dirname, join } from 'path'
import { initialize, enable } from '@electron/remote/main'
import { is } from '@electron-toolkit/utils'
import { sysLog, sysError } from './logger'
import icon from '../../resources/icon.png?asset'

const idmap = {} as Record<string, number> //字符串id匹配window id
const findWindow = (id: string): BrowserWindow | undefined => {
  return BrowserWindow.getAllWindows().find((v) => v.id == idmap[id])
}
const createWindow = (
  id: string,
  params: { devtools?: boolean; show?: boolean; openNew?: boolean } | undefined,
  opt: BrowserWindowConstructorOptions = {}
): BrowserWindow => {
  const defaultParams = {
    devtools: false,
    show: true,
    openNew: true
  }
  params = { ...defaultParams, ...params }
  const defaultOpt = {
    id,
    width: 960,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  }
  if (idmap[id]) {
    sysLog(`Window already exists: ${id}`)
    return findWindow(id)!
  }

  const win = new BrowserWindow({ ...defaultOpt, ...opt })
  enable(win.webContents) //启用窗口响应@electron/remote
  win.on('ready-to-show', () => {
    if (params.show) {
      win.show()
      if (params.devtools) {
        if (is.dev) {
          sysLog(`Opening DevTools for window: ${id}`)
          win.webContents.openDevTools({ mode: 'undocked' })
        }
      }
    }
  })
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: params.openNew ? 'allow' : 'deny' }
  })
  const vuepath = `#/${id}`
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${vuepath}`)
    sysLog(`Loading dev URL for window ${id}: ${process.env['ELECTRON_RENDERER_URL']}${vuepath}`)
  } else {
    //mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    const prodPath = `file://${dirname(__dirname)}/renderer/index.html${vuepath}`
    win.loadURL(prodPath)
    sysLog(`Loading prod URL for window ${id}: ${prodPath}`)
  }
  idmap[id] = win.id
  win.webContents.on('page-title-updated', () => {
    opt.title && win.setTitle(opt.title)
  })
  win.on('closed', () => {
    sysLog(`Window closed: ${id}`)
    delete idmap[id]
  })

  return win
}
const manager = {
  findWindow,
  createWindow
}
const createManager = () => {
  try {
    sysLog('Initializing window manager')
    initialize() //初始化@electron/remote
    return manager
  } catch (err) {
    sysError('Failed to initialize window manager:', err)
    throw err
  }
}
type ManagerType = typeof manager
export type { ManagerType }
export { createManager }
