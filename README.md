
## todo list

- [x] 基本功能：支持论文点击打开，删除。按论文名排序，按时间排序。
- [x] arxiv论文信息获取
- [x] 论文数据本地持久化
- [x] 类别增加，类别删除，类别颜色
- [x] 基于crossref的论文信息获取
- [x] 属性重命名
- [x] 可执行文件构建
- [x] 论文文件移动
- [ ] chatgpt接入
- [ ] 论文顺序拖拽移动

# 开发日志：

1/8: 为修改文件夹名创新了新的窗口，修复了部分数据库bug

1/7: 新建类别UI设计、功能实现完成。实现论文文件移动功能，部分显示bug修复。

1/2: 重新设计了增加类别的UI界面，新增类别时将可以指定类别颜色和类别名称，但功能仍在开发过程中。

12/30: 重新设计UI界面，增加了类别删除功能，增加了简单匹配搜索功能，可根据输入信息与当前类别下文件匹配。现在更新文章信息时，更新结果可编辑。自动打包功能发布功能已调试完毕。

12/13: 再次优化UI界面，完善打包过程和自动发布流程。

12/12: 尝试github actioin ci工具，目前仍存在一些问题，但本地构建已经成功。

12/11：修复各种bug,使用db管理默认配置。增加部分条件的空判定。

12/10：增加打开论文所在文件夹功能，现在对于arxiv论文可以完整的进行论文信息更新功能，其他默认用crossref,但准确性很低，优化代码可读性，优化软件界面效果，在更新论文界面可以点击reset重置论文信息。其他来源论文暂时无法更新论文信息。

12/09：持久化查询数据，实现了论文信息更新后保存在本地，下次打开时可以直接读取本地数据库，而不需要重新获取，优化表格渲染显示。修改原始python arxiv接口，改成使用arxiv api获取论文信息。固定表格最大高度，增加滚动。

12/08：实现了对arxiv模式匹配的论文id号，获取作者并渲染的功能。

12/07: 表格对齐问题解决。新增文件夹功能添加,文件夹重命名功能。

12/06: 对表格进行美化，实现了文件删除，导入文件、删除文件时刷新，表格美化，重写ant design的上传方法从而将文件可以拖拽传入文件夹内
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.
