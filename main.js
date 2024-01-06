const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { writeFile, readFileSync, existsSync } = require('fs');
const { execFile } = require('child_process');
const isDev = require('electron-is-dev');
const { remote } = require('electron');
const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const { PDFDocument } = require('pdf-lib');
const Datastore = require('nedb');
const isMac = process.platform === 'darwin';


function isArxivFileName(fileName) {
  // arXiv 文件名格式，可能包含版本号，如 "2104.00001v1"
  const arxivRegex = /^\d{4}\.\d{4,5}(v\d+)?$/;
  return arxivRegex.test(fileName);
}

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

const dbPath = path.join(app.getPath('userData'), 'files.db');
const db = new Datastore({ filename: dbPath, autoload: true });
module.exports = db;

const savePath = path.join(app.getPath('userData'), "data.json");
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
function createWindow() {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 1250,
    height: 800,
    // resizable: false, // 禁止调整窗口大小
    icon: path.join(__dirname, 'assets', 'icons', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载应用的 index.html
  const urlLocation = isDev ? 'http://localhost:3000' : "build/index.html";
  // const startFile = process.env.ELECTRON_START_URL || `'build/index.html')}`;
  // console.log(urlLocation);
  if (isDev) {
    win.webContents.openDevTools();
  }
  // win.loadURL(urlLocation);
  isDev ? win.loadURL(urlLocation):win.loadFile(urlLocation);
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

ipcMain.handle('listFolder', async (event, directory) => {
  const dirents = fs.readdirSync(directory, { withFileTypes: true });
  const fileDataPromises = dirents
    .filter(dirent => dirent.isFile() && path.extname(dirent.name).toLowerCase() === '.pdf')
    .map(dirent => {
      return new Promise((resolve, reject) => {
        db.findOne({ path: path.join(dirent.path, dirent.name) }, (err, doc) => {
          if (err) {
            reject(err);
          } else {
            const ext = path.extname(dirent.name);
            // 去除扩展名，得到文件名
            const fileNameWithoutExt = dirent.name.replace(ext, '');
            const fileData = {
              ...dirent, // 文件的基本信息
              key: path.join(dirent.path, dirent.name),
              year: '',  // 添加 year 键，值为默认的空字符串
              authors: '', // 添加 author 键，值为默认的空字符串
              summary: '', // 添加 summary 键，值为默认的空字符串
              journal: '', // 添加 journal 键，值为默认的空字符串
              title: fileNameWithoutExt, // 添加 title 键，值为默认的空字符串
              path: path.join(dirent.path, dirent.name), // 添加 path 键，值为文件的完整路径
              ...doc || {} // 数据库查询结果
            };
            resolve(fileData);
          }
        });
      });
    });
  db.update({ _id: 'folderData' }, { $set: { lastfolder: directory } }, { upsert: true });
  try {
    const filesWithDbInfo = await Promise.all(fileDataPromises);
    return filesWithDbInfo;
  } catch (error) {
    console.error('Error reading from database:', error);
    return [];
  }
});


ipcMain.handle('openDialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (!result.canceled) {
    const folderPath = result.filePaths[0];
    let folderContents = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(item => item.isDirectory())
    .map(dir => {
      const subFolderPath = path.join(folderPath, dir.name);

      // 计算该子目录下的 PDF 文件数量
      const pdfCount = fs.readdirSync(subFolderPath)
        .filter(file => file.endsWith('.pdf')).length;
  
      // 返回原始对象，并添加 pdfCount 属性
      return {
        ...dir, // 展开原有属性
        pdfCount: pdfCount, // 添加新属性
        color: '#1677FF',
      };
    });
    const config = {
      folderPath: folderPath,
      folderContents: folderContents,
      lastfolder: "",
    };
    db.update({ _id: 'folderData' }, { $set: config }, { upsert: true });
    return config;
  }
  return null;
});

ipcMain.handle('initFolder', async () => {
  return new Promise((resolve, reject) => {
    db.findOne({ _id: 'folderData' }, (err, doc) => {
      if (err) {
        console.error('Error fetching data:', err);
        reject(err);
      } else {
        resolve(doc);
      }
    });
  });
});

