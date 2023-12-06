import React from 'react';
import { Space, Table, Tag } from 'antd';


const createColumns = (deleteFile) => [
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
    dataIndex: 'path',
    key: 'path',
    defaultSortOrder: 'descend',
  },
  // {
  //   title: 'Address',
  //   dataIndex: 'address',
  //   key: 'address',
  // },
  // {
  //   title: 'Tags',
  //   key: 'tags',
  //   dataIndex: 'tags',
  //   render: (_, { tags }) => (
  //     <>
  //       {tags.map((tag) => {
  //         let color = tag.length > 5 ? 'geekblue' : 'green';
  //         if (tag === 'loser') {
  //           color = 'volcano';
  //         }
  //         return (
  //           <Tag color={color} key={tag}>
  //             {tag.toUpperCase()}
  //           </Tag>
  //         );
  //       })}
  //     </>
  //   ),
  // },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a onClick={() => {
          // console.log(record.key)
          deleteFile(record.key)
        }}>Delete </a>
      </Space>
    ),
  },
];

const onChange = (pagination, filters, sorter, extra) => {
  console.log('params', pagination, filters, sorter, extra);
};
const ItemList = ({ items, openFile, deleteFile }) => {
  // console.log(items)
  const results = items.map(file => ({
    ...file,
    key: file.path + "\\" + file.name,
  }));
  // console.log(results)
  // console.log(items)
  const columns = createColumns(deleteFile);
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
      onChange={onChange}
      expandable={{
      expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.path}</p>,
      }}
    />
  )
}

export default ItemList;