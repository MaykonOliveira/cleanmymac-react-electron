import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cleaner', {
  scanAll: () => ipcRenderer.invoke('scan-all'),
  getScanSettings: () => ipcRenderer.invoke('scan-settings:get'),
  addAuthorizedDirectory: () => ipcRenderer.invoke('scan-settings:add-directory'),
  removeAuthorizedDirectory: (targetPath: string) => ipcRenderer.invoke('scan-settings:remove-directory', targetPath),
  setScanProfile: (profile: string) => ipcRenderer.invoke('scan-settings:set-profile', profile),
  deleteItems: (paths: string[]) => ipcRenderer.invoke(
    'delete-items',
    Array.isArray(paths) ? paths.filter((p) => typeof p === 'string') : []
  ),
  onScanProgress: (cb: (progress: number) => void) => {
    const handler = (_: unknown, value: number) => cb(value)
    ipcRenderer.on('scan-progress', handler)
    return () => ipcRenderer.removeListener('scan-progress', handler)
  }
})
