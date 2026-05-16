# Item list (`ItemList.jsx`)

## Role

Displays the **PDF table** for the current filter (entire library, subtree, or single file) using Ant Design `Table`.

## Columns

- **Name** — `Typography.Link` opens the PDF with the default application. Sortable by `title`.
- **Journal / Year / Authors** — metadata columns; authors use `ellipsis` + `Tooltip`.
- **Expand** — `Table.EXPAND_COLUMN`; expanded row shows `summary` (abstract) when present.
- **Action** — metadata modal (`getInfo`), delete with confirmation, reveal in Explorer/Finder.

## Row identity

`rowKey={(row) => row.key || row.path}` uses the absolute file path.

## Pagination

Client-side pagination with configurable page size; vertical scroll keeps headers visible.
