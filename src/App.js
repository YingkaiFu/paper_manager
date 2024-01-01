import './App.css';
import React, { useState, useEffect } from 'react';
import { Layout, Space, Button, Flex, Table, Upload, message, Input, Drawer, Modal, Row, Col, Typography } from 'antd';
import { InboxOutlined,FolderAddOutlined } from '@ant-design/icons';
import Category from './components/Category.js';
import ItemList from './components/ItemList.js';

const { Header, Footer, Sider, Content } = Layout;
const { Dragger } = Upload;
const { Search } = Input;
const { TextArea } = Input;
const { Text, Link } = Typography;

const headerStyle = {
  textAlign: 'center',
  color: '#8c8c8c',
  height: "130px",
  backgroundColor: '#f5f5f5',
};
const contentStyle = {
  textAlign: 'center',
  minHeight: "200px",
  height: "600px",
  maxHeight: "600px",
  color: '#8c8c8c',
  backgroundColor: '#fff7e6',
};
const siderStyle = {
  textAlign: 'center',
  lineHeight: '60px',
  height: "700px",
  color: '#096dd9',
  backgroundColor: '#ffffff',
};

const category_button = {
  color: '#f5f5f5',
  shape: "round",
  size: "large",
  backgroundColor: '#096dd9',
  margin: '5px 0px',

};

const properties = [
  { key: 'title', label: 'Title', component: TextArea },
  { key: 'authors', label: 'Authors', component: TextArea },
  { key: 'year', label: 'Year', component: Input },
  { key: 'journal', label: 'Journal', component: Input },
];

