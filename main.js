const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { writeFile, readFileSync } = require('fs');
const { execFile } = require('child_process');
const isDev = require('electron-is-dev');
const { remote } = require('electron');
const fs = require('fs');
const axios = require('axios');
const xml2js = require('xml2js');
const { PDFDocument } = require('pdf-lib');
const Datastore = require('nedb');

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

const dbPath = path.join(app.getPath('userData'), 'files.db');
const db = new Datastore({ filename: dbPath, autoload: true });
module.exports = db;

const savePath = path.join(app.getPath('userData'), "data.json");
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
function createWindow() {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // resizable: false, // 禁止调整窗口大小

    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载应用的 index.html
  const urlLocation = isDev ? 'http://localhost:3000' : "dummyurl";
  const startFile = process.env.ELECTRON_START_URL || `'build/index.html')}`;
  console.log(urlLocation);
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

ipcMain.handle('listFolder', async (event, directory) => {
  const dirents = fs.readdirSync(directory, { withFileTypes: true });
  const fileDataPromises = dirents
    .filter(dirent => dirent.isFile() && path.extname(dirent.name).toLowerCase() === '.pdf')
    .map(dirent => {
      return new Promise((resolve, reject) => {
        console.log(dirent.path, dirent.name)
        db.findOne({ path: path.join(dirent.path, dirent.name) }, (err, doc) => {
          if (err) {
            reject(err);
          } else {
            const fileData = {
              ...dirent, // 文件的基本信息
              year: '',  // 添加 year 键，值为默认的空字符串
              authors: '', // 添加 author 键，值为默认的空字符串
              summary: '', // 添加 summary 键，值为默认的空字符串
              journal: '', // 添加 journal 键，值为默认的空字符串
              title: '', // 添加 title 键，值为默认的空字符串
              ...doc || {} // 数据库查询结果
            };
            console.log(fileData, "fileData");
            resolve(fileData);
          }
        });
      });
    });

  try {
    const filesWithDbInfo = await Promise.all(fileDataPromises);
    console.log(filesWithDbInfo, "filesWithDbInfo");
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
    console.log(folderPath);
    const folderContents = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(item => item.isDirectory());
    const config = {
      folderPath: folderPath,
      folderContents: folderContents
    };
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

ipcMain.handle('initFolder', async () => {
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
ipcMain.handle('addFolder', async (event, folderName) => {
  new_path = path.join(folderName, "新建类别");
  fs.mkdirSync(new_path)

  console.log('Folder created successfully');
  result = fs.readdirSync(folderName, { withFileTypes: true })
    .filter(item => item.isDirectory());
  // console.log(folderContents,folderName);
  return result;
});

ipcMain.handle('renameFolder', async (event, { src, des }) => {
  state = fs.renameSync(src, des)
  console.log('Folder rename successfully');
  result = fs.readdirSync(path.dirname(src), { withFileTypes: true })
    .filter(item => item.isDirectory());
  // console.log(folderContents,folderName);
  return result;
});

// ipcMain.handle('read_arxiv', async (event, directory) => {
//   return await new Promise((resolve, reject) => {
//     execFile('python', ['src\\utils\\read_pdfs.py', directory], (error, stdout, stderr) => {
//       if (error) {
//         console.log(error)
//         reject(error);
//       } else {
//         console.log(stdout)
//         resolve(JSON.parse(stdout));
//       }
//     });
//   });
// });
ipcMain.handle('readpdf', async (event, directory) => {
  fileNameWithExt = path.basename(directory)
  const ext = path.extname(directory);

  // 去除扩展名，得到文件名
  const fileNameWithoutExt = fileNameWithExt.replace(ext, '');
  try {
    const link = 'http://export.arxiv.org/api/query?search_query=' + fileNameWithoutExt
    const response = await axios.get(link);
    const data = response.data;
    // 使用 xml2js 解析 XML 数据
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(data);

    // 提取信息
    const entry = result.feed.entry[0];
    const published = entry.published[0];

    // 转换日期格式
    const publishedDate = new Date(published);
    const formattedDate = `${publishedDate.getFullYear()}-${String(publishedDate.getMonth() + 1).padStart(2, '0')}`;
    const title = entry.title[0];
    var authors = entry.author.map(author => author.name[0]);
    authors = authors.join(', ');
    const summary = entry.summary[0];

    // const existingPdfBytes = fs.readFileSync(directory);
    // const pdfDoc = await PDFDocument.load(existingPdfBytes);
    // pdfDoc.setAuthor(authors);
    // pdfDoc.setTitle(title);
    // const pdfBytes = await pdfDoc.save();
    // fs.writeFileSync(directory, pdfBytes);
    const file = {
      path: directory,
      name: fileNameWithExt,
      key: directory,
      filename: fileNameWithoutExt,
      title: title,
      authors: authors,
      summary: summary,
      year: formattedDate,
      journal: 'arXiv',
    }; // 返回解析后的信息
    db.update({ _id: file.path }, file, { upsert: true }, (err) => {
      if (err) {
        console.log('Error updating file in DB:', err);
      }
    });
    db.find({}, (err, files) => {
      if (err) {
        console.log('Error loading files from DB:', err);
        callback([]);
        return;
      }
      console.log(files, "file_saved");
    });
    return file;
  } catch (error) {
    console.error('Error fetching data from arXiv:', error);
    return null;
  }
});