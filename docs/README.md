# Paper Manager — documentation index

This folder contains **English** technical documentation for the Paper Manager desktop application (Electron + React + Vite).

| Document | Purpose |
|----------|---------|
| [architecture.md](./architecture.md) | High-level system layout: processes, data flow, persistence. |
| [development.md](./development.md) | Local setup, scripts, packaging, troubleshooting. |
| [modules/ipc-contract.md](./modules/ipc-contract.md) | IPC channel reference between preload and main process. |
| [modules/main-process.md](./modules/main-process.md) | `main.js`: window lifecycle, filesystem, NeDB, metadata fetchers. |
| [modules/preload-bridge.md](./modules/preload-bridge.md) | `preload.js`: `contextBridge` surface exposed as `window.electronAPI`. |
| [modules/renderer-app.md](./modules/renderer-app.md) | `App.jsx`: tree, table, modals, IPC wiring. |
| [modules/pdf-library-tree.md](./modules/pdf-library-tree.md) | Sidebar PDF / folder tree behavior. |
| [modules/item-list.md](./modules/item-list.md) | `ItemList.jsx`: table of PDFs, sorting, row actions. |

The user-facing overview and quick start live in the repository root [README.md](../README.md).
