import React from "react";
import { Space, Table, Tooltip, Popconfirm, Typography } from "antd";
import {
  DeleteOutlined,
  CloudUploadOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";

const createColumns = (openFile, deleteFile, getInfo, openFileDirectory) => [
  {
    title: "Name",
    dataIndex: "title",
    key: "title",
    render: (_, record) => (
      <Typography.Link
        role="button"
        tabIndex={0}
        onClick={() => openFile(record)}
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
  {
    title: "Journal",
    dataIndex: "journal",
    key: "journal",
    width: 90,
  },
  {
    title: "Year",
    dataIndex: "year",
    key: "year",
    sorter: (a, b) =>
      String(a.year || "").localeCompare(String(b.year || "")),
    width: 90,
  },
  {
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
  Table.EXPAND_COLUMN,
  {
    title: "Action",
    key: "action",
    width: 120,
    render: (_, record) => (
      <Space size="middle">
        <Tooltip title="Metadata">
          <CloudUploadOutlined onClick={() => getInfo(record)} />
        </Tooltip>
        <Tooltip title="Delete">
          <Popconfirm
            title="Delete file"
            description="Delete this PDF from disk?"
            onConfirm={() => deleteFile(record)}
            okText="Yes"
            cancelText="No"
          >
            <DeleteOutlined />
          </Popconfirm>
        </Tooltip>
        <Tooltip title="Show in folder">
          <FolderOpenOutlined onClick={() => openFileDirectory(record)} />
        </Tooltip>
      </Space>
    ),
  },
];

const ItemList = ({ items, openFile, deleteFile, getInfo, openFileDirectory }) => (
  <Table
    columns={createColumns(openFile, deleteFile, getInfo, openFileDirectory)}
    rowKey={(row) => row.key || row.path}
    dataSource={items}
    bordered
    pagination={{
      total: items.length,
      showTotal: (total) => `Total ${total} PDFs`,
      pageSize: 15,
      showSizeChanger: true,
    }}
    scroll={{ y: 520 }}
    expandable={{
      expandedRowRender: (record) => (
        <p style={{ margin: 0, textAlign: "left" }}>{record.summary || "—"}</p>
      ),
    }}
  />
);

export default ItemList;
