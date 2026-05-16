# Main process (`main.js`)

## Responsibilities

- **Application shell** — menu, `BrowserWindow`, Vite dev URL or `build/index.html`.
- **Library scan** — `libraryScan.js` builds a recursive **folder + PDF tree** (`buildPdfTreeNodes`: all subdirs plus `.pdf` leaves) and a **flat PDF path list** (`collectPdfPaths`). Used by `openDialog`, `refreshLibrary`, and `initFolder`.
- **NeDB** — `folderData` stores `rootPath`, `lastUploadDir`, and legacy `folderPath` is migrated on read.
- **Filesystem** — open/delete PDFs, copy uploads, reveal in folder.
- **Metadata (`readpdf`)** — arXiv-like filenames use **HTTPS** `https://export.arxiv.org/api/query?id_list=…` with a documented **User-Agent**; falls back to un-versioned id when needed. Other filenames query Crossref. Results upsert with `{ $set: … }`.

## Files

| File | Role |
|------|------|
| `main.js` | IPC handlers, `readpdf`, window lifecycle. |
| `libraryScan.js` | Pure Node helpers for recursive PDF discovery. |

## Electron security

`contextIsolation: true`, `nodeIntegration: false`.
