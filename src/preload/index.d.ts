import { ElectronAPI } from '@electron-toolkit/preload'
import { ApiType } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ApiType
  }
}
