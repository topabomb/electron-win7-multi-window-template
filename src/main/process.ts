import { spawn, execSync, ChildProcess } from 'node:child_process'
import { procLog, procError, sysLog, sysError } from './logger'

// Force kill timeout in milliseconds
const FORCE_KILL_TIMEOUT = 1000

// 进程状态类型
export interface ProcessState {
  id: string
  pid: number | null
  status: 'running' | 'stopped' | 'error'
  startTime: string
  lastUpdateTime: string
}

const processMap: Map<string, ChildProcess> = new Map()
// 存储进程状态
const processStates: Map<string, ProcessState> = new Map()
// 进程状态回调函数
let processStatCallback: ((state: ProcessState) => void) | null = null

const runPipe = (
  id: string,
  cmd: string,
  args: string[],
  cwd?: string,
  env?: NodeJS.ProcessEnv,
  shell = false
): ChildProcess => {
  sysLog(`Running process: ${id}, cmd: ${cmd}, args: ${args}, cwd: ${cwd}, shell: ${shell}`)
  const child = spawn(cmd, args, {
    env: { ...process.env, ...env },
    cwd: cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell,
    detached: false // 确保子进程不会脱离父进程
  })
  processMap.set(id, child)

  // 初始化进程状态
  const processState: ProcessState = {
    id,
    pid: child.pid || null,
    status: 'running',
    startTime: new Date().toLocaleString(),
    lastUpdateTime: new Date().toLocaleString()
  }
  processStates.set(id, processState)

  // 通知进程状态变化
  if (processStatCallback) {
    processStatCallback(processState)
  }

  child.stdout.on('data', (data) => {
    procLog(id, data)
    updateProcessState(id, { status: 'running' })
  })
  child.stderr.on('data', (data) => {
    procError(id, data)
    updateProcessState(id, { status: 'running' })
  })
  child.on('error', (err) => {
    procError(id, err)
    updateProcessState(id, { status: 'error' })
  })
  child.on('close', (code) => {
    procLog(id, `Process exited with code ${code}`)
    updateProcessState(id, {
      status: code === 0 ? 'stopped' : 'error',
      pid: null
    })
    if (processMap.has(id)) {
      processMap.delete(id)
    }
  })
  return child
}

// 更新进程状态并触发回调
const updateProcessState = (id: string, updates: Partial<ProcessState>) => {
  const currentState = processStates.get(id)
  if (currentState) {
    const updatedState = {
      ...currentState,
      ...updates,
      lastUpdateTime: new Date().toLocaleString()
    }
    processStates.set(id, updatedState)

    // 触发状态回调
    if (processStatCallback) {
      processStatCallback(updatedState)
    }
  }
}

// 注册进程状态回调
const onProcessStat = (callback: (state: ProcessState) => void) => {
  processStatCallback = callback

  // 立即发送当前所有进程状态
  processStates.forEach((state) => {
    callback(state)
  })
}

// Close all processes with shutdown confirmation
const closeAll = async (): Promise<void> => {
  if (processMap.size === 0) {
    sysLog('No active processes to close')
    return
  }
  // 复制进程列表，防止在迭代过程中修改
  const processes = Array.from(processMap.entries())
  sysLog(`Found ${processes.length} processes to close`)
  // 创建子进程关闭promises
  const shutdownPromises = processes.map(([id, proc]) => {
    return new Promise<void>((resolve) => {
      const markResolved = () => {
        if (processMap.has(id)) {
          processMap.delete(id)
        }
        updateProcessState(id, { status: 'stopped', pid: null })
        resolve()
      }
      if (!proc || proc.killed || proc.exitCode !== null) {
        sysLog(`Process ${id} already terminated`)
        markResolved()
        return
      }
      sysLog(`Shutting down process: ${id}`)
      const handleExit = () => {
        sysLog(`Process ${id} closed successfully，${proc.exitCode},${proc.killed}`)
        clearTimeout(killTimeout)
        markResolved()
      }
      proc.once('exit', handleExit)

      const killTimeout = setTimeout(() => {
        try {
          sysLog(`Timeout reached for process ${id}, force killing`)
          proc.removeListener('exit', handleExit)

          if (!proc.killed) {
            // 在Windows上使用taskkill强制终止进程树
            if (process.platform === 'win32' && proc.pid) {
              sysLog(`Using taskkill for process ${proc.pid}`)
              execSync(`taskkill /pid ${proc.pid} /t /f`, { stdio: 'ignore' })
            } else {
              proc.kill('SIGKILL')
            }
            setTimeout(markResolved, 100)
          } else {
            markResolved()
          }
        } catch (err) {
          sysError(`Error force killing process ${id}:`, err)
          markResolved()
        }
      }, FORCE_KILL_TIMEOUT)
      try {
        proc.kill('SIGTERM')
      } catch (err) {
        sysError(`Error terminating process ${id}:`, err)
        clearTimeout(killTimeout)
        markResolved()
      }
    })
  })
  sysLog(`Waiting for ${shutdownPromises.length} processes to close...`)
  await Promise.all(shutdownPromises)
  sysLog('All processes successfully terminated')
}

const manager = {
  closeAll,
  onProcessStat
}

type ManagerType = typeof manager
const createProcessManager = (cfgs: ChildProcessConfig[]): ManagerType => {
  cfgs.forEach((config) => {
    runPipe(
      config.id,
      config.cmd,
      config.args,
      config.options?.cwd,
      config.options?.env,
      config.options?.shell
    )
  })
  return manager
}

export interface ChildProcessConfig {
  id: string
  cmd: string
  args: string[]
  options?: {
    shell?: boolean
    cwd?: string
    env?: NodeJS.ProcessEnv
  }
}

export { createProcessManager }
