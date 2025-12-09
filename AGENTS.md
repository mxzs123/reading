# AGENTS.md (Droid Briefing)

面向 Factory Droid 的执行指南；Droid 在每次任务前会读取本文件，请保持指令准确、精简。

## Core Commands

```bash
npm run dev            # Next.js 开发服务器 (http://localhost:3000)
npm run build          # 生产构建
npm run start          # 生产模式启动
npm run lint           # ESLint 检查
npm run test -- --passWithNoTests  # Vitest；当前无测试文件必须带该 flag
```

## Architecture Overview

- **app/page.tsx**：顶层页面，管理文章输入、设置、词典面板、音频生成以及词典缓存/预取逻辑。
- **components/ReadingArea.tsx / Paragraph.tsx**：构建段落与单词 token，处理单词点击（发音+查词）、段落播放、词典预取回调。
- **stores/audioStore.ts**：Zustand 音频状态（段落列表、生成、播放、MiniPlayer）。
- **lib/paragraphs.ts**：`tokenize`/`renderBionicWord` 负责仿生渲染。
- **app/api/dictionary/route.ts**：Edge Runtime 调 Youdao JSON API，`normalizeYoudaoResponse` 解析音标/释义/网络翻译。
- **app/api/tts/route.ts**：Azure Speech TTS（SSML→MP3），受 `settings.azure*` 控制。
- **app/api/tts/elevenlabs/route.ts**：ElevenLabs REST TTS，可配置模型、音色、输出格式等参数。

> 更多 UI/交互细节见 `README.md` / `CLAUDE.md`，这里仅保留 Droid 执行必需信息。

## Development Patterns & Constraints

1. **Client components**：任何有交互的 React 组件都显式加 `"use client"`。
2. **样式**：页面级使用 CSS Modules (`*.module.css`)，不要引入全局样式或内联覆盖。
3. **设置同步**：`SettingsContext` 自动持久化到 `localStorage`，更新需考虑 500ms 防抖。
4. **词典缓存/预取**：
   - `app/page.tsx` 维护 `dictionaryCacheRef` 与预取控制器；不要移除缓存命中逻辑。
   - `Paragraph` 在 hover/focus 时 `onWordPrefetch`，减少点击时的冷等待。
   - 初始 `prefetchDictionary("warmup")` 负责 Edge 冷启动预热，谨慎修改。
5. **并发控制**：所有词典/音频 `fetch` 必须配合 `AbortController`，点击新词或组件卸载时要及时 abort。
6. **音频生成**：调用 `generateSegment` / `generateAll` 前确保有 `settings.azureApiKey/azureRegion/azureVoice`，遵循现有签名。

## Testing & Validation

- 修改代码后 **必须** 运行：
  1. `npm run lint`
  2. `npm run test -- --passWithNoTests`
- 若新增测试文件，可移除 `--passWithNoTests`，但仍需保证 Vitest 全通过。
- 禁止带着 lint/test 失败去提交或推送。

## External Services & Secrets

- **Youdao Dictionary**：`/api/dictionary` 调公开 JSON API，需附浏览器 UA/Referer；仍按“单用户”假设限制请求频率，避免循环轰炸。
- **Azure Speech**：依赖用户提供的 `azureApiKey/azureRegion/azureVoice`；不得写死密钥。
- **Vercel Edge & Blob**：词典路由固定 `runtime = "edge"` 且 `preferredRegion = [hnd1, icn1, hkg1, sin1]`；改动前评估冷启动与跨境延迟。
- **安全**：日志、注释、提交里不得输出任何 key；错误仅记录状态码/简要描述。

## Git Workflow

- 主分支：`main`。提交前确认 `git status` 干净并完成上述校验。
- 提交信息遵循常规语义；CLI 中提交需附 `Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>`。
- Push 到 `origin/main` 前再次确认 `git status`，禁止强推。

## Performance Notes & Gotchas

1. **词典体验**：保持“先返回缓存，再后台刷新”模式；预取具备去重与 Abort 保护，扩展时也要限制并发。
2. **单用户背景**：当前假设只有一个活跃用户，所以预热频率最低；若扩展到多用户，重新评估速率限制和缓存策略。
3. **pendingAudioUrlsRef**：文章加载后需等待 `segments` 初始化再恢复音频；修改 `ReadingArea` / `Paragraph` 时不要打破该流程。
4. **仿生渲染只处理英文 token**：`tokenize` 只针对拉丁字母，非英文文本可按普通段落渲染。
5. **Abort 清理**：`useEffect` cleanup 必须清除所有请求和预取控制器，避免内存泄漏或控制台警告。

## When in Doubt

- 若引入新的命令或验证流程，请先更新本文件，再改代码，确保后续 Droid 拥有相同上下文。
- 更多背景可参考 `README.md` / `CLAUDE.md`，或直接向维护者询问。

_Keep this briefing lean and actionable. Update it whenever build steps、验证流程或关键约定发生变化。_
