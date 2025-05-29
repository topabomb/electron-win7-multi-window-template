import { format, inspect } from 'util'

// 日志级别定义
export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

// 日志消息接口
export interface LogMessage {
  type: 'system' | 'process'
  level: string
  timestamp: string
  source: string
  content: string
}

// 日志处理器接口
export type LogHandler = (message: LogMessage) => void

// 全局配置
let currentLogLevel = LogLevel.INFO
let logHandlers: LogHandler[] = []

// 设置日志级别
export const setLogLevel = (level: LogLevel): void => {
  currentLogLevel = level
}

// 添加日志处理器
export const addLogHandler = (handler: LogHandler): void => {
  logHandlers.push(handler)
}

// 移除日志处理器
export const removeLogHandler = (handler: LogHandler): void => {
  const index = logHandlers.indexOf(handler)
  if (index !== -1) {
    logHandlers.splice(index, 1)
  }
}

// 清除所有日志处理器
export const clearLogHandlers = (): void => {
  logHandlers = []
}

// 获取时间字符串: HH:MM:SS.mmm
const getTimeString = (): string => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`
}

// 处理Buffer和复杂对象
const formatValue = (value: any): string => {
  // 处理简单类型
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.stack || value.message

  // 处理Buffer
  if (Buffer.isBuffer(value)) {
    // 尝试按UTF-8解码
    return value.toString('utf8')
  }
  // 处理对象和数组
  try {
    return typeof value === 'object' ? JSON.stringify(value) : String(value)
  } catch {
    return inspect(value, { depth: 3, colors: false })
  }
}

// 格式化参数
const formatArgs = (...args: any[]): string => {
  if (args.length === 0) return ''
  if (args.length === 1) return formatValue(args[0])

  try {
    return format(...args)
  } catch {
    return args.map(formatValue).join(' ')
  }
}

// 分发日志消息到所有处理器
const dispatchLogMessage = (msg: LogMessage): void => {
  for (const handler of logHandlers) {
    try {
      handler(msg)
    } catch (err) {
      console.error('Error in log handler:', err)
    }
  }
}

// 创建日志消息对象
const createLogMessage = (
  type: 'system' | 'process',
  level: string,
  source: string,
  content: string
): LogMessage => ({
  type,
  level,
  timestamp: getTimeString(),
  source,
  content
})

// 系统日志函数
export const sysDebug = (...args: any[]): void => {
  if (currentLogLevel > LogLevel.DEBUG) return

  const content = formatArgs(...args)
  const time = getTimeString()
  process.stdout.write(`[${time}][system:debug] ${content}\n`)

  const msg = createLogMessage('system', 'debug', 'System', content)
  dispatchLogMessage(msg)
}

export const sysLog = (...args: any[]): void => {
  if (currentLogLevel > LogLevel.INFO) return

  const content = formatArgs(...args)
  const time = getTimeString()
  process.stdout.write(`[${time}][system] ${content}\n`)

  const msg = createLogMessage('system', 'info', 'System', content)
  dispatchLogMessage(msg)
}

export const sysWarn = (...args: any[]): void => {
  if (currentLogLevel > LogLevel.WARN) return

  const content = formatArgs(...args)
  const time = getTimeString()
  process.stderr.write(`[${time}][system:warn] ${content}\n`)

  const msg = createLogMessage('system', 'warn', 'System', content)
  dispatchLogMessage(msg)
}

export const sysError = (...args: any[]): void => {
  if (currentLogLevel > LogLevel.ERROR) return

  const content = formatArgs(...args)
  const time = getTimeString()
  process.stderr.write(`[${time}][system:error] ${content}\n`)

  const msg = createLogMessage('system', 'error', 'System', content)
  dispatchLogMessage(msg)
}

// 进程日志函数
export const procLog = (procId: string, ...args: any[]): void => {
  if (currentLogLevel > LogLevel.INFO) return

  const content = formatArgs(...args)
  const time = getTimeString()
  process.stdout.write(`[${time}][${procId}] ${content}`)

  const msg = createLogMessage('process', 'info', procId, content)
  dispatchLogMessage(msg)
}

export const procError = (procId: string, ...args: any[]): void => {
  if (currentLogLevel > LogLevel.ERROR) return

  const content = formatArgs(...args)
  const time = getTimeString()
  process.stderr.write(`[${time}][${procId}] ${content}`)

  const msg = createLogMessage('process', 'error', procId, content)
  dispatchLogMessage(msg)
}

// 默认导出
export default {
  procLog,
  procError,
  sysDebug,
  sysLog,
  sysWarn,
  sysError,
  setLogLevel,
  LogLevel,
  addLogHandler,
  removeLogHandler,
  clearLogHandlers
}
