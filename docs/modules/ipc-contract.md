# IPC contract

All channels use `ipcRenderer.invoke` from the preload script and `ipcMain.handle` in the main process. Responses are **Promises** unless noted.

| Channel | Arguments | Return / behavior |
|---------|-------------|-------------------|
| `openDialog` | — | `null` if cancelled. Else `{ rootPath, treeData, files }` — recursive PDF tree (Ant Design `Tree` nodes) and flat `FileRow[]` merged with NeDB. Persists `folderData.rootPath` and `lastUploadDir`. |
| `refreshLibrary` | `rootPath: string` | Same shape as `openDialog` payload: `{ treeData, files }` after rescanning disk. |
| `initFolder` | — | `null` if nothing saved or path missing. Else `{ rootPath, lastUploadDir, treeData, files }`. Migrates legacy `folderPath` → `rootPath` when present. |
| `setLastUploadDir` | `dirPath: string` | Persists `lastUploadDir` in `folderData`. Returns `true`. |
| `openFile` | `filePath: string` | Opens default application for the PDF. |
| `deleteFile` | `filePath: string` | `boolean` — deletes the file from disk and removes its NeDB row. |
| `uploadFile` | `{ fileName, sourcePath, destinationPath }` | `{ ok: boolean, destPath?: string, error?: string }` — copies into `destinationPath` (mkdir `-p` style). `destPath` is the saved PDF path. |
| `downloadPdfFromUrl` | `{ rootPath, destinationDir, url }` | `{ ok: boolean, destPath?: string, error?: string }` — HTTP(S) GET, must be a PDF (`%PDF-` magic). Writes under `destinationDir` (must stay under `rootPath`). Picks filename from `Content-Disposition` or URL path; avoids collisions with `_n` suffix. |
| `openFileDirectory` | `path: string` | If `path` is a **directory**, opens it in the system file manager (`shell.openPath`). If it is a **file**, reveals it in the parent folder (`shell.showItemInFolder`). |
| `createFolder` | `{ rootPath, parentPath, name }` | `{ ok: boolean, error?: string, createdPath?: string }` — creates one directory under `parentPath` (must stay under `rootPath`). On success, `createdPath` is the new folder’s absolute path. |
| `renameEntry` | `{ rootPath, oldPath, newBaseName }` | `{ ok: boolean, error?: string }` — renames file or folder (basename only); cannot rename the library root. PDFs and subtree paths are migrated in NeDB after renames. |
| `deleteEntry` | `{ rootPath, targetPath }` | `{ ok: boolean, error?: string }` — deletes file or directory recursively; cannot delete the library root. Removes affected PDF rows from NeDB. |
| `moveEntry` | `{ rootPath, sourcePath, destinationDir }` | `{ ok: boolean, error?: string, newPath?: string }` — moves a file or folder into `destinationDir` (same basename). Updates NeDB for PDFs / subtrees. Cannot move library root, into self, or into a descendant of a moved folder. |
| `readPdf` | `filePath: string` | `{ ok: boolean, file?: FileRow, error?: string }` — arXiv ids (strict or embedded in stem) use **HTTPS** `export.arxiv.org` `id_list=`; others query Crossref. Persists to NeDB on success. |
| `checkArxivConnection` | — | `{ ok: boolean, latencyMs: number, probeId: string, error?: string }` — GET probe entry `2312.07540` from export API (connectivity test). |
| `saveFileMetadata` | `file: FileRow` | Persists edited fields to NeDB (`$set`). Returns `boolean`. |

### `FileRow` (conceptual)

Built from disk + NeDB merge:

- `path`, `key` — absolute path to the PDF.
- `originalname`, `name` — filename with extension.
- `filename` — stem (no extension); used for arXiv / Crossref detection.
- `title`, `authors`, `year`, `journal`, `summary`, `updatedFlag` — metadata fields.

See [main-process.md](./main-process.md) and [pdf-library-tree.md](./pdf-library-tree.md).
