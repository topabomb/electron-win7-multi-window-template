import * as fs from 'fs'
import * as path from 'path'

// 配置源目录和目标目录
const rootDir = path.resolve(__dirname, '..')

const srcDirs = [path.join(rootDir, '.py3.8.20_env'), path.join(rootDir, 'backend')]
const destDir = path.join(rootDir, 'dist', 'win-unpacked')
const ignoredSubDirs = ['__pycache__', '.venv', '.pytest_cache']
const targetBackendDir = path.join(destDir, 'backend')
if (fs.existsSync(targetBackendDir)) {
  console.log(`固定删除目录，确保后端文件更新: ${targetBackendDir}`)
  removeDirectory(targetBackendDir)
}
// 检查目标目录是否存在
if (!fs.existsSync(destDir)) {
  console.error(`目标目录不存在: ${destDir}`)
  process.exit(1)
}

/**
 * 删除目录（递归）
 * @param dirPath - 要删除的目录路径
 */
function removeDirectory(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    console.log(`删除目录: ${dirPath}`)
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
}

/**
 * 比较两个文件的修改时间来判断是否需要更新
 * @param srcFile - 源文件路径
 * @param destFile - 目标文件路径
 * @returns 如果目标文件不存在或源文件更新则返回true
 */
function isFileNeedsUpdate(srcFile: string, destFile: string): boolean {
  if (!fs.existsSync(destFile)) {
    return true
  }

  try {
    const srcStat = fs.statSync(srcFile)
    const destStat = fs.statSync(destFile)

    // 如果源文件的修改时间比目标文件新，则需要更新
    return srcStat.mtime > destStat.mtime
  } catch (error) {
    console.error(`比较文件时出错: ${(error as Error).message}`)
    return true // 出错时默认更新文件
  }
}

/**
 * 递归复制目录
 * @param src - 源目录
 * @param dest - 目标目录
 * @returns 复制统计信息
 */
function copyDirectory(
  src: string,
  dest: string
): { totalFiles: number; copiedFiles: number; skippedFiles: number } {
  // 如果目标目录不存在，创建它
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  // 读取源目录中的所有项目
  const entries = fs.readdirSync(src, { withFileTypes: true })

  let totalFiles = 0
  let copiedFiles = 0
  let skippedFiles = 0

  // 遍历源目录中的所有项目
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    // 检查是否忽略该文件或目录
    if (ignoredSubDirs.includes(entry.name)) {
      skippedFiles++
      //console.log(`已跳过: ${srcPath} (忽略列表)`)
      continue
    }
    if (entry.isDirectory()) {
      // 如果是目录，递归复制
      const result = copyDirectory(srcPath, destPath)
      totalFiles += result.totalFiles
      copiedFiles += result.copiedFiles
      skippedFiles += result.skippedFiles
    } else {
      // 如果是文件，检查是否需要复制
      totalFiles++

      if (isFileNeedsUpdate(srcPath, destPath)) {
        // 文件需要更新，复制文件
        fs.copyFileSync(srcPath, destPath)
        copiedFiles++
        //console.log(`已复制: ${srcPath} -> ${destPath}`)
      } else {
        // 文件相同，跳过（不输出日志）
        skippedFiles++
      }
    }
  }

  return { totalFiles, copiedFiles, skippedFiles }
}

// 执行复制操作
console.log('开始复制目录到 win-unpacked...')

const totalStats = {
  totalFiles: 0,
  copiedFiles: 0,
  skippedFiles: 0
}

for (const srcDir of srcDirs) {
  const dirName = path.basename(srcDir)
  console.log(`\n处理目录: ${dirName}`)

  if (!fs.existsSync(srcDir)) {
    console.error(`源目录不存在: ${srcDir}`)
    continue
  }

  const targetDir = path.join(destDir, dirName)
  const stats = copyDirectory(srcDir, targetDir)

  totalStats.totalFiles += stats.totalFiles
  totalStats.copiedFiles += stats.copiedFiles
  totalStats.skippedFiles += stats.skippedFiles

  console.log(`${dirName} 复制完成!`)
}

console.log('\n复制操作总结:')
console.log(`总文件数: ${totalStats.totalFiles}`)
console.log(`已复制: ${totalStats.copiedFiles}`)
console.log(`已跳过(文件未修改): ${totalStats.skippedFiles}`)
console.log('完成!')
