# PDF library tree (sidebar)

## Role

After **Open folder**, the left sidebar shows Ant Design **`Tree.DirectoryTree`** — the same pattern as a desktop **file explorer** (folder vs file icons, row hover, expand on **row click**).

Tree nodes are built in the main process (`libraryScan.js`):

- **Folder nodes** — `selectable: false`, `isLeaf` omitted / false; every subdirectory under the library root is listed (including empty folders), so new folders appear immediately after refresh.
- **PDF leaf nodes** — `isLeaf: true`; `key` is the absolute file path.

## VS Code–style actions (renderer)

- **Toolbar** — **New folder** (+) creates a directory under the current upload target (same path shown on the upload dragger), which tracks the last folder selection in the tree.
- **Drag-and-drop** — Drop onto a folder row to **move** there (`moveEntry`). `allowDrop` accepts rc-tree’s **inside** drops (`dropPosition === 0`) for any folder, and **gap** drops (`dropPosition` ±1) when the target folder is **empty** (rc-tree otherwise never offers “inside” for zero‑child folders).
- **Right‑click PDF** — Open; Update metadata (same modal as the table); Rename; Move to…; Reveal in File Explorer; Delete (with confirm).
- **Right‑click folder** — New Folder; Rename; Move to…; Reveal in File Explorer; Delete folder (recursive, with confirm).

IPC: `createFolder`, `renameEntry`, `deleteEntry`, `moveEntry`, and `openFileDirectory` (directory vs file behavior). See [ipc-contract.md](./ipc-contract.md).

## Layout

The sidebar uses the **`app-file-browser`** class and **`App.css`** overrides so content is **left-aligned** (the legacy `.App { text-align: center }` from CRA has been removed).

## Interaction (renderer)

- Selecting a **folder** filters the main table to PDFs under that path (recursive).
- Selecting a **PDF** narrows the table to that file and sets the upload target to its parent directory.

See `src/App.jsx` for `onTreeSelect`, `pathIsUnderDir`, upload wiring, and tree context menu.
