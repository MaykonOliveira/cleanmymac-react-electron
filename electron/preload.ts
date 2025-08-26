import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cleaner', {
  scanAll: () => ipcRenderer.invoke('scan-all'),
  deleteItems: (paths: string[]) => ipcRenderer.invoke('delete-items', paths),
  onScanProgress: (cb: (progress: number) => void) => {
    const handler = (_: unknown, value: number) => cb(value)
    ipcRenderer.on('scan-progress', handler)
    return () => ipcRenderer.removeListener('scan-progress', handler)
  }
})