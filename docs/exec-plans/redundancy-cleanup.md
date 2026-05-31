# Redundancy Cleanup Plan

## Goal

在保持现有功能稳定的前提下，持续清理仓库级冗余代码、导出面、旧样式与多余依赖，让代码结构更直接、更易维护。

## Current Pass

- 收窄未使用的 barrel exports、内部类型和内部工具函数导出。
- 删除旧版全局阅读容器、按钮样式和动画。
- 删除客户端文章读取函数 `getArticle`，当前读取路径由数据层与页面状态承担。
- 移除直接开发依赖 `baseline-browser-mapping` 与 `tsx`。
- 增加 `knip.json`，记录动态注册的 `public/sw.js`。
- 将设置选项的显示文本收敛到 i18n key，删除重复中文 label。
- 将 TTS API 路由默认值收敛到 `DEFAULT_SETTINGS`。
- 清理页面层未读取 ref、冗余别名和未展示统计字段。
- 合并文章管理中的列表加载路径与抽屉关闭判断。
- 简化 Gemini TTS 路由，删除多格式请求尝试分支。
- 删除未引用 CSS Modules 样式和纯标题式代码注释。
- 将 TTS 生成并发默认值与上传重试状态码收敛到单一来源。
- 删除 Gemini `languageCode` 设置字段，消除 UI 到运行链路的无效字段。
- 提取音频上传候选判断与显示状态推导，重试次数显示复用上传常量。
- 提取共享 HTTP 错误响应与上游错误正文读取，API 路由和客户端 TTS 复用同一处理。
- 提取音频上传 `wordTimings` 校验，消除重复的格式错误分支。
- 将文章管理组件收敛为单一左侧栏，删除抽屉 variant、遮罩和对应 CSS 分支。
- 将移动端词典面板收敛为 bottom sheet，删除桌面浮层定位、anchor 状态和未用样式。
- 收敛页面查词/AI 清理动作，删除 `useDictionary.clearCache` 未用入口与 `article.close` 文案。
- 删除音频 store 中 `readyCount`、`generatingCount`、`total`、`concurrencyLimit` 派生状态，页面从 `segments` 直接计算统计。
- 提取 `updateSegment`，收敛音频生成与上传里的段落 patch 逻辑，删除状态字符串类型断言。
- 将词典数据类型迁移到 `lib/dictionary.ts`，API、hook、组件复用同一数据模型。
- 删除队列、播放器、store 参数中的多余保底分支。
- 提取 `createArticleFromInput`、`applyArticlePatch`、`sortArticlesByUpdatedAt`，本地与 Supabase 数据源复用文章创建/更新规则。
- 提取 `removeSensitiveSettings`，客户端云同步与 `/api/settings` 复用同一敏感字段剥离规则。
- 提取 `deleteArticleAudioFiles`，单篇与批量文章删除复用同一 R2 音频清理路径。
- 将阅读默认排版升级为 `19.25px / 1.88`、`1.34em` 段间距、`660px` 版心和 `64px` 桌面阅读边距。
- 将当前旧默认排版值纳入设置迁移，已有本地与云端缓存会进入新的推荐阅读参数。
- 为阅读段落补充 optical sizing、kerning、pretty wrapping 与更舒展的移动端左右留白。
- 提取 `ENGLISH_WORD_REGEX`，段落 token 与 ElevenLabs 词级时间轴复用同一英文单词识别规则。
- 提取 `isWordTiming` / `normalizeWordTimings`，音频上传 API、客户端 TTS 响应和本地段落恢复复用同一时间轴规则。
- 提取 `escapeXml`、SSML 数值格式化与 Edge 文本分段 helper，Azure/Edge TTS 删除重复实现。
- 收敛 `lib/storage.ts` 的文章 REST 客户端请求模板，列表、保存、删除复用 `fetchJson` / `fetchVoid`。
- 提取 `SelectField`，设置面板里的模型、音色、格式、字体、同步方向选择项复用统一 select 控件。
- 提取 `TextField`，ElevenLabs 与 Gemini 的普通文本输入、风格提示 textarea、角色字段复用统一文本控件。
- 删除设置局部样式中的重复 `select` / 文本输入样式，表单基础样式由 `components/ui/form.module.css` 承担。
- 提取 `withApiError`，文章、单篇文章、设置、同步、词典路由复用同一未处理异常响应边界。
- 删除 `SettingsPanel.module.css` 中迁移后遗留的表单、开关、滑块、分段控件和详情样式。
- 提取 `readFormDataRequest` 与 `runApiStep`，音频上传路由复用表单解析和分步错误响应边界。
- 将 `wordTimings` 表单 JSON 解析迁移到 `lib/wordTimings.ts`，上传 API 与音频恢复共用时间轴工具。
- Azure、Edge、ElevenLabs、Gemini TTS route 统一使用 `withApiError` 包住生成阶段，删除 provider 内重复的顶层 catch 分支。
- 提取 `lib/clientRequest.ts`，文章、设置清空、同步、词典、TTS、AI 解释的客户端请求复用同一 JSON/error/status 路径。
- 删除 `UploadAudioError` 专用类，音频上传重试直接读取通用 `HttpRequestError.status`。
- 提取 `audioJsonResponse` 与 `jsonRequestInit`，TTS route 与上游 JSON 请求复用相同响应和请求初始化。
- 提取 `lib/articles.ts`，文章标题、预览、统计与词级时间轴标记从文章管理组件迁移为共享展示工具。
- 将 `SecretTextField` 的密钥显隐状态内聚到控件内部，设置页删除重复 `showApiKey` 状态。
- Supabase 数据源的请求封装改为 `json` 参数，调用点删除重复 `JSON.stringify` 与 headers 拼装。
- 新增 `lib/__tests__/articles.test.ts`，覆盖文章展示工具的预览、统计和时间轴标记规则。
- `SettingsContext` 的云端设置读取/保存接入 `clientRequest`，删除组件上下文里的手写 fetch 分支。
- `TtsTab` 改为 provider-to-component 映射，删除 provider 渲染链式判断。
- 提取 `LinkHint`，Azure、ElevenLabs、Gemini API Key 提示复用同一外链结构。
- 提取 `updateSetting` / `useSettingFieldUpdater`，设置页字段更新统一走单字段入口，并收窄前端 settings context 的公开 API。
- `lib/tts.ts` 提取 TTS request body builder 与必填配置校验 helper，删除 provider 请求体里的重复 `{ text, ...fields }` 拼装。
- 提取 `sanitizeSettings`，设置迁移与受限字段归一化从 `SettingsContext` 迁移到 `lib/settings/sanitize.ts`。
- 提取 `mergeSensitiveLocalSettings`，云端设置合并本地密钥的规则收敛到 `lib/settings/sensitive.ts`。
- `buildTtsGenerationParams` 改为 provider-to-builder 映射，TTS 设置到生成参数的转换路径保持单一入口。
- 新增设置清洗、敏感字段合并与 TTS 参数构建测试，覆盖当前清理段的核心行为。
- 提取 `parseSyncOptions`，同步路由的 direction、scope 与 articleIds 解析进入 `lib/dataStore/sync.ts`。
- 新增同步参数解析测试，覆盖重复 scope 去重、articleIds 清洗和错误入参响应。
- 提取 `lib/ttsRoute.ts`，Azure、Edge、ElevenLabs、Gemini TTS route 复用必填字符串、文本长度、MIME 推断和 prompt 拼接规则。
- TTS helper 测试新增请求字段解析、输出格式 MIME 映射和 Gemini prompt 拼接覆盖。
- 提取 `SettingsLayout`，设置页 section、grid、field row、details、hint 结构统一由单一组件层承载。
- 阅读、排版、布局、TTS、AI、同步设置页删除重复结构类拼装，`settingsStyles` 的结构类消费集中到 `SettingsLayout.tsx`。

## Validation

- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`
- `npm_config_cache=/Users/mgg/Desktop/reading/.npm-cache npx --yes knip --reporter compact`
- `npm run lint`
- `npm run test -- --passWithNoTests`
- CSS Modules 未引用类扫描
- 浏览器检查：`http://localhost:3000` 正常渲染，左侧栏收起/展开正常，控制台无 error；音频 store 清理、设置/数据层清理、阅读默认排版调整后重载页面无 error

## Next Focus

- 继续检查设置字段值转换、数据源窄类型边界和路由响应构造重复。
- 把可机械验证的清理规则沉淀进现有 lint、knip、类型检查流程。
