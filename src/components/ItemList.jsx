import React, { useMemo } from "react";
import { Space, Table, Tooltip, Popconfirm, Typography } from "antd";
import {
  DeleteOutlined,
  CloudUploadOutlined,
  FolderOpenOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";

function buildColumnMap(
  openFile,
  deleteFile,
  getInfo,
  openFileDirectory,
  favoritePaths,
  onToggleFavorite
) {
  return {
    title: {
      title: "Name",
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <Typography.Link
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            openFile(record);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFile(record);
            }
          }}
        >
          {record.title}
        </Typography.Link>
      ),
      sorter: (a, b) =>
        String(a.title || "").localeCompare(String(b.title || "")),
      width: 360,
    },
    journal: {
      title: "Journal",
      dataIndex: "journal",
      key: "journal",
      width: 90,
    },
    year: {
      title: "Year",
      dataIndex: "year",
      key: "year",
      sorter: (a, b) =>
        String(a.year || "").localeCompare(String(b.year || "")),
      width: 90,
    },
    addedAt: {
      title: "添加时间",
      dataIndex: "addedAt",
      key: "addedAt",
      width: 110,
      sorter: (a, b) =>
        String(a.addedAt || "").localeCompare(String(b.addedAt || "")),
      render: (value) => value || "—",
    },
    authors: {
      title: "Authors",
      dataIndex: "authors",
      key: "authors",
      ellipsis: { showTitle: false },
      width: 200,
      render: (author) => (
        <Tooltip placement="topLeft" title={author}>
          {author}
        </Tooltip>
      ),
    },
    expand: Table.EXPAND_COLUMN,
    action: {
      title: "Action",
      key: "action",
      width: 150,
      render: (_, record) => {
        const path = record.path || record.key;
        const favorited = favoritePaths.has(path);
        return (
          <Space size="middle">
            <Tooltip title={favorited ? "Remove from favorites" : "Add to favorites"}>
              {favorited ? (
                <StarFilled
                  style={{ color: "#faad14" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(record);
                  }}
                />
              ) : (
                <StarOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(record);
                  }}
                />
              )}
            </Tooltip>
            <Tooltip title="Metadata">
              <CloudUploadOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  getInfo(record);
                }}
              />
            </Tooltip>
            <Tooltip title="Delete">
              <Popconfirm
                title="Delete file"
                description="Delete this PDF from disk?"
                onConfirm={() => deleteFile(record)}
                okText="Yes"
                cancelText="No"
              >
                <DeleteOutlined onClick={(e) => e.stopPropagation()} />
              </Popconfirm>
            </Tooltip>
            <Tooltip title="Show in folder">
              <FolderOpenOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  openFileDirectory(record);
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  };
}

const ItemList = ({
  items,
  openFile,
  deleteFile,
  getInfo,
  openFileDirectory,
  selectedPath,
  favoritePaths,
  onToggleFavorite,
  columnPrefs,
}) => {
  const columns = useMemo(() => {
    const map = buildColumnMap(
      openFile,
      deleteFile,
      getInfo,
      openFileDirectory,
      favoritePaths,
      onToggleFavorite
    );
    return columnPrefs
      .filter((pref) => pref.visible)
      .map((pref) => map[pref.key])
      .filter(Boolean);
  }, [
    columnPrefs,
    openFile,
    deleteFile,
    getInfo,
    openFileDirectory,
    favoritePaths,
    onToggleFavorite,
  ]);

  const showExpand = columnPrefs.some((p) => p.key === "expand" && p.visible);

  return (
    <Table
      columns={columns}
      rowKey={(row) => row.key || row.path}
      dataSource={items}
      bordered
      rowClassName={(row) =>
        selectedPath && (row.path === selectedPath || row.key === selectedPath)
          ? "paper-row-selected"
          : ""
      }
      onRow={(record) => ({
        onClick: () => openFile(record),
        style: { cursor: "pointer" },
      })}
      pagination={{
        total: items.length,
        showTotal: (total) => `Total ${total} PDFs`,
        pageSize: 15,
        showSizeChanger: true,
      }}
      scroll={{ y: 520 }}
      expandable={
        showExpand
          ? {
              expandedRowRender: (record) => (
                <p style={{ margin: 0, textAlign: "left" }}>{record.summary || "—"}</p>
              ),
            }
          : undefined
      }
    />
  );
};

export default ItemList;
