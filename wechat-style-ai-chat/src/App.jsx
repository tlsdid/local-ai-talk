import {
  Bell,
  Bot,
  Copy,
  Download,
  FilePlus,
  FileText,
  ImagePlus,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  Upload,
  UserRound,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { callGemini, DEFAULT_GEMINI_MODEL } from '../../src/lib/gemini.js'

const SETTINGS_KEY = 'local-ai-talk-settings'
const AGENTS_KEY = 'local-ai-talk-agents'
const CHATS_KEY = 'local-ai-talk-chats'
const DB_NAME = 'local-ai-talk-db'
const DB_VERSION = 1
const STORE_NAME = 'keyval'
const MAX_FILE_BYTES = 20 * 1024 * 1024
const ATTACHMENT_ACCEPT = 'image/*,application/pdf,text/plain,text/markdown,text/csv,application/json,audio/*,video/*'
const MAX_IMAGE_EDGE = 1800
const MAX_IMAGE_BYTES = 900 * 1024

const defaultSettings = {
  uiStyle: 'wechat',
  userName: '我',
  userAvatarImage: '',
  userAvatarImageSize: 0,
  providerName: '',
  apiType: 'openai-compatible',
  baseUrl: '',
  apiKey: '',
  model: '',
  requestMode: 'auto'
}

function App() {
  const [agents, setAgents] = useState(() => readJson(AGENTS_KEY, []))
  const [chats, setChats] = useState(() => readJson(CHATS_KEY, {}))
  const [settings, setSettings] = useState(() =>
    ({ ...defaultSettings, ...readJson(SETTINGS_KEY, {}) })
  )
  const [selectedId, setSelectedId] = useState(() => agents[0]?.id || '')
  const [view, setView] = useState('chats')
  const [mobileScreen, setMobileScreen] = useState('list')
  const [editorAgent, setEditorAgent] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [typingId, setTypingId] = useState('')
  const [storageReady, setStorageReady] = useState(false)

  const selectedAgent = useMemo(() => {
    return agents.find((agent) => agent.id === selectedId) || agents[0] || null
  }, [agents, selectedId])
  const currentMessages = selectedAgent ? chats[selectedAgent.id] || [] : []

  useEffect(() => {
    loadPersistedData().then((data) => {
      setSettings({ ...data.settings, uiStyle: 'wechat' })
      setAgents(data.agents)
      setChats(data.chats)
      setSelectedId(data.agents[0]?.id || '')
      setStorageReady(true)
    })
  }, [])

  useEffect(() => {
    if (storageReady) writeJson(AGENTS_KEY, agents.map(makeAgent))
  }, [agents, storageReady])

  useEffect(() => {
    if (storageReady) writeJson(CHATS_KEY, chats)
  }, [chats, storageReady])

  useEffect(() => {
    if (storageReady) writeJson(SETTINGS_KEY, { ...settings, uiStyle: 'wechat' })
  }, [settings, storageReady])

  useEffect(() => {
    if (!agents.some((agent) => agent.id === selectedId)) {
      setSelectedId(agents[0]?.id || '')
    }
  }, [agents, selectedId])

  function selectAgent(id) {
    setSelectedId(id)
    setMobileScreen('chat')
  }

  function openNewAgent() {
    setEditorAgent(makeAgent())
  }

  function saveAgent(agent) {
    const normalized = makeAgent(agent)
    setAgents((current) => {
      const exists = current.some((item) => item.id === normalized.id)
      return exists
        ? current.map((item) => (item.id === normalized.id ? normalized : item))
        : [...current, normalized]
    })
    setSelectedId(normalized.id)
    setEditorAgent(null)
    setMobileScreen('chat')
  }

  function deleteAgent(agentId) {
    const target = agents.find((agent) => agent.id === agentId)
    if (!target) return
    if (!window.confirm(`确定删除「${target.name}」吗？聊天记录也会删除。`)) return

    setAgents((current) => current.filter((agent) => agent.id !== agentId))
    setChats((current) => {
      const next = { ...current }
      delete next[agentId]
      return next
    })
    setEditorAgent(null)
    setMobileScreen('list')
  }

  function cloneAgent(agentId) {
    const source = agents.find((agent) => agent.id === agentId)
    if (!source) return
    setEditorAgent(makeAgent({ ...source, id: crypto.randomUUID(), name: `${source.name} 副本` }))
  }

  async function sendMessage({ content, attachments }) {
    if (!selectedAgent) return
    const agentId = selectedAgent.id
    const history = chats[agentId] || []
    const userMessage = makeMessage('user', content, { attachments })

    setChats((current) => ({
      ...current,
      [agentId]: [...(current[agentId] || []), userMessage]
    }))
    setTypingId(agentId)

    try {
      const reply = await requestChatCompletion({
        settings,
        agent: selectedAgent,
        history,
        input: { content, attachments }
      })
      setChats((current) => ({
        ...current,
        [agentId]: [...(current[agentId] || []), makeMessage('assistant', reply)]
      }))
    } catch (error) {
      setChats((current) => ({
        ...current,
        [agentId]: [
          ...(current[agentId] || []),
          makeMessage('error', `请求失败：${error.message || '未知错误'}`)
        ]
      }))
    } finally {
      setTypingId('')
    }
  }

  function deleteMessage(messageId) {
    if (!selectedAgent) return
    if (!window.confirm('确定删除这条消息吗？')) return
    setChats((current) => ({
      ...current,
      [selectedAgent.id]: (current[selectedAgent.id] || []).filter(
        (message) => message.id !== messageId
      )
    }))
  }

  function deleteMessages(messageIds) {
    if (!selectedAgent || messageIds.length === 0) return
    if (!window.confirm(`确定删除选中的 ${messageIds.length} 条消息吗？`)) return
    const idSet = new Set(messageIds)
    setChats((current) => ({
      ...current,
      [selectedAgent.id]: (current[selectedAgent.id] || []).filter(
        (message) => !idSet.has(message.id)
      )
    }))
  }

  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: 'WeChat Style AI Chat',
            version: 1,
            exportedAt: new Date().toISOString(),
            settings,
            agents,
            chats
          },
          null,
          2
        )
      ],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wechat-style-ai-chat-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function importData(payload) {
    if (!payload || !Array.isArray(payload.agents)) {
      window.alert('导入失败：没有找到 agents 联系人数组。')
      return
    }
    if (!window.confirm('导入会覆盖当前本地数据，确定继续吗？')) return
    setAgents(payload.agents)
    setChats(payload.chats && typeof payload.chats === 'object' ? payload.chats : {})
    setSettings({ ...defaultSettings, ...(payload.settings || {}) })
    setSelectedId(payload.agents[0]?.id || '')
    setSettingsOpen(false)
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white">
      <Rail
        active={view}
        onSelect={(nextView) => {
          setView(nextView)
          if (nextView === 'chats' || nextView === 'contacts') setMobileScreen('list')
        }}
        onSettings={() => setSettingsOpen(true)}
      />
      <ConversationList
        agents={agents}
        chats={chats}
        view={view}
        selectedId={selectedAgent?.id}
        visible={mobileScreen === 'list'}
        onSelect={selectAgent}
        onAdd={openNewAgent}
        onEdit={(id) => setEditorAgent(agents.find((agent) => agent.id === id))}
        onClone={cloneAgent}
      />
      {selectedAgent ? (
        <ChatPane
          agent={selectedAgent}
          selfProfile={{
            name: settings.userName || '我',
            avatar: '我',
            avatarImage: settings.userAvatarImage || ''
          }}
          messages={currentMessages}
          isTyping={typingId === selectedAgent.id}
          visible={mobileScreen === 'chat'}
          onBack={() => setMobileScreen('list')}
          onSend={sendMessage}
          onDeleteMessage={deleteMessage}
          onDeleteMessages={deleteMessages}
          onEditAgent={() => setEditorAgent(selectedAgent)}
        />
      ) : (
        <EmptyPane visible={mobileScreen === 'chat'} onBack={() => setMobileScreen('list')} onAdd={openNewAgent} />
      )}
      <AgentEditor
        agent={editorAgent}
        onClose={() => setEditorAgent(null)}
        onSave={saveAgent}
        onDelete={deleteAgent}
      />
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        onExport={exportData}
        onImport={importData}
      />
    </div>
  )
}

