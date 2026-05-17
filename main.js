const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const isDev = require("electron-is-dev");
const axios = require("axios");
const xml2js = require("xml2js");
const Datastore = require("nedb");
const { buildPdfTreeNodes, collectPdfPaths } = require("./libraryScan.js");

const isMac = process.platform === "darwin";

const DEV_SERVER_URL = "http://localhost:5173";

/** arXiv asks for a descriptive User-Agent with contact. */
const HTTP_UA =
  "PaperManager/0.2 (https://github.com/YingkaiFu/paper_manager; mailto:Yingkai.Fu@outlook.com)";

const axiosCommon = {
  headers: { "User-Agent": HTTP_UA },
  timeout: 45000,
};

/** Probe ID for connectivity checks (fixture paper in this repo). */
const ARXIV_PROBE_ID = "2312.07540";

function isArxivFileName(fileName) {
  return /^\d{4}\.\d{4,5}(v\d+)?$/i.test(String(fileName || "").trim());
}

/** Collect candidate arXiv ids from a PDF stem (strict name or embedded id). */
function collectArxivIdsFromStem(stem) {
  const ids = [];
  const s = String(stem || "").trim();
  if (!s) return ids;
  if (isArxivFileName(s)) ids.push(s);
  const embedded = s.match(/(\d{4}\.\d{4,5})(v\d+)?/i);
  if (embedded) {
    const base = embedded[1];
    const ver = embedded[2] || "";
    const withVer = `${base}${ver}`;
    if (!ids.includes(withVer)) ids.push(withVer);
    if (!ids.includes(base)) ids.push(base);
  }
  return ids;
}

function normalizeArxivText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "object") {
    if (typeof value._ === "string") return value._.replace(/\s+/g, " ").trim();
    if (typeof value["#text"] === "string") {
      return value["#text"].replace(/\s+/g, " ").trim();
    }
  }
  if (Array.isArray(value) && value.length) return normalizeArxivText(value[0]);
  return String(value).replace(/\s+/g, " ").trim();
}

