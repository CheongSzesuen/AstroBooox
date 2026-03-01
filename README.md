# AstroBooox - 提交数据生成工具

AstroBooox 是一个用于生成AstroBox应用提交数据的工具，支持 Manifest 和 CSV 两种模式，帮助开发者快速创建符合规范的AstroBox资源提交数据。

## 功能特性

- **双模式支持**：支持 Manifest JSON 和 CSV 两种数据格式
- **可视化编辑**：提供直观的界面编辑应用信息
- **文件系统集成**：支持直接选择项目文件夹
- **响应式设计**：适配不同设备尺寸
- **数据验证**：自动验证输入数据的有效性

## 技术栈

- Vue 3 + TypeScript
- Vite 构建工具
- shadcn 风格 UI 组件体系（Vue）
- phosphor-icons 图标库（`@phosphor-icons/vue`）
- File System Access API
- OPFS API

## 项目结构

```bash
.
├── App.vue
├── assets
│   └── vue.svg
├── components
│   ├── CSVEGenerator.vue     #CSV语句生成页面
│   ├── Footer.vue           #页脚组件 
│   ├── JsonPreview.vue      #JSON预览组件
│   ├── ManifestEditor.vue   #Manifest编辑页面
│   ├── NavBar.vue           #导航栏组件
│   └── ResLinkGenerator.vue #资源链接和徽标代码生成页面
├── layouts
│   └── MainLayout.vue
├── main.ts
├── router
│   └── index.ts
├── style.css
├── type
│   └── manifest.ts
└── vite-env.d.ts
```

## 在线使用
[AstroBooox](https://astrobooox.pages.dev/) 在线网站，由CloudFlare pages托管和部署，需要梯子。
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

3. 配置 GitHub Token（仅本地）
   ```bash
   cp .env.example .env.local
   ```
   在 `.env.local` 中设置 `VITE_GITHUB_TOKEN`，不要提交真实密钥。

4. 启动开发服务器
   ```bash
   npm run dev
   ```

5. 构建生产版本
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
