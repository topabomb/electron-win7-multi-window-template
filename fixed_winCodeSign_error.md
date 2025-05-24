# Windows下 npm run build:target 时 `winCodeSign` 报错的解决方法
1. 手动下载 winCodeSign.7z 软件包。您可以使用与 electron-builder 相同的 URL：
https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z

2. 然后将档案解压到请求的位置（我使用了适用于 Windows 的 7-Zip 23.01，注意需要使用管理员权限打开7-zip），以便您的机器上出现此文件夹：
C:\Users\<YourUserName>\AppData\Local\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\

提取过程中没有出现任何错误。一旦文件夹存在，electron-builder 运行时就会跳过 7z 文件的下载和提取。

## 优点：

- 您不需要管理员权限
- 您可以使用最新版本的 electron-builder
- 您只需执行一次此准备步骤，在 CI 环境中也很容易实现

## [参考地址](https://github.com/electron-userland/electron-builder/issues/8149)
