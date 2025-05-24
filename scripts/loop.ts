// infinite-timestamp.ts

function printTimestampEverySecond(): void {
  setInterval(() => {
    const timestamp = new Date().toISOString()
    console.log(`时间戳 : ${timestamp}`)
  }, 1000)
}

// 启动函数
printTimestampEverySecond()
