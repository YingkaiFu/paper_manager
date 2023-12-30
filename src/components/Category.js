import React, { useState } from 'react';
import { Space, Layout, Menu, Input, Row, Col,Popconfirm } from 'antd';
import { EditOutlined,DeleteOutlined,CloseOutlined,CheckOutlined,RightOutlined } from '@ant-design/icons';

function renameFolderPath(originalPath, newName) {
  const lastBackslashIndex = originalPath.lastIndexOf('\\');
  if (lastBackslashIndex === -1) {
    // 如果没有找到反斜杠，说明路径不是有效的 Windows 路径
    return null;
  }
  return originalPath.substring(0, lastBackslashIndex + 1) + newName;
}

const Category = ({ categorys, clickFoler, onRenameClick, onDeleteClick,activeFolder, isediting}) => {

  const [editingKey, setEditingKey] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleEdit = (category) => {
    const key = category.path + "\\" + category.name;
    setEditingKey(key);
    setEditingName(category.name);
  };

  const handleSave = (key) => {
    const des = renameFolderPath(key, editingName);
    onRenameClick(key, des);
    setEditingKey(null);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
  };

  const handleDelete = (category) => {
    const key = category.path + "\\" + category.name;
    onDeleteClick(key);
  };

  return (
    <Menu
      mode="inline"
      defaultSelectedKeys={activeFolder}
      onClick={(e) => {
        if (editingKey !== e.key) {
          clickFoler(e);
        }
      }}
      theme="light"
      items={
        categorys.map((category) => {
          const isEditing = editingKey === category.path + "\\" + category.name;
          return {
            key: category.path + "\\" + category.name,
            label: isEditing ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onPressEnter={() => handleSave(category.path + "\\" + category.name)}
                onBlur={() => handleSave(category.path + "\\" + category.name)}
                addonAfter={
                  <span>
                    <CheckOutlined onClick={() => handleSave(category.path + "\\" + category.name)} />
                    <CloseOutlined onClick={handleCancelEdit} style={{ marginLeft: 10 }} />
                  </span>
                }
              />
            ) : (
              <Row justify="space-between" align="middle">
                <Col>
                  {category.name}
                </Col>
                {isediting ?(
                  <Col>
                  <EditOutlined
                    style={{ marginLeft: 10 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(category);
                    }}
                  />
                  <Popconfirm
                    title="Delete the folder"
                    description= {`${category.pdfCount} files are in this folder.`}
                    onConfirm={(e) => {
                      e.stopPropagation();
                      handleDelete(category);}}
                    okText="Yes"
                    cancelText="No"
                  > 
                  <DeleteOutlined
                    style={{ marginLeft: 10 }}
                  />
                  </Popconfirm>
                  </Col>
                  ):(
                    <Col style={{ color: 'gray' }}>
                      {category.pdfCount}<RightOutlined />
                    </Col>
                  )
                }
              </Row>
            )
          };
        })
      }
    />
  );
};

export default Category;