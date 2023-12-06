const { app, BrowserWindow, ipcMain, dialog,Menu ,shell } = require('electron');
const path = require('path');
const {writeFile,readFileSync } = require('fs');
const { execFile } = require('child_process');
const isDev = require('electron-is-dev');
const {remote} = require('electron');
const fs = require('fs');

const isMac = process.platform === 'darwin'

const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }]
    : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac
         ? { role: 'close' } : { role: 'quit' }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [
                { role: 'startSpeaking' },
                { role: 'stopSpeaking' }
              ]
            }
          ]
        : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac
        ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ]
        : [
            { role: 'close' }
          ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://electronjs.org')
        }
      }
    ]
  }
]

const savePath = app.getPath('userData')+ "\\data.json";
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
function createWindow () {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
    resizable: false, // 禁止调整窗口大小

    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载应用的 index.html
  const urlLocation = isDev ? 'http://localhost:3000' : 'dummyurl'
  // win.webContents.openDevTools();
  win.loadURL(urlLocation);
//   win.loadFile('index.html');

}

app.whenReady().then(() => {
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('listFolder',async (event,directory) => {
  result = fs.readdirSync(directory, { withFileTypes: true });
  return result;
});

ipcMain.handle('openDialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (!result.canceled) {
    const folderPath = result.filePaths[0];
    const folderContents = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(item => item.isDirectory());
    const config = {
      folderPath:folderPath,
      folderContents:folderContents};
    let status = null;
    writeFile(savePath, JSON.stringify(config, null, 2), (err) => {
      if (err) {
        status = -1;
      } else {
        status = 0;
      }
    });
    return config;
  }
  return null;
});

ipcMain.handle('initFolder',async () => {
  const data = readFileSync(savePath);
  if (data) {
    return JSON.parse(data);
  }
});

ipcMain.handle('openFile', async (event, filePath) => {
  shell.openPath(filePath).then(response => {
      if (response) {
          console.error('Error opening file:', response);
      }
  });
});
ipcMain.handle('deleteFile', async (event, filePath) => {
  console.log(filePath,'ipcdelete');
  fs.unlink(filePath, (err) => {
    if (err) {
        console.error('File delete failed:', err);
        return false;
    } else {
        console.log('File deleted successfully');
        return true;
    }
});
});

ipcMain.handle('uploadFile', (event,{fileName, sourcePath, destinationPath }) => {
  fs.cp(sourcePath, path.join(destinationPath,fileName), (err) => {
    if (err) {
        console.error('File copy failed:', err);
        return false;
    } else {
        console.log('File copied successfully');
        return true;
    }
});
});
// ipcMain.handle('listFolder',async (event,folderPath) => {
//   const folderContents = fs.readdirSync(folderPath, { withFileTypes: true })
//   .filter(item => item.isDirectory());
//   console.log(folderContents);
//   return folderContents;
// });
