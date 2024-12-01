import "./App.css";
import React, { useState, useEffect } from "react";
import {
  Layout,
  Button,
  Flex,
  Upload,
  message,
  Input,
  Modal,
  Row,
  Col,
  Typography,
  ColorPicker,
  theme,
  Select,
  Form,
  Space,
  Checkbox,
  Alert,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { generate, presetPalettes } from "@ant-design/colors";
import Category from "./components/Category.js";
import ItemList from "./components/ItemList.js";
const { Header, Sider, Content } = Layout;
const { Dragger } = Upload;
const { Search } = Input;
const { TextArea } = Input;

const buttonItemLayout = {
  wrapperCol: {
    span: 10,
    offset: 10,
  },
};

const getColorValue = (color) => {
  if (color && typeof color === "string") {
    return color;
  } else if (color && color.metaColor && color.metaColor.originalInput) {
    if (typeof color.metaColor.originalInput === "string") {
      return color.metaColor.originalInput;
    } else {
      const originalInput = color.metaColor.originalInput;
      const toHex = (c) => {
        const hex = Math.round(c).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
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
            case 0:
              r = v;
              g = t;
              b = p;
              break;
            case 1:
              r = q;
              g = v;
              b = p;
              break;
            case 2:
              r = p;
              g = v;
              b = t;
              break;
            case 3:
              r = p;
              g = q;
              b = v;
              break;
            case 4:
              r = t;
              g = p;
              b = v;
              break;
            default:
              r = v;
              g = p;
              b = q;
              break;
          }
        }
        return [r * 255, g * 255, b * 255];
      };

      let r, g, b;
      if (
        "h" in originalInput &&
        "s" in originalInput &&
        "v" in originalInput
      ) {
        // HSAV 格式
        [r, g, b] = hsvToRgb(originalInput.h, originalInput.s, originalInput.v);
      } else if (
        "r" in originalInput &&
        "g" in originalInput &&
        "b" in originalInput
      ) {
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
};

function getBaseName(path) {
  // 分割路径字符串
  const parts = path.split(/[/\\]/);
  // 返回路径的最后一部分
  return parts[parts.length - 1];
}

function joinPath(basePath, folderName) {
  // 检查路径是否以斜杠或反斜杠结束
  if (basePath.endsWith("/") || basePath.endsWith("\\")) {
    return basePath + folderName;
  } else {
    // 使用合适的分隔符
    // 在 Node.js 环境中，可以使用 path.sep 获取系统特定的路径分隔符
    const separator = basePath.includes("/") ? "/" : "\\";
    return basePath + separator + folderName;
  }
}

const headerStyle = {
  textAlign: "center",
  color: "#8c8c8c",
  height: "130px",
  backgroundColor: "#f5f5f5",
};
const contentStyle = {
  textAlign: "center",
  minHeight: "200px",
  height: "600px",
  maxHeight: "600px",
  color: "#8c8c8c",
  backgroundColor: "#fff7e6",
};
const siderStyle = {
  textAlign: "center",
  lineHeight: "60px",
  height: "700px",
  color: "#096dd9",
  backgroundColor: "#ffffff",
};

const category_button = {
  color: "#f5f5f5",
  shape: "round",
  size: "large",
  backgroundColor: "#096dd9",
  margin: "5px 0px",
};
const properties = [
  { key: "title", label: "Title", component: TextArea },
  { key: "authors", label: "Authors", component: TextArea },
  { key: "year", label: "Year", component: Input },
  { key: "journal", label: "Journal", component: Input },
];

const genPresets = (presets = presetPalettes) =>
  Object.entries(presets).map(([label, colors]) => ({
    label,
    colors,
  }));

const MyComponent = ({ currentFile, updatedFile, setUpdatedFile }) => {
  const handleInputChange = (key, value) => {
    setUpdatedFile((prev) => ({ ...prev, [key]: value }));
  };

  const renderRow = (key, label, Component) => (
    <Row>
      <Col span={4}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {label}
        </Typography.Title>
      </Col>
      <Col span={10}>
        <Component
          value={currentFile?.[key] || ""}
          autoSize={{ minRows: 2, maxRows: 5 }}
          readOnly
        />
      </Col>
      <Col span={10}>
        <Component
          value={updatedFile?.[key] || ""}
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
          <Typography.Title level={4} style={{ margin: 0 }}>
            Properties
          </Typography.Title>
        </Col>
        <Col span={10}>
          <Typography.Title
            level={4}
            style={{ margin: 0, textAlign: "center" }}
          >
            Original
          </Typography.Title>
        </Col>
        <Col span={10}>
          <Typography.Title
            level={4}
            style={{ margin: 0, textAlign: "center" }}
          >
            Updated File
          </Typography.Title>
        </Col>
      </Row>
      {properties.map((prop) =>
        renderRow(prop.key, prop.label, prop.component)
      )}
    </div>
  );
};

function App() {
  const [Folder, setFolder] = useState([]);
  const [rootFolder, setRootFolder] = useState("");
  const [activeFolder, setActivedFoler] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMove, setIsMove] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [updatedFile, setUpdatedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal2Open, setModal2Open] = useState(false);
  const { token } = theme.useToken();
  const [newColor, setnewColor] = useState(token.colorPrimary);
  const [newCateName, setNewCateName] = useState("");
  const [selectedValue, setSelectedValue] = useState(undefined);
  const [editmodalOpen, setEditmodalOpen] = useState(false);
  const [editCateName, setEditCateName] = useState("");
  const [form] = Form.useForm();
  const [formLayout, setFormLayout] = useState("horizontal");

  const presets = genPresets({
    primary: generate(token.colorPrimary),
  });

  const filterOption = (input, option) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  const folderOptions = Folder.filter(
    (folder) => joinPath(folder.path, folder.name) !== activeFolder
  ).map((folder) => ({
    value: folder.name, // 假设你想要用name作为value
    label: folder.name, // 这里也使用name作为显示的label
  }));
  const handleSearch = (keyword) => {
    if (!keyword) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter((file) =>
        file.title.toLowerCase().includes(keyword.toLowerCase())
      );
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
  }
  async function comfirmCreateColor() {
    const categroyColor = newColor;
    const categoryName = newCateName;
    const result = await window.electronAPI.addFolder(
      rootFolder,
      categoryName,
      categroyColor
    );
    setFolder(result);
    setModal2Open(false);
    setnewColor(token.colorPrimary);
    setNewCateName("");
  }

  async function comfirmEdit() {
    const color = newColor;
    const src = joinPath(rootFolder, newCateName);
    const des = joinPath(rootFolder, editCateName);
    const result = await window.electronAPI.renameFolder(
      src,
      des,
      getColorValue(color)
    );
    setFolder(result);
    setActivedFoler(des);
    setEditmodalOpen(false);
    setnewColor(token.colorPrimary);
    setNewCateName("");
  }
  async function showFolder(folder) {
    const result = await window.electronAPI.listFolder(folder);
    setFiles([...result]);
    setActivedFoler(folder);
  }

  async function addfoler() {
    setnewColor(token.colorPrimary);
    setNewCateName("");
    setModal2Open(true);
  }

  async function editFolder(key, name, color) {
    setNewCateName(name);
    setEditCateName(name);
    setnewColor(color);
    setEditmodalOpen(true);
  }
  async function deleteFolder(folder_name) {
    await window.electronAPI.deleteFolder(folder_name);
    messageApi.success("Delete category successfully!");
    const result = await window.electronAPI.initFolder();
    if (!result) {
      return;
    }
    const folderPath = result.folderPath;
    const folderContents = result.folderContents;
    setFolder(folderContents);
    setActivedFoler(folderContents[0].name);
    setFiles([]);
  }
  async function openFile(file) {
    const result = await window.electronAPI.openFile(file.key);
  }

  async function openFileDirectory(file) {
    window.electronAPI.openFileDirectory(file.key);
    // const result = await window.electronAPI.openFileDirectory(file.key);
  }
  async function moveFile(file) {
    setCurrentFile(file);
    setIsMove(true);
  }

  async function handleMoveCancel() {
    setSelectedValue(undefined);
    setIsMove(false);
  }

  async function deleteFile(file) {
    const result = await window.electronAPI.deleteFile(file.key);
    showFolder(activeFolder);
  }

  async function handleMove() {
    console.log(selectedValue);
    console.log(currentFile);
    console.log(rootFolder);
    const result = await window.electronAPI.moveFile(
      rootFolder,
      selectedValue,
      currentFile
    );
    console.log(result);
    if (result) {
      setIsMove(false);
      showFolder(activeFolder);
      const result = await window.electronAPI.initFolder();
      const folderContents = result.folderContents;
      setFolder(folderContents);
      messageApi.success("Move file successfully!");
      setSelectedValue(undefined);
    }
  }

  const handleOk = () => {
    // 更新 files 状态
    const updatedFiles = [...files];
    const fileIndex = files.findIndex(
      (item) => item.originalname === currentFile.originalname
    );
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...currentFile };
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
      ...currentFile,
      title: currentFile.filename,
      authors: "",
      year: "",
      journal: "",
      summary: "",
      updatedFlag: false,
    };
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...default_file };
    setFiles(updatedFiles);
    setCurrentFile(default_file);
  };
  const handleCancel = () => {
    setIsModalVisible(false);
  };
  async function getInfo(file) {
    setCurrentFile(file);
    // setUpdatedFile(null);
    setIsModalVisible(true);
  }

  async function updateInfo() {
    setIsLoading(true); // 开始加载时设置为 true
    try {
      const result = await window.electronAPI.readPdf(currentFile.path);
      setCurrentFile(result);
    } catch (error) {
      console.error("Error fetching data:", error);
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
        setActivedFoler(folder);
      }
      setFolder(folderContents);
      setRootFolder(folderPath);
    }
    initFolder();
  }, []); // 空数组表示只在组件挂载时调用一次

  return (
    <div className="App ">
      <Layout>
        <Sider style={siderStyle} width="220">
          <Flex vertical gap="small" style={{ width: "100%" }}>
            {/* <Text strong textAlign='left'>Category</Text> */}
            <Flex
              justify="space-between"
              style={{ margin: "15px", alignItems: "center" }}
            >
              <Typography.Title
                level={4}
                style={{
                  margin: 0, // 移除默认的外边距
                  lineHeight: "initial", // 调整行高以匹配按钮高度
                  display: "flex", // 使 Typography 支持 Flexbox 属性
                  alignItems: "center", // 在 Typography 内部垂直居中文本
                  textAlign: "center",
                }}
              >
                My Papers
              </Typography.Title>
              <Button type="primary" onClick={handleEdit}>
                {isEditing ? "Finish" : "Edit"}{" "}
                {/* 根据 isEditing 状态显示不同文本 */}
              </Button>
            </Flex>

            {Folder && Folder.length > 0 && (
              <Category
                categorys={Folder}
                clickFoler={(id) => {
                  showFolder(id.key);
                }}
                onRenameClick={editFolder}
                onDeleteClick={deleteFolder}
                activeFolder={activeFolder}
                isediting={isEditing}
              />
            )}
            <Flex
              vertical
              style={{
                width: "100%",
                padding: "0 10px",
                bottom: 0,
                position: "absolute",
                justify: "center",
              }}
            >
              <Dragger
                // style={{padding:"15px 15px 0px 15px"}}
                width="50%"
                name="file"
                multiple={true}
                customRequest={({ file, onSuccess }) => {
                  const result = window.electronAPI.uploadFile(
                    file.name,
                    file.path,
                    activeFolder
                  );
                  setTimeout(() => {
                    onSuccess("ok");
                  }, 0);
                }}
                onChange={(info) => {
                  const { status } = info.file;
                  if (status !== "uploading") {
                    console.log(info.file, info.fileList);
                  }
                  if (status === "done") {
                    showFolder(activeFolder);
                    message.success(
                      `${info.file.name} file uploaded successfully.`
                    );
                  } else if (status === "error") {
                    message.error(`${info.file.name} file upload failed.`);
                  }
                }}
                onDrop={(e) => {
                  console.log("Dropped files", e.dataTransfer.files);
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Click or drag file to this area to upload to current category.
                </p>
              </Dragger>
              {!isEditing && (
                <Button
                  type="primary"
                  style={category_button}
                  block
                  onClick={opendilog}
                >
                  Open Folder
                </Button>
              )}
              {isEditing && (
                <Button
                  type="primary"
                  style={category_button}
                  block
                  onClick={addfoler}
                >
                  Add Categroy
                </Button>
              )}
            </Flex>
          </Flex>
        </Sider>
        <Layout>
          <Header style={headerStyle}>
            {contextHolder}
            <Row>
              <Search
                style={{
                  padding: "15px 15px 0px 15px",
                }}
                placeholder="Search articles"
                onSearch={onSearch}
                enterButton
              />
            </Row>
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
              width={600}
              onCancel={() => handleCancel(false)}
              confirmLoading={isLoading}
              footer={null}
            >
              {/* <Flex justify="center" align="start" vertical> */}
              <Form
                labelCol={{
                  span: 8,
                }}
                wrapperCol={{
                  span: 16,
                }}
                layout={formLayout}
                form={form}
                initialValues={{
                  layout: formLayout,
                }}
                style={{ maxWidth: 600, margin: "0 auto" }}
              >
                <Form.Item label="Original file name">
                  <Input value={currentFile?.name} readOnly />
                </Form.Item>
                <Form.Item label="Update action">
                  <Space>
                    <Button
                      onClick={updateInfo}
                      type="primary"
                      loading={isLoading}
                    >
                      Update
                    </Button>
                    <Button danger onClick={handleReset}>
                      Reset
                    </Button>
                  </Space>
                </Form.Item>
                <Form.Item label="Status" style={{ maxWidth: 600 }}>
                  {currentFile?.updatedFlag ? (
                    <Alert style={{ maxWidth: 40 }} type="success" showIcon />
                  ) : (
                    <Alert style={{ maxWidth: 40 }} type="warning" showIcon />
                  )}
                </Form.Item>
                <Form.Item label="Title">
                  <Input value={currentFile?.title} />
                </Form.Item>
                <Form.Item label="Authors">
                  <Input value={currentFile?.authors} />
                </Form.Item>
                <Form.Item label="Published date">
                  <Input value={currentFile?.year} />
                </Form.Item>
                <Form.Item label="Journal">
                  <Input value={currentFile?.journal} />
                </Form.Item>
                <Form.Item
                  labelCol={{ span: 4 }}
                  wrapperCol={{
                    span: 8,
                    offset: 8,
                  }}
                >
                  <Checkbox>Rename the paper</Checkbox>
                </Form.Item>
                <Form.Item {...buttonItemLayout}>
                  <Space>
                    <Button type="primary" onClick={handleOk}>
                      Submit
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
              {/* </Flex> */}
            </Modal>
            <Modal
              title="Move Paper to"
              open={isMove}
              onOk={handleMove}
              width={350}
              onCancel={handleMoveCancel}
              confirmLoading={isLoading}
              footer={[
                <Button key="back" onClick={handleMoveCancel}>
                  Cancel
                </Button>,
                <Button
                  key="Comfirm"
                  type="primary"
                  loading={isLoading}
                  onClick={handleMove}
                >
                  Update
                </Button>,
              ]}
            >
              <Select
                style={{
                  width: 300,
                }}
                showSearch
                placeholder="Select a new categroy"
                optionFilterProp="children"
                onSearch={onSearch}
                value={selectedValue}
                onChange={setSelectedValue}
                options={folderOptions}
              />
            </Modal>
            <Modal
              title="Creating new category"
              centered
              open={modal2Open}
              onOk={comfirmCreateColor}
              width={400}
              onCancel={() => setModal2Open(false)}
            >
              <Row align="middle" gutter={[16, 16]}>
                <Col span={8}>Category Name:</Col>
                <Col span={16}>
                  <Input
                    count={{
                      show: true,
                      max: 12,
                    }}
                    defaultValue="New Category"
                    value={newCateName}
                    onChange={(e) => setNewCateName(e.target.value)}
                  />
                </Col>
                <Col span={8}>Category Color:</Col>
                <Col span={16}>
                  <ColorPicker
                    value={newColor}
                    onChange={setnewColor}
                    presets={presets}
                  />
                </Col>
              </Row>
            </Modal>
            <Modal
              title="Edit category"
              centered
              open={editmodalOpen}
              onOk={comfirmEdit}
              width={400}
              onCancel={() => setEditmodalOpen(false)}
            >
              <Row align="middle" gutter={[16, 16]}>
                <Col span={8}>Category Name:</Col>
                <Col span={16}>
                  <Input
                    count={{
                      show: true,
                      max: 12,
                    }}
                    defaultValue="New Category"
                    value={editCateName}
                    onChange={(e) => setEditCateName(e.target.value)}
                  />
                </Col>
                <Col span={8}>Category Color:</Col>
                <Col span={16}>
                  <ColorPicker
                    value={newColor}
                    onChange={setnewColor}
                    presets={presets}
                  />
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
