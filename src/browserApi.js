/**
 * Temporary browser shim for window.electronAPI (File System Access API + localStorage).
 * Used when the app runs via Vite without Electron.
 */

/** @type {AbortController | null} */
let readPdfAbortController = null;
const META_STORAGE_KEY = "paper-manager-browser-metadata";
const FAVORITES_STORAGE_KEY = "paper-manager-browser-favorites";
const FOLDER_STORAGE_KEY = "paper-manager-browser-folder";
const IDB_NAME = "paper-manager-browser";
const IDB_STORE = "handles";
const ARXIV_PROBE_ID = "2312.07540";

/** @type {FileSystemDirectoryHandle | null} */
let rootHandle = null;
/** @type {string | null} */
let rootPath = null;
/** @type {Map<string, FileSystemDirectoryHandle>} */
const dirHandleMap = new Map();
/** @type {Map<string, FileSystemFileHandle>} */
const fileHandleMap = new Map();

function joinPath(...parts) {
  return parts
    .filter(Boolean)
    .join("\\")
    .replace(/[/\\]+/g, "\\");
}

function basename(p) {
  const s = String(p || "").replace(/[/\\]+$/, "");
  const i = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
  return i >= 0 ? s.slice(i + 1) : s;
}

function dirname(p) {
  const s = String(p || "").replace(/[/\\]+$/, "");
  const i = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
  return i >= 0 ? s.slice(0, i) : "";
}

function extname(p) {
  const base = basename(p);
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i) : "";
}