function Rail({ active, onSelect, onSettings }) {
  const items = [
    { id: 'contacts', label: '通讯录', icon: UserRound },
    { id: 'chats', label: '微信', icon: MessageCircle },
    { id: 'more', label: '更多', icon: MoreHorizontal },
    { id: 'notice', label: '通知', icon: Bell }
  ]

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-20 grid h-[64px] grid-cols-5 border-t border-wx-line bg-white text-wx-text lg:static lg:flex lg:h-screen lg:w-[88px] lg:grid-cols-none lg:flex-col lg:items-center lg:justify-between lg:border-r lg:border-t-0 lg:bg-wx-rail lg:py-5">
      <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3">
        <div className="mb-5 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#D7E8D2] text-sm font-bold text-[#2B5B2F]">
          AI
        </div>
        {items.map((item) => (
          <RailButton key={item.id} item={item} active={active === item.id} onClick={() => onSelect(item.id)} />
        ))}
      </div>
      <div className="contents lg:hidden">
        {items.map((item) => (
          <RailButton key={item.id} item={item} active={active === item.id} onClick={() => onSelect(item.id)} mobile />
        ))}
        <RailButton item={{ id: 'settings', label: '设置', icon: Settings }} onClick={onSettings} mobile />
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="hidden h-10 w-10 items-center justify-center rounded-md hover:bg-wx-railActive lg:flex"
        title="设置"
      >
        <Settings size={22} />
      </button>
    </aside>
  )
}

