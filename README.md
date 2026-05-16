# Paper Manager

Paper Manager is a **desktop** application for researchers who want to browse **PDF papers** in a **folder tree**, search and inspect metadata, and fetch bibliographic data from **arXiv** or **Crossref**—with lightweight **NeDB** persistence in the user profile.

![License](https://img.shields.io/badge/license-GPL%203.0-blue.svg)

## Features

- **Open folder** — recursively index all PDFs under a root directory.
- **Tree navigation** — left sidebar shows folders and PDFs; filter the table by folder or jump to a single file.
- **PDF table** — sortable columns, expandable abstract, search by title.
- **Metadata** — fetch from arXiv (`id_list`, HTTPS) when the filename stem looks like an arXiv id; otherwise Crossref (best-effort).
- **File operations** — open PDF, show in folder, delete, drag-and-drop upload into the selected folder.
## Quick start

```bash
git clone https://github.com/YingkaiFu/paper_manager.git
cd paper_manager
npm install
npm run dev
```

Use **Node.js 18+** (see `engines` in `package.json`). If `npm install` fails on Windows with `EBUSY` / `default_app.asar`, follow [docs/development.md](./docs/development.md).

- **Dev**: `npm run dev` starts Vite (`http://localhost:5173`) and launches Electron.
- **Production bundle (renderer only)**: `npm run build` → output in `build/`.
- **Installer**: `npm run build && npm run builder` (Windows NSIS exe lands in `dist/`).

> Running `npm start` alone opens the Vite server in a browser; **IPC features will not work** outside Electron.

## Documentation

| Resource | Description |
|----------|-------------|
| [docs/README.md](./docs/README.md) | Documentation index (architecture, modules, IPC). |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and migration notes. |
| [docs/development.md](./docs/development.md) | Scripts, packaging, troubleshooting. |

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 27 |
| UI | React 18, Ant Design 5 |
| Bundler | Vite 6 |
| Local DB | NeDB (file in userData) |
| HTTP | axios (main process) |

## Repository layout

| Path | Purpose |
|------|---------|
| `main.js` | Main process: IPC, filesystem, NeDB, metadata HTTP. |
| `preload.js` | Secure bridge exposing `window.electronAPI`. |
| `src/` | React app (entry `src/main.jsx`). |
| `libraryScan.js` | Recursive folder + PDF tree builder (main process). |
| `vite.config.js` | Vite + React plugin; `base: './'` for Electron `file://` loading. |
| `build/` | Renderer production output (gitignored). |
| `installer/` | electron-builder `buildResources` (installer assets). |
| `docs/` | English technical documentation. |

## Contributing

Issues and pull requests are welcome. When changing IPC shapes, update **`docs/modules/ipc-contract.md`** and **`CHANGELOG.md`** in the same change.

## License

GPL-3.0 — see `package.json` / `copyright` field in electron-builder config.

## Author

Yingkai Fu — `Yingkai.Fu@outlook.com`