const MyComponent = ({ currentFile, updatedFile, setUpdatedFile }) => {
  const handleInputChange = (key, value) => {
    setUpdatedFile(prev => ({ ...prev, [key]: value }));
  };

  const renderRow = (key, label, Component) => (
    <Row>
      <Col span={4}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {label}
        </Typography.Title>
      </Col>
      <Col span={10}>
        <Component value={currentFile?.[key] || ''} autoSize={{ minRows: 2, maxRows: 5 }} readOnly />
      </Col>
      <Col span={10}>
        <Component
          value={updatedFile?.[key] || ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          autoSize={{ minRows: 2, maxRows: 5 }}
        />
      </Col>
    </Row>
  );

  return (
    <div>
      <Row>
        <Col span={4}>
          <Typography.Title level={4} style={{ margin: 0 }}>Properties</Typography.Title>
        </Col>
        <Col span={10}>
          <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>Original</Typography.Title>
        </Col>
        <Col span={10}>
          <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>Updated File</Typography.Title>
        </Col>
      </Row>
      {properties.map(prop => renderRow(prop.key, prop.label, prop.component))}
    </div>
  );
};

function App() {

  const [Folder, setFolder] = useState([]);
  const [rootFolder, setRootFolder] = useState("");
  const [activeFolder, setActivedFoler] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMove, setIsMove] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [updatedFile, setUpdatedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const [filteredFiles, setFilteredFiles] = useState([]);

  const handleSearch = (keyword) => {
    if (!keyword) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file => file.title.toLowerCase().includes(keyword.toLowerCase()));
      setFilteredFiles(filtered);
    }
  };
  // 定义状态来保存文件信息
  async function opendilog() {
    const result = await window.electronAPI.openDialog();
    if (result) {
      const folderPath = result.folderPath;
      const folderContents = result.folderContents;
      setRootFolder(folderPath);
      setFolder(folderContents);
    }
  };

  async function showFolder(folder) {
    const result = await window.electronAPI.listFolder(folder);
    setFiles([...result]);
    setActivedFoler([folder]);
  };

  async function onRenameClick(src, des) {
    // 更新类别的名字
    const result = await window.electronAPI.renameFolder(src, des);
    setFolder(result);
    setActivedFoler([des]);
  }
  async function addfoler() {
    const result = await window.electronAPI.addFolder(rootFolder);
    // const folderContents = result.folderContents;
    setFolder(result);
  };
  async function deleteFolder(folder_name){
    await window.electronAPI.deleteFolder(folder_name);
    const result = await window.electronAPI.initFolder();
    if (!result) {
      return;
    }
    const folderPath = result.folderPath;
    const folderContents = result.folderContents;
    setFolder(folderContents);
  }
  async function openFile(file) {
    const result = await window.electronAPI.openFile(file.key);
  };

  async function openFileDirectory(file) {
    window.electronAPI.openFileDirectory(file.key);
    // const result = await window.electronAPI.openFileDirectory(file.key);
  };
  async function moveFile(file) {
    setCurrentFile(file);
    console.log(file);
    setIsMove(true);
  };

  async function moveCancel() {
    setIsMove(false);
  }

  async function deleteFile(file) {
    const result = await window.electronAPI.deleteFile(file.key);
    showFolder(activeFolder[0]);
  }

  const handleMove = () => {
    
  }

  const handleOk = () => {
    // 更新 files 状态
    const updatedFiles = [...files];
    const fileIndex = files.findIndex((item) => item.path === currentFile.path);
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...updatedFile };
    setFiles(updatedFiles);
    setIsModalVisible(false);
  };
  const handleEdit = () => {
    // 更新 files 状态
    setEditing(!isEditing);
  };

  const onSearch = (value) => handleSearch(value);

  const handleReset = () => {
    // 更新 files 状态
    const updatedFiles = [...files];

    const fileIndex = files.findIndex((item) => item.path === currentFile.path);
    const default_file = {
      title: currentFile.filename,
      authors: '',
      year: '',
      journal: '',
    };
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...default_file };
    setFiles(updatedFiles);
    setIsModalVisible(false);
  };
  const handleCancel = () => {

    setIsModalVisible(false);
  };
  async function getInfo(file) {
    setCurrentFile(file);
    setUpdatedFile(null);
    setIsModalVisible(true);
    setIsLoading(true); // 开始加载时设置为 true
    try {
      const result = await window.electronAPI.readPdf(file.path);
      setUpdatedFile(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false); // 加载完成或发生错误时设置为 false
    }
  }
  // const handleChange = (e) => {
  //   setMyValue(e.target.value);
  // };
  useEffect(() => {
    setFilteredFiles(files);
  }, [files]);

  useEffect(() => {
    async function initFolder() {
      const result = await window.electronAPI.initFolder();
      if (!result) {
        return;
      }
      const folderPath = result.folderPath;
      const folderContents = result.folderContents;
      const folder = result.lastfolder;
      if (folder) {
        const folers = await window.electronAPI.listFolder(folder);
        setFiles(folers);
        setActivedFoler([folder]);
      }
      setFolder(folderContents);
      setRootFolder(folderPath);
    };
    initFolder();

  }, []); // 空数组表示只在组件挂载时调用一次


  return (
    <div className="App ">
      <Layout>
        <Sider style={siderStyle} width="220">

          <Flex vertical gap="small" style={{ width: '100%' }}>
            {/* <Text strong textAlign='left'>Category</Text> */}
            <Flex justify="space-between" style={{ margin: "15px", alignItems: 'center' }}>
              <Typography.Title
                level={4}
                style={{
                  margin: 0, // 移除默认的外边距
                  lineHeight: 'initial', // 调整行高以匹配按钮高度
                  display: 'flex', // 使 Typography 支持 Flexbox 属性
                  alignItems: 'center', // 在 Typography 内部垂直居中文本
                  textAlign: "center",
                }}
              >
                My Papers
              </Typography.Title>
              <Button type="primary" onClick={handleEdit} >
                  {isEditing ? 'Finish' : 'Edit'} {/* 根据 isEditing 状态显示不同文本 */}
              </Button>
            </Flex>
            
            {Folder && Folder.length > 0 && (
              <Category
                categorys={Folder}
                clickFoler={(id) => { showFolder(id.key); }}
                onRenameClick={(src, des) => { onRenameClick(src, des); }}
                onDeleteClick={deleteFolder}
                activeFolder={activeFolder}
                isediting={isEditing}
              />
            )}
            <Flex vertical style={{ width: '100%',padding: '0 10px',bottom: 0, position: "absolute", justify:"center"}}>
            <Dragger
                // style={{padding:"15px 15px 0px 15px"}}
                width="50%"
                name='file'
                multiple={true}
                customRequest={({ file, onSuccess }) => {
                  const result = window.electronAPI.uploadFile(file.name, file.path, activeFolder[0]);
                  setTimeout(() => {
                    onSuccess("ok");
                  }, 0);
                }}
                onChange={(info) => {
                  const { status } = info.file;
                  if (status !== 'uploading') {
                    console.log(info.file, info.fileList);
                  }
                  if (status === 'done') {
                    showFolder(activeFolder[0]);
                    message.success(`${info.file.name} file uploaded successfully.`);
                  } else if (status === 'error') {
                    message.error(`${info.file.name} file upload failed.`);
                  }
                }}
                onDrop={(e) => {
                  console.log('Dropped files', e.dataTransfer.files);
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag file to this area to upload to current category.</p>
              </Dragger>
              {!isEditing && <Button type="primary" style={category_button} block onClick={opendilog} >
                Open Folder
              </Button>}
              {isEditing && <Button type="primary" style={category_button} block onClick={addfoler}>
                Add Categroy
              </Button>
              }
            </Flex>
          </Flex>
        </Sider>
        <Layout>
          <Header style={headerStyle}>
            <Row>
              <Search 
            style={{
              padding:"15px 15px 0px 15px"
            }}
            placeholder="Search articles" onSearch={onSearch} enterButton />
            </Row>
            {/* <Col span={12}>
              </Col> */}
          </Header>
          <Content style={contentStyle}>
            {
              <ItemList
                items={filteredFiles}
                openFile={openFile}
                deleteFile={deleteFile}
                getInfo={getInfo}
                openFileDirectory={openFileDirectory}
                moveFile={moveFile}
              />
            }
            <Modal
              title="Update File Information"
              open={isModalVisible}
              onOk={handleOk}
              width={900}
              onCancel={() => handleCancel(false)}
              confirmLoading={isLoading}
              footer={[
                <Button key="back" onClick={handleCancel}>
                  Cancel
                </Button>,
                <Button key="Reset" type="primary" danger onClick={handleReset}>
                  Reset
                </Button>,
                <Button key="Comfirm" type="primary" loading={isLoading} onClick={handleOk}>
                  Update
                </Button>,
              ]}
            >
            <MyComponent
              currentFile={currentFile}
              updatedFile={updatedFile}
              setUpdatedFile={setUpdatedFile}
            />
            </Modal>
            <Modal
              title="Move Paper"
              open={isMove}
              onOk={handleMove}
              width={400}
              onCancel={() => moveCancel(false)}
              confirmLoading={isLoading}
              footer={[
                <Button key="back" onClick={moveCancel}>
                  Cancel
                </Button>,
                <Button key="Comfirm" type="primary" loading={isLoading} onClick={handleOk}>
                  Update
                </Button>,
              ]}
             >
              <Row>
                <Col span={12}>
                  Source Path
                </Col>
                <Col span={12}>
                  Destinate Path
                </Col>
              </Row>
              <Row>
                <Col span={12}>
                {setIsMove && currentFile?.category}
                </Col>
                <Col span={12}>
                  good
                </Col>
              </Row>
             </Modal>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}

export default App;
