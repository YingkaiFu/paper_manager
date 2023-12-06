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
}); 