function formatArxivPublished(published) {
  if (!published) return "";
  const d = new Date(published);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchArxivEntryByIds(ids) {
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  for (const id of ids) {
    const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
    const response = await axios.get(url, {
      ...axiosCommon,
      headers: {
        ...axiosCommon.headers,
        Accept: "application/atom+xml, application/xml, text/xml, */*",
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const result = await parser.parseStringPromise(response.data);
    const feed = result.feed || result;
    let rawEntry = feed.entry;
    if (!rawEntry) continue;
    rawEntry = Array.isArray(rawEntry) ? rawEntry[0] : rawEntry;
    const title = normalizeArxivText(rawEntry.title);
    const summary = normalizeArxivText(rawEntry.summary);
    if (rawEntry && (title || summary)) return rawEntry;
  }
  return null;
}

function buildArxivFileRow(filePath, stem, entry) {
  const fileNameWithExt = path.basename(filePath);
  const title = normalizeArxivText(entry.title) || stem;
  const summary = normalizeArxivText(entry.summary);
  const published = normalizeArxivText(entry.published);
  const file = {
    path: filePath,
    name: fileNameWithExt,
    originalname: fileNameWithExt,
    key: filePath,
    updatedFlag: true,
    filename: stem,
    title,
    authors: parseArxivAuthors(entry),
    summary,
    year: formatArxivPublished(published),
    journal: "arXiv",
  };
  return file;
}

function persistFileMetadata(file) {
  return new Promise((resolve) => {
    db.update({ _id: file.path }, { $set: file }, { upsert: true }, (err) => {
      if (err) console.error("DB update:", err);
      resolve(!err);
    });
  });
}

function fileRowFromPath(fullPath, doc) {
  const ext = path.extname(fullPath);
  const stem = path.basename(fullPath, ext);
  const base = {
    key: fullPath,
    path: fullPath,
    originalname: path.basename(fullPath),
    name: path.basename(fullPath),
    filename: stem,
    title: stem,
    authors: "",
    year: "",
    journal: "",
    summary: "",
    updatedFlag: false,
  };
  if (!doc) return base;
  const { _id, ...rest } = doc;
  return { ...base, ...rest, key: fullPath, path: fullPath };
}

function scanLibrary(db, rootPath) {
  const paths = collectPdfPaths(rootPath);
  const treeData = buildPdfTreeNodes(rootPath);
  return Promise.all(
    paths.map(
      (p) =>
        new Promise((resolve) => {
          db.findOne({ $or: [{ path: p }, { _id: p }] }, (err, doc) => {
            resolve(fileRowFromPath(p, !err && doc ? doc : null));
          });
        })
    )
  ).then((files) => ({ treeData, files }));
}

function parseArxivAuthors(entry) {
  if (!entry || !entry.author) return "";
  const raw = entry.author;
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((a) => {
      if (!a) return "";
      if (typeof a === "string") return a;
      const n = a.name;
      if (Array.isArray(n)) return String(n[0] || "").trim();
      if (typeof n === "string") return n.trim();
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

const template = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  {
    label: "File",
    submenu: [isMac ? { role: "close" } : { role: "quit" }],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
        : [{ role: "close" }]),
    ],
  },
  {
    role: "help",
    submenu: [
      {
        label: "Learn More",
        click: async () => {
          await shell.openExternal("https://electronjs.org");
        },
      },
    ],
  },
];

const dbPath = path.join(app.getPath("userData"), "files.db");
const db = new Datastore({ filename: dbPath, autoload: true });
module.exports = db;

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    icon: path.join(__dirname, "assets", "icons", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const prodIndex = path.join(__dirname, "build", "index.html");
  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(prodIndex);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("openDialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (result.canceled) return null;

  const rootPath = result.filePaths[0];
  const { treeData, files } = await scanLibrary(db, rootPath);

  await new Promise((resolve, reject) => {
    db.update(
      { _id: "folderData" },
      {
        $set: {
          rootPath,
          lastUploadDir: rootPath,
        },
      },
      { upsert: true },
      (err) => (err ? reject(err) : resolve())
    );
  });

  return { rootPath, treeData, files };
});

ipcMain.handle("refreshLibrary", async (event, rootPath) => {
  if (!rootPath || !fs.existsSync(rootPath)) {
    return { treeData: [], files: [] };
  }
  return scanLibrary(db, rootPath);
});

ipcMain.handle("initFolder", async () => {
  return new Promise((resolve, reject) => {
    db.findOne({ _id: "folderData" }, async (err, doc) => {
      if (err) {
        reject(err);
        return;
      }
      const rootPath = doc?.rootPath || doc?.folderPath;
      if (!rootPath || !fs.existsSync(rootPath)) {
        resolve(null);
        return;
      }
      if (doc && !doc.rootPath && doc.folderPath) {
        await new Promise((res, rej) => {
          db.update(
            { _id: "folderData" },
            { $set: { rootPath: doc.folderPath } },
            {},
            (e2) => (e2 ? rej(e2) : res())
          );
        }).catch(() => {});
      }
      try {
        const { treeData, files } = await scanLibrary(db, rootPath);
        resolve({
          rootPath,
          lastUploadDir: doc?.lastUploadDir || rootPath,
          treeData,
          files,
        });
      } catch (e) {
        console.error(e);
        resolve(null);
      }
    });
  });
});

ipcMain.handle("setLastUploadDir", async (event, dirPath) => {
  await new Promise((resolve, reject) => {
    db.update(
      { _id: "folderData" },
      { $set: { lastUploadDir: dirPath } },
      { upsert: true },
      (err) => (err ? reject(err) : resolve())
    );
  });
  return true;
});

ipcMain.handle("saveFileMetadata", async (event, file) => {
  if (!file?.path) return false;
  const { path: p, ...rest } = file;
  return new Promise((resolve) => {
    db.update({ _id: p }, { $set: { ...rest, path: p, key: p } }, { upsert: true }, (err) =>
      resolve(!err)
    );
  });
});

ipcMain.handle("openFile", async (event, filePath) => {
  const err = await shell.openPath(filePath);
  if (err) console.error("Error opening file:", err);
});

ipcMain.handle("deleteFile", async (event, filePath) => {
  try {
    await fsPromises.unlink(filePath);
    await new Promise((resolve) => {
      db.remove({ _id: filePath }, { multi: false }, () => resolve());
    });
    return true;
  } catch (err) {
    console.error("File delete failed:", err);
    return false;
  }
});

function isUnderRoot(rootPath, targetPath) {
  const root = path.resolve(rootPath) + path.sep;
  const abs = path.resolve(targetPath);
  const rootDir = path.resolve(rootPath);
  return abs === rootDir || abs.startsWith(root);
}

function invalidFsName(name) {
  if (!name || typeof name !== "string") return "Empty name";
  const t = name.trim();
  if (!t) return "Empty name";
  if (t === "." || t === "..") return "Invalid name";
  if (/[<>:"/\\|?*\x00-\x1f]/.test(t)) return "Name contains illegal characters";
  return null;
}

ipcMain.handle(
  "createFolder",
  async (event, { rootPath, parentPath, name }) => {
    const err = invalidFsName(name);
    if (err) return { ok: false, error: err };
    if (!isUnderRoot(rootPath, parentPath)) {
      return { ok: false, error: "Invalid parent" };
    }
    const dest = path.join(parentPath, name.trim());
    if (fs.existsSync(dest)) {
      return { ok: false, error: "Already exists" };
    }
    try {
      await fsPromises.mkdir(dest, { recursive: false });
      return { ok: true, createdPath: dest };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }
);

function migratePdfDocId(oldId, newId) {
  return new Promise((resolve) => {
    db.findOne({ _id: oldId }, (err, doc) => {
      if (err || !doc) {
        resolve();
        return;
      }
      db.remove({ _id: oldId }, {}, (e1) => {
        if (e1) {
          resolve();
          return;
        }
        const next = {
          ...doc,
          _id: newId,
          path: newId,
          key: newId,
          name: path.basename(newId),
          originalname: path.basename(newId),
        };
        db.insert(next, () => resolve());
      });
    });
  });
}

function migrateNedbAfterDirRename(oldDir, newDir) {
  const oldRes = path.resolve(oldDir);
  const oldBase = oldRes + path.sep;
  return new Promise((resolve) => {
    db.find({ _id: { $ne: "folderData" } }, (err, docs) => {
      if (err || !docs?.length) {
        resolve();
        return;
      }
      const migrations = [];
      for (const doc of docs) {
        const id = doc._id;
        if (typeof id !== "string" || !id.toLowerCase().endsWith(".pdf")) continue;
        const abs = path.resolve(id);
        if (abs !== oldRes && !abs.startsWith(oldBase)) continue;
        const rel = path.relative(oldRes, abs);
        if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
        const newId = path.join(path.resolve(newDir), rel);
        if (newId !== id) migrations.push({ oldId: id, newId });
      }
      let i = 0;
      const step = () => {
        if (i >= migrations.length) {
          resolve();
          return;
        }
        const { oldId, newId } = migrations[i++];
        migratePdfDocId(oldId, newId).then(step);
      };
      step();
    });
  });
}

ipcMain.handle(
  "moveEntry",
  async (event, { rootPath, sourcePath, destinationDir }) => {
    if (!rootPath || !sourcePath || !destinationDir) {
      return { ok: false, error: "Missing arguments" };
    }
    const src = path.resolve(sourcePath);
    const dstDir = path.resolve(destinationDir);
    if (!isUnderRoot(rootPath, src) || !isUnderRoot(rootPath, dstDir)) {
      return { ok: false, error: "Outside library root" };
    }
    if (path.resolve(rootPath) === src) {
      return { ok: false, error: "Cannot move library root" };
    }
    let dstDirStat;
    try {
      dstDirStat = await fsPromises.stat(dstDir);
    } catch {
      return { ok: false, error: "Destination folder not found" };
    }
    if (!dstDirStat.isDirectory()) {
      return { ok: false, error: "Destination is not a folder" };
    }
    let srcStat;
    try {
      srcStat = await fsPromises.stat(src);
    } catch {
      return { ok: false, error: "Source not found" };
    }
    const base = path.basename(src);
    const newPath = path.join(dstDir, base);
    if (!isUnderRoot(rootPath, newPath)) {
      return { ok: false, error: "Invalid target path" };
    }
    if (path.resolve(newPath) === src) {
      return { ok: false, error: "Already in this folder" };
    }
    if (srcStat.isDirectory()) {
      const srcLower = src + path.sep;
      const dstLower = path.resolve(dstDir);
      if (dstLower === src || dstLower.startsWith(srcLower)) {
        return { ok: false, error: "Cannot move a folder into itself" };
      }
    }
    if (fs.existsSync(newPath)) {
      return {
        ok: false,
        error: "A file or folder with that name already exists there",
      };
    }
    try {
      await fsPromises.rename(src, newPath);
      if (srcStat.isDirectory()) {
        await migrateNedbAfterDirRename(src, newPath);
      } else if (srcStat.isFile() && src.toLowerCase().endsWith(".pdf")) {
        await migratePdfDocId(src, newPath);
      }
      return { ok: true, newPath };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }
);

ipcMain.handle(
  "renameEntry",
  async (event, { rootPath, oldPath, newBaseName }) => {
    const why = invalidFsName(newBaseName);
    if (why) return { ok: false, error: why };
    if (!isUnderRoot(rootPath, oldPath)) {
      return { ok: false, error: "Invalid path" };
    }
    if (path.resolve(oldPath) === path.resolve(rootPath)) {
      return { ok: false, error: "Cannot rename library root" };
    }
    const trimmed = newBaseName.trim();
    const newPath = path.join(path.dirname(oldPath), trimmed);
    if (!isUnderRoot(rootPath, newPath)) {
      return { ok: false, error: "Invalid target path" };
    }
    if (fs.existsSync(newPath)) {
      return { ok: false, error: "Target already exists" };
    }
    try {
      const stat = await fsPromises.stat(oldPath);
      await fsPromises.rename(oldPath, newPath);
      if (stat.isDirectory()) {
        await migrateNedbAfterDirRename(oldPath, newPath);
      } else if (stat.isFile() && oldPath.toLowerCase().endsWith(".pdf")) {
        await migratePdfDocId(oldPath, newPath);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }
);

ipcMain.handle("deleteEntry", async (event, { rootPath, targetPath }) => {
  if (!isUnderRoot(rootPath, targetPath)) {
    return { ok: false, error: "Invalid path" };
  }
  if (path.resolve(targetPath) === path.resolve(rootPath)) {
    return { ok: false, error: "Cannot delete library root" };
  }
  try {
    const stat = await fsPromises.stat(targetPath);
    if (stat.isDirectory()) {
      const base = path.resolve(targetPath) + path.sep;
      await fsPromises.rm(targetPath, { recursive: true, force: true });
      await new Promise((resolve) => {
        db.find({ _id: { $ne: "folderData" } }, (err, docs) => {
          if (err || !docs?.length) {
            resolve();
            return;
          }
          let left = docs.length;
          const doneOne = () => {
            left -= 1;
            if (left <= 0) resolve();
          };
          for (const doc of docs) {
            const id = doc._id;
            if (typeof id !== "string" || !id.toLowerCase().endsWith(".pdf")) {
              doneOne();
              continue;
            }
            const abs = path.resolve(id);
            if (abs === path.resolve(targetPath) || abs.startsWith(base)) {
              db.remove({ _id: id }, {}, doneOne);
            } else {
              doneOne();
            }
          }
        });
      });
    } else {
      await fsPromises.unlink(targetPath);
      await new Promise((resolve) => {
        db.remove({ _id: targetPath }, {}, () => resolve());
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});

ipcMain.handle(
  "uploadFile",
  async (event, { fileName, sourcePath, destinationPath }) => {
    try {
      await fsPromises.mkdir(destinationPath, { recursive: true });
      const destPath = path.join(destinationPath, fileName);
      await fsPromises.cp(sourcePath, destPath);
      return { ok: true, destPath };
    } catch (err) {
      console.error("File copy failed:", err);
      return { ok: false, error: err.message || String(err) };
    }
  }
);

function sanitizeDownloadFileName(name) {
  const raw = String(name || "download.pdf").trim() || "download.pdf";
  const base = path.basename(raw);
  const cleaned = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 200);
  return cleaned || "download.pdf";
}

function parseFilenameFromContentDisposition(cd) {
  if (!cd || typeof cd !== "string") return null;
  const star = /filename\*\s*=\s*([^']*)''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[2].trim());
    } catch {
      return null;
    }
  }
  const plain = /filename\s*=\s*("?)([^";\n]+)\1/i.exec(cd);
  return plain ? plain[2].trim() : null;
}

ipcMain.handle(
  "downloadPdfFromUrl",
  async (event, { rootPath, destinationDir, url }) => {
    if (!rootPath || !destinationDir || !url || typeof url !== "string") {
      return { ok: false, error: "Missing arguments" };
    }
    if (!isUnderRoot(rootPath, destinationDir)) {
      return { ok: false, error: "Invalid destination" };
    }
    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      return { ok: false, error: "Invalid URL" };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Only http(s) URLs are allowed" };
    }
    try {
      const response = await axios.get(parsed.href, {
        ...axiosCommon,
        responseType: "arraybuffer",
        maxContentLength: 80 * 1024 * 1024,
        maxBodyLength: 80 * 1024 * 1024,
      });
      let fileName = parseFilenameFromContentDisposition(
        response.headers["content-disposition"] ||
          response.headers["Content-Disposition"]
      );
      if (fileName) fileName = sanitizeDownloadFileName(fileName);
      if (!fileName) {
        const seg = path.basename(parsed.pathname || "");
        if (seg && /\.pdf$/i.test(seg)) fileName = sanitizeDownloadFileName(seg);
      }
      if (!fileName || !fileName.toLowerCase().endsWith(".pdf")) {
        fileName = "download.pdf";
      }
      const destDir = path.resolve(destinationDir);
      await fsPromises.mkdir(destDir, { recursive: true });
      let destPath = path.join(destDir, fileName);
      let n = 0;
      while (fs.existsSync(destPath)) {
        n += 1;
        const ext = path.extname(fileName);
        const stem = path.basename(fileName, ext);
        destPath = path.join(destDir, `${stem}_${n}${ext}`);
      }
      const buf = Buffer.from(response.data);
      const head = buf.slice(0, 5).toString("ascii");
      if (buf.length < 5 || head !== "%PDF-") {
        return { ok: false, error: "Response is not a PDF file" };
      }
      await fsPromises.writeFile(destPath, buf);
      if (!isUnderRoot(rootPath, destPath)) {
        await fsPromises.unlink(destPath).catch(() => {});
        return { ok: false, error: "Invalid target path" };
      }
      return { ok: true, destPath };
    } catch (e) {
      console.error("downloadPdfFromUrl:", e);
      return { ok: false, error: e.message || String(e) };
    }
  }
);

ipcMain.handle("openFileDirectory", async (event, filePath) => {
  try {
    const stat = await fsPromises.stat(filePath);
    if (stat.isDirectory()) {
      const err = await shell.openPath(filePath);
      if (err) console.error("openPath (folder):", err);
    } else {
      shell.showItemInFolder(filePath);
    }
  } catch (e) {
    console.error("openFileDirectory failed:", e);
  }
});

ipcMain.handle("checkArxivConnection", async () => {
  const started = Date.now();
  try {
    const entry = await fetchArxivEntryByIds([ARXIV_PROBE_ID]);
    const latencyMs = Date.now() - started;
    if (!entry) {
      return {
        ok: false,
        latencyMs,
        probeId: ARXIV_PROBE_ID,
        error: "API responded but probe entry was missing",
      };
    }
    return { ok: true, latencyMs, probeId: ARXIV_PROBE_ID };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      probeId: ARXIV_PROBE_ID,
      error: error.message || String(error),
    };
  }
});

ipcMain.handle("readpdf", async (event, filePath) => {
  if (!filePath || typeof filePath !== "string") {
    return { ok: false, error: "Invalid file path" };
  }

  const fileNameWithExt = path.basename(filePath);
  const ext = path.extname(filePath);
  const stem = path.basename(fileNameWithExt, ext);

  try {
    const arxivIds = collectArxivIdsFromStem(stem);
    if (arxivIds.length > 0) {
      const entry = await fetchArxivEntryByIds(arxivIds);
      if (!entry) {
        return {
          ok: false,
          error: `No arXiv metadata for id(s): ${arxivIds.join(", ")}`,
        };
      }
      const file = buildArxivFileRow(filePath, stem, entry);
      await persistFileMetadata(file);
      return { ok: true, file };
    }

    const url = `https://api.crossref.org/works?query=${encodeURIComponent(stem)}`;
    const response = await axios.get(url, axiosCommon);
    const items = response.data?.message?.items;
    if (!items?.length) {
      return { ok: false, error: "No Crossref results for this filename" };
    }

    const data = items[0];
    const title = (data.title && data.title[0]) || stem;
    let authors = "";
    if (Array.isArray(data.author)) {
      authors = data.author
        .map((author) => {
          const given = author.given || "";
          const family = author.family || "";
          return `${given} ${family}`.trim();
        })
        .filter(Boolean)
        .join(", ");
    }

    const file = {
      path: filePath,
      name: fileNameWithExt,
      originalname: fileNameWithExt,
      key: filePath,
      filename: stem,
      title: String(title).replace(/\n/g, ""),
      authors,
      updatedFlag: true,
      summary: "",
      year: "",
      journal: "crossref",
    };

    await persistFileMetadata(file);
    return { ok: true, file };
  } catch (error) {
    console.error("readpdf:", error.message || error);
    return { ok: false, error: error.message || String(error) };
  }
});
