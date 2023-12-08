import React,{ useState } from 'react';
import { Space, Table, Tag,Pagination } from 'antd';


const createColumns = (deleteFile,getInfo) => [
  {
    title: 'Item',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.name - b.name,
  },
  Table.EXPAND_COLUMN,
  {
    title: 'Author',
    dataIndex: 'author',
    key: 'author',
    defaultSortOrder: 'descend',
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a onClick={() => {
          // console.log(record.key)
          getInfo(record.key)
        }}>Update </a>
        <a onClick={() => {
          // console.log(record.key)
          deleteFile(record.key)
        }}>Delete </a>
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
  // console.log(items)
  const columns = createColumns(deleteFile,getInfo);
  return (
    <Table
      onRow={(record) => {
        return {
          onClick: (event) => {
            if (event.target.innerText.endsWith('.pdf')) {
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
      pagination={
        {total:items.length,
        showTotal:(total) => `Total ${total} items`,
        defaultPageSize:20,
        pageSize:5,
        defaultCurrent:1}
      }
      // onChange={onChange}
      expandable={{
      expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.path}</p>,
      }}
      
    />
  )
}

export default ItemList;