function RailButton({ item, active, onClick, mobile = false }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      className={`relative flex items-center justify-center transition ${
        mobile
          ? 'h-16 flex-col gap-0.5 text-[11px]'
          : 'h-11 w-11 rounded-xl hover:bg-wx-railActive'
      } ${active ? 'text-[#07C160] lg:bg-wx-railActive lg:text-[#07C160]' : 'text-zinc-700'}`}
    >
      <Icon size={22} />
      {mobile && <span>{item.label}</span>}
      {active && !mobile && <span className="absolute -right-1 top-2 h-2 w-2 rounded-full bg-[#07C160]" />}
    </button>
  )
}

function ConversationList({
  agents,
  chats,
  view,
  selectedId,
  visible,
  onSelect,
  onAdd,
  onEdit,
  onClone
}) {
  const [query, setQuery] = useState('')
  const list = useMemo(() => {
    const enriched = agents.map((agent) => {
      const messages = chats[agent.id] || []
      const lastMessage = [...messages].reverse().find((message) => {
        return message.role === 'user' || message.role === 'assistant'
      })
      return { ...agent, messageCount: messages.length, lastMessage }
    })
    const filtered = query.trim()
      ? enriched.filter((agent) =>
          [agent.name, agent.status, agent.group, agent.systemPrompt, agent.lastMessage?.content]
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        )
      : enriched

    if (view === 'contacts') {
      return filtered.sort((a, b) => `${a.group}${a.name}`.localeCompare(`${b.group}${b.name}`, 'zh'))
    }
    return filtered
      .filter((agent) => agent.messageCount > 0)
      .sort((a, b) => (b.lastMessage?.createdAt || '').localeCompare(a.lastMessage?.createdAt || ''))
  }, [agents, chats, query, view])

  return (
    <aside className={`${visible ? 'block' : 'hidden'} h-[100dvh] w-full bg-wx-list pb-[64px] lg:block lg:w-[360px] lg:border-r lg:border-wx-line lg:pb-0`}>
      <header className="flex h-[90px] items-end justify-between px-5 pb-3 lg:h-[72px] lg:items-center lg:pb-0">
        <h1 className="text-center text-[22px] font-semibold text-wx-text lg:text-left">
          {view === 'contacts' ? '通讯录' : '微信'}
        </h1>
        <div className="flex gap-1">
          <IconButton title="新增联系人" onClick={onAdd}>
            <Plus size={21} />
          </IconButton>
        </div>
      </header>
      <div className="border-b border-wx-line px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-wx-muted" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input bg-white !pl-12"
            placeholder={view === 'contacts' ? '搜索联系人' : '搜索会话'}
          />
        </div>
      </div>
      <div className="thin-scrollbar h-[calc(100dvh-181px)] overflow-y-auto lg:h-[calc(100vh-125px)]">
        {list.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-wx-muted">
            {view === 'contacts' ? '还没有联系人' : '还没有聊天记录'}
          </div>
        ) : (
          list.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelect(agent.id)}
              className={`group flex w-full items-center gap-3 px-5 py-3 text-left transition lg:px-4 ${
                selectedId === agent.id
                  ? 'bg-[#07C160] text-white'
                  : 'border-b border-wx-line/70 hover:bg-[#EEEEEE]'
              }`}
            >
              <Avatar agent={agent} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-[15px] font-medium ${selectedId === agent.id ? 'text-white' : 'text-wx-text'}`}>{agent.name}</p>
                  <span className={`text-[11px] ${selectedId === agent.id ? 'text-white/90' : 'text-wx-muted'}`}>
                    {agent.lastMessage ? formatTime(agent.lastMessage.createdAt) : ''}
                  </span>
                </div>
                <p className={`mt-1 truncate text-[13px] ${selectedId === agent.id ? 'text-white/90' : 'text-wx-muted'}`}>
                  {agent.lastMessage?.content || agent.status || agent.group || 'AI 联系人'}
                </p>
              </div>
              <div className="hidden gap-1 group-hover:flex">
                <MiniButton title="克隆" onClick={(event) => { event.stopPropagation(); onClone(agent.id) }}>
                  <Copy size={14} />
                </MiniButton>
                <MiniButton title="编辑" onClick={(event) => { event.stopPropagation(); onEdit(agent.id) }}>
                  <Settings size={14} />
                </MiniButton>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}

function ChatPane({ agent, selfProfile, messages, isTyping, visible, onBack, onSend, onDeleteMessage, onDeleteMessages, onEditAgent }) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState([])
  const listRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping, agent.id])

  useEffect(() => {
    setSelectMode(false)
    setSelectedMessageIds([])
  }, [agent.id])

  function submit() {
    const content = draft.trim()
    if ((!content && attachments.length === 0) || isTyping) return
    setDraft('')
    setAttachments([])
    onSend({ content, attachments })
  }

  function toggleMessageSelection(messageId) {
    setSelectedMessageIds((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId]
    )
  }

  function deleteSelectedMessages() {
    if (selectedMessageIds.length === 0) return
    onDeleteMessages(selectedMessageIds)
    setSelectedMessageIds([])
    setSelectMode(false)
  }

  async function addFiles(files) {
    const accepted = files.filter((file) => file.size <= MAX_FILE_BYTES)
    if (accepted.length < files.length) window.alert('部分文件超过 20MB，已跳过。')
    const next = await Promise.all(accepted.map(makeAttachment))
    setAttachments((current) => [...current, ...next])
    setMenuOpen(false)
  }

  async function handleFileSelect(event) {
    await addFiles(Array.from(event.target.files || []))
    event.target.value = ''
  }

  async function handlePaste(event) {
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean)
    if (files.length === 0) return
    event.preventDefault()
    await addFiles(files)
  }

  return (
    <main className={`${visible ? 'flex' : 'hidden'} h-[100dvh] min-w-0 flex-1 flex-col bg-wx-chat pb-[64px] lg:flex lg:pb-0`}>
      <header className="relative flex h-[64px] items-center justify-between border-b border-wx-line bg-[#F7F7F7] px-3 lg:h-[72px] lg:px-6">
        <div className="flex min-w-0 items-center gap-3 lg:flex-1">
          <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded hover:bg-[#EDEDED] lg:hidden">
            <X size={20} />
          </button>
          <div className="hidden lg:block">
            <Avatar agent={agent} small />
          </div>
          <div className="min-w-0">
            <h2 className="absolute left-1/2 top-1/2 max-w-[58vw] -translate-x-1/2 -translate-y-1/2 truncate text-[17px] font-semibold text-wx-text lg:static lg:max-w-none lg:translate-x-0 lg:translate-y-0 lg:text-[16px] lg:font-medium">{agent.name}</h2>
            <p className="hidden truncate text-xs text-wx-muted lg:block">{agent.status || 'AI 联系人'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            title={selectMode ? '取消多选' : '多选删除'}
            onClick={() => {
              setSelectMode((mode) => !mode)
              setSelectedMessageIds([])
            }}
          >
            <span className="text-xs font-semibold">{selectMode ? '取消' : '多选'}</span>
          </IconButton>
          {selectMode && (
            <IconButton title="删除选中消息" onClick={deleteSelectedMessages}>
              <span className="text-xs font-semibold text-red-600">
                删除{selectedMessageIds.length || ''}
              </span>
            </IconButton>
          )}
          <IconButton title="编辑联系人" onClick={onEditAgent}>
          <Menu size={21} />
          </IconButton>
        </div>
      </header>
      <section ref={listRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-8">
        <div className="mx-auto flex max-w-[860px] flex-col gap-5">
          {messages.length === 0 ? (
            <div className="mt-12 text-center text-sm text-wx-muted">开始和 {agent.name} 对话</div>
          ) : (
            messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                agent={agent}
                selfProfile={selfProfile}
                onDelete={onDeleteMessage}
                selectable={selectMode}
                selected={selectedMessageIds.includes(message.id)}
                onToggleSelect={toggleMessageSelection}
              />
            ))
          )}
          {isTyping && <div className="w-fit rounded bg-white px-3 py-2 text-sm text-wx-muted">正在输入...</div>}
        </div>
      </section>
      <footer className="border-t border-wx-line bg-[#F7F7F7] px-3 py-3 lg:px-5">
        {attachments.length > 0 && (
          <div className="mx-auto mb-3 flex max-w-[860px] gap-2 overflow-x-auto">
            {attachments.map((file) => (
              <AttachmentChip
                key={file.id}
                file={file}
                onRemove={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}
              />
            ))}
          </div>
        )}
        <div className="mx-auto flex max-w-[860px] items-end gap-2">
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#EDEDED]">
              <Plus size={22} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-12 left-0 w-44 rounded border border-wx-line bg-white p-1 shadow-soft">
                <MenuItem onClick={() => imageInputRef.current?.click()}><ImagePlus size={17} />上传图片</MenuItem>
                <MenuItem onClick={() => fileInputRef.current?.click()}><FilePlus size={17} />上传文件</MenuItem>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} multiple className="hidden" onChange={handleFileSelect} />
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="输入消息"
            className="min-h-[42px] flex-1 resize-none rounded-md border border-wx-line bg-white px-3 py-2 text-[16px] leading-6 outline-none lg:min-h-[96px] lg:text-[14px]"
          />
          <button
            type="button"
            onClick={submit}
            disabled={(!draft.trim() && attachments.length === 0) || isTyping}
            className="flex h-10 w-10 items-center justify-center rounded bg-[#07C160] text-white disabled:bg-zinc-300"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </main>
  )
}

function MessageRow({
  message,
  agent,
  selfProfile,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect
}) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const speaker = isUser ? selfProfile : agent
  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {selectable && (
        <label className="mr-2 mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(message.id)}
            className="h-4 w-4 accent-[#07C160]"
          />
        </label>
      )}
      <div className={`flex max-w-[86%] items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <Avatar agent={speaker} small />
        <div className={`rounded-md px-3.5 py-2.5 text-[14px] leading-6 shadow-sm ${isUser ? 'bg-wx-green' : isError ? 'bg-red-50 text-red-700' : 'bg-white'}`}>
          {message.attachments?.length > 0 && (
            <div className="mb-2 grid gap-2">
              {message.attachments.map((file) => (
                <AttachmentView key={file.id} file={file} />
              ))}
            </div>
          )}
          {message.content && <div className="whitespace-pre-wrap break-words">{message.content}</div>}
        </div>
        <span className="text-[11px] text-wx-muted">{formatTime(message.createdAt)}</span>
        <button type="button" onClick={() => onDelete(message.id)} className="hidden h-7 w-7 items-center justify-center rounded bg-white text-red-500 group-hover:flex">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function AgentEditor({ agent, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(agent)
  const avatarInputRef = useRef(null)
  useEffect(() => setDraft(agent), [agent])
  if (!draft) return null

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('请选择图片文件。')
      return
    }
    const image = await prepareAvatarImage(file)
    setDraft((current) => ({
      ...current,
      avatarImage: image.dataUrl,
      avatarImageSize: image.size
    }))
    event.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20">
      <section className="thin-scrollbar h-[100dvh] w-full overflow-y-auto bg-white shadow-soft lg:w-[460px]">
        <header className="sticky top-0 flex h-[64px] items-center justify-between border-b border-wx-line bg-white px-4">
          <h2 className="text-lg font-medium">编辑联系人</h2>
          <IconButton title="关闭" onClick={onClose}><X size={20} /></IconButton>
        </header>
        <div className="space-y-4 px-4 pb-24 pt-5">
          <div className="flex items-center gap-4">
            <Avatar agent={draft} large />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-wx-text">
                {draft.name || '新联系人'}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="h-9 rounded border border-wx-line px-3 text-sm hover:bg-wx-list"
                >
                  上传头像
                </button>
                {draft.avatarImage && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        avatarImage: '',
                        avatarImageSize: 0
                      }))
                    }
                    className="h-9 rounded border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    移除
                  </button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>
          <Field label="名称"><input className="input" value={draft.name} onChange={(event) => update('name', event.target.value)} /></Field>
          <Field label="头像文字"><input className="input" value={draft.avatar} maxLength={6} onChange={(event) => update('avatar', event.target.value)} placeholder="未上传头像时显示" /></Field>
          <Field label="分组"><input className="input" value={draft.group} onChange={(event) => update('group', event.target.value)} /></Field>
          <Field label="状态"><input className="input" value={draft.status} onChange={(event) => update('status', event.target.value)} /></Field>
          <Field label="单独模型"><input className="input" value={draft.model} onChange={(event) => update('model', event.target.value)} placeholder="留空使用全局模型" /></Field>
          <Field label="System Prompt">
            <textarea className="min-h-40 w-full resize-y rounded border border-wx-line px-3 py-2 text-[16px] leading-6 outline-none lg:text-[14px]" value={draft.systemPrompt} onChange={(event) => update('systemPrompt', event.target.value)} />
          </Field>
          <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-wx-line bg-white px-4 py-3">
            <button type="button" onClick={() => onSave(draft)} className="h-10 flex-1 rounded bg-[#07C160] text-sm font-medium text-white">保存</button>
            <button type="button" onClick={() => onDelete(draft.id)} className="h-10 w-10 rounded border border-red-200 text-red-600"><Trash2 size={17} className="mx-auto" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}

