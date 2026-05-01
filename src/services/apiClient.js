import { callGemini, DEFAULT_GEMINI_MODEL } from '../lib/gemini.js'

const LOCAL_PROXY_URL = 'http://localhost:3001/api/chat'
const API_TYPE_OPENAI = 'openai-compatible'
const API_TYPE_GEMINI = 'gemini'

function isLocalHost() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

function resolveRequestMode(settings) {
  if (settings.requestMode === 'proxy') return 'proxy'
  if (settings.requestMode === 'direct') return 'direct'
  return isLocalHost() ? 'proxy' : 'direct'
}

function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`
}

function normalizeApiType(apiType) {
  if (apiType === 'Gemini') return API_TYPE_GEMINI
  return apiType || API_TYPE_OPENAI
}

function toProviderMessages(agent, history, input) {
  const recentHistory = history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content:
        message.content ||
        attachmentSummary(message.attachments) ||
        '[附件消息]',
      attachments: message.attachments || []
    }))

  return [
    { role: 'system', content: agent.systemPrompt || '' },
    ...recentHistory,
    {
      role: 'user',
      content: typeof input === 'string' ? input : input.content,
      attachments: typeof input === 'string' ? [] : input.attachments || []
    }
  ]
}

function toOpenAiMessages(messages) {
  return messages.map((message) => {
    if (message.role !== 'user') {
      return {
        role: message.role,
        content: message.content || attachmentSummary(message.attachments)
      }
    }

    return {
      role: 'user',
      content: toUserContent(message)
    }
  })
}

export async function sendChatCompletion({ settings, agent, history, input }) {
  const effectiveSettings = resolveSettings(settings, agent)
  const apiType = normalizeApiType(effectiveSettings.apiType)
  const messages = toProviderMessages(agent, history, input)

  if (!effectiveSettings.apiKey.trim()) {
    throw new Error(apiType === API_TYPE_GEMINI ? '缺少 Gemini API Key' : '请先在设置里填写 API Key。')
  }

  if (!effectiveSettings.model.trim() && apiType !== API_TYPE_GEMINI) {
    throw new Error('请先在设置里填写 Model。')
  }

  if (apiType === API_TYPE_GEMINI) {
    const content = await callGemini({
      apiKey: effectiveSettings.apiKey.trim(),
      model: effectiveSettings.model.trim() || DEFAULT_GEMINI_MODEL,
      messages,
      temperature: 0.7
    })

    if (!content) {
      throw new Error('Gemini 响应为空。')
    }

    return content.trim()
  }

  if (!effectiveSettings.baseUrl.trim()) {
    throw new Error('请先在设置里填写 Base URL。')
  }

  if (apiType !== API_TYPE_OPENAI) {
    throw new Error('当前仅支持 OpenAI Compatible Chat Completions 和 Gemini。')
  }

  const requestMode = resolveRequestMode(effectiveSettings)
  const body = {
    model: effectiveSettings.model.trim(),
    messages: toOpenAiMessages(messages),
    temperature: 0.7,
    max_tokens: 1024,
    stream: false
  }

  let response
  try {
    if (requestMode === 'proxy') {
      response = await fetch(LOCAL_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: effectiveSettings.baseUrl.trim(),
          apiKey: effectiveSettings.apiKey.trim(),
          ...body
        })
      })
    } else {
      response = await fetch(joinUrl(effectiveSettings.baseUrl.trim(), '/chat/completions'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveSettings.apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
    }
  } catch {
    if (requestMode === 'proxy') {
      throw new Error('本地代理服务未启动，请先运行 npm run dev:all')
    }
    throw new Error('浏览器直连失败，可能是服务商 CORS 限制。NVIDIA 等接口请切换为本地代理并运行 npm run dev:all')
  }

  const payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        `请求失败：HTTP ${response.status}`
    )
  }

  const content =
    requestMode === 'proxy'
      ? payload?.content
      : payload?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('请求成功，但响应里没有可显示的文本。')
  }

  return content.trim()
}

async function readJsonResponse(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function toUserContent(message) {
  const attachments = message.attachments || []
  if (attachments.length === 0) return message.content || ''

  const images = attachments.filter(
    (attachment) => attachment.type === 'image' && attachment.dataUrl
  )
  const files = attachments.filter((attachment) => attachment.type !== 'image')
  const parts = [
    {
      type: 'text',
      text: buildTextPrompt(message.content, images, files)
    }
  ]

  images.forEach((attachment) => {
    parts.push({
      type: 'image_url',
      image_url: {
        url: attachment.dataUrl
      }
    })
  })

  return parts
}

function attachmentSummary(attachments = []) {
  const imageCount = attachments.filter(
    (attachment) => attachment.type === 'image'
  ).length
  const fileCount = attachments.filter(
    (attachment) => attachment.type !== 'image'
  ).length
  if (imageCount > 0 || fileCount > 0) {
    return `[${imageCount} 张图片，${fileCount} 个文件]`
  }
  return ''
}

function buildTextPrompt(content, images, files) {
  const lines = [content?.trim() || defaultAttachmentPrompt(images, files)]

  if (files.length > 0) {
    lines.push('\n用户上传了以下文件：')
    files.forEach((file, index) => {
      lines.push(
        `${index + 1}. ${file.name} (${file.mimeType || 'unknown'}, ${formatBytes(file.size)})`
      )
      if (file.textContent) {
        lines.push('文件文本内容如下：')
        lines.push('```')
        lines.push(truncateText(file.textContent, 24000))
        lines.push('```')
      } else if (file.parseError) {
        lines.push(`文件解析失败：${file.parseError}`)
      } else {
        lines.push(
          '这个文件当前只作为附件保存，尚未在前端解析正文；请根据文件名和用户问题说明可行的下一步。'
        )
      }
    })
  }

  return lines.join('\n')
}

function defaultAttachmentPrompt(images, files) {
  if (images.length > 0 && files.length > 0) {
    return '请识别图片并结合附件内容回答。'
  }
  if (images.length > 0) return '请识别并描述这张图片。'
  return '请阅读并分析我上传的附件。'
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}\n\n[内容过长，已截断 ${text.length - maxLength} 个字符]`
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function resolveSettings(settings, agent) {
  if (agent.apiConfig?.enabled) {
    return {
      providerName: agent.apiConfig.providerName || settings.providerName,
      apiType: agent.apiConfig.apiType || settings.apiType,
      baseUrl: agent.apiConfig.baseUrl || settings.baseUrl,
      apiKey: agent.apiConfig.apiKey || settings.apiKey,
      model: agent.apiConfig.model || agent.model || settings.model,
      requestMode: agent.apiConfig.requestMode || settings.requestMode
    }
  }

  return {
    ...settings,
    model: agent.model || settings.model
  }
}
