import React, { useState } from "react";
import {
  Space,
  Table,
  Tag,
  Pagination,
  Tooltip,
  Drawer,
  Popconfirm,
} from "antd";
import {
  DeleteOutlined,
  CloudUploadOutlined,
  FolderOpenOutlined,
  ScissorOutlined,
} from "@ant-design/icons";

const createColumns = (
  openFile,
  deleteFile,
  getInfo,
  openFileDirectory,
  moveFile
) => [
  {
    title: "Name",
    dataIndex: "title",
    key: "title",
    render: (_, record) => (
      <a
        onClick={() => {
          openFile(record);
        }}
      >
        {record.title}
      </a>
    ),
    sorter: (a, b) => a.title.localeCompare(b.title),
    width: 380,
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
    // defaultSortOrder: 'descend',
    sorter: (a, b) => a.year.localeCompare(b.year),
    width: 90,
  },
  {
    title: "Authors",
    dataIndex: "authors",
    key: "authors",
    defaultSortOrder: "descend",
    ellipsis: {
      showTitle: false,
    },
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
    render: (_, record) => (
      <Space size="middle">
        <Tooltip placement="top" title="更新">
          <CloudUploadOutlined
            onClick={() => {
              getInfo(record);
            }}
          />
        </Tooltip>
        <Tooltip placement="top" title="删除">
          <Popconfirm
            title="Delete the task"
            description="Are you sure to delete this task?"
            onConfirm={() => deleteFile(record)}
            okText="Yes"
            cancelText="No"
          >
            <DeleteOutlined />
          </Popconfirm>
        </Tooltip>
        <Tooltip placement="top" title="打开文件夹">
          <FolderOpenOutlined
            onClick={() => {
              openFileDirectory(record);
            }}
          />
        </Tooltip>
        <Tooltip placement="top" title="移动">
          <ScissorOutlined
            onClick={() => {
              moveFile(record);
            }}
          />
        </Tooltip>
      </Space>
    ),
  },
];
const rowSelection = {
  onChange: (selectedRowKeys, selectedRows) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      "selectedRows: ",
      selectedRows
    );
  },
  getCheckboxProps: (record) => ({
    disabled: record.name === "Disabled User",
    // Column configuration not to be checked
    name: record.name,
  }),
};

const ItemList = ({
  items,
  openFile,
  deleteFile,
  getInfo,
  openFileDirectory,
  moveFile,
}) => {
  const [selectionType, setSelectionType] = useState("checkbox");
  const columns = createColumns(
    openFile,
    deleteFile,
    getInfo,
    openFileDirectory,
    moveFile
  );
  return (
    <Table
      rowSelection={{
        type: selectionType,
        ...rowSelection,
      }}
      columns={columns}
      dataSource={items}
      bordered
      pagination={{
        total: items.length,
        showTotal: (total) => `Total ${total} items`,
        defaultPageSize: 30,
        pageSize: 7,
        defaultCurrent: 1,
      }}
      scroll={{
        y: 500,
      }}
      // onChange={onChange}
      expandable={{
        expandedRowRender: (record) => (
          <p style={{ margin: 0 }}>{record.summary}</p>
        ),
      }}
    />
  );
};

export default ItemList;
