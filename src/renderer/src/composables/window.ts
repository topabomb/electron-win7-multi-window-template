const windowUtils = {
  minimize: () => window.api.minimize(),
  toggleMaximize: () => window.api.toggleMaximize(),
  closeApp: () => window.api.close(),
  devTools: () => window.api.openDevTools()
}
export { windowUtils }
