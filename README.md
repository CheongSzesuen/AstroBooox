<p align="center">
  <img src="public/icon-candidates/secret-icon.png" alt="AstroBooox 图标" width="64" />
</p>
<h1 align="center">AstroBooox</h1>
<p align="center">面向 AstroBox 生态的第三方资源提交与审核工作台，聚焦发布、更新与 PR 协作流程。</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-19-61dafb.svg?style=flat-square&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/typescript-5.8-3178c6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.8">
  <img src="https://img.shields.io/badge/vite-7.2-646cff.svg?style=flat-square&logo=vite&logoColor=white" alt="Vite 7.2">
  <img src="https://img.shields.io/badge/router-spa-0f766e.svg?style=flat-square" alt="SPA Router">
  <img src="https://img.shields.io/badge/ui-shadcn-111827.svg?style=flat-square" alt="shadcn UI">
  <a href="https://github.com/CheongSzesuen/AstroBooox"><img src="https://img.shields.io/github/stars/CheongSzesuen/AstroBooox?style=flat-square&logo=github" alt="GitHub Stars"></a>
  <a href="https://github.com/CheongSzesuen/AstroBooox/commits"><img src="https://img.shields.io/github/last-commit/CheongSzesuen/AstroBooox?style=flat-square" alt="Last Commit"></a>
</p>

---

## 项目简介

AstroBooox 是一个面向 AstroBox 资源提交流程的辅助工具，提供从资源整理、发布到审核相关流程的可视化工作台。  
当前项目已迁移为 React + shadcn UI 体系，并采用单页应用（SPA）路由体验。

## 主要能力

- 资源发布工作台（含步骤引导、日志与表单）
- PR 审核与资源管理工作台
- Token 登录与帮助页
- 兼容 legacy 工具页（manifest / csv / res-link / code-review）

## CC 功能详解

1. **登录与会话**
   - 使用 GitHub Token 登录
   - 校验当前 Token 对应账号并在会话中保存
   - 提供 `/help` Token 创建教程页

2. **发布工作台（`/publish`）**
   - 多步骤流程：仓库绑定、资源信息、预览与提交
   - 支持本地文件夹与远程仓库文件读取
   - 支持 icon / cover / preview 管理、设备选择、标签与资源元数据编辑
   - 提交时自动生成 PR 文案并回显日志

3. **资源更新（`/resource/edit`）**
   - 从已有资源上下文进入更新流程
   - 复用发布工作台核心能力
   - 支持按目标仓库与资源 ID 执行更新提交

4. **等待审核（`/pullrequest`）**
   - 展示待处理 PR 列表
   - 支持查看 PR 详情与跳转审核流程

5. **审核工作台（`/review`）**
   - 代码与资源规范检查
   - 评论流与审查信息聚合
   - 对提交内容、图片链接等规则进行校验提示

6. **资源管理（`/resource`）**
   - 资源列表浏览与详情查看
   - 与更新流程联动，可直接进入编辑更新

7. **仓库与设置**
   - `/repositories`：管理目标仓库与协作者相关信息
   - `/settings`：默认 owner/repo、账号信息、关于页、构建信息

8. **路由体验**
   - 全站采用 SPA 路由
   - 站内跳转仅切换 URL，不整页刷新
   - 顶部进度条反馈页面切换状态

## 在线地址

- 主站：<https://astrobooox-ng.waijade.cn/>
- 旧版legacy：<https://astrobooox-ng.waijade.cn/legacy/>
## 本地开发

1. 克隆仓库
```bash
git clone https://github.com/CheongSzesuen/AstroBooox.git
cd AstroBooox
```

2. 安装依赖
```bash
npm install
```

3. 启动开发环境
```bash
npm run dev
```

4. 生产构建校验
```bash
npm run build
```

## 技术栈

- React 19 + TypeScript
- Vite
- shadcn/ui（Radix UI）
- phosphor-icons + lucide

## 仓库贡献者

<a href="https://github.com/CheongSzesuen/AstroBooox/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=CheongSzesuen/AstroBooox" />
</a>

## 活动
![Alt](https://repobeats.axiom.co/api/embed/479d4ca796d862ca55daa77f69988ae15e956096.svg "Repobeats analytics image")

## 免责声明

**重要说明**

本项目**不是 AstroSightStudios 官方项目**，为第三方开发者维护的工具。  
本项目使用到的网站图标与部分视觉素材来源于 AstroBox 生态官方项目，版权归原项目及其作者所有。
