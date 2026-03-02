# Repository Guidelines

## 交流与协作规则
- 与用户交流必须使用**简体中文**，且语言必须**简练**。
- 讨论方案、提交说明、PR 描述建议统一中文；代码注释可按场景中英混用，但需可读。

## 用户新增协作要求（最高优先级）
- 每次完成代码修改后，需主动执行 `npm run build` 进行校验。
- 每次完成代码修改后，需**主动执行** `git commit`（提交信息遵循既有前缀规范）。
- 所有与 Git 相关的信息（提交说明、提交摘要、变更说明、PR 文案）统一使用中文描述。

## 当前重构状态（强制）
- 本项目正在进行**完全重构**，旧 UI 方案逐步废弃。
- UI 组件体系统一迁移到 **shadcn** 思路与组件规范。
- 图标库统一迁移到 **phosphor-icons**，不再新增其他图标来源。
- 根目录已放置参考仓库：`ui/`（shadcn/ui）与 `homepage/`、`vue/`（phosphor 相关）。开发时优先参考这些仓库实现与用法。

## 项目结构与模块组织
- 主应用代码在 `src/`：入口 `src/main.ts`，路由在 `src/router/index.ts`。
- 页面与业务组件在 `src/components/`，布局在 `src/layouts/`。
- 工具函数在 `src/utils/`，类型定义在 `src/type/`。
- 静态资源分为 `src/assets/`（参与构建）与 `public/`（原样拷贝）。

## 构建、运行与验证命令
- `npm install`：安装依赖。
- `npm run dev`：启动本地开发环境。
- `npm run build`：执行 `vue-tsc -b && vite build`，作为提交前必跑检查。
- `npm run preview`：预览生产构建结果。

## 编码规范与命名
- 技术栈：Vue 3 + TypeScript（`strict` 开启）。
- 保持现有风格：2 空格缩进、单引号、默认不写分号。
- 组件文件使用 `PascalCase.vue`，工具模块使用 `camelCase.ts`。
- 路由路径使用小写 kebab-case（如 `code-review`、`res-link`）。

## 提交与 PR 规范
- 沿用现有提交前缀：`feat:`、`fix:`、`refactor:`、`chore:`。
- 提交信息格式统一为：`type(scope): subject`，可包含 body。
- `type` 建议使用：`feat`、`fix`、`refactor`、`chore`；`scope` 使用受影响模块英文标识（如 `cc`、`publish`、`navbar`）。
- 单次提交只做一类改动；PR 需写清变更点、影响范围与手动验证结果。
- 涉及 UI 变更时，附截图或录屏；涉及迁移时，说明旧实现是否已替换完毕。
