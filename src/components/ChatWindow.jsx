import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FilePlus,
  FileText,
  ImagePlus,
  Menu,
  Plus,
  Search,
  Send,
  Trash2,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'
import {
  canParseDocumentFile,
  isLegacyWordFile,
  parseDocumentFile
} from '../utils/documentParser.js'

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

export default function ChatWindow({
  agent,
  messages,
  isTyping,
  mobileVisible,
  onBack,
  onSend,
  onClearChat,
  onDeleteMessage
}) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatQuery, setChatQuery] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const listRef = useRef(null)
  const dateRefs = useRef({})
  const textareaRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const messageDates = useMemo(() => {
    return new Set(messages.map((message) => getDateKey(message.createdAt)))
  }, [messages])

  const visibleMessages = useMemo(() => {
    const keyword = chatQuery.trim().toLowerCase()
    if (!keyword) return messages

    return messages.filter((message) => {
      return (
        message.content?.toLowerCase().includes(keyword) ||
        message.attachments?.some((attachment) =>
          attachment.name?.toLowerCase().includes(keyword)
        )
      )
    })
  }, [chatQuery, messages])

  const groupedMessages = useMemo(() => {
    return visibleMessages.reduce((groups, message) => {
      const key = getDateKey(message.createdAt)
      if (!groups[key]) groups[key] = []
      groups[key].push(message)
      return groups
    }, {})
  }, [visibleMessages])

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [messages, isTyping, agent.id])

  useEffect(() => {
    setDraft('')
    setAttachments([])
    setAttachmentMenuOpen(false)
    setChatSearchOpen(false)
    setChatQuery('')
    setCalendarOpen(false)
    textareaRef.current?.focus()
  }, [agent.id])

  function submit() {
    const content = draft.trim()
    if ((!content && attachments.length === 0) || isTyping) return
    setDraft('')
    setAttachments([])
    setAttachmentMenuOpen(false)
    onSend({ content, attachments })
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  async function handleAttachmentSelect(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const acceptedFiles = files.filter((file) => file.size <= MAX_ATTACHMENT_BYTES)
    const rejectedCount = files.length - acceptedFiles.length
    if (rejectedCount > 0) {
      window.alert(`有 ${rejectedCount} 个文件超过 5MB，已跳过。`)
    }

    const nextAttachments = await Promise.all(
      acceptedFiles.map((file) => makeAttachment(file))
    )

    setAttachments((current) => [...current, ...nextAttachments])
    setAttachmentMenuOpen(false)
    event.target.value = ''
  }

  function removeAttachment(id) {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id)
    )
  }

  function jumpToDate(dateKey) {
    setCalendarOpen(false)
    setChatSearchOpen(false)
    setChatQuery('')
    window.requestAnimationFrame(() => {
      dateRefs.current[dateKey]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    })
  }

  return (
    <main
      className={`h-[100dvh] min-w-0 flex-1 flex-col bg-kakao-chat pb-[64px] lg:flex lg:pb-0 ${
        mobileVisible ? 'flex' : 'hidden'
      }`}
    >
      <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-kakao-line bg-white px-3 lg:h-[72px] lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            title="返回列表"
            aria-label="返回列表"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-600 transition hover:bg-kakao-section lg:hidden"
          >
            <ArrowLeft size={21} />
          </button>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] text-sm font-semibold text-white lg:h-11 lg:w-11 lg:rounded-[16px]"
            style={{ backgroundColor: agent.accent }}
          >
            {agent.avatar}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold text-kakao-text">
              {agent.name}
            </h2>
            <p className="mt-0.5 truncate text-xs text-kakao-muted">
              {agent.status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            title={chatSearchOpen ? '关闭聊天搜索' : '搜索聊天'}
            onClick={() => {
              setChatSearchOpen((open) => !open)
              setCalendarOpen(false)
              setChatQuery('')
            }}
          >
            <Search size={20} />
          </IconButton>
          <IconButton title="清空当前聊天" onClick={onClearChat} hideOnMobile>
            <Trash2 size={19} />
          </IconButton>
          <IconButton
            title="编辑当前联系人"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('edit-current-agent'))
            }
          >
            <Menu size={21} />
          </IconButton>
        </div>
      </header>

      {chatSearchOpen && (
        <div className="relative shrink-0 border-b border-kakao-line bg-white px-3 py-3 lg:px-6">
          <div className="flex gap-2">
            <input
              value={chatQuery}
              onChange={(event) => setChatQuery(event.target.value)}
              autoFocus
              placeholder="搜索当前聊天记录"
              className="input"
            />
            <button
              type="button"
              title="聊天日历"
              aria-label="聊天日历"
              onClick={() => setCalendarOpen((open) => !open)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-kakao-line transition ${
                calendarOpen
                  ? 'bg-kakao-yellow text-kakao-text'
                  : 'bg-white text-zinc-600 hover:bg-kakao-section'
              }`}
            >
              <CalendarDays size={19} />
            </button>
          </div>
          {calendarOpen && (
            <ChatCalendar
              month={calendarMonth}
              messageDates={messageDates}
              onMonthChange={setCalendarMonth}
              onSelectDate={jumpToDate}
            />
          )}
        </div>
      )}

      <section
        ref={listRef}
        className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 lg:px-8 lg:py-6"
      >
        <div className="mx-auto flex max-w-[860px] flex-col gap-4">
          {messages.length === 0 ? (
            <div className="mt-6 flex justify-center">
              <div className="rounded-full bg-white/55 px-4 py-2 text-xs text-[#4F6272]">
                开始和 {agent.name} 对话
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
              <div
                key={dateKey}
                ref={(node) => {
                  if (node) dateRefs.current[dateKey] = node
                }}
                className="scroll-mt-4"
              >
                <DateDivider dateKey={dateKey} />
                <div className="mt-4 flex flex-col gap-4">
                  {dateMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onDelete={onDeleteMessage}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-[7px] bg-white px-3.5 py-2.5 text-[13px] text-kakao-muted shadow-bubble">
                正在输入...
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="shrink-0 border-t border-kakao-line bg-white px-3 py-3 lg:px-5 lg:py-4">
        {attachments.length > 0 && (
          <div className="mx-auto mb-3 flex max-w-[920px] gap-2 overflow-x-auto">
            {attachments.map((attachment) => (
              <AttachmentDraft
                key={attachment.id}
                attachment={attachment}
                onRemove={removeAttachment}
              />
            ))}
          </div>
        )}
        <div className="mx-auto flex max-w-[920px] items-end gap-2 lg:gap-3">
          <div className="relative mb-1">
            <button
              type="button"
              title="附加"
              aria-label="附加"
              onClick={() => setAttachmentMenuOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-zinc-600 transition hover:bg-kakao-section"
            >
              <Plus size={22} />
            </button>
            {attachmentMenuOpen && (
              <div className="absolute bottom-12 left-0 w-44 rounded-md border border-kakao-line bg-white p-1 shadow-lg">
                <AttachmentMenuButton onClick={() => imageInputRef.current?.click()}>
                  <ImagePlus size={17} />
                  上传图片
                </AttachmentMenuButton>
                <AttachmentMenuButton onClick={() => fileInputRef.current?.click()}>
                  <FilePlus size={17} />
                  上传文件
                </AttachmentMenuButton>
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAttachmentSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleAttachmentSelect}
              className="hidden"
            />
          </div>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="输入消息"
            className="chat-scrollbar max-h-36 min-h-[44px] flex-1 resize-none rounded-md border border-kakao-line bg-white px-4 py-3 text-[16px] leading-5 text-kakao-text outline-none transition focus:border-zinc-400 lg:text-[14px]"
          />

          <button
            type="button"
            title="发送"
            aria-label="发送"
            onClick={submit}
            disabled={(!draft.trim() && attachments.length === 0) || isTyping}
            className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-kakao-yellow text-kakao-text transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            <Send size={19} />
          </button>
        </div>
      </footer>
    </main>
  )
}

function ChatCalendar({ month, messageDates, onMonthChange, onSelectDate }) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, index) => {
    if (index < startOffset) return null
    return index - startOffset + 1
  })

  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="absolute right-3 top-[58px] z-20 w-[292px] rounded-md border border-kakao-line bg-white p-3 shadow-xl lg:right-6">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="上个月"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-kakao-section"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-kakao-text">
          {year}年{monthIndex + 1}月
        </div>
        <button
          type="button"
          aria-label="下个月"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-kakao-section"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-kakao-muted">
        {['日', '一', '二', '三', '四', '五', '六'].map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="h-8" />
          const dateKey = makeDateKey(year, monthIndex, day)
          const hasMessage = messageDates.has(dateKey)
          return (
            <button
              key={dateKey}
              type="button"
              disabled={!hasMessage}
              onClick={() => onSelectDate(dateKey)}
              className={`h-8 rounded-md text-sm transition ${
                hasMessage
                  ? 'bg-kakao-yellow text-kakao-text hover:brightness-95'
                  : 'text-zinc-300'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AttachmentDraft({ attachment, onRemove }) {
  return (
    <div className="relative shrink-0">
      {attachment.type === 'image' ? (
        <div className="h-20 w-20 overflow-hidden rounded-md border border-kakao-line bg-kakao-section">
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-52 items-center gap-3 rounded-md border border-kakao-line bg-kakao-section px-3">
          <FileText size={26} className="shrink-0 text-zinc-500" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-kakao-text">
              {attachment.name}
            </p>
            <p className="mt-1 text-xs text-kakao-muted">
              {formatBytes(attachment.size)}
              {attachment.textContent ? ' · 已读取' : ''}
            </p>
          </div>
        </div>
      )}
      <button
        type="button"
        title="移除附件"
        aria-label="移除附件"
        onClick={() => onRemove(attachment.id)}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
      >
        <X size={13} />
      </button>
    </div>
  )
}

function AttachmentMenuButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2 rounded px-3 text-left text-sm text-kakao-text transition hover:bg-kakao-section"
    >
      {children}
    </button>
  )
}

async function makeAttachment(file) {
  const isImage = file.type.startsWith('image/')
  const attachment = {
    id: crypto.randomUUID(),
    type: isImage ? 'image' : 'file',
    name: file.name,
    mimeType: file.type || guessMimeType(file.name),
    size: file.size,
    dataUrl: await readFileAsDataUrl(file)
  }

  if (!isImage && isReadableTextFile(file)) {
    attachment.textContent = await readFileAsText(file)
    attachment.parser = 'text'
  } else if (!isImage && canParseDocumentFile(file)) {
    try {
      const parsed = await parseDocumentFile(file)
      attachment.textContent = parsed.textContent
      attachment.parser = parsed.parser
      attachment.parseWarnings = parsed.warnings || []
      if (!parsed.textContent?.trim()) {
        attachment.parseError = '已尝试解析，但没有提取到文本。'
      }
    } catch (error) {
      attachment.parseError = error.message || '文档解析失败。'
    }
  } else if (!isImage && isLegacyWordFile(file)) {
    attachment.parseError = '旧版 .doc 暂不支持解析，请另存为 .docx 后上传。'
  }

  return attachment
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function isReadableTextFile(file) {
  const textExtensions = [
    '.txt',
    '.md',
    '.csv',
    '.tsv',
    '.json',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.py',
    '.java',
    '.c',
    '.cpp',
    '.cs',
    '.go',
    '.rs',
    '.html',
    '.css',
    '.xml',
    '.yaml',
    '.yml',
    '.sql',
    '.log'
  ]

  const name = file.name.toLowerCase()
  return (
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    textExtensions.some((extension) => name.endsWith(extension))
  )
}

function guessMimeType(name) {
  const lowerName = name.toLowerCase()
  if (lowerName.endsWith('.pdf')) return 'application/pdf'
  if (lowerName.endsWith('.doc')) return 'application/msword'
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return 'application/octet-stream'
}

function DateDivider({ dateKey }) {
  const date = parseDateKey(dateKey)
  const label = date.toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-white/55 px-4 py-1.5 text-[12px] text-[#4F6272]">
        {label}
      </span>
    </div>
  )
}

function IconButton({ title, onClick, children, hideOnMobile = false }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-kakao-section hover:text-kakao-text ${
        hideOnMobile ? 'hidden lg:flex' : 'flex'
      }`}
    >
      {children}
    </button>
  )
}

function getDateKey(value) {
  const date = new Date(value)
  return makeDateKey(date.getFullYear(), date.getMonth(), date.getDate())
}

function makeDateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
