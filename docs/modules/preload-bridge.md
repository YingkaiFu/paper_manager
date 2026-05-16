# Preload bridge (`preload.js`)

## Surface area

| Property | IPC channel |
|----------|-------------|
| `openDialog` | `openDialog` |
| `refreshLibrary` | `refreshLibrary` |
| `initFolder` | `initFolder` |
| `setLastUploadDir` | `setLastUploadDir` |
| `openFile` | `openFile` |
| `deleteFile` | `deleteFile` |
| `uploadFile` | `uploadFile` |
| `readPdf` | `readpdf` |
| `saveFileMetadata` | `saveFileMetadata` |
| `openFileDirectory` | `openFileDirectory` |
| `createFolder` | `createFolder` |
| `renameEntry` | `renameEntry` |
| `deleteEntry` | `deleteEntry` |
| `moveEntry` | `moveEntry` |

`readPdf` maps to channel `readpdf` for compatibility.

See [ipc-contract.md](./ipc-contract.md).