function SettingsPanel({ open, settings, onChange, onClose, onExport, onImport }) {
  const inputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const userName = cleanMojibake(settings.userName, '')
  if (!open) return null
  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('请选择图片文件。')
      event.target.value = ''
      return
    }
    const image = await prepareAvatarImage(file)
    onChange({
      ...settings,
      userAvatarImage: image.dataUrl,
      userAvatarImageSize: image.size
    })
    event.target.value = ''
  }
  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      onImport(JSON.parse(await file.text()))
    } catch {
      window.alert('导入失败：请选择有效 JSON。')
    }
  }
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20">
      <section className="thin-scrollbar h-[100dvh] w-full overflow-y-auto bg-white shadow-soft lg:w-[420px]">
        <header className="sticky top-0 flex h-[64px] items-center justify-between border-b border-wx-line bg-white px-4">
          <h2 className="text-lg font-medium">设置</h2>
          <IconButton title="关闭" onClick={onClose}><X size={20} /></IconButton>
        </header>
        <div className="space-y-4 px-4 py-5">
          <button
            type="button"
            onClick={() => {
              window.location.href = window.location.hostname === 'localhost'
                ? 'http://localhost:5173'
                : new URL('../', window.location.href).href
            }}
            className="h-10 w-full rounded border border-wx-line text-sm font-medium hover:bg-wx-list"
          >
            切换到 KKT 风格
          </button>

          <div className="rounded border border-wx-line p-4">
            <p className="mb-3 text-sm font-medium text-wx-text">我的资料</p>
            <div className="flex items-center gap-4">
              <Avatar
                agent={{
                  name: userName || '我',
                  avatar: '我',
                  avatarImage: settings.userAvatarImage
                }}
                large
              />
              <div className="min-w-0 flex-1">
                <input
                  className="input"
                  value={userName}
                  onChange={(e) => onChange({ ...settings, userName: e.target.value })}
                  placeholder="我的昵称"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="h-9 rounded border border-wx-line px-3 text-sm hover:bg-wx-list">
                    上传头像
                  </button>
                  {settings.userAvatarImage && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...settings, userAvatarImage: '', userAvatarImageSize: 0 })}
                      className="h-9 rounded border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <Field label="Provider Name"><input className="input" value={settings.providerName} onChange={(e) => onChange({ ...settings, providerName: e.target.value })} /></Field>
          <Field label="API Type">
            <select
              className="input bg-white"
              value={settings.apiType === 'Gemini' ? 'gemini' : settings.apiType || 'openai-compatible'}
              onChange={(e) => {
                const apiType = e.target.value
                onChange({
                  ...settings,
                  apiType,
                  providerName: apiType === 'gemini' ? settings.providerName || 'Gemini' : settings.providerName,
                  baseUrl: apiType === 'gemini' ? '' : settings.baseUrl,
                  model: apiType === 'gemini' ? settings.model || DEFAULT_GEMINI_MODEL : settings.model
                })
              }}
            >
              <option value="openai-compatible">OpenAI Compatible Chat Completions</option>
              <option value="gemini">Gemini</option>
            </select>
          </Field>
          {(settings.apiType || 'openai-compatible') !== 'gemini' && <Field label="Request Mode">
            <select className="input bg-white" value={settings.requestMode || 'auto'} onChange={(e) => onChange({ ...settings, requestMode: e.target.value })}>
              <option value="auto">自动选择：本地用代理，GitHub 网页用直连</option>
              <option value="direct">浏览器直连：适合支持 CORS 的服务商</option>
              <option value="proxy">本地代理：适合 NVIDIA 等会被 CORS 拦截的服务商</option>
            </select>
          </Field>}
          <Field label="Base URL"><input className="input" value={settings.baseUrl} onChange={(e) => onChange({ ...settings, baseUrl: e.target.value })} placeholder={(settings.apiType || 'openai-compatible') === 'gemini' ? 'Gemini 不需要 Base URL，此项会被忽略' : ''} /></Field>
          <Field label="API Key"><input type="password" className="input" value={settings.apiKey} onChange={(e) => onChange({ ...settings, apiKey: e.target.value })} /></Field>
          <Field label="Model"><input className="input" value={settings.model} onChange={(e) => onChange({ ...settings, model: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onClick={onExport} className="flex h-10 items-center justify-center gap-2 rounded border border-wx-line"><Download size={17} />导出</button>
            <button type="button" onClick={() => inputRef.current?.click()} className="flex h-10 items-center justify-center gap-2 rounded border border-wx-line"><Upload size={17} />导入</button>
          </div>
          <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={importFile} />
        </div>
      </section>
    </div>
  )
}

function EmptyPane({ visible, onBack, onAdd }) {
  return (
    <main className={`${visible ? 'flex' : 'hidden'} h-[100dvh] flex-1 items-center justify-center bg-wx-chat px-5 pb-[64px] text-center lg:flex lg:pb-0`}>
      <div className="rounded bg-white px-6 py-5 shadow-sm">
        <p className="font-medium">还没有联系人</p>
        <p className="mt-2 text-sm text-wx-muted">新增联系人后开始聊天。</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onBack} className="h-10 flex-1 rounded border border-wx-line lg:hidden">返回</button>
          <button type="button" onClick={onAdd} className="h-10 flex-1 rounded bg-[#07C160] px-4 text-white">新增</button>
        </div>
      </div>
    </main>
  )
}

