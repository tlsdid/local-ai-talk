# WeChat Style AI Chat

一个独立的新项目，使用 React + Vite + Tailwind 实现微信桌面端风格的本地 AI 聊天客户端壳子。

## 特点

- 深色窄侧栏、浅灰聊天列表、浅灰聊天背景、绿色用户气泡。
- 不使用微信官方 logo、商标或素材，只参考桌面聊天软件布局和视觉层级。
- 联系人、设置、聊天记录、附件保存在当前浏览器 localStorage。
- API 使用 OpenAI Compatible Chat Completions。
- 支持图片和文本/代码文件附件。
- 支持从剪贴板粘贴图片/文件到输入框。
- 移动端输入框保持 16px，避免 iOS 聚焦时自动放大。

## 安装

```bash
npm install
```

## 运行

```bash
npm run dev
```

默认地址：

```text
http://localhost:5174
```

## 手机局域网访问

```bash
npm run dev -- --host 0.0.0.0
```

然后手机打开终端显示的 Network 地址。
