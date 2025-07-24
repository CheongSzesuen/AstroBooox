# AstroBooox - 提交数据生成工具

AstroBooox 是一个用于生成AstroBox应用提交数据的工具，支持 Manifest 和 CSV 两种模式，帮助开发者快速创建符合规范的提交数据。

## 功能特性

- **双模式支持**：支持 Manifest JSON 和 CSV 两种数据格式
- **可视化编辑**：提供直观的界面编辑应用信息
- **文件系统集成**：支持直接选择项目文件夹
- **响应式设计**：适配不同设备尺寸
- **数据验证**：自动验证输入数据的有效性

## 技术栈

- Vue 3 + TypeScript
- Vite 构建工具
- File System Access API
- OPFS API

## 项目结构

```
AstroBooox
├── index.html
├── package.json
├── package-lock.json
├── public
│   ├── favicon.svg
│   ├── fonts
│   │   ├── woff
│   │   └── woff2
│   └── vite.svg
├── README.md
├── src
│   ├── App.vue
│   ├── assets
│   │   └── vue.svg
│   ├── components
│   │   ├── CSVEGenerator.vue #CSV编辑页面
│   │   ├── Footer.vue        #Footer组件
│   │   ├── JsonPreview.vue   #Json实时预览组件
│   │   ├── ManifestEditor.vue #manifest编辑组件
│   │   └── NavBar.vue          #nab组件
│   ├── layouts
│   │   └── MainLayout.vue     #布局组件
│   ├── main.ts
│   ├── router
│   │   └── index.ts
│   ├── style.css
│   ├── type
│   │   └── manifest.ts
│   └── vite-env.d.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```
## 在线使用
[AstroBooox](https://astrobooox.pages.dev/) 在线网站，由CloudFlare pages托管和部署。
## 本地安装与运行

1. 克隆仓库
   ```bash
   git clone https://github.com/CheongSzesuen/AstroBooox.git
   cd AstroBooox
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动开发服务器
   ```bash
   npm run dev
   ```

4. 构建生产版本
   ```bash
   npm run build
   ```

## 使用说明

1. 选择项目文件夹（Manifest 模式）
2. 填写应用基本信息
3. 添加下载项和预览图
4. 生成并导出数据

## 注意事项

- Manifest 模式在手机设备上不可用
- 部分浏览器可能需要启用实验性功能才能使用文件系统 API（FSA API）
- 建议使用最新版 Chrome 或 Edge 浏览器