function AttachmentChip({ file, onRemove }) {
  return (
    <div className="relative shrink-0">
      {file.type === 'image' ? (
        <img src={file.dataUrl} alt={file.name} className="h-20 w-20 rounded object-cover" />
      ) : (
        <div className="flex h-20 w-52 items-center gap-3 rounded bg-white px-3">
          <FileText size={24} /><div className="min-w-0"><p className="truncate text-sm">{file.name}</p><p className="text-xs text-wx-muted">{formatBytes(file.size)}</p></div>
        </div>
      )}
      <button type="button" onClick={onRemove} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><X size={13} /></button>
    </div>
  )
}

function AttachmentView({ file }) {
  if (file.type === 'image') {
    return <a href={file.dataUrl} target="_blank" rel="noreferrer"><img src={file.dataUrl} alt={file.name} className="max-h-[240px] rounded object-contain" /></a>
  }
  return <a href={file.dataUrl} download={file.name} className="flex min-w-[220px] items-center gap-3 rounded bg-black/5 px-3 py-2"><FileText size={22} /><span className="truncate text-sm">{file.name}</span></a>
}

function Avatar({ agent, small = false, large = false }) {
  const size = small ? 'h-10 w-10' : large ? 'h-16 w-16' : 'h-12 w-12'
  return (
    <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded bg-[#D7E8D2] text-sm font-semibold text-[#2B5B2F]`}>
      {agent.avatarImage ? (
        <img
          src={agent.avatarImage}
          alt={agent.name || '头像'}
          className="h-full w-full object-cover"
        />
      ) : (
        agent.avatar || agent.name?.[0] || 'AI'
      )}
    </div>
  )
}

function IconButton({ title, onClick, children }) {
  return <button type="button" title={title} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded hover:bg-[#EDEDED]">{children}</button>
}

function MiniButton({ title, onClick, children }) {
  return <button type="button" title={title} onClick={onClick} className="flex h-6 w-6 items-center justify-center rounded hover:bg-white">{children}</button>
}

function MenuItem({ onClick, children }) {
  return <button type="button" onClick={onClick} className="flex h-9 w-full items-center gap-2 rounded px-3 text-left text-sm hover:bg-wx-list">{children}</button>
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span>{children}</label>
}

async function requestChatCompletion({ settings, agent, history, input }) {
  const apiType = settings.apiType === 'Gemini' ? 'gemini' : settings.apiType || 'openai-compatible'
  if (!settings.apiKey.trim()) throw new Error('请先填写 API Key。')
  if (!settings.model.trim() && !agent.model.trim() && apiType !== 'gemini') throw new Error('请先填写模型名。')

  const messages = [
    { role: 'system', content: agent.systemPrompt || '你是一个简洁、自然的 AI 助手。' },
    ...history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content || '[附件消息]' })),
    { role: 'user', content: toUserContent(input) }
  ]

  if (apiType === 'gemini') {
    const geminiMessages = [
      { role: 'system', content: agent.systemPrompt || '你是一个简洁、自然的 AI 助手。' },
      ...history
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content || '[附件消息]',
          attachments: message.attachments || []
        })),
      {
        role: 'user',
        content: input.content,
        attachments: input.attachments || []
      }
    ]
    const content = await callGemini({
      apiKey: settings.apiKey.trim(),
      model: agent.model || settings.model || DEFAULT_GEMINI_MODEL,
      messages: geminiMessages,
      temperature: 0.7
    })
    return content.trim() || '响应为空。'
  }

  if (!settings.baseUrl.trim()) throw new Error('请先填写 Base URL。')
  if (apiType !== 'openai-compatible') {
    throw new Error('当前仅支持 OpenAI Compatible Chat Completions 和 Gemini。')
  }

  const requestMode = resolveRequestMode(settings)
  const body = {
    model: agent.model || settings.model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: false
  }

  let response
  try {
    if (requestMode === 'proxy') {
      response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: settings.baseUrl.trim(),
          apiKey: settings.apiKey.trim(),
          ...body
        })
      })
    } else {
      response = await fetch(joinUrl(settings.baseUrl.trim(), '/chat/completions'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey.trim()}`,
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

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || data?.message || `HTTP ${response.status}`)
  }

  const content = requestMode === 'proxy'
    ? data?.content
    : data?.choices?.[0]?.message?.content
  return content?.trim() || '响应为空。'
}

function resolveRequestMode(settings) {
  if (settings.requestMode === 'proxy') return 'proxy'
  if (settings.requestMode === 'direct') return 'direct'
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    ? 'proxy'
    : 'direct'
}

function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`
}

function toUserContent(input) {
  const attachments = input.attachments || []
  if (attachments.length === 0) return input.content
  const images = attachments.filter((file) => file.type === 'image')
  const files = attachments.filter((file) => file.type !== 'image')
  const text = [
    input.content || (images.length ? '请识别图片并回答。' : '请阅读附件并回答。'),
    ...files.map((file) => `\n文件：${file.name}\n${file.textContent || '[此文件未解析正文，仅作为附件保存。]'}`)
  ].join('\n')
  return [
    { type: 'text', text },
    ...images.map((file) => ({ type: 'image_url', image_url: { url: file.dataUrl } }))
  ]
}

async function makeAttachment(file) {
  const isImage = file.type.startsWith('image/')
  const prepared = isImage ? await prepareImage(file) : null
  const item = {
    id: crypto.randomUUID(),
    type: isImage ? 'image' : 'file',
    name: file.name,
    mimeType: prepared?.mimeType || file.type || 'application/octet-stream',
    size: prepared?.size || file.size,
    originalSize: file.size,
    compressed: Boolean(prepared?.compressed),
    dataUrl: prepared?.dataUrl || (await readAsDataUrl(file))
  }
  Object.defineProperty(item, 'rawFile', {
    value: file,
    enumerable: false
  })
  if (!isImage && isTextLike(file)) item.textContent = await file.text()
  return item
}

async function prepareImage(file) {
  if (file.size <= MAX_IMAGE_BYTES) {
    return { dataUrl: await readAsDataUrl(file), mimeType: file.type, size: file.size, compressed: false }
  }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob || blob.size >= file.size) {
      return { dataUrl: await readAsDataUrl(file), mimeType: file.type, size: file.size, compressed: false }
    }
    return { dataUrl: await readAsDataUrl(blob), mimeType: 'image/jpeg', size: blob.size, compressed: true }
  } catch (error) {
    return { dataUrl: await readAsDataUrl(file), mimeType: file.type, size: file.size, compressed: false }
  }
}

