# AstroBooox

一个基于Vue 3的Web应用，提供Manifest编辑器和CSV生成器功能。

## 功能特性

- Manifest.json编辑器：可视化编辑Web应用清单(manifest.json)
- CSV：生成和转换CSV语句
- 响应式设计：适配各种屏幕尺寸
- 现代化UI：使用MiSans字体和现代设计元素

## 技术栈

- 前端框架：Vue 3 + TypeScript
- 构建工具：Vite
- 路由管理：Vue Router
- 代码编辑器：Monaco Editor

## 开发指南

1. 项目结构：
```
src/
├── components/      # 组件
│   ├── CSVEGenerator.vue  # CSV/JSON生成器
│   ├── JsonPreview.vue    # JSON预览器
│   └── ManifestEditor.vue # Manifest编辑器
├── layouts/         # 布局组件
│   └── MainLayout.vue # 主布局
├── router/          # 路由配置
│   └── index.ts
├── type/            # 类型定义
│   └── manifest.ts
└── main.ts          # 应用入口
```

2. 主要开发依赖：
- vue-tsc: 用于TypeScript类型检查
- monaco-editor: 代码编辑器组件
- @types/web-app-manifest: manifest类型定义

