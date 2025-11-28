# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个基于 Next.js 的仿生阅读器 (Bionic Reader) 应用，通过加粗单词前半部分来提升阅读速度和专注度。用户可以点击单词播放发音并查看词典释义。

## Common Commands

### Development
```bash
npm run dev          # 启动开发服务器 (http://localhost:3000)
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
```

### Testing & Linting
```bash
npm run test         # 运行测试 (vitest)
npm run test:watch   # 监听模式运行测试
npm run lint         # 运行 ESLint 检查
```

## Architecture

### Core Modules

**仿生阅读渲染** (`lib/paragraphs.ts` + `components/Paragraph.tsx`)
- 使用 `tokenize()` 函数将文本拆分为单词和标点
- `renderBionicWord()` 根据加粗比例渲染单词（支持 `low`/`medium`/`high`）
- `Paragraph` 组件实时渲染仿生阅读效果，支持单词点击交互

**音频播放** (`stores/audioStore.ts`)
- 使用 Zustand 管理全局音频状态
- 支持段落音频生成、播放、暂停、顺序播放
- 音频通过 Gemini TTS API 生成，存储到 Vercel Blob

**设置管理** (`lib/settings.ts` + `contexts/SettingsContext.tsx`)
- 使用 React Context 进行全局状态管理
- 设置自动持久化到 `localStorage`，防抖延迟 500ms
- `DEFAULT_SETTINGS` 包含字体大小、行高、段落间距、主题等
- `applySettings()` 通过 CSS 变量 (`--font-size`, `--line-height` 等) 动态应用设置
- 支持三种主题：`sepia` (默认), `white`, `dark`

**单词发音** (`lib/wordAudio.ts`)
- 使用有道词典 API 播放单词发音
- 共享单个 `HTMLAudioElement` 实例以优化性能

**词典查询** (`app/api/dictionary/route.ts`)
- 服务端 API 路由，调用有道词典 JSON API
- 返回音标 (美/英)、词性释义、网络翻译
- `normalizeYoudaoResponse()` 处理复杂的 API 响应结构

### Component Structure

**主页面** (`app/page.tsx`)
- 管理所有顶层状态：原文输入、设置面板开关、词典面板状态
- 响应式布局：桌面端默认展开设置面板，移动端默认收起
- 处理单词选中事件并触发发音与词典查询
- 使用 `AbortController` 管理并发查询请求

**ReadingArea 组件** (`components/ReadingArea.tsx`)
- 将文本分割为段落并渲染为 `Paragraph` 组件
- 管理段落音频生成和播放状态
- 集成 `MiniPlayer` 控制音频播放

**SettingsPanel 组件** (`components/SettingsPanel.tsx`)
- 提供所有阅读设置的 UI 控制
- 响应式设计：移动端全屏遮罩，桌面端侧边栏

**DictionaryPanel 组件** (`components/DictionaryPanel.tsx`)
- 显示单词释义、音标、网络翻译
- 桌面端：浮动在单词上方 (使用 `anchor` 定位)
- 移动端：底部抽屉式面板

### Key Patterns

1. **Client Components** - 所有交互组件使用 `"use client"` 指令
2. **CSS Modules** - 页面级样式使用 CSS Modules (`page.module.css`)
3. **Settings via CSS Variables** - 设置通过 CSS 变量应用，避免内联样式
4. **Local Storage Sync** - 设置自动持久化，防抖避免频繁写入
5. **API Routes** - 词典查询通过 Next.js API 路由代理，避免 CORS 问题

## Testing

- 测试框架：Vitest
- 运行测试：`npm run test`

## Important Notes

- 仿生阅读只支持英文单词 (拉丁字母)
- 词典 API 依赖有道服务，无备用方案
- 设置面板在桌面端 (≥1025px) 默认展开，移动端 (≤768px) 默认收起
- 单词包含连字符和撇号的变体 (如 "don't", "self-aware")