async function prepareAvatarImage(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const edge = 320
    const sourceSize = Math.min(bitmap.width, bitmap.height)
    const sourceX = Math.max(0, Math.floor((bitmap.width - sourceSize) / 2))
    const sourceY = Math.max(0, Math.floor((bitmap.height - sourceSize) / 2))
    const canvas = document.createElement('canvas')
    canvas.width = edge
    canvas.height = edge
    canvas
      .getContext('2d')
      .drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, edge, edge)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (blob) {
      return { dataUrl: await readAsDataUrl(blob), size: blob.size }
    }
  } catch {
    // Fall back to the original image below.
  }
  return { dataUrl: await readAsDataUrl(file), size: file.size }
}

function isTextLike(file) {
  return file.type.startsWith('text/') || /\.(txt|md|json|js|jsx|ts|tsx|py|html|css|csv|log|xml|yaml|yml)$/i.test(file.name)
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function makeAgent(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || '新联系人',
    avatar: overrides.avatar || 'AI',
    avatarImage: overrides.avatarImage || '',
    avatarImageSize: overrides.avatarImageSize || 0,
    group: overrides.group || '默认',
    status: overrides.status || '',
    model: overrides.model || '',
    systemPrompt: overrides.systemPrompt || '',
    ...overrides
  }
}

