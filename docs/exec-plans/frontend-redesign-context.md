# 前端重设计交接上下文

日期：2026-05-31

## 目标

这份文档记录当前前端重设计方向、用户反馈、实现现场和验证结果，方便设计专家基于 repo 内上下文重新设计阅读工作台。

## 产品方向

这个应用是英文阅读与学习工作台。目标布局接近 IDE：

- 左侧：文章管理，支持展开和折叠，形态接近文件资源管理器。
- 中间：顶部保留紧凑原文输入区，下方作为主要阅读区。
- 右侧：工具区，承载查词、AI 解释、朗读、设置等能力。

核心流程：

1. 粘贴或加载文章。
2. 保存文章或从文章管理中选择文章。
3. 在中间阅读区阅读。
4. 点击单词并在右侧使用工具。

## 需要保留的用户反馈

- 组件采用平面化处理，阴影值保持为 `0`。
- 主要容器通过留白、层级和背景色区分，边框值保持为 `0`。
- 页面层级保持扁平，卡片嵌套数量保持为 `0`。
- 按钮数量做减法，重复动作合并到更少的位置。
- 解释性文案只保留功能标签、状态、错误和必要提示。
- 顶部页面标题区域、当前文章区域已经从目标方向中移除。
- 原文输入区承担粘贴入口功能，视觉权重低于阅读区。
- 左侧文章管理支持折叠，结构可以继续向文件树模型发展。
- 右侧工具区和左侧文章管理保持清晰分工。
- 折叠、设置、播放、保存、新建、搜索、删除等常见动作优先使用图标。
- 全局圆角系统保持统一。
- 整体视觉保持 IDE 式、克制、密集、可扫描。

## 当前实现现场

当前工作区已经推进到三栏工作台方向：

- `app/page.tsx` 负责文章状态、原文输入、阅读区、词典、AI 解释、设置、音频控制的编排。
- `app/page.module.css` 定义主工作台布局。
- `components/ArticleManager.tsx` 承载左侧文章管理。
- `components/ReadingArea.tsx` 承载中间阅读区域。
- `components/DictionaryPanel.tsx`、`components/AiExplainPanel.tsx`、`components/SettingsPanel.tsx`、`components/MiniPlayer.tsx` 承载右侧工具和播放流程。

当前布局参数：

- 左侧文章栏宽度：`320px`；折叠宽度：`56px`。
- 右侧工具栏宽度：`320px`；折叠宽度：`56px`。
- 中间区域为紧凑原文输入区 + 主要阅读区。
- 文章操作已经收敛为保存、新建、单篇文章菜单。
- 工具区包含词典、AI 解释、朗读、设置。
- 已引入 `lucide-react` 作为界面图标库。

当前圆角系统：

- 大工作区和大文本输入：`8px`。
- 按钮、搜索框、菜单、图标控制：`6px`。
- 小标签、分段控制、进度元素、紧凑状态点：`4px`。

## 验证记录

最新本地视觉 QA 截图：

- `.codex-screenshots/reading-ide-radius-system.png`

最新自动检查通过：

- `npm run lint`
- `npm run test -- --passWithNoTests`

最新浏览器计算样式审计：

```json
{
  "articleCollapseButton": { "borderRadius": "6px", "height": "40px", "width": "40px" },
  "articleSidebar": { "borderRadius": "8px", "width": "320px" },
  "generateButton": { "borderRadius": "6px", "height": "40px" },
  "newButton": { "borderRadius": "6px", "height": "44px" },
  "saveButton": { "borderRadius": "6px", "height": "44px" },
  "searchInput": { "borderRadius": "6px" },
  "settingsButton": { "borderRadius": "6px", "height": "40px" },
  "sourceTextarea": { "borderRadius": "8px" },
  "toolCollapseButton": { "borderRadius": "6px", "height": "40px", "width": "40px" },
  "toolSidebar": { "borderRadius": "8px", "width": "320px" }
}
```

## 设计约束

- 视觉表面保持平面化。
- 容器分隔主要依靠空间、背景层级、状态色和排版密度。
- 重复面板保持扁平关系。
- 卡片圆角上限为 `8px`。
- 常见工具动作使用 `lucide-react` 图标。
- 控件尺寸保持稳定，hover、loading、标签变化和动态内容都保持布局稳定。
- 可见文字集中服务于操作、状态、结果和错误。
- 工作台布局保持密集、平静、可扫描。
- 原文输入区保持次级视觉权重。
- 词典预取、音频、AI 解释、设置同步等行为在视觉调整中继续保留。

## 给设计专家的问题

1. 文章管理是否应升级为文件树模型：文件夹、最近阅读、筛选搜索、状态标记。
2. 原文输入保存后应保持何种状态：细条入口、展开区、弹出入口或命令式入口。
3. 哪些工具适合常驻右栏，哪些工具适合跟随选中单词或段落出现。
4. 长文英文阅读需要怎样的字体、行宽、行距、段落间距、焦点状态。
5. 移动端应采用怎样的替代结构承接三栏桌面模型。
6. 空状态如何兼顾首次引导和专业工作台气质。

## 建议下一步

在 `docs/exec-plans/` 中创建一份设计规格，先确定最终面板模型、交互状态、响应式策略和可复用 UI 规则，再进入下一轮视觉实现。
