const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openDialog: () => ipcRenderer.invoke("openDialog"),
  refreshLibrary: (rootPath) => ipcRenderer.invoke("refreshLibrary", rootPath),
  initFolder: () => ipcRenderer.invoke("initFolder"),
  setLastUploadDir: (dirPath) => ipcRenderer.invoke("setLastUploadDir", dirPath),
  openFile: (filePath) => ipcRenderer.invoke("openFile", filePath),
  deleteFile: (filePath) => ipcRenderer.invoke("deleteFile", filePath),
  uploadFile: (fileName, sourcePath, destinationPath) =>
    ipcRenderer.invoke("uploadFile", { fileName, sourcePath, destinationPath }),
  readPdf: (filePath) => ipcRenderer.invoke("readpdf", filePath),
  saveFileMetadata: (file) => ipcRenderer.invoke("saveFileMetadata", file),
  openFileDirectory: (filePath) =>
    ipcRenderer.invoke("openFileDirectory", filePath),
  createFolder: (payload) => ipcRenderer.invoke("createFolder", payload),
  renameEntry: (payload) => ipcRenderer.invoke("renameEntry", payload),
  deleteEntry: (payload) => ipcRenderer.invoke("deleteEntry", payload),
  moveEntry: (payload) => ipcRenderer.invoke("moveEntry", payload),
});
