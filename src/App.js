import './App.css';
import React, { useState, useEffect } from 'react'
import { Layout, Space, Button, Flex, Table, Upload, message, Input, Drawer, Modal } from 'antd'
import { InboxOutlined } from '@ant-design/icons';
import Initstate from './utils/Initstate.js'
import Category from './components/Category.js'
import ItemList from './components/ItemList.js'
import DragAndDropArea from './components/Drag.js'
const { Header, Footer, Sider, Content } = Layout
const { Dragger } = Upload;
const { Search } = Input;

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
// const props = {
//   name: 'file',
//   multiple: true,
//   // action: 'https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188',
//   customRequest: ({ file, onSuccess }) => {
//     const result = window.electronAPI.uploadFile(file);
//     console.log(file);
//     setTimeout(() => {
//       onSuccess("ok");
//     }, 0);
//   },
//   onChange(info) {
//     const { status } = info.file;
//     if (status !== 'uploading') {
//       console.log(info.file, info.fileList);
//     }
//     if (status === 'done') {
//       message.success(`${info.file.name} file uploaded successfully.`);
//     } else if (status === 'error') {
//       message.error(`${info.file.name} file upload failed.`);
//     }
//   },
//   onDrop(e) {
//     console.log('Dropped files', e.dataTransfer.files);
//   },
// };
const onSearch = (value, _e, info) => console.log(info?.source, value);


function App() {

  const [Folder, setFolder] = useState([]);
  const [rootFolder, setRootFolder] = useState("");
  const [activeFolder, setActivedFoler] = useState("");
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
    // const folderContents = result.folderContents;
    console.log(result);
    setFiles(result);
    setActivedFoler(folder);
  };

  async function onRenameClick(src, des) {
    // 更新类别的名字
    const result = await window.electronAPI.renameFolder(src, des);
    setFolder(result)
    setActivedFoler(des);
  }
  async function addfoler() {
    const result = await window.electronAPI.addFolder(rootFolder);
    // const folderContents = result.folderContents;
    setFolder(result)
  };
  async function openFile(file) {
    const result = await window.electronAPI.openFile(activeFolder + "\\" + file);
  };
  async function deleteFile(file) {
    const result = await window.electronAPI.deleteFile(file);
    showFolder(activeFolder);
  }


  const handleOk = () => {
    // 更新 files 状态
    const updatedFiles = [...files];
    const fileIndex = files.findIndex((item) => (item.path + '\\' + item.name) === currentFile);
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...updatedFile };
    console.log(files, currentFile);
    console.log(updatedFiles);
    setFiles(updatedFiles);
    setIsModalVisible(false);
  };

  const handleCancel = () => {

    setIsModalVisible(false);
  };
  async function getInfo(file) {
    setCurrentFile(file);
    setIsModalVisible(true);
    setIsLoading(true); // 开始加载时设置为 true

    try {
        const result = await window.electronAPI.readPdf(file);
        setUpdatedFile(result);
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        setIsLoading(false); // 加载完成或发生错误时设置为 false
    }
  }

  useEffect(() => {
    async function initFolder() {
      const result = await window.electronAPI.initFolder();
      const folderPath = result.folderPath;
      const folderContents = result.folderContents;
      setFolder(folderContents);
      setRootFolder(folderPath);
    };
    initFolder();
    //   // 调用异步函数
    //   fetchFiles();
  }, []); // 空数组表示只在组件挂载时调用一次

  // // 根据加载状态渲染不同的内容
  // if (loading) {
  //   return 

  return (
    <div className="App ">
      <Layout>
        <Sider style={siderStyle}>

          <Flex vertical gap="small" style={{ width: '100%' }}>
            <Search placeholder="input search text" onSearch={onSearch} enterButton />

            <Category
              categorys={Folder}
              clickFoler={(id) => { showFolder(id.key); }}
              onRenameClick={(src, des) => { onRenameClick(src, des) }}
            />
            <Flex vertical style={{ width: '100%', bottom: 0, position: "absolute", }}>
              <Button type="primary" style={category_button} block onClick={opendilog} >
                导入文献
              </Button>
              <Button type="primary" style={category_button} block onClick={addfoler}>
                增加类别
              </Button>
            </Flex>
            {/* <div>
              <DragAndDropArea />
            </div> */}
            {/* <Button type="primary" style={buttonStyle} block>
          Primary
        </Button> */}
          </Flex>
        </Sider>
        <Layout>
          <Header style={headerStyle}>
            <Dragger
              name='file'
              multiple={true}
              customRequest={({ file, onSuccess }) => {
                const result = window.electronAPI.uploadFile(file.name, file.path, activeFolder);
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
                  showFolder(activeFolder)
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
              // activeFolder={activeFolder}
              />
            }
            <Modal
              title="Update File Information"
              open={isModalVisible}
              onOk={handleOk}
              onCancel={() => handleCancel(false)}
              confirmLoading={isLoading}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3>Original File</h3>
                  {/* 在这里渲染 currentFile 的内容 */}
                  <p>{currentFile?.name}</p>
                  {/* 其他信息 */}
                </div>
                <div>
                  <h3>Updated File</h3>
                  {/* 在这里渲染 updatedFile 的内容 */}
                  <p>{updatedFile?.name}</p>
                  {/* 其他信息 */}
                </div>
              </div>
            </Modal>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}

export default App;
