# Local AI Talk

一个本地优先的 AI 聊天客户端，使用 React + Vite + Tailwind 构建。

项目现在包含两套界面风格：

- KKT 风格：参考桌面聊天软件的三栏布局、浅灰侧栏、白色列表、雾蓝聊天背景、黄色用户气泡。
- 微信风格：参考微信桌面端 / 移动端的绿色会话高亮、浅灰聊天区、底部输入栏和移动端底部导航。

两套 UI 共用同一份本地数据。联系人、聊天记录、头像、API 设置、附件等会优先保存在浏览器 IndexedDB 中，并保留 JSON 导入 / 导出能力。

## 界面预览



### KKT 风格

![KKT 桌面端预览-1](docs/images/kkt-desktop-preview.png)
![KKT 桌面端预览-1](docs/images/kkt-desktop-preview-1.png)
![KKT 手机端预览](docs/images/kkt-mobile-preview.png)

### 微信风格

![微信风格桌面端预览](docs/images/wechat-desktop-preview.png)

![微信风格手机端预览](docs/images/wechat-mobile-preview.png)

## 本地运行

先安装依赖：

```bash
npm install
```

运行 KKT 风格：

```bash
npm run dev
```

打开：

```text
http://localhost:5173
```

运行微信风格：

```bash
cd wechat-style-ai-chat
npm install
npm run dev
```

打开：

```text
http://localhost:5174
```

注意：本地开发时 `5173` 和 `5174` 是不同端口，浏览器会把它们当作不同网站，所以本地预览时数据不一定共享。部署到 GitHub Pages 后，两套 UI 在同一个域名下，才会共用 IndexedDB 数据。

## GitHub Pages 地址

部署后访问：

```text
https://tlsdid.github.io/local-ai-talk/
```

微信风格访问：

```text
https://tlsdid.github.io/local-ai-talk/wechat/
```

## 部署到 GitHub Pages

项目已经包含：

```text
.github/workflows/deploy.yml
```

把源码上传到 GitHub 后，GitHub Actions 会自动构建并发布两个页面：

- 根路径：KKT 风格
- `/wechat/`：微信风格

上传时需要包含：

- `.github/workflows/deploy.yml`
- `src/`
- `public/`
- `wechat-style-ai-chat/`
- `index.html`
- `package.json`
- `package-lock.json`
- `postcss.config.js`
- `tailwind.config.js`
- `vite.config.js`
- `README.md`

不要上传：

- `node_modules/`
- `dist/`

## API 设置

目前支持：

```text
OpenAI Compatible Chat Completions
```

这不代表只能使用 OpenAI 官方接口。只要服务商兼容 OpenAI Chat Completions 格式，就可以填写使用，例如 AiHubMix、OpenRouter、硅基流动、DeepSeek 兼容接口等。

填写示例：

```text
Provider Name: AiHubMix
Base URL: https://aihubmix.com/v1
Model: gpt-4.1-free
API Key: 使用你自己的 key
```

实际请求地址会自动拼接为：

```text
{Base URL 去掉末尾斜杠}/chat/completions
```

例如：

```text
https://aihubmix.com/v1/chat/completions
```

## 联系人与人设

联系人支持：

- 新增联系人
- 编辑联系人名称、头像、状态、分组、模型、人设 prompt
- 克隆联系人
- 删除联系人
- 每个联系人独立聊天记录
- 每个联系人独立 system prompt
- 联系人可使用全局 API 设置，也可以以后扩展为独立 API 设置

默认不强制内置联系人。你可以根据自己的使用习惯创建联系人和人设。

## 附件与图片

聊天支持：

- 上传图片
- 上传普通附件
- 电脑端粘贴图片 / 文件到输入框
- 删除单条聊天记录
- 图片作为 `image_url` 发给支持视觉能力的模型
- 文本、代码类文件会读取正文后随消息发送

为减少手机端白屏风险，图片会在前端压缩后再保存。头像也会压缩为小图保存。

## 本地存储

当前数据优先保存在浏览器 IndexedDB：

- 全局 API 设置
- 联系人配置
- 聊天记录
- 头像
- 本地附件数据

IndexedDB 比 localStorage 更适合保存聊天记录、图片和附件，容量通常更大，也更稳定。

但 IndexedDB 仍然是本机 / 本浏览器存储，不是云同步。换手机、换浏览器、清理网站数据后，数据不会自动回来。

## 导入与导出

设置面板中可以导出 JSON 备份，也可以导入 JSON 恢复数据。

导出内容包含：

- API 设置
- 联系人
- 人设 prompt
- 聊天记录
- 头像
- 本地附件

IndexedDB 不影响导出格式。导出的仍然是普通 JSON 文件。

## 桌面软件模式

如果安装了 Electron 相关依赖，可以运行：

```bash
npm run desktop
```

打包 Windows 安装包：

```bash
npm run dist:desktop
```

打包结果输出到：

```text
release/
```

## 注意事项

- API Key 不要写进代码，也不要提交到 GitHub。
- GitHub Pages 是静态网页，不会把你的本地聊天记录上传到 GitHub。
- 如果需要像 ChatGPT 那样跨设备长期同步，需要额外搭建后端、数据库和文件存储。
- 当前方案适合本地优先、自用、可导入导出的 AI 聊天客户端。
