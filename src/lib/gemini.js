import { GoogleGenAI } from '@google/genai'

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite'

function isFileLike(value) {
  return typeof File !== 'undefined' && value instanceof File
}

function isBlobLike(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

function normalizeTextContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part?.type === 'text') return part.text || ''
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return content ? String(content) : ''
}

async function fileToGeminiPart(ai, file, fallbackName = 'uploaded-file') {
  const name = file.name || fallbackName
  const mimeType = file.type || 'application/octet-stream'
  const smallTextFile =
    file.size <= 1024 * 1024 &&
    (
      mimeType.startsWith('text/') ||
      /\.(txt|md|csv|json)$/i.test(name)
    )

  if (smallTextFile && typeof file.text === 'function') {
    const text = await file.text()
    return {
      text: `\n\n[附件：${name}]\n${text}`
    }
  }

  const uploadedFile = await ai.files.upload({
    file,
    config: {
      mimeType,
      displayName: name
    }
  })

  return {
    fileData: {
      fileUri: uploadedFile.uri,
      mimeType: uploadedFile.mimeType || mimeType
    }
  }
}

function dataUrlToInlinePart(attachment) {
  const dataUrl = String(attachment.dataUrl || '')
  const base64 = dataUrl.split(',')[1]
  if (!base64) return null

  return {
    inlineData: {
      mimeType: attachment.mimeType || 'application/octet-stream',
      data: base64
    }
  }
}

async function buildGeminiParts(ai, message) {
  const parts = []
  const text = normalizeTextContent(message.content)

  if (text.trim()) {
    parts.push({ text })
  }

  const attachments = message.attachments || message.files || []

  for (const attachment of attachments) {
    const file = attachment?.rawFile || attachment?.file || attachment

    if (isFileLike(file) || isBlobLike(file)) {
      parts.push(await fileToGeminiPart(ai, file, attachment?.name))
      continue
    }

    if (attachment?.textContent || attachment?.text) {
      parts.push({
        text: `\n\n[附件：${attachment.name || 'text'}]\n${attachment.textContent || attachment.text}`
      })
      continue
    }

    if (attachment?.dataUrl && attachment?.mimeType) {
      const inlinePart = dataUrlToInlinePart(attachment)
      if (inlinePart) {
        parts.push(inlinePart)
      }
      continue
    }

    if (attachment?.url || attachment?.previewUrl) {
      parts.push({
        text: `\n\n[附件链接：${attachment.name || 'file'}]\n${attachment.url || attachment.previewUrl}`
      })
    }
  }

  if (!parts.length) {
    parts.push({ text: '' })
  }

  return parts
}

export async function callGemini({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  messages = [],
  temperature = 0.7
}) {
  if (!apiKey) {
    throw new Error('缺少 Gemini API Key')
  }

  const ai = new GoogleGenAI({ apiKey })
  const systemInstruction = messages
    .filter((message) => message.role === 'system')
    .map((message) => normalizeTextContent(message.content))
    .filter(Boolean)
    .join('\n\n')
  const contents = []

  for (const message of messages.filter((item) => item.role !== 'system')) {
    const role = message.role === 'assistant' ? 'model' : 'user'
    const parts = await buildGeminiParts(ai, message)

    if (parts.some((part) => part.text?.trim() || part.fileData || part.inlineData)) {
      contents.push({ role, parts })
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: model || DEFAULT_GEMINI_MODEL,
      contents,
      config: {
        temperature,
        ...(systemInstruction ? { systemInstruction } : {})
      }
    })

    return response.text || ''
  } catch (error) {
    const message = error?.message || String(error)

    if (message.includes('429') || message.toLowerCase().includes('quota')) {
      throw new Error('已达到 Gemini 免费额度限制，请稍后再试')
    }

    if (
      message.includes('403') ||
      message.includes('401') ||
      message.toLowerCase().includes('api key')
    ) {
      throw new Error('Gemini API Key 无效或无权限')
    }

    throw new Error(message)
  }
}
