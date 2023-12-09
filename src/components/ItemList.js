import React,{ useState } from 'react';
import { Space, Table, Tag,Pagination,Tooltip,Drawer,Popconfirm } from 'antd';
import {
  DeleteOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';


const createColumns = (deleteFile,getInfo) => [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.name.localeCompare(b.name),
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
          console.log(record,'record');
          getInfo(record.key)
        }}/>
        </Tooltip>
          <Tooltip placement="top" title="删除">
          <Popconfirm
            title="Delete the task"
            description="Are you sure to delete this task?"
            onConfirm={() => deleteFile(record.key)}
            okText="Yes"
            cancelText="No"
          >
            <DeleteOutlined />
          </Popconfirm>
                  
        </Tooltip>
      </Space>
    ),
  },
];

// const onChange = (pagination, filters, sorter, extra) => {
//   console.log('params', pagination, filters, sorter, extra);
// };
const ItemList = ({ items, openFile, deleteFile,getInfo }) => {

  
  // console.log(items)
  const results = items.map(file => ({
    ...file,
    key: file.path + "\\" + file.name,
  }));
  // console.log(results)
  const columns = createColumns(deleteFile,getInfo);
  return (
    <Table
      onRow={(record) => {
        return {
          onClick: (event) => {
            if (event.target.innerText && event.target.innerText.endsWith('.pdf')) {
              openFile(event.target.innerText);
            }
          }, // 点击行
          onDoubleClick: (event) => { },
          onContextMenu: (event) => { },
          onMouseEnter: (event) => { }, // 鼠标移入行
          onMouseLeave: (event) => { },
        };
      }}
      columns={columns}
      dataSource={results}
      bordered
      pagination={
        {total:items.length,
        showTotal:(total) => `Total ${total} items`,
        defaultPageSize:30,
        pageSize:7,
        defaultCurrent:1}
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