# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-05-16

### Added

- Recursive **PDF tree** in the left sidebar after **Open folder** (`libraryScan.js` + Ant Design `Tree`).
- `refreshLibrary` / `setLastUploadDir` IPC for rescanning and remembering upload targets.
- Test fixture `tests/fixtures/library-with-arxiv/2312.07540.pdf` and `tests/fixtures/README.md`.
- `saveFileMetadata` IPC so edited fields persist to NeDB across sessions.

### Changed

- **Library model** — single root folder with recursive PDF discovery; removed category / color / move-between-category flows and related IPC (`addFolder`, `deleteFolder`, `renameFolder`, `moveFile`, `listFolder`).
- **arXiv metadata** — use **HTTPS** `export.arxiv.org` with **`id_list`** (and version-less fallback), explicit **User-Agent**, and more robust Atom parsing (`xml2js` `explicitArray: false` + author normalization).
- **Persistence** — `folderData` now stores `rootPath` and `lastUploadDir`; legacy `folderPath` is read for migration on `initFolder`.
- **Engines** — `node` requirement relaxed to `>=18` for newer runtimes (e.g. Node 26 via nvm).

### Removed

- `Category.jsx`, `Drag.jsx`, `Initstate.js`, `pathJoin.js`, and obsolete module docs (`category-sidebar`, `utils-pathjoin`).

## [0.2.1] - 2026-05-16

### Changed

- Upgraded **Vite** from 5.x to **6.x** (`vite@^6.3.5`, `@vitejs/plugin-react@^4.4.1`) to align with current Node (nvm); lockfile refreshed via `npm install`.

### Fixed

- Renamed React entry files that contain JSX from `.js` to `.jsx` (`App`, `Category`, `ItemList`, `Drag`) so **Vite 6** import analysis accepts them (stricter than Vite 5).

## [0.2.0] - 2026-05-16

### Added

- Vite 6-based renderer build (`vite`, `@vitejs/plugin-react`) replacing Create React App.
- Explicit `axios` dependency (used by the main process).
- `src/utils/pathJoin.js` for consistent path joining in the renderer on Windows and POSIX-style paths.
- English documentation under `docs/` (architecture, development, IPC contract, and per-module notes).
- `installer/` directory reserved for `electron-builder` resources (icons/installer assets), separate from the web `build/` output.

### Changed

- Bumped runtime dependencies: `react` / `react-dom` 18.3.x, `antd` 5.24.x, `concurrently` 9.x, `wait-on` 8.x, `xml2js` 0.6.x.
- Bumped dev tooling: `electron` 27.x, `electron-builder` 24.x, `@electron-forge/*` 7.8.x, `vite` 6.x.
- Development server URL for Electron is now `http://localhost:5173` (Vite default).
- `electron-builder` `directories.buildResources` moved from `build` to `installer` to avoid clashing with the Vite output directory `build/`.
- README rewritten in English with setup, scripts, and links to module documentation.
- Regenerated `package-lock.json` for the new dependency tree (Vite, updated Electron toolchain).

### Fixed

- **NeDB API misuse**: `findOne(...).exec(...)` is not valid for classic `nedb`; `addFolder` / `deleteFolder` now use callback-style `findOne`.
- **Stale `dirent.path` usage**: `listFolder` now builds `path.join(directory, dirent.name)` instead of relying on `fs.Dirent#path` (varies by Node version).
- **`openDialog` category rows**: each category now includes an explicit `path` (root library folder) instead of spreading `fs.Dirent` into plain objects.
- **Global leaks in main process**: removed invalid `require("electron").remote` import; removed implicit globals (`fileNameWithExt`, `state` from `renameFolder`).
- **Crossref / arXiv parsing**: guards for missing API entries, optional authors, and safer string handling; URL-encoded query parameters.
- **Rename category (color only)**: `renameFolder` skips `fs.renameSync` when source and destination resolve to the same path.
- **Delete category UI**: after deletion, the active category path uses `joinPath(folderPath, name)` instead of the bare folder name.
- **Category sidebar**: menu keys use `joinPath`; active item highlighting via `selectedKeys`; Popconfirm handler no longer assumes an event argument.
- **Move-paper modal**: `Select` search/filter targets category names (no longer wired to the article search handler).
- **Metadata modal**: title, authors, year, and journal fields are editable and persisted on Submit.
- **Upload**: `customRequest` awaits `uploadFile` and surfaces failures through Ant Design Upload callbacks.
- **Preload**: removed dead `readArxiv` bridge (no matching IPC handler); normalized exposed API surface.
- **NeDB file upserts**: `readpdf` now uses `{ $set: file }` modifiers so updates conform to NeDB’s Mongo-style API.
- **Electron window defaults**: `contextIsolation: true`, `nodeIntegration: false`, and detached devtools in development.

### Removed

- `react-scripts`, CRA-specific `public/index.html`, and `src/index.js` entry (replaced by root `index.html` and `src/main.jsx`).
- Unused dependencies from the renderer bundle: `@testing-library/*`, `web-vitals`, `pdf-lib`, `pdfjs-dist` (they were not used by the UI; metadata uses HTTP APIs in the main process).

## [0.1.9] and earlier

Historical versions used Create React App, an older dependency set, and a Chinese-language README / informal change notes. See git history for details.
