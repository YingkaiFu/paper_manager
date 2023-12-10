import React, { useState } from 'react';
import { Space, Table, Tag, Pagination, Tooltip, Drawer, Popconfirm } from 'antd';
import {
  DeleteOutlined,
  CloudUploadOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';


const createColumns = (openFile, deleteFile, getInfo, openFileDirectory) => [
  {
    title: 'Name',
    dataIndex: 'title',
    key: 'title',
    render: (_, record) => <a onClick={() => { openFile(record) }}>{record.title}</a>,
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.title.localeCompare(b.title),
    width: 400,
  },
  {
    title: 'Journal',
    dataIndex: 'journal',
    key: 'journal',
    width: 90,
  },
  {
    title: 'Year',
    dataIndex: 'year',
    key: 'year',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.year.localeCompare(b.year),
    width: 90,
  },
  {
    title: 'Authors',
    dataIndex: 'authors',
    key: 'authors',
    defaultSortOrder: 'descend',
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
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <Tooltip placement="top" title="更新">
          <CloudUploadOutlined onClick={() => {
            getInfo(record);
          }} />
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
          <FolderOpenOutlined onClick={() => {
            openFileDirectory(record);
          }} />
        </Tooltip>
      </Space>
    ),
  },
];


const ItemList = ({ items, openFile, deleteFile, getInfo, openFileDirectory }) => {

  const columns = createColumns(openFile, deleteFile, getInfo, openFileDirectory);
  return (
    <Table

      columns={columns}
      dataSource={items}
      bordered
      pagination={
        {
          total: items.length,
          showTotal: (total) => `Total ${total} items`,
          defaultPageSize: 30,
          pageSize: 7,
          defaultCurrent: 1
        }
      }
      scroll={{
        y: 500,
      }}
      // onChange={onChange}
      expandable={{
        expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.summary}</p>,
      }}

    />
  )
}

export default ItemList;