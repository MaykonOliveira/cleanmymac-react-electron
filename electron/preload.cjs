const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('cleaner', {
  scanAll: () => ipcRenderer.invoke('scan-all'),
  deleteItems: (paths) => ipcRenderer.invoke('delete-items', paths),
  onScanProgress: (cb) => {
    const handler = (_, value) => cb(value)
    ipcRenderer.on('scan-progress', handler)
    return () => ipcRenderer.removeListener('scan-progress', handler)
  }
})