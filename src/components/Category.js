import React ,{ useState } from 'react';
import { Space,Layout, Menu,Input,Row, Col} from 'antd';
import {EditOutlined} from '@ant-design/icons';

function renameFolderPath(originalPath, newName) {
  const lastBackslashIndex = originalPath.lastIndexOf('\\');
  if (lastBackslashIndex === -1) {
      // 如果没有找到反斜杠，说明路径不是有效的 Windows 路径
      return null;
  }
  return originalPath.substring(0, lastBackslashIndex + 1) + newName;
}

const Category = ({categorys,clickFoler,onRenameClick}) => {

  const [editingKey, setEditingKey] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleEdit = (category) => {
      const key = category.path+"\\"+category.name
      setEditingKey(key);
      setEditingName(category.name);
      console.log(key);
  };

  const handleSave = (key) => {
      // 在这里调用 onRenameClick 传递新的名字和 key
      const des = renameFolderPath(key, editingName);
      onRenameClick(key, des);
      console.log(key,des);
      setEditingKey(null);
  };

    return (
        <Menu
          mode="inline"
          defaultSelectedKeys={['1']}
          onClick={clickFoler}
          theme="light"
          items={
            categorys.map((category) => ({
              key: category.path+"\\"+category.name,
              label: editingKey === category.path + "\\" + category.name ? (
                <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onPressEnter={() => handleSave(category.path + "\\" + category.name)}
                    onBlur={() => handleSave(category.path + "\\" + category.name)}
                />
            ) : (
            <Row justify="space-between" align="middle">
              <Col>
                {category.name}
              </Col>
              <Col>
                <EditOutlined
                  style={{ marginLeft: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(category);
                  }}
                />
              </Col>
            </Row>
              )
            }),
          )}
        />
    )
}

export default Category;