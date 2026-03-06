# CC React 全量重构执行文档（唯一工作清单）

最后更新：2026-03-07

## 目标
- 仅优先完成 `cc` 全页面 React 重构，主站页面暂缓。
- 保证功能与行为与 Vue 版一致（路径、交互、数据、错误提示、移动端布局）。
- UI 必须使用 shadcn 体系实现，不回退旧 Vue 组件。

## 参考来源（功能真值）
- 首选参考工程：`/home/WaiJade/Documents/GitHub/AstroBooox/AstroBooox-AstroBooox-NG`
- 当前仓库 Vue 实现参考：
  - `src/cc/App.vue`
  - `src/cc/CcTokenGate.vue`
  - `src/components/ResourcePublishWorkbench.vue`
  - `src/components/review/*`
  - `src/components/PreviewImageCarousel.vue`
  - `src/components/LinkIconPickerDialog.vue`

## 强制约束
- 每次改动后必须执行：`npm run build`
- 每次改动后必须提交：`git commit`
- 提交信息用中文，遵循 `type(scope): subject`
- 不修改参考目录（只读）：
  - `homepage/`
  - `ui/`
  - `vue/`
  - `ui-thing/`
  - `secret/`
  - `next-shadcn-dashboard-starter/`
  - `AstroBooox-AstroBooox-NG/`

## 页面与功能清单（按优先级）

### P0：登录与路由基础
- [ ] `/cc/login` Token 登录页完整迁移（含 GitHub 注册提示卡）
- [ ] `/cc` 路由状态机完整迁移（`cc_path` 兼容）
- [ ] 头部导航、移动端抽屉、主题切换、用户菜单迁移

### P0：发布工作台（最重）
- [ ] 步骤导航、文件树、日志区迁移
- [ ] 本地 workspace / 远程 repo 文件选择与同步迁移
- [ ] 资源信息表单迁移（ID/名称/类型/付费/描述/tags）
- [ ] icon/cover/preview 上传与预览迁移
- [ ] preview 轮播、删除、toast 撤销栈迁移（sonner）
- [ ] 作者、links、下载设备矩阵迁移
- [ ] 提交流程（上传、创建 PR、结果回显）迁移

### P0：审核与资源管理
- [ ] `/cc/review` 列表、详情、评论流迁移
- [ ] `/cc/resource` 资源列表与详情迁移
- [ ] 资源详情预览组件复用（与 review 一致）
- [ ] `/cc/resource/edit` 更新资源工作台迁移

### P1：仓库与设置
- [ ] `/cc/repositories` 仓库管理与协作者邀请迁移
- [ ] `/cc/settings` 默认仓库、账号、关于迁移

### P1：帮助页
- [x] `/cc/help` Token 教程页迁移完成

## 技术落地约束（React）
- 路由：`react-router-dom`
- UI：shadcn（React 组件）
- 图标：沿用原有两套图标库（phosphor + lucide），不新增第三套
- 提示：sonner
- 样式：复用现有 `src/style.css` 变量体系

## 验收标准
- 与 Vue 版功能点逐条对齐，差异必须记录在本文件。
- 移动端紧凑布局必须可用（含窄屏 filetree、cover、preview）。
- 每个迁移批次至少包含：
  - 构建通过
  - 路由可访问
  - 关键交互自测记录

## 提交节奏
- 每完成一个可运行子模块提交一次（小步快跑）。
- 推荐范围：
  - `feat(cc): 迁移登录与路由壳层`
  - `feat(cc): 迁移发布工作台步骤一`
  - `feat(cc): 迁移预览轮播与删除撤销`
  - `feat(cc): 迁移审核评论流`
  - `feat(cc): 迁移资源管理与编辑`
