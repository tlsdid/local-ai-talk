import { FileText, Trash2 } from 'lucide-react'

export default function MessageBubble({ message, onDelete }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const hasText = Boolean(message.content?.trim())
  const attachments = message.attachments || []

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group flex max-w-[72%] items-end gap-2 ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <div
          className={`min-w-0 rounded-[7px] px-3.5 py-2.5 text-[14px] leading-6 shadow-bubble ${
            isUser
              ? 'bg-kakao-yellow text-kakao-text'
              : isError
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'bg-white text-kakao-text'
          }`}
        >
          {attachments.length > 0 && (
            <div className="mb-2 grid max-w-[320px] gap-2">
              {attachments.map((attachment) => (
                <AttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}
          {hasText && (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>
        <span className="mb-1 shrink-0 text-[11px] text-[#4F6272]">
          {formatMessageTime(message.createdAt)}
        </span>
        <button
          type="button"
          title="删除这条消息"
          aria-label="删除这条消息"
          onClick={() => onDelete(message.id)}
          className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/70 text-zinc-500 opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function AttachmentPreview({ attachment }) {
  if (attachment.type === 'image') {
    return (
      <a
        href={attachment.dataUrl}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-md bg-black/5"
        title={attachment.name}
      >
        <img
          src={attachment.dataUrl}
          alt={attachment.name || '图片附件'}
          className="max-h-[260px] w-full object-contain"
        />
      </a>
    )
  }

  return (
    <a
      href={attachment.dataUrl}
      download={attachment.name}
      className="flex min-w-[240px] items-center gap-3 rounded-md bg-black/5 px-3 py-2 transition hover:bg-black/10"
      title={attachment.name}
    >
      <FileText size={24} className="shrink-0 text-zinc-600" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-kakao-text">
          {attachment.name}
        </p>
        <p className="mt-0.5 text-xs text-kakao-muted">
          {formatBytes(attachment.size)}
          {attachment.textContent ? ' · 已读取文本' : ''}
          {attachment.parseError ? ' · 未解析' : ''}
        </p>
        {attachment.parseError && (
          <p className="mt-1 line-clamp-2 text-xs text-red-600">
            {attachment.parseError}
          </p>
        )}
      </div>
    </a>
  )
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatMessageTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}
