import "./App.css";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Layout,
  Button,
  Flex,
  Upload,
  message,
  Input,
  Modal,
  Row,
  Typography,
  Form,
  Space,
  Alert,
  Tree,
  Menu,
  Badge,
  Spin,
  Tooltip,
} from "antd";
import { InboxOutlined, FolderAddOutlined, UploadOutlined, MoreOutlined } from "@ant-design/icons";
import ItemList from "./components/ItemList.jsx";
import PdfViewer from "./components/PdfViewer.jsx";
import TableColumnSettings from "./components/TableColumnSettings.jsx";
import { loadTableColumnPrefs } from "./tableColumns.js";

const { DirectoryTree } = Tree;
const { Header, Sider, Content } = Layout;
const { Dragger } = Upload;
const { Search } = Input;

const buttonItemLayout = {
  wrapperCol: { span: 10, offset: 10 },
};

/** Case-insensitive: file path under directory prefix (recursive). */
function pathIsUnderDir(filePath, dirKey) {
  if (!dirKey) return true;
  const f = filePath.replace(/\//g, "\\").toLowerCase();
  const d = dirKey.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
  if (f === d) return true;
  return f.startsWith(d + "\\");
}

function defaultExpandKeys(nodes, maxDepth, depth = 0) {
  const keys = [];
  if (!nodes || depth >= maxDepth) return keys;
  for (const n of nodes) {
    if (n.children?.length) {
      keys.push(n.key);
      keys.push(...defaultExpandKeys(n.children, maxDepth, depth + 1));
    }
  }
  return keys;
}

/** Parent folder keys from `deepestPath` up to (but excluding) `rootPath` — for Tree `expandedKeys`. */
function expandKeysForPath(rootPath, deepestPath) {
  const keys = [];
  const root = String(rootPath).replace(/[/\\]+$/, "");
  const rootLower = root.toLowerCase();
  let cur = String(deepestPath).replace(/[/\\]+$/, "");
  for (;;) {
    const par = cur.replace(/[/\\][^/\\]+$/, "");
    if (!par || par === cur) break;
    if (par.length < root.length) break;
    keys.push(par);
    if (par.toLowerCase() === rootLower) break;
    cur = par;
  }
  return keys;
}

/** Normalize path string for comparison (Windows-friendly). */
function normPathKey(p) {
  return String(p).replace(/\//g, "\\").toLowerCase();
}

/** True if `maybeDesc` is a strict child path of `ancestorDir`. */
function isStrictPathUnderDir(maybeDesc, ancestorDir) {
  const d = normPathKey(maybeDesc).replace(/\\+$/, "");
  const a = normPathKey(ancestorDir).replace(/\\+$/, "");
  if (!a || d === a) return false;
  return d.startsWith(a + "\\");
}

/** Tree nodes: folders only (for move-destination picker). */
function foldersOnlyTree(nodes) {
  if (!nodes?.length) return [];
  const out = [];
  for (const n of nodes) {
    if (n.isLeaf) continue;
    out.push({
      title: n.title,
      key: n.key,
      isLeaf: false,
      selectable: true,
      children: foldersOnlyTree(n.children || []),
    });
  }
  return out;
}

/** Disable illegal targets (self, subtree when moving a folder). */
function markMovePickerNodes(nodes, sourcePath, sourceIsDir) {
  if (!sourcePath || !nodes?.length) return nodes;
  const srcN = normPathKey(sourcePath).replace(/\\+$/, "");
  return nodes.map((n) => {
    const k = normPathKey(n.key).replace(/\\+$/, "");
    const self = k === srcN;
    const under = sourceIsDir && isStrictPathUnderDir(n.key, sourcePath);
    return {
      ...n,
      disabled: self || under,
      children: markMovePickerNodes(n.children || [], sourcePath, sourceIsDir),
    };
  });
}

/** Tree `data` node: folder with no children (rc-tree often uses gap drop here, not dropPosition 0). */
function isEmptyFolderDataNode(dropNode) {
  if (!dropNode || dropNode.isLeaf) return false;
  const ch = dropNode.children;
  return !Array.isArray(ch) || ch.length === 0;
}

function findTreeDataNode(nodes, targetKey) {
  if (!targetKey || !nodes?.length) return null;
  for (const n of nodes) {
    if (n.key === targetKey) return n;
    const hit = findTreeDataNode(n.children, targetKey);
    if (hit) return hit;
  }
  return null;
}

function eventNodeKey(node) {
  if (!node) return null;
  return node.key ?? node.eventKey ?? node.props?.eventKey ?? null;
}

function isDirectChildOfRoot(treeNodes, rootPath, key) {
  if (!rootPath || !key || !treeNodes?.length) return false;
  const root = treeNodes.find((n) => n.key === rootPath);
  return Boolean(root?.children?.some((c) => c.key === key));
}

/**
 * Drop *into* a folder: rc-tree uses dropPosition 0 on the folder row lower zone.
 * For **empty** folders it often only offers gap positions (±1); treat those as move-into.
 * Gap drops between root-level items move into the library root folder.
 */
function allowTreeFilesystemDrop({ dragNode, dropNode, dropPosition, rootPath, treeNodes }) {
  const src = dragNode?.key;
  const dst = dropNode?.key;
  if (!src || !dst || src === dst) return false;

  if (
    rootPath &&
    isDirectChildOfRoot(treeNodes, rootPath, dropNode?.key) &&
    (dropPosition === 1 || dropPosition === -1)
  ) {
    return true;
  }

  if (!dropNode || dropNode.isLeaf) return false;
  const dragIsDir = !dragNode.isLeaf;
  if (dragIsDir) {
    const dn = normPathKey(dst);
    const sn = normPathKey(src);
    if (dn === sn || isStrictPathUnderDir(dst, src)) return false;
  }
  if (dropPosition === 0) return true;
  if (
    isEmptyFolderDataNode(dropNode) &&
    (dropPosition === 1 || dropPosition === -1)
  ) {
    return true;
  }
  return false;
}

/** Last segment of a path (works with `/` or `\\`). */
function fileBaseName(p) {
  if (!p) return "";
  const s = String(p).replace(/[/\\]+$/, "");
  const i = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
  return i >= 0 ? s.slice(i + 1) : s;
}

/** PDF stem (no extension) from a full path. */
function pdfStemFromPath(p) {
  return fileBaseName(p).replace(/\.pdf$/i, "");
}

/** Same rule as main `isArxivFileName` (stem only, case-insensitive). */
function isArxivStem(stem) {
  return /^\d{4}\.\d{4,5}(v\d+)?$/i.test(String(stem || "").trim());
}

function editFormFromFileRow(row) {
  return {
    title: row?.title || "",
    authors: row?.authors || "",
    year: row?.year || "",
    journal: row?.journal || "",
  };
}

function App() {
  const [rootPath, setRootPath] = useState("");
  const [treeData, setTreeData] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [treeFilterDir, setTreeFilterDir] = useState("");
  const [uploadTargetDir, setUploadTargetDir] = useState("");
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedTreeKeys, setSelectedTreeKeys] = useState([]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    authors: "",
    year: "",
    journal: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const metadataFetchRef = useRef({ cancelled: false });
  const [messageApi, contextHolder] = message.useMessage();
  const [formLayout] = useState("horizontal");

  /** VS Code–style tree context menu */
  const [ctxMenu, setCtxMenu] = useState(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameOldPath, setRenameOldPath] = useState("");
  const [renameBase, setRenameBase] = useState("");
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveSourcePath, setMoveSourcePath] = useState("");
  const [moveSourceIsDir, setMoveSourceIsDir] = useState(false);
  const [moveDestDir, setMoveDestDir] = useState("");
  const [movePickerExpanded, setMovePickerExpanded] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalDestDir, setUploadModalDestDir] = useState("");
  const [uploadPickerExpanded, setUploadPickerExpanded] = useState([]);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadUrlLoading, setUploadUrlLoading] = useState(false);
  const [uploadPanelPath, setUploadPanelPath] = useState("");
  const [uploadPanelForm, setUploadPanelForm] = useState({
    title: "",
    authors: "",
    year: "",
    journal: "",
  });
  const [uploadMetaLoading, setUploadMetaLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [favoritePaths, setFavoritePaths] = useState([]);
  const [activeFavoritePath, setActiveFavoritePath] = useState("");
  const [columnPrefs, setColumnPrefs] = useState(() => loadTableColumnPrefs());
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [arxivStatus, setArxivStatus] = useState({
    state: "idle",
    latencyMs: null,
    error: null,
    checkedAt: null,
    probeId: "2312.07540",
  });

  const favoritePathSet = useMemo(() => new Set(favoritePaths), [favoritePaths]);

  const favoriteItems = useMemo(() => {
    if (!favoritePaths.length) return [];
    const order = new Map(favoritePaths.map((p, i) => [p, i]));
    return allFiles
      .filter((f) => favoritePathSet.has(f.path) || favoritePathSet.has(f.key))
      .sort(
        (a, b) =>
          (order.get(a.path) ?? order.get(a.key) ?? 0) -
          (order.get(b.path) ?? order.get(b.key) ?? 0)
      );
  }, [allFiles, favoritePaths, favoritePathSet]);

  const loadFavorites = useCallback(async () => {
    try {
      const paths = await window.electronAPI.getFavorites();
      setFavoritePaths(Array.isArray(paths) ? paths : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(
    async (file) => {
      const path = file?.path || file?.key;
      if (!path) return;
      try {
        const result = await window.electronAPI.toggleFavorite(path);
        const nextPaths = Array.isArray(result?.paths) ? result.paths : [];
        setFavoritePaths(nextPaths);
        if (!result?.favorited) {
          setFilteredFiles((prev) =>
            prev.filter((row) => (row.path || row.key) !== path)
          );
          if (activeFavoritePath === path) setActiveFavoritePath("");
        }
        messageApi.success(result?.favorited ? "Added to favorites." : "Removed from favorites.");
      } catch (e) {
        console.error(e);
        messageApi.error("Could not update favorites.");
      }
    },
    [activeFavoritePath, messageApi]
  );

  const showAllFavorites = useCallback(() => {
    setSelectedTreeKeys([]);
    setTreeFilterDir("");
    setActiveFavoritePath("");
    setFilteredFiles(favoriteItems);
  }, [favoriteItems]);

  const selectFavorite = useCallback((file) => {
    const path = file.path || file.key;
    setSelectedTreeKeys([]);
    setTreeFilterDir("");
    setActiveFavoritePath(path);
    setFilteredFiles([file]);
  }, []);

  const applyLibrary = useCallback((payload) => {
    if (!payload?.rootPath) return;
    setRootPath(payload.rootPath);
    setTreeData(payload.treeData || []);
    setAllFiles(payload.files || []);
    setFilteredFiles(payload.files || []);
    setTreeFilterDir("");
    setUploadTargetDir(payload.lastUploadDir || payload.rootPath);
    setExpandedKeys([payload.rootPath, ...defaultExpandKeys(payload.treeData || [], 2)]);
    setSelectedTreeKeys([]);
  }, []);

  const refreshFromDisk = useCallback(async () => {
    if (!rootPath) return null;
    const payload = await window.electronAPI.refreshLibrary(rootPath);
    const nextFiles = payload.files || [];
    setTreeData(payload.treeData || []);
    setAllFiles(nextFiles);
    setFilteredFiles(
      nextFiles.filter((f) =>
        treeFilterDir ? pathIsUnderDir(f.path, treeFilterDir) : true
      )
    );
    return { ...payload, files: nextFiles };
  }, [rootPath, treeFilterDir]);

  const handleSearch = (keyword) => {
    if (!keyword) {
      setFilteredFiles(
        allFiles.filter((f) =>
          treeFilterDir ? pathIsUnderDir(f.path, treeFilterDir) : true
        )
      );
    } else {
      const lower = keyword.toLowerCase();
      setFilteredFiles(
        allFiles.filter(
          (f) =>
            (treeFilterDir ? pathIsUnderDir(f.path, treeFilterDir) : true) &&
            String(f.title || "")
              .toLowerCase()
              .includes(lower)
        )
      );
    }
  };

  const applyTreeNodeSelection = useCallback(
    (node) => {
      const key = node?.key;
      if (!key) return;
      setSelectedTreeKeys([key]);
      setActiveFavoritePath("");

      if (key === rootPath) {
        setTreeFilterDir("");
        setUploadTargetDir(rootPath);
        setFilteredFiles(allFiles);
        return;
      }

      const isLeaf = node.isLeaf === true;
      if (isLeaf) {
        setTreeFilterDir("");
        setFilteredFiles(allFiles.filter((f) => f.path === key));
        const parent = key.replace(/[/\\][^/\\]+$/, "");
        setUploadTargetDir(parent || rootPath);
      } else {
        setTreeFilterDir(key);
        setUploadTargetDir(key);
        setFilteredFiles(allFiles.filter((f) => pathIsUnderDir(f.path, key)));
      }
    },
    [allFiles, rootPath]
  );

  const onTreeSelect = (keys, info) => {
    if (info?.node) {
      applyTreeNodeSelection(info.node);
      return;
    }
    const key = keys[0];
    setSelectedTreeKeys(keys);
    if (!key) {
      setTreeFilterDir("");
      setUploadTargetDir(rootPath);
      setFilteredFiles(allFiles);
    }
  };

  useEffect(() => {
    if (uploadTargetDir && rootPath) {
      window.electronAPI.setLastUploadDir(uploadTargetDir);
    }
  }, [uploadTargetDir, rootPath]);

  async function openLibrary() {
    const result = await window.electronAPI.openDialog();
    if (result) applyLibrary(result);
  }

  function openFile(file) {
    setPreviewFile(file);
  }

  function openFileDirectory(file) {
    window.electronAPI.openFileDirectory(file.key);
  }

  async function deleteFile(file) {
    const ok = await window.electronAPI.deleteFile(file.key);
    if (ok) {
      if (
        previewFile &&
        (previewFile.path === file.path || previewFile.key === file.key)
      ) {
        setPreviewFile(null);
      }
      if (activeFavoritePath === file.path || activeFavoritePath === file.key) {
        setActiveFavoritePath("");
      }
      messageApi.success("Deleted.");
      await refreshFromDisk();
      await loadFavorites();
    } else {
      messageApi.error("Delete failed.");
    }
  }

  async function performMove(sourcePath, destinationDir) {
    if (!rootPath || !sourcePath || !destinationDir) return false;
    try {
      const r = await window.electronAPI.moveEntry({
        rootPath,
        sourcePath,
        destinationDir,
      });
      if (!r?.ok) {
        messageApi.error(r?.error || "Move failed.");
        return false;
      }
      messageApi.success("Moved.");
      if (previewFile?.path === sourcePath && r.newPath) {
        setPreviewFile((prev) =>
          prev
            ? {
                ...prev,
                path: r.newPath,
                key: r.newPath,
                name: fileBaseName(r.newPath),
              }
            : null
        );
      }
      const payload = await refreshFromDisk();
      await loadFavorites();
      if (activeFavoritePath === sourcePath && r.newPath) {
        setActiveFavoritePath(r.newPath);
      }
      if (r.newPath && payload?.files) {
        const extras = expandKeysForPath(rootPath, r.newPath);
        setExpandedKeys((prev) =>
          Array.from(new Set([...(prev || []), ...extras]))
        );
        setSelectedTreeKeys([r.newPath]);
        const isPdf = r.newPath.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          setTreeFilterDir("");
          const parent = r.newPath.replace(/[/\\][^/\\]+$/, "");
          setUploadTargetDir(parent || rootPath);
          setFilteredFiles(payload.files.filter((f) => f.path === r.newPath));
        } else {
          setTreeFilterDir(r.newPath);
          setUploadTargetDir(r.newPath);
          setFilteredFiles(
            payload.files.filter((f) => pathIsUnderDir(f.path, r.newPath))
          );
        }
      }
      return true;
    } catch (e) {
      console.error(e);
      messageApi.error("Move failed.");
      return false;
    }
  }

  const displayTreeData = useMemo(() => {
    if (!rootPath) return [];
    return [
      {
        title: fileBaseName(rootPath) || rootPath,
        key: rootPath,
        isLeaf: false,
        selectable: true,
        children: treeData,
      },
    ];
  }, [rootPath, treeData]);

  async function onTreeDrop(info) {
    if (!rootPath) return;
    const destKey = eventNodeKey(info.node);
    const dragKey = eventNodeKey(info.dragNode);
    if (!destKey || !dragKey || dragKey === destKey) return;

    const dataNode = findTreeDataNode(displayTreeData, destKey) || info.node;
    let destDir = null;

    if (!info.dropToGap) {
      if (!dataNode || dataNode.isLeaf) return;
      destDir = destKey;
    } else if (isEmptyFolderDataNode(dataNode)) {
      destDir = destKey;
    } else if (isDirectChildOfRoot(displayTreeData, rootPath, destKey)) {
      destDir = rootPath;
    } else {
      return;
    }
    if (!destDir) return;

    const srcParent = dragKey.replace(/[/\\][^/\\]+$/, "");
    if (normPathKey(destDir) === normPathKey(srcParent)) return;

    await performMove(dragKey, destDir);
  }

  async function submitMoveTo() {
    if (!moveDestDir) {
      messageApi.warning("Select a destination folder.");
      return Promise.reject(new Error("no-dest"));
    }
    const ok = await performMove(moveSourcePath, moveDestDir);
    if (!ok) return Promise.reject(new Error("move-failed"));
    setMoveModalOpen(false);
    setMoveSourcePath("");
    setMoveDestDir("");
  }

  const handleOk = async () => {
    const nextFile = { ...currentFile, ...editForm, updatedFlag: true };
    await window.electronAPI.saveFileMetadata(nextFile);
    setAllFiles((prev) =>
      prev.map((row) => (row.path === nextFile.path ? { ...row, ...nextFile } : row))
    );
    setFilteredFiles((prev) =>
      prev.map((row) => (row.path === nextFile.path ? { ...row, ...nextFile } : row))
    );
    setCurrentFile(nextFile);
    setIsModalVisible(false);
  };

  const handleReset = async () => {
    const stem = currentFile.filename;
    const default_file = {
      ...currentFile,
      title: stem,
      authors: "",
      year: "",
      journal: "",
      summary: "",
      updatedFlag: false,
    };
    await window.electronAPI.saveFileMetadata(default_file);
    setAllFiles((prev) =>
      prev.map((row) => (row.path === default_file.path ? default_file : row))
    );
    setFilteredFiles((prev) =>
      prev.map((row) => (row.path === default_file.path ? default_file : row))
    );
    setCurrentFile(default_file);
    setEditForm({
      title: stem || "",
      authors: "",
      year: "",
      journal: "",
    });
  };

  const stopMetadataFetch = useCallback(() => {
    metadataFetchRef.current.cancelled = true;
    window.electronAPI.cancelReadPdf?.();
    setIsLoading(false);
  }, []);

  const handleCancel = () => {
    stopMetadataFetch();
    setIsModalVisible(false);
  };

  async function getInfo(file) {
    setCurrentFile(file);
    setIsModalVisible(true);
  }

  const runArxivConnectionCheck = useCallback(async () => {
    setArxivStatus((prev) => ({ ...prev, state: "checking" }));
    try {
      const r = await window.electronAPI.checkArxivConnection();
      setArxivStatus({
        state: r?.ok ? "online" : "offline",
        latencyMs: r?.latencyMs ?? null,
        error: r?.error ?? null,
        checkedAt: Date.now(),
        probeId: r?.probeId || "2312.07540",
      });
    } catch (e) {
      console.error(e);
      setArxivStatus({
        state: "offline",
        latencyMs: null,
        error: e?.message || "Connection check failed",
        checkedAt: Date.now(),
        probeId: "2312.07540",
      });
    }
  }, []);

  useEffect(() => {
    runArxivConnectionCheck();
    const timer = window.setInterval(runArxivConnectionCheck, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [runArxivConnectionCheck]);

  async function updateInfo() {
    const filePath = currentFile?.path || currentFile?.key;
    if (!filePath) {
      messageApi.warning("No file selected.");
      return;
    }
    metadataFetchRef.current = { cancelled: false };
    setIsLoading(true);
    try {
      const result = await window.electronAPI.readPdf(filePath);
      if (metadataFetchRef.current.cancelled || result?.cancelled) return;
      if (result?.ok && result.file) {
        const file = result.file;
        setCurrentFile(file);
        setEditForm(editFormFromFileRow(file));
        setAllFiles((prev) =>
          prev.map((row) => (row.path === file.path ? { ...row, ...file } : row))
        );
        setFilteredFiles((prev) =>
          prev.map((row) => (row.path === file.path ? { ...row, ...file } : row))
        );
        messageApi.success("Metadata updated.");
      } else {
        messageApi.warning(
          result?.error || "Could not fetch metadata (network or filename)."
        );
      }
    } catch (e) {
      if (metadataFetchRef.current.cancelled) return;
      console.error(e);
      messageApi.error("Metadata request failed.");
    } finally {
      if (!metadataFetchRef.current.cancelled) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (currentFile && isModalVisible) {
      setEditForm({
        title: currentFile.title || "",
        authors: currentFile.authors || "",
        year: currentFile.year || "",
        journal: currentFile.journal || "",
      });
    }
  }, [currentFile, isModalVisible]);

  useEffect(() => {
    (async () => {
      const saved = await window.electronAPI.initFolder();
      if (saved) applyLibrary(saved);
    })();
  }, [applyLibrary]);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  useEffect(() => {
    if (!ctxMenu) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeCtxMenu();
    };
    const onMouseDown = (e) => {
      if (e.button === 2) return;
      closeCtxMenu();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [ctxMenu, closeCtxMenu]);

  const ctxMenuItems = useMemo(() => {
    if (!ctxMenu) return [];
    if (ctxMenu.isLeaf) {
      return [
        { key: "open", label: "Open" },
        { key: "metadata", label: "Update metadata" },
        { key: "rename", label: "Rename…" },
        { key: "moveTo", label: "Move to…" },
        { type: "divider" },
        { key: "reveal", label: "Reveal in File Explorer" },
        { key: "delete", label: "Delete", danger: true },
      ];
    }
    return [
      { key: "newFolder", label: "New Folder…" },
      { key: "rename", label: "Rename…" },
      { key: "moveTo", label: "Move to…" },
      { key: "reveal", label: "Reveal in File Explorer" },
      { type: "divider" },
      { key: "deleteFolder", label: "Delete Folder", danger: true },
    ];
  }, [ctxMenu]);

  const movePickerTree = useMemo(() => {
    if (!rootPath) return [];
    const rootNode = {
      title: fileBaseName(rootPath) || rootPath,
      key: rootPath,
      isLeaf: false,
      selectable: true,
      children: foldersOnlyTree(treeData),
    };
    return markMovePickerNodes([rootNode], moveSourcePath, moveSourceIsDir);
  }, [rootPath, treeData, moveSourcePath, moveSourceIsDir]);

  useEffect(() => {
    if (!moveModalOpen || !rootPath) return;
    const keys = new Set([
      ...expandKeysForPath(rootPath, moveSourcePath || rootPath),
      ...defaultExpandKeys(movePickerTree, 8),
    ]);
    setMovePickerExpanded(Array.from(keys));
  }, [moveModalOpen, rootPath, moveSourcePath, movePickerTree]);

  const uploadPickerTree = useMemo(() => {
    if (!rootPath) return [];
    return [
      {
        title: fileBaseName(rootPath) || rootPath,
        key: rootPath,
        isLeaf: false,
        selectable: true,
        children: foldersOnlyTree(treeData),
      },
    ];
  }, [rootPath, treeData]);

  useEffect(() => {
    if (!uploadModalOpen || !rootPath) return;
    setUploadModalDestDir(rootPath);
    setUploadPickerExpanded(
      Array.from(new Set([...defaultExpandKeys(uploadPickerTree, 8)]))
    );
    setUploadUrl("");
    setUploadPanelPath("");
    setUploadPanelForm({ title: "", authors: "", year: "", journal: "" });
  }, [uploadModalOpen, rootPath, uploadPickerTree]);

  async function hydrateUploadPanelAfterFile(destPath) {
    const stem = pdfStemFromPath(destPath);
    if (isArxivStem(stem)) {
      setUploadMetaLoading(true);
      try {
        const result = await window.electronAPI.readPdf(destPath);
        if (result?.ok && result.file) {
          setUploadPanelForm(editFormFromFileRow(result.file));
        } else {
          setUploadPanelForm({
            title: stem,
            authors: "",
            year: "",
            journal: "",
          });
          messageApi.warning(
            result?.error || "Could not fetch arXiv metadata for this file."
          );
        }
      } catch (e) {
        console.error(e);
        setUploadPanelForm({ title: stem, authors: "", year: "", journal: "" });
        messageApi.error("Metadata fetch failed.");
      } finally {
        setUploadMetaLoading(false);
      }
    } else {
      setUploadMetaLoading(false);
      setUploadPanelForm({
        title: stem.replace(/[-_]+/g, " ").trim() || stem,
        authors: "",
        year: "",
        journal: "",
      });
    }
  }

  async function saveUploadPanelMetadata() {
    if (!uploadPanelPath) {
      messageApi.warning("Upload or download a PDF first.");
      return;
    }
    const name = fileBaseName(uploadPanelPath);
    const stem = pdfStemFromPath(uploadPanelPath);
    const row = {
      path: uploadPanelPath,
      key: uploadPanelPath,
      name,
      originalname: name,
      filename: stem,
      title: uploadPanelForm.title.trim() || stem,
      authors: uploadPanelForm.authors.trim(),
      year: uploadPanelForm.year.trim(),
      journal: uploadPanelForm.journal.trim(),
      summary: "",
      updatedFlag: true,
    };
    const ok = await window.electronAPI.saveFileMetadata(row);
    if (ok) {
      messageApi.success("Metadata saved.");
      await refreshFromDisk();
    } else {
      messageApi.error("Save failed.");
    }
  }

  async function handleDownloadPdfFromUrl() {
    const u = uploadUrl.trim();
    if (!u) {
      messageApi.warning("Enter a download link.");
      return;
    }
    if (!rootPath || !uploadModalDestDir) return;
    setUploadUrlLoading(true);
    try {
      const r = await window.electronAPI.downloadPdfFromUrl({
        rootPath,
        destinationDir: uploadModalDestDir,
        url: u,
      });
      if (r?.ok && r.destPath) {
        messageApi.success("Downloaded.");
        setUploadUrl("");
        window.electronAPI.setLastUploadDir(uploadModalDestDir);
        setUploadPanelPath(r.destPath);
        await hydrateUploadPanelAfterFile(r.destPath);
        await refreshFromDisk();
      } else {
        messageApi.error(r?.error || "Download failed.");
      }
    } catch (e) {
      console.error(e);
      messageApi.error("Download failed.");
    } finally {
      setUploadUrlLoading(false);
    }
  }

  async function submitNewFolder() {
    const name = newFolderName.trim();
    if (!name || !newFolderParent || !rootPath) return;
    const r = await window.electronAPI.createFolder({
      rootPath,
      parentPath: newFolderParent,
      name,
    });
    if (r?.ok) {
      messageApi.success("Folder created.");
      setNewFolderOpen(false);
      setNewFolderName("");
      const payload = await refreshFromDisk();
      const created = r.createdPath;
      if (created && payload?.files) {
        const extras = expandKeysForPath(rootPath, created);
        setExpandedKeys((prev) =>
          Array.from(new Set([...(prev || []), ...extras]))
        );
        setSelectedTreeKeys([created]);
        setTreeFilterDir(created);
        setUploadTargetDir(created);
        setFilteredFiles(
          payload.files.filter((f) => pathIsUnderDir(f.path, created))
        );
      }
    } else {
      messageApi.error(r?.error || "Create failed.");
    }
  }

  async function submitRename() {
    const trimmed = renameBase.trim();
    if (!trimmed || !renameOldPath || !rootPath) return;
    const r = await window.electronAPI.renameEntry({
      rootPath,
      oldPath: renameOldPath,
      newBaseName: trimmed,
    });
    if (r?.ok) {
      messageApi.success("Renamed.");
      setRenameOpen(false);
      setRenameBase("");
      setRenameOldPath("");
      setSelectedTreeKeys([]);
      await refreshFromDisk();
    } else {
      messageApi.error(r?.error || "Rename failed.");
    }
  }

  function openNewFolderDialog(parentPath) {
    setNewFolderParent(parentPath);
    setNewFolderName("");
    setNewFolderOpen(true);
  }

  function onTreeRightClick({ event, node }) {
    event.preventDefault();
    setCtxMenu({
      x: event.clientX,
      y: event.clientY,
      key: node.key,
      isLeaf: node.isLeaf === true,
    });
  }

  async function handleCtxMenuClick({ key, domEvent }) {
    domEvent?.stopPropagation?.();
    const target = ctxMenu;
    setCtxMenu(null);
    if (!target || !rootPath) return;
    const p = target.key;

    if (key === "open" && target.isLeaf) {
      await openFile({ key: p });
      return;
    }
    if (key === "metadata" && target.isLeaf) {
      const row = allFiles.find((f) => f.path === p);
      if (row) await getInfo(row);
      else messageApi.warning("File not in list yet; try Refresh.");
      return;
    }
    if (key === "reveal") {
      openFileDirectory({ key: p });
      return;
    }
    if (key === "delete" && target.isLeaf) {
      Modal.confirm({
        title: "Delete this PDF?",
        content: "The file will be removed from disk and the library index.",
        okText: "Delete",
        okType: "danger",
        onOk: () => deleteFile({ key: p }),
      });
      return;
    }
    if (key === "newFolder" && !target.isLeaf) {
      openNewFolderDialog(p);
      return;
    }
    if (key === "rename") {
      setRenameOldPath(p);
      setRenameBase(fileBaseName(p));
      setRenameOpen(true);
      return;
    }
    if (key === "moveTo") {
      const par = p.replace(/[/\\][^/\\]+$/, "");
      const def = par && pathIsUnderDir(par, rootPath) ? par : rootPath;
      setMoveSourcePath(p);
      setMoveSourceIsDir(!target.isLeaf);
      setMoveDestDir(def);
      setMoveModalOpen(true);
      return;
    }
    if (key === "deleteFolder" && !target.isLeaf) {
      Modal.confirm({
        title: "Delete this folder?",
        content:
          "Everything inside will be removed from disk. PDFs in this subtree will be dropped from the library index.",
        okText: "Delete",
        okType: "danger",
        onOk: async () => {
          const r = await window.electronAPI.deleteEntry({
            rootPath,
            targetPath: p,
          });
          if (r?.ok) {
            messageApi.success("Deleted.");
            setSelectedTreeKeys([]);
            await refreshFromDisk();
          } else {
            messageApi.error(r?.error || "Delete failed.");
            throw new Error(r?.error || "delete");
          }
        },
      });
    }
  }

  const arxivBadgeStatus =
    arxivStatus.state === "online"
      ? "success"
      : arxivStatus.state === "offline"
        ? "error"
        : arxivStatus.state === "checking"
          ? "processing"
          : "default";

  return (
    <div className="App">
      <Layout style={{ minHeight: "100vh", position: "relative" }}>
        <Sider
          width={320}
          style={{
            background: "#fafafa",
            borderRight: "1px solid #e8e8e8",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Flex
            vertical
            className="app-file-browser"
            style={{ height: "100%", padding: "10px 12px", textAlign: "left" }}
            gap="small"
          >
            <Typography.Title level={4} style={{ margin: 0, textAlign: "left" }}>
              Files
            </Typography.Title>
            <Space.Compact block style={{ width: "100%" }}>
              <Button type="primary" onClick={openLibrary} style={{ flex: 1 }}>
                Open folder
              </Button>
              <Button
                icon={<FolderAddOutlined />}
                disabled={!rootPath}
                title="New folder in the current upload / selection target"
                onClick={() =>
                  openNewFolderDialog(uploadTargetDir || rootPath)
                }
              />
              <Button
                icon={<UploadOutlined />}
                disabled={!rootPath}
                title="Upload PDFs — choose destination inside the window"
                onClick={() => setUploadModalOpen(true)}
              />
            </Space.Compact>
            {rootPath ? (
              <Typography.Text
                ellipsis
                title={rootPath}
                style={{ fontSize: 11, textAlign: "left", display: "block" }}
              >
                {rootPath}
              </Typography.Text>
            ) : null}
            <div
              className="pdf-tree-scroll"
              style={{
                flex: "1 1 55%",
                overflow: "auto",
                minHeight: 0,
                marginInline: 0,
                paddingInline: 0,
                textAlign: "left",
              }}
            >
              {displayTreeData.length > 0 ? (
                <DirectoryTree
                  className="pdf-directory-tree"
                  blockNode
                  showIcon
                  indent={12}
                  expandAction="click"
                  draggable={{ icon: false }}
                  allowDrop={(info) =>
                    allowTreeFilesystemDrop({
                      ...info,
                      rootPath,
                      treeNodes: displayTreeData,
                    })
                  }
                  onDrop={onTreeDrop}
                  treeData={displayTreeData}
                  expandedKeys={expandedKeys}
                  selectedKeys={selectedTreeKeys}
                  onExpand={setExpandedKeys}
                  onSelect={onTreeSelect}
                  onClick={(_e, node) => applyTreeNodeSelection(node)}
                  onRightClick={onTreeRightClick}
                />
              ) : (
                <Typography.Text
                  type="secondary"
                  style={{ display: "block", textAlign: "left" }}
                >
                  No folder opened.
                </Typography.Text>
              )}
            </div>
            <div className="favorites-panel">
              <div className="favorites-panel-header">
                <Typography.Title level={5} style={{ margin: 0 }}>
                  收藏
                </Typography.Title>
                <Button
                  type="link"
                  size="small"
                  disabled={!favoriteItems.length}
                  onClick={showAllFavorites}
                  style={{ padding: 0, height: "auto" }}
                >
                  全部 ({favoriteItems.length})
                </Button>
              </div>
              <div className="favorites-list-scroll">
                {favoriteItems.length === 0 ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    在列表 Action 中点击星标收藏论文
                  </Typography.Text>
                ) : (
                  favoriteItems.map((item) => {
                    const path = item.path || item.key;
                    const active = activeFavoritePath === path;
                    return (
                      <button
                        key={path}
                        type="button"
                        className={`favorites-list-item${active ? " favorites-list-item-active" : ""}`}
                        title={item.title}
                        onClick={() => selectFavorite(item)}
                      >
                        <Typography.Text ellipsis>{item.title}</Typography.Text>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </Flex>
        </Sider>
        <Layout style={{ flex: 1, minHeight: 0 }}>
          <Header
            style={{
              background: "#fafafa",
              padding: "12px 16px",
              height: "auto",
              lineHeight: "normal",
            }}
          >
            {contextHolder}
            <div className="app-header-toolbar">
              <Search
                className="app-header-search"
                placeholder="Search by title"
                onSearch={handleSearch}
                allowClear
                enterButton
              />
              <Tooltip title="表格列设置">
                <Button
                  type="text"
                  icon={<MoreOutlined style={{ fontSize: 20 }} />}
                  aria-label="表格列设置"
                  onClick={() => setColumnSettingsOpen(true)}
                />
              </Tooltip>
            </div>
          </Header>
          <Layout className="app-main-split">
            <Content className="app-table-pane">
              <ItemList
                items={filteredFiles}
                openFile={openFile}
                deleteFile={deleteFile}
                getInfo={getInfo}
                openFileDirectory={openFileDirectory}
                selectedPath={previewFile?.path || previewFile?.key}
                favoritePaths={favoritePathSet}
                onToggleFavorite={toggleFavorite}
                columnPrefs={columnPrefs}
              />
            </Content>
            {previewFile ? (
              <Sider width={480} theme="light" className="pdf-preview-sider">
                <PdfViewer
                  filePath={previewFile.path || previewFile.key}
                  title={previewFile.title}
                  onClose={() => setPreviewFile(null)}
                />
              </Sider>
            ) : null}
          </Layout>
            <Modal
              title="PDF metadata"
              open={isModalVisible}
              onCancel={handleCancel}
              confirmLoading={false}
              footer={null}
              width={600}
            >
              <Form
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                layout={formLayout}
                style={{ maxWidth: 600, margin: "0 auto" }}
              >
                <Form.Item label="File">
                  <Input value={currentFile?.name} readOnly />
                </Form.Item>
                <Form.Item label="Fetch">
                  <Space>
                    {isLoading ? (
                      <Button danger onClick={stopMetadataFetch}>
                        Stop fetch
                      </Button>
                    ) : (
                      <Button type="primary" onClick={updateInfo}>
                        Fetch arXiv / Crossref
                      </Button>
                    )}
                    <Button danger onClick={handleReset}>
                      Reset fields
                    </Button>
                  </Space>
                </Form.Item>
                <Form.Item label="Status">
                  {currentFile?.updatedFlag ? (
                    <Alert type="success" message="Has metadata" showIcon />
                  ) : (
                    <Alert type="warning" message="Not fetched" showIcon />
                  )}
                </Form.Item>
                <Form.Item label="Title">
                  <Input
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </Form.Item>
                <Form.Item label="Authors">
                  <Input
                    value={editForm.authors}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, authors: e.target.value }))
                    }
                  />
                </Form.Item>
                <Form.Item label="Date">
                  <Input
                    value={editForm.year}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, year: e.target.value }))
                    }
                  />
                </Form.Item>
                <Form.Item label="Journal">
                  <Input
                    value={editForm.journal}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, journal: e.target.value }))
                    }
                  />
                </Form.Item>
                <Form.Item {...buttonItemLayout}>
                  <Button type="primary" onClick={handleOk}>
                    Save to library
                  </Button>
                </Form.Item>
              </Form>
            </Modal>
        </Layout>
      </Layout>
      <div className="arxiv-connection-status" role="status" aria-live="polite">
        <Badge status={arxivBadgeStatus} />
        <Typography.Text strong style={{ fontSize: 12 }}>
          arXiv
        </Typography.Text>
        {arxivStatus.state === "checking" ? (
          <Spin size="small" />
        ) : null}
        {arxivStatus.state === "online" ? (
          <Typography.Text type="success" style={{ fontSize: 12 }}>
            Connected
            {arxivStatus.latencyMs != null ? ` · ${arxivStatus.latencyMs} ms` : ""}
          </Typography.Text>
        ) : null}
        {arxivStatus.state === "offline" ? (
          <Tooltip title={arxivStatus.error || "Cannot reach export.arxiv.org"}>
            <Typography.Text type="danger" style={{ fontSize: 12 }}>
              Offline
            </Typography.Text>
          </Tooltip>
        ) : null}
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          probe {arxivStatus.probeId}
        </Typography.Text>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: "auto", fontSize: 12 }}
          disabled={arxivStatus.state === "checking"}
          onClick={runArxivConnectionCheck}
        >
          Refresh
        </Button>
      </div>
      {ctxMenu ? (
        <div
          role="presentation"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            zIndex: 2000,
            minWidth: 200,
            background: "#fff",
            borderRadius: 6,
            boxShadow:
              "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Menu
            mode="vertical"
            selectable={false}
            items={ctxMenuItems}
            onClick={handleCtxMenuClick}
          />
        </div>
      ) : null}
      <Modal
        title="New folder"
        open={newFolderOpen}
        onOk={submitNewFolder}
        onCancel={() => {
          setNewFolderOpen(false);
          setNewFolderName("");
        }}
        okText="Create"
        destroyOnHidden
      >
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          Parent: {newFolderParent}
        </Typography.Text>
        <Input
          placeholder="Folder name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={submitNewFolder}
        />
      </Modal>
      <Modal
        title="Rename"
        open={renameOpen}
        onOk={submitRename}
        onCancel={() => {
          setRenameOpen(false);
          setRenameBase("");
          setRenameOldPath("");
        }}
        okText="Rename"
        destroyOnHidden
      >
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginBottom: 8, wordBreak: "break-all" }}
        >
          {renameOldPath}
        </Typography.Text>
        <Input
          placeholder="New name"
          value={renameBase}
          onChange={(e) => setRenameBase(e.target.value)}
          onPressEnter={submitRename}
        />
      </Modal>
      <Modal
        title="Move to folder"
        open={moveModalOpen}
        onOk={submitMoveTo}
        onCancel={() => {
          setMoveModalOpen(false);
          setMoveSourcePath("");
          setMoveDestDir("");
        }}
        okText="Move here"
        width={440}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Moving:{" "}
          <Typography.Text code style={{ wordBreak: "break-all" }}>
            {moveSourcePath}
          </Typography.Text>
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginTop: 0, fontSize: 12 }}>
          Select a destination folder, then confirm.
        </Typography.Paragraph>
        <div style={{ maxHeight: 380, overflow: "auto" }}>
          <DirectoryTree
            className="pdf-directory-tree pdf-move-picker-tree"
            blockNode
            showIcon
            indent={12}
            expandAction="click"
            treeData={movePickerTree}
            expandedKeys={movePickerExpanded}
            onExpand={setMovePickerExpanded}
            selectedKeys={moveDestDir ? [moveDestDir] : []}
            onSelect={(keys, info) => {
              const k = keys[0];
              if (!k || info.node.disabled) return;
              setMoveDestDir(k);
            }}
            titleRender={(node) =>
              node.disabled ? (
                <span style={{ opacity: 0.45 }}>{node.title}</span>
              ) : (
                node.title
              )
            }
          />
        </div>
      </Modal>
      <Modal
        title="Upload files"
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false);
          setUploadUrl("");
          setUploadPanelPath("");
          setUploadPanelForm({ title: "", authors: "", year: "", journal: "" });
        }}
        footer={null}
        width={580}
        destroyOnHidden
      >
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          Choose the library folder to receive files (library root or any subfolder). This
          window does not use the sidebar selection.
        </Typography.Text>
        <div style={{ maxHeight: 220, overflow: "auto", marginBottom: 10 }}>
          <DirectoryTree
            className="pdf-directory-tree pdf-upload-picker-tree"
            blockNode
            showIcon
            indent={12}
            expandAction="click"
            treeData={uploadPickerTree}
            expandedKeys={uploadPickerExpanded}
            onExpand={setUploadPickerExpanded}
            selectedKeys={uploadModalDestDir ? [uploadModalDestDir] : []}
            onSelect={(keys) => {
              const k = keys[0];
              if (k) setUploadModalDestDir(k);
            }}
          />
        </div>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          Upload destination
        </Typography.Text>
        <Typography.Paragraph copyable style={{ marginBottom: 12, wordBreak: "break-all" }}>
          <Typography.Text code>{uploadModalDestDir || "—"}</Typography.Text>
        </Typography.Paragraph>
        <Space.Compact block style={{ width: "100%", marginBottom: 10 }}>
          <Input
            allowClear
            placeholder="https://… (direct link to a PDF)"
            value={uploadUrl}
            onChange={(e) => setUploadUrl(e.target.value)}
            onPressEnter={handleDownloadPdfFromUrl}
          />
          <Button
            type="primary"
            loading={uploadUrlLoading}
            disabled={!uploadModalDestDir}
            onClick={handleDownloadPdfFromUrl}
          >
            Download
          </Button>
        </Space.Compact>
        <Dragger
          className="upload-modal-dragger"
          multiple
          disabled={!uploadModalDestDir}
          customRequest={async ({ file, onSuccess, onError }) => {
            const dest = uploadModalDestDir;
            if (!dest) {
              onError(new Error("No destination"));
              return;
            }
            try {
              const r = await window.electronAPI.uploadFile(
                file.name,
                file.path || file,
                dest
              );
              if (r?.ok && r.destPath) {
                onSuccess({ destPath: r.destPath, name: file.name });
              } else {
                onError(new Error(r?.error || "Upload failed"));
              }
            } catch (e) {
              onError(e);
            }
          }}
          onChange={(info) => {
            if (info.file.status === "done") {
              const destPath = info.file.response?.destPath;
              if (uploadModalDestDir) {
                window.electronAPI.setLastUploadDir(uploadModalDestDir);
              }
              refreshFromDisk();
              messageApi.success(`${info.file.name} uploaded.`);
              if (destPath) {
                setUploadPanelPath(destPath);
                void hydrateUploadPanelAfterFile(destPath);
              }
            }
            if (info.file.status === "error") {
              messageApi.error(`${info.file.name} upload failed.`);
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Drop PDFs here or click to browse</p>
          <p className="ant-upload-hint" style={{ padding: "0 8px" }}>
            Compact zone — same folder as above.
          </p>
        </Dragger>
        <Typography.Title level={5} style={{ margin: "12px 0 8px" }}>
          PDF information
        </Typography.Title>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
          arXiv-style file names are filled automatically after upload or download. Other PDFs:
          fill in as you like, then save.
        </Typography.Text>
        {uploadPanelPath ? (
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 11 }}>
            File: <Typography.Text code>{fileBaseName(uploadPanelPath)}</Typography.Text>
          </Typography.Text>
        ) : null}
        <Form layout="vertical" size="small" style={{ marginBottom: 8 }}>
          <Form.Item label="Title">
            <Input
              value={uploadPanelForm.title}
              onChange={(e) =>
                setUploadPanelForm((p) => ({ ...p, title: e.target.value }))
              }
              disabled={uploadMetaLoading}
            />
          </Form.Item>
          <Form.Item label="Authors">
            <Input
              value={uploadPanelForm.authors}
              onChange={(e) =>
                setUploadPanelForm((p) => ({ ...p, authors: e.target.value }))
              }
              disabled={uploadMetaLoading}
            />
          </Form.Item>
          <Form.Item label="Year / date">
            <Input
              value={uploadPanelForm.year}
              onChange={(e) =>
                setUploadPanelForm((p) => ({ ...p, year: e.target.value }))
              }
              disabled={uploadMetaLoading}
            />
          </Form.Item>
          <Form.Item label="Journal">
            <Input
              value={uploadPanelForm.journal}
              onChange={(e) =>
                setUploadPanelForm((p) => ({ ...p, journal: e.target.value }))
              }
              disabled={uploadMetaLoading}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              onClick={saveUploadPanelMetadata}
              disabled={!uploadPanelPath || uploadMetaLoading}
            >
              Save metadata to library
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      <TableColumnSettings
        open={columnSettingsOpen}
        onClose={() => setColumnSettingsOpen(false)}
        columnPrefs={columnPrefs}
        onChange={setColumnPrefs}
      />
    </div>
  );
}

export default App;
