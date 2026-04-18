const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('cleaner', {
  scanAll: () => ipcRenderer.invoke('scan-all'),
  getScanSettings: () => ipcRenderer.invoke('scan-settings:get'),
  addAuthorizedDirectory: () => ipcRenderer.invoke('scan-settings:add-directory'),
  removeAuthorizedDirectory: (targetPath) => ipcRenderer.invoke('scan-settings:remove-directory', targetPath),
  setScanProfile: (profile) => ipcRenderer.invoke('scan-settings:set-profile', profile),
  deleteItems: (paths) => ipcRenderer.invoke(
    'delete-items',
    Array.isArray(paths) ? paths.filter((p) => typeof p === 'string') : []
  ),
  onScanProgress: (cb) => {
    const handler = (_, value) => cb(value)
    ipcRenderer.on('scan-progress', handler)
    return () => ipcRenderer.removeListener('scan-progress', handler)
  }
})
