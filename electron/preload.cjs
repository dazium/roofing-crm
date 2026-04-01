const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('roofingcrmDesktop', {
  loadData: () => ipcRenderer.invoke('desktop-storage:load'),
  saveData: (payload) => ipcRenderer.invoke('desktop-storage:save', payload),
  getMeta: () => ipcRenderer.invoke('desktop-storage:meta'),
  exportEstimatePdf: (payload) => ipcRenderer.invoke('desktop-estimate:export-pdf', payload),
  runMaterialScraper: () => ipcRenderer.invoke('desktop-materials:run-scraper'),
})
