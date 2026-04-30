function trimBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '')
}

function toOpenAiMessages(agent, history, input) {
  const recentHistory = history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content:
        message.content ||
        attachmentSummary(message.attachments) ||
        '[图片消息]'
    }))

  return [
    { role: 'system', content: agent.systemPrompt },
    ...recentHistory,
    { role: 'user', content: toUserContent(input) }
  ]
}

export async function sendChatCompletion({ settings, agent, history, input }) {
  const effectiveSettings = resolveSettings(settings, agent)

  if (!effectiveSettings.apiKey.trim()) {
    throw new Error('请先在设置里填写 API Key。')
  }

  if (effectiveSettings.apiType !== 'openai-compatible') {
    throw new Error('当前仅支持 OpenAI Compatible Chat Completions。')
  }

  const endpoint = `${trimBaseUrl(effectiveSettings.baseUrl)}/chat/completions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveSettings.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: effectiveSettings.model.trim(),
      messages: toOpenAiMessages(agent, history, input)
    })
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `请求失败：HTTP ${response.status}`
    throw new Error(message)
  }

  const content = payload?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('请求成功，但响应里没有可显示的文本。')
  }

  return content.trim()
}

function toUserContent(input) {
  if (typeof input === 'string') return input

  const attachments = input.attachments || []
  if (attachments.length === 0) return input.content

  const images = attachments.filter(
    (attachment) => attachment.type === 'image' && attachment.dataUrl
  )
  const files = attachments.filter((attachment) => attachment.type !== 'image')
  const parts = []
  parts.push({
    type: 'text',
    text: buildTextPrompt(input.content, images, files)
  })

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
      model: agent.apiConfig.model || agent.model || settings.model
    }
  }

  return {
    ...settings,
    model: agent.model || settings.model
  }
}