function normPath(p) {
  return String(p || "").replace(/\//g, "\\");
}

function isUnderRoot(root, target) {
  const r = normPath(root).replace(/\\+$/, "").toLowerCase();
  const t = normPath(target).replace(/\\+$/, "").toLowerCase();
  return t === r || t.startsWith(r + "\\");
}

function invalidFsName(name) {
  if (!name || typeof name !== "string") return "Empty name";
  const t = name.trim();
  if (!t) return "Empty name";
  if (t === "." || t === "..") return "Invalid name";
  if (/[<>:"/\\|?*\x00-\x1f]/.test(t)) return "Name contains illegal characters";
  return null;
}

function loadMetaStore() {
  try {
    return JSON.parse(localStorage.getItem(META_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMetaStore(store) {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(store));
}

function loadFolderData() {
  try {
    return JSON.parse(localStorage.getItem(FOLDER_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveFolderData(data) {
  localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(data));
}

function loadFavoritePaths() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavoritePaths(paths) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(paths));
}

function migrateFavoritePathInStore(oldPath, newPath) {
  const paths = loadFavoritePaths();
  const idx = paths.indexOf(oldPath);
  if (idx < 0) return paths;
  paths[idx] = newPath;
  saveFavoritePaths(paths);
  return paths;
}

function removeFavoritePathFromStore(filePath) {
  const paths = loadFavoritePaths();
  const next = paths.filter((p) => p !== filePath);
  if (next.length !== paths.length) saveFavoritePaths(next);
  return next;
}

function removeFavoritesUnderDirFromStore(dirPath) {
  const paths = loadFavoritePaths();
  const base = normPath(dirPath).replace(/\\+$/, "").toLowerCase() + "\\";
  const next = paths.filter((p) => {
    const abs = normPath(p).replace(/\\+$/, "").toLowerCase();
    const dir = normPath(dirPath).replace(/\\+$/, "").toLowerCase();
    return abs !== dir && !abs.startsWith(base);
  });
  if (next.length !== paths.length) saveFavoritePaths(next);
  return next;
}

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function persistRootHandle(handle) {
  const db = await openIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(handle, "root");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadPersistedRootHandle() {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get("root");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function ensureWritePermission(handle) {
  if (!handle) return false;
  let perm = await handle.queryPermission({ mode: "readwrite" });
  if (perm === "granted") return true;
  perm = await handle.requestPermission({ mode: "readwrite" });
  return perm === "granted";
}

function formatAddedAt(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getAddedAtFromHandle(filePath) {
  const handle = fileHandleMap.get(normPath(filePath));
  if (!handle) return formatAddedAt(new Date());
  try {
    const file = await handle.getFile();
    return formatAddedAt(new Date(file.lastModified));
  } catch {
    return formatAddedAt(new Date());
  }
}

async function resolveFileRowWithAddedAt(fullPath, doc) {
  const row = fileRowFromPath(fullPath, doc);
  if (row.addedAt) return row;
  row.addedAt = await getAddedAtFromHandle(fullPath);
  persistFileMetadata(row);
  return row;
}

function stampNewFileAddedAt(destPath) {
  const meta = loadMetaStore();
  const existing = meta[destPath] || null;
  const row = fileRowFromPath(destPath, existing);
  if (row.addedAt) return row;
  row.addedAt = formatAddedAt(new Date());
  persistFileMetadata(row);
  return row;
}

function fileRowFromPath(fullPath, doc) {
  const name = basename(fullPath);
  const stem = name.replace(/\.pdf$/i, "");
  const base = {
    key: fullPath,
    path: fullPath,
    originalname: basename(fullPath),
    name: basename(fullPath),
    filename: stem,
    title: stem,
    authors: "",
    year: "",
    journal: "",
    summary: "",
    updatedFlag: false,
    addedAt: "",
  };
  if (!doc) return base;
  const { _id, ...rest } = doc;
  return { ...base, ...rest, key: fullPath, path: fullPath };
}

async function walkDirectory(dirHandle, currentPath, treeNodes, pdfPaths) {
  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) {
    entries.push({ name, handle });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const { name, handle: entry } of entries) {
    const fullPath = joinPath(currentPath, name);
    if (entry.kind === "directory") {
      dirHandleMap.set(fullPath, entry);
      const children = [];
      await walkDirectory(entry, fullPath, children, pdfPaths);
      treeNodes.push({
        title: name,
        key: fullPath,
        selectable: true,
        children,
      });
    } else if (entry.kind === "file" && name.toLowerCase().endsWith(".pdf")) {
      fileHandleMap.set(fullPath, entry);
      treeNodes.push({ title: name, key: fullPath, isLeaf: true });
      pdfPaths.push(fullPath);
    }
  }
}

async function scanLibraryFromHandle(handle, folderData) {
  rootHandle = handle;
  rootPath = handle.name;
  dirHandleMap.clear();
  fileHandleMap.clear();
  dirHandleMap.set(rootPath, handle);

  const treeData = [];
  const pdfPaths = [];
  await walkDirectory(handle, rootPath, treeData, pdfPaths);

  const meta = loadMetaStore();
  const files = await Promise.all(
    pdfPaths.map((p) => resolveFileRowWithAddedAt(p, meta[p] || null))
  );

  return {
    rootPath,
    treeData,
    files,
    lastUploadDir: folderData?.lastUploadDir || rootPath,
  };
}

function getDirHandle(dirPath) {
  const key = normPath(dirPath);
  if (key === normPath(rootPath)) return rootHandle;
  return dirHandleMap.get(key) || null;
}

async function resolveDirHandle(dirPath) {
  const hit = getDirHandle(dirPath);
  if (hit) return hit;
  return null;
}

function isArxivFileName(fileName) {
  return /^\d{4}\.\d{4,5}(v\d+)?$/i.test(String(fileName || "").trim());
}

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
  return String(value).replace(/\s+/g, " ").trim();
}

function formatArxivPublished(published) {
  if (!published) return "";
  const d = new Date(published);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseArxivAuthorsFromEntry(entry) {
  const authorEls = entry.getElementsByTagName("author");
  return [...authorEls]
    .map((a) => normalizeArxivText(a.getElementsByTagName("name")[0]?.textContent))
    .filter(Boolean)
    .join(", ");
}

function parseArxivEntryXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) return null;
  const entry = doc.getElementsByTagName("entry")[0];
  if (!entry) return null;
  const title = normalizeArxivText(entry.getElementsByTagName("title")[0]?.textContent);
  const summary = normalizeArxivText(entry.getElementsByTagName("summary")[0]?.textContent);
  const published = normalizeArxivText(
    entry.getElementsByTagName("published")[0]?.textContent
  );
  if (!title && !summary) return null;
  return {
    title,
    summary,
    published,
    authors: parseArxivAuthorsFromEntry(entry),
  };
}

/** arXiv blocks browser CORS — route through Vite dev proxy. */
async function proxyFetch(url, signal) {
  const response = await fetch(`/__browser_proxy?url=${encodeURIComponent(url)}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response;
}

async function fetchArxivEntryByIds(ids, signal) {
  for (const id of ids) {
    if (signal?.aborted) return null;
    const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
    let response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/atom+xml, application/xml, text/xml, */*" },
        signal,
      });
      if (!response.ok) response = null;
    } catch (e) {
      if (signal?.aborted || e.name === "AbortError") return null;
      response = null;
    }
    if (!response) {
      try {
        response = await proxyFetch(url, signal);
      } catch (e) {
        if (signal?.aborted || e.name === "AbortError") return null;
        continue;
      }
    }
    const xml = await response.text();
    const parsed = parseArxivEntryXml(xml);
    if (parsed) return parsed;
  }
  return null;
}

function buildArxivFileRow(filePath, stem, entry) {
  const fileNameWithExt = basename(filePath);
  const title = entry.title || stem;
  return {
    path: filePath,
    name: fileNameWithExt,
    originalname: fileNameWithExt,
    key: filePath,
    updatedFlag: true,
    filename: stem,
    title,
    authors: entry.authors || "",
    summary: entry.summary || "",
    year: formatArxivPublished(entry.published),
    journal: "arXiv",
  };
}

function persistFileMetadata(file) {
  const store = loadMetaStore();
  store[file.path] = { ...file, _id: file.path };
  saveMetaStore(store);
  return true;
}

function sanitizeDownloadFileName(name) {
  const raw = String(name || "download.pdf").trim() || "download.pdf";
  const base = basename(raw);
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

async function uniqueDestPath(dirHandle, fileName) {
  let destName = fileName;
  let n = 0;
  while (true) {
    try {
      await dirHandle.getFileHandle(destName, { create: false });
      n += 1;
      const ext = extname(fileName);
      const stem = basename(fileName, ext);
      destName = `${stem}_${n}${ext}`;
    } catch {
      return destName;
    }
  }
}

export const browserApi = {
  async openDialog() {
    if (!window.showDirectoryPicker) {
      throw new Error(
        "This browser does not support folder access. Use Chrome or Edge."
      );
    }
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    if (!(await ensureWritePermission(handle))) {
      return null;
    }
    await persistRootHandle(handle);
    const folderData = { rootPath: handle.name, lastUploadDir: handle.name };
    saveFolderData(folderData);
    const result = await scanLibraryFromHandle(handle, folderData);
    return result;
  },

  async refreshLibrary(pathArg) {
    if (!rootHandle || !rootPath) {
      return { treeData: [], files: [] };
    }
    if (pathArg && normPath(pathArg) !== normPath(rootPath)) {
      return { treeData: [], files: [] };
    }
    if (!(await ensureWritePermission(rootHandle))) {
      return { treeData: [], files: [] };
    }
    return scanLibraryFromHandle(rootHandle, loadFolderData());
  },

  async initFolder() {
    if (!window.showDirectoryPicker) return null;
    const handle = await loadPersistedRootHandle();
    if (!handle) return null;
    if (!(await ensureWritePermission(handle))) return null;
    const folderData = loadFolderData();
    return scanLibraryFromHandle(handle, folderData);
  },

  async setLastUploadDir(dirPath) {
    const data = loadFolderData() || { rootPath: rootPath || dirPath };
    data.lastUploadDir = dirPath;
    saveFolderData(data);
    return true;
  },

  async openFile(filePath) {
    const handle = fileHandleMap.get(normPath(filePath));
    if (!handle) return;
    const file = await handle.getFile();
    const url = URL.createObjectURL(file);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  async readPdfBytes(filePath) {
    const handle = fileHandleMap.get(normPath(filePath));
    if (!handle) {
      return { ok: false, error: "File not found in library" };
    }
    try {
      const file = await handle.getFile();
      const head = await file.slice(0, 5).text();
      if (head !== "%PDF-") {
        return { ok: false, error: "Not a PDF file" };
      }
      return { ok: true, encoding: "bloburl", url: URL.createObjectURL(file) };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  async deleteFile(filePath) {
    const p = normPath(filePath);
    const parentPath = dirname(p);
    const parent = await resolveDirHandle(parentPath);
    if (!parent) return false;
    try {
      await parent.removeEntry(basename(p));
      const store = loadMetaStore();
      delete store[p];
      saveMetaStore(store);
      removeFavoritePathFromStore(p);
      fileHandleMap.delete(p);
      return true;
    } catch (e) {
      console.error("deleteFile:", e);
      return false;
    }
  },

  async uploadFile(fileName, sourcePathOrFile, destinationPath) {
    const destDir = await resolveDirHandle(destinationPath);
    if (!destDir) return { ok: false, error: "Destination folder not found" };

    try {
      let blob;
      if (sourcePathOrFile instanceof Blob) {
        blob = sourcePathOrFile;
      } else if (typeof sourcePathOrFile === "string") {
        const src = fileHandleMap.get(normPath(sourcePathOrFile));
        if (!src) return { ok: false, error: "Source file not found" };
        blob = await src.getFile();
      } else {
        return { ok: false, error: "Invalid source" };
      }

      const safeName = sanitizeDownloadFileName(fileName || blob.name || "upload.pdf");
      const finalName = await uniqueDestPath(destDir, safeName);
      const destHandle = await destDir.getFileHandle(finalName, { create: true });
      const writable = await destHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      const destPath = joinPath(normPath(destinationPath), finalName);
      fileHandleMap.set(destPath, destHandle);
      stampNewFileAddedAt(destPath);
      return { ok: true, destPath };
    } catch (e) {
      console.error("uploadFile:", e);
      return { ok: false, error: e.message || String(e) };
    }
  },

  async downloadPdfFromUrl({ rootPath: libRoot, destinationDir, url }) {
    if (!libRoot || !destinationDir || !url) {
      return { ok: false, error: "Missing arguments" };
    }
    if (!isUnderRoot(libRoot, destinationDir)) {
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

    const destDir = await resolveDirHandle(destinationDir);
    if (!destDir) return { ok: false, error: "Destination folder not found" };

    try {
      const proxyUrl = `/__browser_proxy?url=${encodeURIComponent(parsed.href)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        return { ok: false, error: `Download failed (${response.status})` };
      }
      const buf = new Uint8Array(await response.arrayBuffer());
      const head = new TextDecoder().decode(buf.slice(0, 5));
      if (buf.length < 5 || head !== "%PDF-") {
        return { ok: false, error: "Response is not a PDF file" };
      }

      let fileName = parseFilenameFromContentDisposition(
        response.headers.get("content-disposition")
      );
      if (fileName) fileName = sanitizeDownloadFileName(fileName);
      if (!fileName) {
        const seg = basename(parsed.pathname || "");
        if (seg && /\.pdf$/i.test(seg)) fileName = sanitizeDownloadFileName(seg);
      }
      if (!fileName || !fileName.toLowerCase().endsWith(".pdf")) {
        fileName = "download.pdf";
      }

      const finalName = await uniqueDestPath(destDir, fileName);
      const destHandle = await destDir.getFileHandle(finalName, { create: true });
      const writable = await destHandle.createWritable();
      await writable.write(buf);
      await writable.close();

      const destPath = joinPath(normPath(destinationDir), finalName);
      fileHandleMap.set(destPath, destHandle);
      if (!isUnderRoot(libRoot, destPath)) {
        await destDir.removeEntry(finalName);
        return { ok: false, error: "Invalid target path" };
      }
      stampNewFileAddedAt(destPath);
      return { ok: true, destPath };
    } catch (e) {
      console.error("downloadPdfFromUrl:", e);
      return { ok: false, error: e.message || String(e) };
    }
  },

  async readPdf(filePath) {
    readPdfAbortController?.abort();
    const controller = new AbortController();
    readPdfAbortController = controller;
    const { signal } = controller;

    const p = normPath(filePath);
    const stem = basename(p, extname(p));
    try {
      const arxivIds = collectArxivIdsFromStem(stem);
      if (arxivIds.length > 0) {
        const entry = await fetchArxivEntryByIds(arxivIds, signal);
        if (signal.aborted) {
          return { ok: false, error: "Cancelled", cancelled: true };
        }
        if (!entry) {
          return {
            ok: false,
            error: `No arXiv metadata for id(s): ${arxivIds.join(", ")}`,
          };
        }
        const file = buildArxivFileRow(p, stem, entry);
        persistFileMetadata(file);
        return { ok: true, file };
      }

      const url = `https://api.crossref.org/works?query=${encodeURIComponent(stem)}`;
      const response = await fetch(url, { signal });
      if (signal.aborted) {
        return { ok: false, error: "Cancelled", cancelled: true };
      }
      if (!response.ok) {
        return { ok: false, error: "Crossref request failed" };
      }
      const data = await response.json();
      const items = data?.message?.items;
      if (!items?.length) {
        return { ok: false, error: "No Crossref results for this filename" };
      }

      const item = items[0];
      const title = (item.title && item.title[0]) || stem;
      let authors = "";
      if (Array.isArray(item.author)) {
        authors = item.author
          .map((author) => {
            const given = author.given || "";
            const family = author.family || "";
            return `${given} ${family}`.trim();
          })
          .filter(Boolean)
          .join(", ");
      }

      const file = {
        path: p,
        name: basename(p),
        originalname: basename(p),
        key: p,
        filename: stem,
        title: String(title).replace(/\n/g, ""),
        authors,
        updatedFlag: true,
        summary: "",
        year: "",
        journal: "crossref",
      };
      persistFileMetadata(file);
      return { ok: true, file };
    } catch (error) {
      if (signal.aborted || error.name === "AbortError") {
        return { ok: false, error: "Cancelled", cancelled: true };
      }
      console.error("readPdf:", error);
      return { ok: false, error: error.message || String(error) };
    } finally {
      if (readPdfAbortController === controller) {
        readPdfAbortController = null;
      }
    }
  },

  cancelReadPdf() {
    readPdfAbortController?.abort();
    readPdfAbortController = null;
  },

  async checkArxivConnection() {
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
  },

  async getFavorites() {
    return loadFavoritePaths();
  },

  async toggleFavorite(filePath) {
    if (!filePath || typeof filePath !== "string") {
      return { paths: loadFavoritePaths(), favorited: false };
    }
    const paths = loadFavoritePaths();
    const idx = paths.indexOf(filePath);
    if (idx >= 0) {
      paths.splice(idx, 1);
      saveFavoritePaths(paths);
      return { paths, favorited: false };
    }
    paths.push(filePath);
    saveFavoritePaths(paths);
    return { paths, favorited: true };
  },

  async saveFileMetadata(file) {
    if (!file?.path) return false;
    return persistFileMetadata(file);
  },

  async openFileDirectory() {
    console.info("Reveal in folder is not available in browser mode.");
  },

  async createFolder({ rootPath: libRoot, parentPath, name }) {
    const err = invalidFsName(name);
    if (err) return { ok: false, error: err };
    if (!isUnderRoot(libRoot, parentPath)) {
      return { ok: false, error: "Invalid parent" };
    }
    const parent = await resolveDirHandle(parentPath);
    if (!parent) return { ok: false, error: "Parent folder not found" };
    try {
      await parent.getDirectoryHandle(name.trim(), { create: false });
      return { ok: false, error: "Already exists" };
    } catch {
      /* does not exist — ok */
    }
    try {
      const created = await parent.getDirectoryHandle(name.trim(), { create: true });
      const createdPath = joinPath(normPath(parentPath), name.trim());
      dirHandleMap.set(createdPath, created);
      return { ok: true, createdPath };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  async moveEntry({ rootPath: libRoot, sourcePath, destinationDir }) {
    if (!libRoot || !sourcePath || !destinationDir) {
      return { ok: false, error: "Missing arguments" };
    }
    const src = normPath(sourcePath);
    const dstDirPath = normPath(destinationDir);
    if (!isUnderRoot(libRoot, src) || !isUnderRoot(libRoot, dstDirPath)) {
      return { ok: false, error: "Outside library root" };
    }
    if (normPath(libRoot) === src) {
      return { ok: false, error: "Cannot move library root" };
    }

    const destDir = await resolveDirHandle(dstDirPath);
    if (!destDir) return { ok: false, error: "Destination folder not found" };

    const fileHandle = fileHandleMap.get(src);
    const dirHandle = dirHandleMap.get(src);
    const handle = fileHandle || dirHandle;
    if (!handle?.move) {
      return { ok: false, error: "Move not supported in this browser" };
    }

    const newName = basename(src);
    const newPath = joinPath(dstDirPath, newName);
    if (normPath(newPath) === src) {
      return { ok: false, error: "Already in this folder" };
    }

    try {
      await handle.move(destDir, newName);
      const meta = loadMetaStore();
      if (meta[src]) {
        meta[newPath] = { ...meta[src], path: newPath, key: newPath, _id: newPath };
        delete meta[src];
        saveMetaStore(meta);
      }
      migrateFavoritePathInStore(src, newPath);
      await scanLibraryFromHandle(rootHandle, loadFolderData());
      return { ok: true, newPath };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  async renameEntry({ rootPath: libRoot, oldPath, newBaseName }) {
    const why = invalidFsName(newBaseName);
    if (why) return { ok: false, error: why };
    if (!isUnderRoot(libRoot, oldPath)) {
      return { ok: false, error: "Invalid path" };
    }
    if (normPath(oldPath) === normPath(libRoot)) {
      return { ok: false, error: "Cannot rename library root" };
    }

    const src = normPath(oldPath);
    const parentPath = dirname(src);
    const parent = await resolveDirHandle(parentPath);
    if (!parent) return { ok: false, error: "Parent folder not found" };

    const trimmed = newBaseName.trim();
    const newPath = joinPath(parentPath, trimmed);

    const fileHandle = fileHandleMap.get(src);
    const dirHandle = dirHandleMap.get(src);
    const handle = fileHandle || dirHandle;
    if (!handle?.move) {
      return { ok: false, error: "Rename not supported in this browser" };
    }

    try {
      await handle.move(parent, trimmed);
      const meta = loadMetaStore();
      if (meta[src]) {
        meta[newPath] = { ...meta[src], path: newPath, key: newPath, _id: newPath };
        delete meta[src];
        saveMetaStore(meta);
      }
      migrateFavoritePathInStore(src, newPath);
      await scanLibraryFromHandle(rootHandle, loadFolderData());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  async deleteEntry({ rootPath: libRoot, targetPath }) {
    if (!isUnderRoot(libRoot, targetPath)) {
      return { ok: false, error: "Invalid path" };
    }
    if (normPath(targetPath) === normPath(libRoot)) {
      return { ok: false, error: "Cannot delete library root" };
    }

    const p = normPath(targetPath);
    const parentPath = dirname(p);
    const parent = await resolveDirHandle(parentPath);
    if (!parent) return { ok: false, error: "Parent folder not found" };

    const isDir = dirHandleMap.has(p);
    try {
      await parent.removeEntry(basename(p), { recursive: isDir });
      const meta = loadMetaStore();
      const prefix = p.toLowerCase() + "\\";
      for (const key of Object.keys(meta)) {
        const k = normPath(key).toLowerCase();
        if (k === p.toLowerCase() || k.startsWith(prefix)) {
          delete meta[key];
        }
      }
      saveMetaStore(meta);
      if (isDir) {
        removeFavoritesUnderDirFromStore(p);
      } else {
        removeFavoritePathFromStore(p);
      }
      await scanLibraryFromHandle(rootHandle, loadFolderData());
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },
};

export function installBrowserApi() {
  if (typeof window !== "undefined" && !window.electronAPI) {
    window.electronAPI = browserApi;
    window.__PAPER_MANAGER_BROWSER_MODE__ = true;
  }
}
