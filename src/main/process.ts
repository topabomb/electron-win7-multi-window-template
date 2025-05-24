import { spawn, execSync } from 'node:child_process'
const log = (raw) => {
  process.stdout.write(raw)
}
const error = (raw) => {
  process.stdout.write(raw)
}

const createProcessManager = () => {
  const chcp = execSync('chcp')
  log(chcp)
  const child = spawn('npm ', ['run', 'test:loop'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true // Windows 兼容性好
  })

  // 监听标准输出
  child.stdout.on('data', (data) => {
    log(`stdout: ${data}`)
  })

  // 监听标准错误
  child.stderr.on('data', (data) => {
    error(`stderr ${data}`)
  })

  // 监听退出
  child.on('close', (code) => {
    log(`close ${code}`)
  })

  // 优雅退出（例如 Ctrl+C）
  process.on('SIGINT', () => {
    log('主进程收到 SIGINT，通知子进程退出')
    // 向子进程发送终止信号（在 Windows 上会强制 kill）
    child.kill('SIGTERM')
  })
}
export { createProcessManager }
