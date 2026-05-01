import { Copy, Edit3, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function ContactList({
  agents,
  selectedAgentId,
  chats,
  viewMode,
  mobileVisible,
  onSelectAgent,
  onAddAgent,
  onEditAgent,
  onCloneAgent
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const preparedAgents = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const enriched = agents.map((agent) => {
      const messages = chats[agent.id] || []
      const lastMessage = [...messages].reverse().find((message) => {
        return message.role === 'user' || message.role === 'assistant'
      })
      const messageCount = messages.length

      return {
        ...agent,
        lastMessage,
        messageCount
      }
    })

    const filtered = keyword
      ? enriched.filter((agent) => {
          const messages = chats[agent.id] || []
          const haystack = [
            agent.name,
            agent.status,
            agent.group,
            agent.systemPrompt,
            agent.lastMessage?.content,
            ...messages.slice(-8).map((message) => message.content)
          ]
            .join(' ')
            .toLowerCase()

          return haystack.includes(keyword)
        })
      : enriched

    if (viewMode === 'friends') {
      return [...filtered].sort((a, b) => {
        return `${a.group}${a.name}`.localeCompare(`${b.group}${b.name}`, 'zh')
      })
    }

    return [...filtered]
      .filter((agent) => agent.messageCount > 0)
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || ''
        const bTime = b.lastMessage?.createdAt || ''
        if (aTime || bTime) return bTime.localeCompare(aTime)
        return a.name.localeCompare(b.name, 'zh')
      })
  }, [agents, chats, query, viewMode])

  const groupedFriends = useMemo(() => {
    return preparedAgents.reduce((groups, agent) => {
      const groupName = agent.group || '默认'
      if (!groups[groupName]) groups[groupName] = []
      groups[groupName].push(agent)
      return groups
    }, {})
  }, [preparedAgents])

  return (
    <aside
      className={`h-[100dvh] w-full shrink-0 border-r border-kakao-line bg-white pb-[64px] lg:block lg:w-[310px] lg:pb-0 ${
        mobileVisible ? 'block' : 'hidden'
      }`}
    >
      <div className="flex h-[64px] items-center justify-between border-b border-kakao-line px-5 lg:h-[72px] lg:px-6">
        <h1 className="text-[22px] font-semibold tracking-normal text-kakao-text">
          {viewMode === 'friends' ? 'Friends' : 'Chats'}
        </h1>
        <div className="flex items-center gap-1">
          <IconButton
            title={searchOpen ? '关闭搜索' : '搜索'}
            onClick={() => {
              setSearchOpen((open) => !open)
              setQuery('')
            }}
          >
            {searchOpen ? (
              <X size={20} strokeWidth={1.9} />
            ) : (
              <Search size={20} strokeWidth={1.9} />
            )}
          </IconButton>
          <IconButton title="新增联系人" onClick={onAddAgent}>
            <Plus size={21} strokeWidth={1.9} />
          </IconButton>
        </div>
      </div>

      {searchOpen && (
        <div className="border-b border-kakao-line px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder={
              viewMode === 'friends'
                ? '搜索联系人、人设或分组'
                : '搜索会话和最近消息'
            }
            className="input"
          />
        </div>
      )}

      <div className="bg-kakao-section px-6 py-2 text-xs font-medium text-kakao-muted">
        {viewMode === 'friends'
          ? `${preparedAgents.length} Contacts`
          : `${preparedAgents.length} Conversations`}
      </div>

      <div
        className={`chat-scrollbar overflow-y-auto px-3 py-3 ${
          searchOpen
            ? 'h-[calc(100dvh-213px)] lg:h-[calc(100vh-157px)]'
            : 'h-[calc(100dvh-160px)] lg:h-[calc(100vh-104px)]'
        }`}
      >
        {preparedAgents.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-kakao-muted">
            {viewMode === 'friends'
              ? '没有找到匹配的联系人'
              : '还没有聊天记录'}
          </div>
        ) : viewMode === 'friends' ? (
          <FriendsView
            groupedFriends={groupedFriends}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
            onEditAgent={onEditAgent}
            onCloneAgent={onCloneAgent}
          />
        ) : (
          <ChatsView
            agents={preparedAgents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
            onEditAgent={onEditAgent}
            onCloneAgent={onCloneAgent}
          />
        )}
      </div>
    </aside>
  )
}

function ChatsView({
  agents,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onCloneAgent
}) {
  return agents.map((agent) => {
    const selected = selectedAgentId === agent.id

    return (
      <AgentRow
        key={agent.id}
        agent={agent}
        selected={selected}
        primaryText={agent.lastMessage?.content || agent.status}
        secondaryText={`${agent.group || '默认'}${agent.model ? ` · ${agent.model}` : ''}`}
        timeText={formatContactTime(agent.lastMessage?.createdAt)}
        onSelectAgent={onSelectAgent}
        onEditAgent={onEditAgent}
        onCloneAgent={onCloneAgent}
      />
    )
  })
}

function FriendsView({
  groupedFriends,
  selectedAgentId,
  onSelectAgent,
  onEditAgent,
  onCloneAgent
}) {
  return Object.entries(groupedFriends).map(([groupName, groupAgents]) => (
    <div key={groupName} className="mb-3">
      <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {groupName}
      </div>
      {groupAgents.map((agent) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          selected={selectedAgentId === agent.id}
          primaryText={agent.status || '暂无状态文字'}
          secondaryText={`${agent.systemPrompt.slice(0, 26)}${agent.systemPrompt.length > 26 ? '...' : ''}`}
          timeText={agent.messageCount > 0 ? `${agent.messageCount} 条` : ''}
          onSelectAgent={onSelectAgent}
          onEditAgent={onEditAgent}
          onCloneAgent={onCloneAgent}
        />
      ))}
    </div>
  ))
}

function AgentRow({
  agent,
  selected,
  primaryText,
  secondaryText,
  timeText,
  onSelectAgent,
  onEditAgent,
  onCloneAgent
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectAgent(agent.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSelectAgent(agent.id)
      }}
      className={`group flex w-full items-center gap-3 rounded-md px-3 py-3 text-left outline-none transition ${
        selected ? 'bg-[#F0F0F0]' : 'hover:bg-kakao-section'
      }`}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] text-sm font-semibold text-white"
        style={{ backgroundColor: agent.accent }}
      >
        {agent.avatarImage ? (
          <img
            src={agent.avatarImage}
            alt={agent.name}
            className="h-full w-full object-cover"
          />
        ) : (
          agent.avatar
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[15px] font-semibold text-kakao-text">
            {agent.name}
          </p>
          <span className="shrink-0 text-[11px] text-zinc-400">
            {timeText}
          </span>
        </div>
        <p className="mt-1 truncate text-[13px] text-kakao-muted">
          {primaryText}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-zinc-400">
            {secondaryText}
          </span>
          <div className="flex opacity-0 transition group-hover:opacity-100">
            <MiniButton
              title="克隆联系人"
              onClick={(event) => {
                event.stopPropagation()
                onCloneAgent(agent.id)
              }}
            >
              <Copy size={14} />
            </MiniButton>
            <MiniButton
              title="编辑联系人"
              onClick={(event) => {
                event.stopPropagation()
                onEditAgent(agent.id)
              }}
            >
              <Edit3 size={14} />
            </MiniButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-kakao-section hover:text-kakao-text"
    >
      {children}
    </button>
  )
}

function MiniButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition hover:bg-white hover:text-kakao-text"
    >
      {children}
    </button>
  )
}

function formatContactTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
