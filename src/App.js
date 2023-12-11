import './App.css';
import React, { useState, useEffect } from 'react'
import { Layout, Space, Button, Flex, Table, Upload, message, Input, Drawer, Modal, Row, Col, Typography } from 'antd'
import { InboxOutlined } from '@ant-design/icons';
import Initstate from './utils/Initstate.js'
import Category from './components/Category.js'
import ItemList from './components/ItemList.js'
import DragAndDropArea from './components/Drag.js'
const { Header, Footer, Sider, Content } = Layout
const { Dragger } = Upload;
const { Search } = Input;
const { TextArea } = Input;
const { Text, Link } = Typography;

const headerStyle = {
  textAlign: 'center',
  color: '#8c8c8c',
  height: "100px",
  // paddingInline: 50,
  lineHeight: '64px',
  backgroundColor: '#f5f5f5',
};
const contentStyle = {
  textAlign: 'center',
  minHeight: "200px",
  height: "600px",
  maxHeight: "600px",
  lineHeight: '60px',
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

const onSearch = (value, _e, info) => console.log(info?.source, value);

const properties = [
  { key: 'title', label: 'Title', component: TextArea },
  { key: 'authors', label: 'Authors', component: TextArea },
  { key: 'year', label: 'Year', component: Input },
  { key: 'journal', label: 'Journal', component: Input },
];

const MyComponent = ({ currentFile, updatedFile }) => {
  const renderRow = (key, label, Component) => (
    <Row>
      <Col span={4}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {label}
        </Typography.Title>
      </Col>
      <Col span={10}>
        <Component value={currentFile?.[key] || ''} autoSize={{ minRows: 2, maxRows: 5 }} />
      </Col>
      <Col span={10}>
        <Component value={updatedFile?.[key] || ''} autoSize={{ minRows: 2, maxRows: 5 }} />
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
  const [currentFile, setCurrentFile] = useState(null);
  const [updatedFile, setUpdatedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 定义状态来保存文件信息
  async function opendilog() {
    const result = await window.electronAPI.openDialog();
    if (result) {
      const folderPath = result.folderPath;
      const folderContents = result.folderContents;
      setRootFolder(folderPath);
      setFolder(folderContents)
    }
  };

  async function showFolder(folder) {
    const result = await window.electronAPI.listFolder(folder);
    setFiles(result);
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
    setFolder(result)
  };
  async function openFile(file) {
    const result = await window.electronAPI.openFile(file.key);
  };

  async function openFileDirectory(file) {
    window.electronAPI.openFileDirectory(file.key);
    // const result = await window.electronAPI.openFileDirectory(file.key);
  };
  async function deleteFile(file) {
    const result = await window.electronAPI.deleteFile(file.key);
    showFolder(activeFolder[0]);
  }


  const handleOk = () => {
    // 更新 files 状态
    const updatedFiles = [...files];
    const fileIndex = files.findIndex((item) => item.path === currentFile.path);
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...updatedFile };
    setFiles(updatedFiles);
    setIsModalVisible(false);
  };
  const handleReset = () => {
    // 更新 files 状态
    const updatedFiles = [...files];

    const fileIndex = files.findIndex((item) => item.path === currentFile.path);
    const default_file = {
      title: currentFile.filename,
      authors: '',
      year: '',
      journal: '',
    }
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...default_file };
    setFiles(updatedFiles);
    setIsModalVisible(false);
  };
  const handleCancel = () => {

    setIsModalVisible(false);
  };
  async function getInfo(file) {
    setCurrentFile(file);
    setUpdatedFile(null)
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
    async function initFolder() {
      const result = await window.electronAPI.initFolder();
      console.log(result, 'ddd');
      if (!result) {
        return;
      }
      const folderPath = result.folderPath;
      const folderContents = result.folderContents;
      const folder = result.lastfolder;
      if (folder) {
        const folers = await window.electronAPI.listFolder(folder);
        setFiles(folers);
        setActivedFoler([folers]);
      }
      setFolder(folderContents);
      setRootFolder(folderPath);
    };
    initFolder();

  }, []); // 空数组表示只在组件挂载时调用一次


  return (
    <div className="App ">
      <Layout>
        <Sider style={siderStyle}>

          <Flex vertical gap="small" style={{ width: '100%' }}>
            <Search placeholder="input search text" onSearch={onSearch} enterButton />
            {Folder && Folder.length > 0 && (
              <Category
                categorys={Folder}
                clickFoler={(id) => { showFolder(id.key); }}
                onRenameClick={(src, des) => { onRenameClick(src, des) }}
                activeFolder={activeFolder}
              />
            )}
            <Flex vertical style={{ width: '100%', bottom: 0, position: "absolute", }}>
              <Button type="primary" style={category_button} block onClick={opendilog} >
                打开文件夹
              </Button>
              <Button type="primary" style={category_button} block onClick={addfoler}>
                增加类别
              </Button>
            </Flex>
          </Flex>
        </Sider>
        <Layout>
          <Header style={headerStyle}>
            <Dragger
              name='file'
              multiple={true}
              customRequest={({ file, onSuccess }) => {
                const result = window.electronAPI.uploadFile(file.name, file.path, activeFolder[0]);
                console.log(file);
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
                  showFolder(activeFolder[0])
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
              {/* <p className="ant-upload-text">Upload</p> */}
            </Dragger>
          </Header>
          <Content style={contentStyle}>
            {/* {
            loading && <p>Loading...</p>
          } */}
            {
              <ItemList
                items={files}
                openFile={openFile}
                deleteFile={deleteFile}
                getInfo={getInfo}
                openFileDirectory={openFileDirectory}
              // activeFolder={activeFolder}
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
              >
              </MyComponent>
            </Modal>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}

export default App;
