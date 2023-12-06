import './App.css';
import React, { useState, useEffect } from 'react'
import { Layout, Space, Button, Flex, Table,Upload,message,Input } from 'antd'
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
  height: 100,
  paddingInline: 50,
  lineHeight: '64px',
  backgroundColor: '#f5f5f5',
};
const contentStyle = {
  textAlign: 'center',
  minHeight: 400,
  lineHeight: '120px',
  color: '#8c8c8c',
  backgroundColor: '#fff7e6',
};
const siderStyle = {
  textAlign: 'center',
  lineHeight: '120px',
  color: '#8c8c8c',
  backgroundColor: '#f6ffed',
};

const category_button = {
  color: '#f5f5f5',
  shape: "round",
  size: "large",
  backgroundColor: '#096dd9',
  margin: '5px 0px',

};

const dragger_style={
  height: 50,
}

const props = {
  name: 'file',
  multiple: true,
  action: 'https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188',
  onChange(info) {
    const { status } = info.file;
    if (status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (status === 'done') {
      message.success(`${info.file.name} file uploaded successfully.`);
    } else if (status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  },
  onDrop(e) {
    console.log('Dropped files', e.dataTransfer.files);
  },
};
const onSearch = (value, _e, info) => console.log(info?.source, value);


function App() {

  // const changeFoler = (id)=>{
  //   setActivedFoler(id);
  // }
  const [Folder, setFolder] = useState([]);
  
  const [activeFolder, setActivedFoler] = useState("");

  // const database = window.electronAPI.listFolder(activeFolder);
  // const ItemList = Folder.map((item) => {
  //   return  database
  // })
  // async function getFolerItems(folder) {
  //   const result = await window.electronAPI.listFolder(folder);
  //   return result
  // }
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  // 定义状态来保存文件信息
  async function opendilog() {
    const result = await window.electronAPI.openDialog();
    if (result){
    const folderPath = result.folderPath;
    const folderContents = result.folderContents;
    setFolder(folderContents)
    }
  };

  async function showFolder(folder) {
    console.log(folder);
    const result = await window.electronAPI.listFolder(folder);
    // const folderContents = result.folderContents;
    // console.log(folderContents);
    setFiles(result);
    setActivedFoler(folder);
  };

  async function initFolder() {
    const result = await window.electronAPI.initFolder();
    const folderPath = result.folderPath;
    const folderContents = result.folderContents;
    setFolder(folderContents);
  };

  initFolder();
  async function openFile(file) {
    const result = await window.electronAPI.openFile(activeFolder+"\\"+file);
  };
  
  // useEffect(() => {
  //   // 异步函数用来获取文件夹内文件的信息
  //   const fetchFiles = async () => {
  //     try {
  //       // 调用异步函数获取文件信息
  //       const filesData = await window.electronAPI.listFolder(activeFolder); // 替换成你的实际异步函数调用

  //       // 将获取到的文件信息保存在状态中
  //       setFiles(filesData);
  //     } catch (error) {
  //       console.error('Error fetching files:', error);
  //     } finally {
  //       // 数据加载完成，设置loading为false
  //       setLoading(false);
  //     }
  //   };

  //   // 调用异步函数
  //   fetchFiles();
  // }, []); // 空数组表示只在组件挂载时调用一次

  // // 根据加载状态渲染不同的内容
  // if (loading) {
  //   return 
  // }

  return (
    <div className="App ">
      <Layout>
        <Sider style={siderStyle}>
          
          <Flex vertical gap="small" style={{ width: '100%' }}>
          <Search placeholder="input search text" onSearch={onSearch} enterButton />

            <Category
              categorys={Folder}
              clickFoler={(id) => { showFolder(id.key); }}
            // clickFoler={listFoler}
            />
            <Flex vertical style={{ width: '100%', bottom: 0, position: "absolute", }}>
              <Button type="primary" style={category_button} block onClick={opendilog} >
                导入文献
              </Button>
              <Button type="primary" style={category_button} block>
                增加类别
              </Button>
            </Flex>
            <div>
              <DragAndDropArea />
            </div>
            {/* <Button type="primary" style={buttonStyle} block>
          Primary
        </Button> */}
          </Flex>
        </Sider>
        <Layout>
          <Header style={headerStyle}>
          <Dragger {...props} style={dragger_style}>
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
              // activeFolder={activeFolder}
              />
            }
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}

export default App;
