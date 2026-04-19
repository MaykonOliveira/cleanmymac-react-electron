import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cleaner', {
  scanAll: () => ipcRenderer.invoke('scan-all'),
  getScanSettings: () => ipcRenderer.invoke('scan-settings:get'),
  addAuthorizedDirectory: () => ipcRenderer.invoke('scan-settings:add-directory'),
  removeAuthorizedDirectory: (targetPath: string) => ipcRenderer.invoke('scan-settings:remove-directory', targetPath),
  setScanProfile: (profile: string) => ipcRenderer.invoke('scan-settings:set-profile', profile),
  setReminderFrequency: (frequency: string) => ipcRenderer.invoke('scan-settings:set-reminder-frequency', frequency),
  setMetricsOptIn: (enabled: boolean) => ipcRenderer.invoke('metrics:set-opt-in', enabled),
  trackMetricEvent: (eventName: string, payload?: Record<string, unknown>) => ipcRenderer.invoke('metrics:track-event', eventName, payload),
  getCleanupInsights: () => ipcRenderer.invoke('metrics:get-cleanup-insights'),
  deleteItems: (paths: string[]) => ipcRenderer.invoke(
    'delete-items',
    Array.isArray(paths) ? paths.filter((p) => typeof p === 'string') : []
  ),
  onScanProgress: (cb: (progress: number) => void) => {
    const handler = (_: unknown, value: number) => cb(value)
    ipcRenderer.on('scan-progress', handler)
    return () => ipcRenderer.removeListener('scan-progress', handler)
  },
  onReminder: (cb: (payload: { frequency: 'off' | 'weekly' | 'monthly'; dueAt: number }) => void) => {
    const handler = (_: unknown, value: { frequency: 'off' | 'weekly' | 'monthly'; dueAt: number }) => cb(value)
    ipcRenderer.on('scan-reminder', handler)
    return () => ipcRenderer.removeListener('scan-reminder', handler)
  },
  onTrayAction: (cb: (action: 'scan-quick' | 'scan-safe' | 'scan-complete' | 'reminder-weekly' | 'reminder-monthly' | 'toggle-theme') => void) => {
    const handler = (_: unknown, value: 'scan-quick' | 'scan-safe' | 'scan-complete' | 'reminder-weekly' | 'reminder-monthly' | 'toggle-theme') => cb(value)
    ipcRenderer.on('tray-action', handler)
    return () => ipcRenderer.removeListener('tray-action', handler)
  }
})
