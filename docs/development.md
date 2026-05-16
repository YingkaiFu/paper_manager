# Development

## Prerequisites

- **Node.js** **18+** (LTS or current; matches `package.json` `engines`).
- **npm** 9+.

### Windows: `EBUSY` / `default_app.asar` during `npm install`

If installation fails while **renaming** Electron’s `default_app.asar`, another process still has the file open (often a running **Electron** instance, a **Node** process, or occasionally **Explorer** preview / indexing).

1. Quit any running **Paper Manager** / Electron dev instances.
2. In Task Manager, end stray **`Electron`** / **`node`** processes.
3. Delete `node_modules\electron` (or the whole `node_modules` folder), then run `npm install` again.
4. As a last resort, sign out or restart Windows to release the file lock.

## Install

```bash
git clone https://github.com/YingkaiFu/paper_manager.git
cd paper_manager
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts **Vite** on port **5173** and launches **Electron** against the dev server (`concurrently` + `wait-on`). |
| `npm start` | Vite dev server only (browser can open the app, but **IPC will not work** outside Electron). |
| `npm run build` | Production bundle of the renderer into `build/`. |
| `npm run preview` | Serves the production build locally (still no Electron IPC unless you wire a browser mock). |
| `npm run builder` | Runs **electron-builder** after you have produced `build/` (CI runs `npm run build` first). |

## Electron vs browser

The UI is built with React, but features such as opening PDFs, scanning folders, and NeDB access require **Electron**. Use `npm run dev` for full functionality.

## Packaging notes

- `package.json` → `build.files` includes `build/**/*`, `main.js`, and `preload.js`.
- Windows NSIS target is configured with `win.icon` pointing at `assets/icons/logo.ico`.
- If you add custom installer assets, place them under `installer/` (see `build.directories.buildResources`).

## Troubleshooting

- **Blank window in dev** — ensure port `5173` is free; Vite is started with `strictPort: true`.
- **Metadata fetch failures** — Crossref results are heuristic; arXiv requires filenames matching `NNNN.NNNNN` (optional `vN` version suffix).
- **Stale NeDB data** — the database file lives under the OS user data directory (`app.getPath("userData")` / `files.db`).
