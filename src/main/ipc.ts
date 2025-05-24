import { ipcMain } from 'electron'
import { ManagerType } from './manager'
const createIpcManager = (manager: ManagerType) => {
  ipcMain.on('ping', (e, args) => {
    const mainWindow = manager.findWindow('main')
    if (mainWindow) {
      mainWindow.webContents.send('pong', 'pong')
    }
  })
  ipcMain.handle('invokeCall', async (e, args) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return `invokeCall(${e.sender.id},${args})`
  })
}
export { createIpcManager }
