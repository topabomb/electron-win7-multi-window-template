import { defineStore } from 'pinia'

// 导入主进程日志消息类型
export interface MainProcessLogMessage {
  type: 'system' | 'process'
  level: string
  timestamp: string
  source: string
  content: string
}

// 导入主进程状态消息类型
export interface MainProcessState {
  id: string
  pid: number | null
  status: 'running' | 'stopped' | 'error'
  startTime: string
  lastUpdateTime: string
}

export interface ProcessLog {
  timestamp: string
  message: string
  isError: boolean
}

export interface BackendProcess {
  id: number
  name: string
  status: 'running' | 'stopped' | 'error'
  startTime: string
  lastResponseTime: string
  logs: ProcessLog[]
  // 进程ID
  pid?: number | null
}

// 日志更新回调类型
type LogUpdateCallback = (processId: number) => void

// 系统进程的固定ID
const SYSTEM_PROCESS_ID = 1

export const useProcessStore = defineStore('process', {
  // State - 存储状态数据
  state: () => ({
    // 后端进程数据
    backendProcesses: [] as BackendProcess[],
    // UI状态 - 每个进程的自动滚动设置，使用进程ID作为键
    autoScrollSettings: {} as Record<number, boolean>,
    // 日志更新回调
    logUpdateCallback: null as LogUpdateCallback | null,
    // IPC监听器是否已设置
    ipcListenersInitialized: false
  }),

  // Getters - 派生状态
  getters: {
    // 获取指定进程
    getProcessById: (state) => {
      return (id: number) => state.backendProcesses.find((p) => p.id === id)
    },

    // 根据源获取进程ID
    getProcessIdBySource: (state) => {
      return (source: string) => {
        const process = state.backendProcesses.find((p) => p.name === source)
        return process?.id
      }
    },

    // 获取进程的自动滚动设置
    getAutoScrollSetting: (state) => {
      return (processId: number) => state.autoScrollSettings[processId] ?? true
    }
  },

  // Actions - 修改状态的方法
  actions: {
    // 设置日志更新回调
    setLogUpdateCallback(callback: LogUpdateCallback | null) {
      this.logUpdateCallback = callback
    },

    // 初始化系统进程
    initSystemProcess() {
      // 创建系统进程
      const systemProcess: BackendProcess = {
        id: SYSTEM_PROCESS_ID,
        name: 'System',
        status: 'running',
        startTime: new Date().toLocaleString(),
        lastResponseTime: new Date().toLocaleString(),
        logs: []
      }

      // 添加到进程列表
      this.backendProcesses.push(systemProcess)

      // 设置默认自动滚动
      this.autoScrollSettings[SYSTEM_PROCESS_ID] = true

      // 添加初始日志
      this.addLog(SYSTEM_PROCESS_ID, '系统日志开始记录')
    },

    // 初始化IPC监听器，接收主进程日志和状态
    initIpcListeners() {
      if (this.ipcListenersInitialized) return

      // 确保window.electron存在
      if (!window.electron?.ipcRenderer) {
        console.error('window.electron.ipcRenderer is not available')
        return
      }

      // 监听system.logger频道
      window.electron.ipcRenderer.on('system.logger', (event, msg: MainProcessLogMessage) => {
        this.handleMainProcessLog(msg)
      })

      // 监听system.process频道
      window.electron.ipcRenderer.on('system.process', (event, state: MainProcessState) => {
        this.handleProcessState(state)
      })

      this.ipcListenersInitialized = true
      console.log('IPC listeners initialized for system channels')
    },

    // 处理来自主进程的状态更新
    handleProcessState(state: MainProcessState) {
      // 如果是系统进程（ID=system），忽略
      if (state.id === 'system') return

      // 尝试找到匹配的进程
      const existingProcess = this.backendProcesses.find((p) => p.name === state.id)

      if (existingProcess) {
        // 更新现有进程
        existingProcess.status = state.status
        existingProcess.pid = state.pid
        existingProcess.lastResponseTime = state.lastUpdateTime

        // 如果进程状态发生变化，添加一条日志
        if (existingProcess.status !== state.status) {
          this.addLog(existingProcess.id, `进程状态变更为：${this.getStatusText(state.status)}`)
        }
      } else {
        // 创建新进程
        const newId = Math.max(0, ...this.backendProcesses.map((p) => p.id)) + 1

        const newProcess: BackendProcess = {
          id: newId,
          name: state.id,
          status: state.status,
          startTime: state.startTime,
          lastResponseTime: state.lastUpdateTime,
          pid: state.pid,
          logs: []
        }

        // 添加到进程列表
        this.backendProcesses.push(newProcess)

        // 设置默认自动滚动
        this.autoScrollSettings[newId] = true

        // 添加初始日志
        this.addLog(newId, `进程已启动，状态：${this.getStatusText(state.status)}`)
      }
    },

    // 获取状态文本
    getStatusText(status: string) {
      switch (status) {
        case 'running':
          return '运行中'
        case 'stopped':
          return '已停止'
        case 'error':
          return '错误'
        default:
          return '未知'
      }
    },

    // 处理来自主进程的日志消息
    handleMainProcessLog(msg: MainProcessLogMessage) {
      // 根据消息类型处理
      if (msg.type === 'system') {
        // 系统日志，添加到系统进程（ID=1）
        this.addLogFromMainProcess(SYSTEM_PROCESS_ID, msg)
      } else if (msg.type === 'process') {
        // 进程日志，尝试根据source查找对应进程
        const processId = this.getProcessIdBySource(msg.source)
        if (processId) {
          this.addLogFromMainProcess(processId, msg)
        } else {
          // 如果找不到对应进程，创建一个新进程
          this.createProcessForSource(msg.source, msg)
        }
      }
    },

    // 为未知源创建新的进程
    createProcessForSource(source: string, initialLog: MainProcessLogMessage) {
      // 生成新ID（当前最大ID+1）
      const newId = Math.max(0, ...this.backendProcesses.map((p) => p.id)) + 1

      // 创建新进程
      const newProcess: BackendProcess = {
        id: newId,
        name: source,
        status: 'running',
        startTime: new Date().toLocaleString(),
        lastResponseTime: new Date().toLocaleString(),
        logs: []
      }

      // 添加到进程列表
      this.backendProcesses.push(newProcess)

      // 设置默认自动滚动
      this.autoScrollSettings[newId] = true

      // 添加初始日志
      this.addLogFromMainProcess(newId, initialLog)

      return newId
    },

    // 从主进程日志创建ProcessLog并添加到指定进程
    addLogFromMainProcess(processId: number, msg: MainProcessLogMessage) {
      const process = this.getProcessById(processId)
      if (process) {
        // 创建日志对象
        const log: ProcessLog = {
          timestamp: msg.timestamp,
          message: `[${msg.source}] ${msg.content}`,
          isError: msg.level === 'error' || msg.level === 'warn'
        }

        // 添加新日志
        process.logs.push(log)

        // 限制日志数量，只保留最新的1000条
        if (process.logs.length > 1000) {
          process.logs = process.logs.slice(-1000)
        }

        // 更新最后响应时间
        process.lastResponseTime = new Date().toLocaleString()

        // 触发日志更新回调
        if (this.logUpdateCallback) {
          this.logUpdateCallback(processId)
        }
      }
    },

    // 切换特定进程的自动滚动设置
    toggleAutoScroll(processId: number, value?: boolean) {
      const currentValue = this.getAutoScrollSetting(processId)
      this.autoScrollSettings[processId] = value !== undefined ? value : !currentValue
    },

    // 根据进程状态返回对应的颜色
    getStatusColor(status: BackendProcess['status']) {
      switch (status) {
        case 'running':
          return 'positive'
        case 'stopped':
          return 'warning'
        case 'error':
          return 'negative'
        default:
          return 'grey'
      }
    },

    // 添加日志
    addLog(processId: number, message: string) {
      const process = this.getProcessById(processId)
      if (process) {
        // 创建日志对象
        const log: ProcessLog = {
          timestamp: new Date().toLocaleTimeString(),
          message,
          isError: message.includes('错误')
        }

        // 添加新日志
        process.logs.push(log)

        // 限制日志数量，只保留最新的1000条
        if (process.logs.length > 1000) {
          process.logs = process.logs.slice(-1000)
        }

        // 更新最后响应时间
        process.lastResponseTime = new Date().toLocaleString()

        // 触发日志更新回调
        if (this.logUpdateCallback) {
          this.logUpdateCallback(processId)
        }
      }
    },

    // 清除日志
    clearLogs(processId: number) {
      const process = this.getProcessById(processId)
      if (process) {
        process.logs = []
        this.addLog(processId, '日志已清除')
      }
    },

    // 初始化进程数据
    async initializeProcessData() {
      // 初始化系统进程
      this.initSystemProcess()

      // 初始化IPC监听器
      this.initIpcListeners()
    }
  }
})
