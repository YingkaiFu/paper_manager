export const TABLE_COLUMN_STORAGE_KEY = "paper-manager-table-columns";

export const TABLE_COLUMN_DEFS = [
  { key: "title", label: "Name", required: true },
  { key: "journal", label: "Journal" },
  { key: "year", label: "Year" },
  { key: "addedAt", label: "添加时间" },
  { key: "authors", label: "Authors" },
  { key: "expand", label: "Summary" },
  { key: "action", label: "Action", required: true },
];

export function defaultTableColumnPrefs() {
  return TABLE_COLUMN_DEFS.map((col) => ({
    key: col.key,
    visible: true,
  }));
}

export function loadTableColumnPrefs() {
  try {
    const raw = localStorage.getItem(TABLE_COLUMN_STORAGE_KEY);
    if (!raw) return defaultTableColumnPrefs();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultTableColumnPrefs();
    const known = new Map(TABLE_COLUMN_DEFS.map((c) => [c.key, c]));
    const out = [];
    for (const item of parsed) {
      if (!item?.key || !known.has(item.key)) continue;
      out.push({ key: item.key, visible: item.visible !== false });
    }
    for (const col of TABLE_COLUMN_DEFS) {
      if (!out.some((x) => x.key === col.key)) {
        out.push({ key: col.key, visible: true });
      }
    }
    for (const col of TABLE_COLUMN_DEFS) {
      if (col.required) {
        const hit = out.find((x) => x.key === col.key);
        if (hit) hit.visible = true;
      }
    }
    return out;
  } catch {
    return defaultTableColumnPrefs();
  }
}

export function saveTableColumnPrefs(prefs) {
  localStorage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify(prefs));
}

export function isColumnRequired(key) {
  return TABLE_COLUMN_DEFS.find((c) => c.key === key)?.required === true;
}

export function columnLabel(key) {
  return TABLE_COLUMN_DEFS.find((c) => c.key === key)?.label || key;
}
