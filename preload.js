const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listFolder:(directory) => {
    // console.log(directory)
    return ipcRenderer.invoke('listFolder', directory);
  },
  openDialog:() => {
    // console.log(directory)
    return ipcRenderer.invoke('openDialog', );
  },
  initFolder:() => {
    // console.log(directory)
    return ipcRenderer.invoke('initFolder', );
  },
  openFile:(filePath) => {
    // console.log(directory)
    return ipcRenderer.invoke('openFile',filePath);
  },
  deleteFile:(filePath) => {
    console.log(filePath,'preload');
    return ipcRenderer.invoke('deleteFile',filePath);
  },
  uploadFile:(fileName, sourcePath, destinationPath) => {
    // console.log(sourcePath, destinationPath,"preload");
    return ipcRenderer.invoke('uploadFile', { fileName,sourcePath, destinationPath });
  },
}); 
