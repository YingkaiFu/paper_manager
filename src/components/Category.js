import React, { useState } from 'react';
import { Space, Layout, Menu, Input, Row, Col,Popconfirm,Badge } from 'antd';
import { EditOutlined,DeleteOutlined,CloseOutlined,CheckOutlined,RightOutlined } from '@ant-design/icons';

function renameFolderPath(originalPath, newName) {
  const lastBackslashIndex = originalPath.lastIndexOf('\\');
  if (lastBackslashIndex === -1) {
    // 如果没有找到反斜杠，说明路径不是有效的 Windows 路径
    return null;
  }
  return originalPath.substring(0, lastBackslashIndex + 1) + newName;
}

const getColorValue = (color) => {
  if (color && typeof color === 'string') {
    return color;
  }
  else if (
    color &&
    color.metaColor  &&
    color.metaColor.originalInput
  ) {

    if (typeof color.metaColor.originalInput === 'string'){
      return color.metaColor.originalInput;}
      else{

    const originalInput = color.metaColor.originalInput;
    const toHex = c => {
      const hex = Math.round(c).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };


    // HSAV 到 RGBA 的转换
    const hsvToRgb = (h, s, v) => {
      let r, g, b, i, f, p, q, t;
      if (s === 0) {
        r = g = b = v;
      } else {
        h /= 60;
        i = Math.floor(h);
        f = h - i;
        p = v * (1 - s);
        q = v * (1 - s * f);
        t = v * (1 - s * (1 - f));
        switch (i) {
          case 0: r = v; g = t; b = p; break;
          case 1: r = q; g = v; b = p; break;
          case 2: r = p; g = v; b = t; break;
          case 3: r = p; g = q; b = v; break;
          case 4: r = t; g = p; b = v; break;
          default: r = v; g = p; b = q; break;
        }
      }
      return [r * 255, g * 255, b * 255];
    };

    let r, g, b;
    if ('h' in originalInput && 's' in originalInput && 'v' in originalInput) {
      // HSAV 格式
      [r, g, b] = hsvToRgb(originalInput.h, originalInput.s, originalInput.v);
    } else if ('r' in originalInput && 'g' in originalInput && 'b' in originalInput) {
      // RGB 格式
      r = originalInput.r * 255;
      g = originalInput.g * 255;
      b = originalInput.b * 255;
    } else {
      return null; // 格式不正确
    }


    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
}

const Category = ({ categorys, clickFoler, onRenameClick, onDeleteClick,activeFolder, isediting}) => {

  const [editingKey, setEditingKey] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleEdit = (category) => {
    const key = category.path + "\\" + category.name;
    onRenameClick(key, category.name,getColorValue(category.color));
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
            label:  (
              <Row justify="space-between" align="left">
                <Col>
                <span style={{
                  display: 'inline-block',
                  width: '10px', // 颜色区域的宽度
                  height: '30px', // 颜色区域的高度
                  backgroundColor: getColorValue(category.color), // 设置背景颜色为 category 的颜色
                  marginRight: '5px', // 右侧的间隔
                  verticalAlign: 'middle', // 垂直对齐
                }}></span>
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