ipcMain.handle('openFile', async (event, filePath) => {
  shell.openPath(filePath).then(response => {
    if (response) {
      console.error('Error opening file:', response);
    }
  });
});
ipcMain.handle('deleteFile', async (event, filePath) => {
  console.log(filePath, 'ipcdelete');
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

ipcMain.handle('uploadFile', (event, { fileName, sourcePath, destinationPath }) => {
  fs.cp(sourcePath, path.join(destinationPath, fileName), (err) => {
    if (err) {
      console.error('File copy failed:', err);
      return false;
    } else {
      console.log('File copied successfully');
      return true;
    }
  });
});
<<<<<<< HEAD
ipcMain.handle('addFolder', async (event, folderName) => {
  const new_path = path.join(folderName, "新建类别");
  try {
  const state = fs.mkdirSync(new_path)
  } catch (err) {
    return { error: `无法创建文件夹: ${err.message}` };
  }
  result = fs.readdirSync(folderName, { withFileTypes: true })
    .filter(item => item.isDirectory());
  return result;
=======
ipcMain.handle('addFolder', async (event, rootFolder, categoryName, categoryColor) => {
  const new_path = path.join(rootFolder, categoryName);
  fs.mkdirSync(new_path, { recursive: true });

  console.log('Folder created successfully');

  // 获取当前的 folderContents
  const currentData = await new Promise((resolve, reject) => {
    db.findOne({ _id: 'folderData' }).exec((err, doc) => {
      if (err) {
        reject(err);
      } else {
        resolve(doc);
      }
    });
  });

  // 创建新文件夹的对象
  const newFolder = {
    name: categoryName,
    path:rootFolder,
    pdfCount: 0, // 新创建的文件夹初始 PDF 数量为 0
    color: categoryColor || '#1677FF' // 使用指定的颜色或默认颜色
  };

  // 如果已有 folderContents，则追加新文件夹，否则创建新数组
  const updatedFolderContents = currentData && currentData.folderContents
    ? [...currentData.folderContents, newFolder]
    : [newFolder];

  // 更新数据库记录
  await db.update({ _id: 'folderData' }, { $set: { folderContents: updatedFolderContents } }, { upsert: true });

  // 返回更新后的文件夹列表
  return updatedFolderContents;
>>>>>>> origin/master
});

ipcMain.handle('deleteFolder', async (event, directory) => {
  fs.rmdirSync(directory, { recursive: true });
  const currentData = await new Promise((resolve, reject) => {
    db.findOne({ _id: 'folderData' }).exec((err, doc) => {
      if (err) {
        reject(err);
      } else {
        resolve(doc);
      }
    });
  });
  if (currentData && currentData.folderContents) {
    // 获取要删除的文件夹名称（假设 directory 是完整路径）
    const folderNameToDelete = path.basename(directory);

    // 过滤掉名字匹配的项
    const updatedFolderContents = currentData.folderContents.filter(item => item.name !== folderNameToDelete);
    console.log(updatedFolderContents, 'updatedFolderContents',folderNameToDelete,currentData);
    // 更新数据库记录
    const result = await db.update({ _id: 'folderData' }, { $set: { folderContents: updatedFolderContents } }, {});
  }
});
ipcMain.handle('renameFolder', async (event, { src, des }) => {
  state = fs.renameSync(src, des)
  console.log('Folder rename successfully');
  result = fs.readdirSync(path.dirname(src), { withFileTypes: true })
    .filter(item => item.isDirectory());
  db.update({ _id: 'folderData' }, { $set: { folderContents: result } }, { upsert: true });
  db.update({ _id: 'folderData' }, { $set: { lastfolder: des } }, { upsert: true });
  return result;
});

ipcMain.handle('openFileDirectory', async (event, directory) => {
  shell.showItemInFolder(directory);
});

ipcMain.handle('readpdf', async (event, directory) => {
  fileNameWithExt = path.basename(directory)
  const ext = path.extname(directory);
  // 去除扩展名，得到文件名
  const fileNameWithoutExt = fileNameWithExt.replace(ext, '');
  try {
    if (isArxivFileName(fileNameWithoutExt)) {
      const link = 'http://export.arxiv.org/api/query?search_query=' + fileNameWithoutExt
      const response = await axios.get(link);
      const data = response.data;
      // 使用 xml2js 解析 XML 数据
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(data);
      const entry = result.feed.entry[0];
      const published = entry.published[0];
      // 转换日期格式
      const publishedDate = new Date(published);
      const formattedDate = `${publishedDate.getFullYear()}-${String(publishedDate.getMonth() + 1).padStart(2, '0')}`;
      const title = entry.title[0];
      var authors = entry.author.map(author => author.name[0]);
      authors = authors.join(', ');
      const summary = entry.summary[0];
      const file = {
        path: directory,
        name: fileNameWithExt,
        key: directory,
        filename: fileNameWithoutExt,
        title: title.replace(/\n/g, ''),
        authors: authors,
        summary: summary.replace(/\n/g, ''),
        year: formattedDate,
        journal: 'arXiv',
      }; // 返回解析后的信息
      db.update({ _id: file.path }, file, { upsert: true }, (err) => {
        if (err) {
          console.log('Error updating file in DB:', err);
        }
      });
      return file;
    }
    else {
      const link = 'https://api.crossref.org/works?query=' + fileNameWithoutExt
      const response = await axios.get(link);
      const data = response.data.message.items[0]
      const title = data.title[0]; // 提取标题
      const author_list = data.author.map(author => {
        return author.given + " " + author.family;
      });
      const authors = author_list.join(", "); // 提取作者
      const file = {
        path: directory,
        name: fileNameWithExt,
        key: directory,
        filename: fileNameWithoutExt,
        title: title.replace(/\n/g, ''),
        authors: authors,
        summary: '',
        year: '',
        journal: 'crossref',
      };
      db.update({ _id: file.path }, file, { upsert: true }, (err) => {
        if (err) {
          console.log('Error updating file in DB:', err);
        }
      });
      return file;
    }
  } catch (error) {
    console.error('Error fetching data from arXiv:', error);
    return null;
  }
});