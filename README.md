# Local AI Talk Client

一个本地运行的 React + Vite + Tailwind AI 聊天客户端壳子。界面参考 Windows 桌面聊天软件的三栏布局和冷静配色逻辑：左侧浅灰功能栏、中间白色联系人列表、右侧雾蓝聊天区、用户黄色气泡、AI 白色气泡。

## 安装依赖

```bash
npm install
```

## 本地运行

```bash
npm run dev
```

浏览器打开 Vite 输出的本地地址，通常是：

```text
http://localhost:5173
```

## 桌面软件模式

安装 Electron 相关依赖后，可以直接用桌面窗口运行：

```bash
npm run desktop
```

这个命令会自动启动 Vite，然后打开一个桌面软件窗口。

也可以预览构建后的桌面版本：

```bash
npm run desktop:preview
```

## 打包 Windows 安装包

```bash
npm run dist:desktop
```

打包完成后，安装包会输出到：

```text
release/
```

## 部署到 GitHub Pages

项目已包含 `.github/workflows/deploy.yml`。推送到 GitHub 的 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages。

部署前不要把自己的 API Key 写进代码。API Key 应该继续在网页设置里手动填写，并保存在当前浏览器本地。

## 构建

```bash
npm run build
```

## AiHubMix 填写方式

打开左侧底部设置按钮，填写全局 API 设置：

- Provider Name：`AiHubMix`
- API Type：`OpenAI Compatible Chat Completions`
- Base URL：`https://aihubmix.com/v1`
- Model：`gpt-4.1-free`
- API Key：填写你自己的 key

请求地址会自动拼接为：

```text
{Base URL 去掉末尾斜杠}/chat/completions
```

例如：

```text
https://aihubmix.com/v1/chat/completions
```

## 本地数据

- 全局 API 设置保存在 `localStorage`。
- 联系人配置保存在 `localStorage`。
- 聊天记录按联系人 id 单独保存在 `localStorage`。
- 图片和文件附件会以本地 data URL 的形式保存在对应聊天记录里。
- 图片会按 OpenAI Chat Completions 的 `image_url` 多模态格式发送给模型。
- `.txt`、`.md`、`.json`、`.py`、`.js`、`.html`、`.css` 等文本/代码文件会读取正文并随消息发送给模型。
- PDF 会通过 `pdfjs-dist` 在前端提取文本，并随消息发送给模型。
- `.docx` 会通过 `mammoth` 在前端提取文本，并随消息发送给模型。
- 旧版 `.doc` 暂不支持解析，请另存为 `.docx` 后上传。
- 默认不内置联系人，首次使用需要用户自行新增联系人和 system prompt。
- 联系人可以新增、编辑、克隆、删除。
- 每个联系人可以使用全局 API 配置，也可以启用单独 API 配置。
- 联系人单独模型优先于全局模型；启用联系人单独 API 配置后，会优先使用联系人自己的 Provider、Base URL、API Key、Model。
- 可以在全局设置里导出/导入 JSON 备份，用于迁移联系人、设置、聊天记录和本地附件。

## 常用入口

- 输入框左侧 `+`：上传图片或文件附件；图片可让支持视觉的模型识别，文本/代码文件会随消息发送。
- 消息气泡 hover 后的删除按钮：删除单条聊天记录。
- 聊天顶部搜索：搜索当前联系人的聊天记录。
- 联系人列表顶部搜索：搜索联系人、人设和最近消息。
- 左侧好友页：按分组查看联系人和人设摘要。
- 左侧聊天页：按最近消息查看会话列表。
- 聊天顶部菜单：编辑当前联系人。
- 左侧通知/更多：打开通知和更多面板。
- 设置面板底部：导出 JSON / 导入 JSON。
