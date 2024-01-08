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
  addFolder:(rootFolder,categoryName,categroyColor) => {
    return ipcRenderer.invoke('addFolder', rootFolder,categoryName,categroyColor);
  },
  renameFolder:(src,des,color) => {
    return ipcRenderer.invoke('renameFolder', {src,des,color});
  },
  readArxiv: async (directory) => {
    console.log(directory)
    const result = await ipcRenderer.invoke('read_arxiv', directory);
    return result;
  },
  readPdf: async (directory) => {
    const result = await ipcRenderer.invoke('readpdf', directory);
    return result;
  },
  openFileDirectory : async(directory) => {
    const result = await ipcRenderer.invoke('openFileDirectory', directory);
    return result;
  },
  deleteFolder: async(directory) => {
    const result = await ipcRenderer.invoke('deleteFolder', directory);
    return result;
  },
  moveFile: async(rootFolder,selectedValue,currentFile) => {
    const result = await ipcRenderer.invoke('moveFile', {rootFolder,selectedValue,currentFile});
    return result;
  }
}); 