function makeMessage(role, content, meta = {}) {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString(), ...meta }
}

async function loadPersistedData() {
  const [settings, agents, chats] = await Promise.all([
    readDbValue(SETTINGS_KEY, null),
    readDbValue(AGENTS_KEY, null),
    readDbValue(CHATS_KEY, null)
  ])

  const nextSettings = settings
    ? { ...defaultSettings, ...settings }
    : { ...defaultSettings, ...readJson(SETTINGS_KEY, {}) }
  const nextAgents = Array.isArray(agents)
    ? agents.map(makeAgent)
    : readJson(AGENTS_KEY, []).map(makeAgent)
  const nextChats = chats && typeof chats === 'object' ? chats : readJson(CHATS_KEY, {})

  if (!settings) writeDbValue(SETTINGS_KEY, nextSettings)
  if (!agents) writeDbValue(AGENTS_KEY, nextAgents)
  if (!chats) writeDbValue(CHATS_KEY, nextChats)

  return { settings: nextSettings, agents: nextAgents, chats: nextChats }
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  const storedValue = key === CHATS_KEY ? stripTransientFiles(value) : value
  writeDbValue(key, storedValue)
  try {
    localStorage.setItem(key, JSON.stringify(storedValue))
  } catch (error) {
    console.warn('Failed to mirror data to localStorage', error)
  }
}

function stripTransientFiles(chats) {
  return Object.fromEntries(
    Object.entries(chats || {}).map(([agentId, messages]) => [
      agentId,
      Array.isArray(messages)
        ? messages.map((message) => ({
            ...message,
            attachments: Array.isArray(message.attachments)
              ? message.attachments.map(({ rawFile, file, ...attachment }) => attachment)
              : message.attachments
          }))
        : messages
    ])
  )
}

function openDb() {
  if (!('indexedDB' in window)) return Promise.resolve(null)

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function readDbValue(key, fallback) {
  const db = await openDb()
  if (!db) return fallback

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result ?? fallback)
    request.onerror = () => resolve(fallback)
  })
}

async function writeDbValue(key, value) {
  const db = await openDb()
  if (!db) return false

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(value, key)
    request.onsuccess = () => resolve(true)
    request.onerror = () => resolve(false)
  })
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function cleanMojibake(value, fallback = '') {
  if (!value) return fallback
  const text = String(value)
  const looksBroken = /[�]|[鎴鐢电戞枡绯讳繚瓨鍏抽棴]|[?]{2,}/.test(text)
  return looksBroken ? fallback : text
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default App
