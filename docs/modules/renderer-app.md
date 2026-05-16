# Renderer shell (`App.jsx`)

## Role

`App.jsx` is the **root React component**: left **PDF tree** (navigation + upload target), right **search + table**, and the **metadata modal**.

## State highlights

- **`rootPath`** — library root chosen via **Open folder**.
- **`treeData` / `expandedKeys` / `selectedTreeKeys`** — Ant Design `Tree` state from the main process scan.
- **`allFiles` / `filteredFiles`** — complete flat PDF list and view after tree or search filtering.
- **`treeFilterDir`** — when a folder node is selected, filters the table to PDFs under that path.
- **`uploadTargetDir`** — directory used by `Upload.Dragger`; follows tree selection (folder or parent of selected PDF). Persisted with `setLastUploadDir`.
- **`editForm`** — controlled fields in the metadata modal.

## Behaviors

- **Startup** — `initFolder` restores the last library root and rescans.
- **Search** — title substring filter on the current filtered set.
- **Upload** — `customRequest` awaits `uploadFile`, then `refreshLibrary` to refresh tree + table.

See [pdf-library-tree.md](./pdf-library-tree.md) and [item-list.md](./item-list.md).
