const path = require("path");
const fs = require("fs");

/**
 * Recursively build Ant Design Tree nodes: every subdirectory is listed (even if empty),
 * plus `.pdf` files as leaves — same visibility as a desktop file explorer.
 * @param {string} dirPath Absolute directory path
 * @returns {object[]}
 */
function buildPdfTreeNodes(dirPath) {
  let dirents;
  try {
    dirents = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  dirents.sort((a, b) => a.name.localeCompare(b.name));

  const nodes = [];
  for (const ent of dirents) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      const children = buildPdfTreeNodes(full);
      nodes.push({
        title: ent.name,
        key: full,
        selectable: false,
        children,
      });
    } else if (ent.isFile() && path.extname(ent.name).toLowerCase() === ".pdf") {
      nodes.push({
        title: ent.name,
        key: full,
        isLeaf: true,
      });
    }
  }
  return nodes;
}

/**
 * Flat list of every PDF under root (depth-first).
 * @param {string} rootPath
 * @returns {string[]}
 */
function collectPdfPaths(rootPath) {
  const out = [];
  function walk(d) {
    let dirents;
    try {
      dirents = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of dirents) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && path.extname(ent.name).toLowerCase() === ".pdf") {
        out.push(full);
      }
    }
  }
  walk(rootPath);
  return out;
}

module.exports = { buildPdfTreeNodes, collectPdfPaths };
