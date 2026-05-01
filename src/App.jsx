import { useEffect, useMemo, useState } from 'react'
import AppSidebar from './components/AppSidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import ContactEditorPanel from './components/ContactEditorPanel.jsx'
import ContactList from './components/ContactList.jsx'
import InfoPanel from './components/InfoPanel.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import { defaultAgentMap } from './data/agents.js'
import { sendChatCompletion } from './services/apiClient.js'
import {
  loadAgents,
  loadChats,
  loadPersistedData,
  loadSettings,
  makeAgent,
  makeMessage,
  saveAgents,
  saveChats,
  saveSettings
} from './utils/storage.js'

export default function App() {
  const [agents, setAgents] = useState(loadAgents)
  const [activeRailItem, setActiveRailItem] = useState('chats')
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editorState, setEditorState] = useState(null)
  const [infoPanelType, setInfoPanelType] = useState(null)
  const [mobileScreen, setMobileScreen] = useState('list')
  const [settings, setSettings] = useState(loadSettings)
  const [chats, setChats] = useState(loadChats)
  const [typingAgentId, setTypingAgentId] = useState(null)
  const [storageReady, setStorageReady] = useState(false)

  const selectedAgent = useMemo(() => {
    return agents.find((agent) => agent.id === selectedAgentId) || agents[0] || null
  }, [agents, selectedAgentId])

  const currentMessages = selectedAgent ? chats[selectedAgent.id] || [] : []
  const isTyping = selectedAgent ? typingAgentId === selectedAgent.id : false
  const editingAgent = editorState
    ? agents.find((agent) => agent.id === editorState.agentId) ||
      editorState.agent
    : null

  useEffect(() => {
    loadPersistedData().then((data) => {
      setSettings(data.settings)
      setAgents(data.agents)
      setChats(data.chats)
      setSelectedAgentId(data.agents[0]?.id)
      setStorageReady(true)
    })
  }, [])

  useEffect(() => {
    if (storageReady) saveAgents(agents)
  }, [agents, storageReady])

  useEffect(() => {
    if (storageReady) saveChats(chats)
  }, [chats, storageReady])

  useEffect(() => {
    if (!agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(agents[0]?.id)
    }
  }, [agents, selectedAgentId])

  useEffect(() => {
    function openEditorForCurrentAgent() {
      if (!selectedAgent) return
      setEditorState({ mode: 'edit', agentId: selectedAgent.id })
    }

    window.addEventListener('edit-current-agent', openEditorForCurrentAgent)
    return () => {
      window.removeEventListener('edit-current-agent', openEditorForCurrentAgent)
    }
  }, [selectedAgent])

  function handleRailSelect(itemId) {
    setActiveRailItem(itemId)
    if (itemId === 'friends' || itemId === 'chats') {
      setMobileScreen('list')
    }
    if (itemId === 'more' || itemId === 'notifications') {
      setInfoPanelType(itemId)
    } else {
      setInfoPanelType(null)
    }

    if (itemId === 'chats') {
      const chatAgents = agents
        .map((agent) => {
          const messages = chats[agent.id] || []
          const lastMessage = [...messages].reverse().find((message) => {
            return message.role === 'user' || message.role === 'assistant'
          })
          return {
            id: agent.id,
            lastMessage
          }
        })
        .filter((agent) => agent.lastMessage)
        .sort((a, b) => {
          return b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt)
        })

      if (
        chatAgents.length > 0 &&
        !chatAgents.some((agent) => agent.id === selectedAgentId)
      ) {
        setSelectedAgentId(chatAgents[0].id)
      }
    }
  }

  function handleSaveSettings() {
    saveSettings(settings)
    setSettingsOpen(false)
  }

  function handleExportData() {
    const payload = {
      app: 'Local AI Talk',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      agents,
      chats
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `local-ai-talk-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function handleImportData(payload) {
    const imported = normalizeImportPayload(payload)

    if (!imported) {
      const fields =
        payload && typeof payload === 'object'
          ? Object.keys(payload).join('、') || '无字段'
          : '不是对象'
      window.alert(
        `导入失败：没有找到联系人数据。\n\n当前 JSON 字段：${fields}\n\n请导入本软件“导出 JSON”生成的备份文件。`
      )
      return
    }

    const confirmed = window.confirm(
      '导入会覆盖当前本地设置、联系人和聊天记录，确定继续吗？'
    )
    if (!confirmed) return

    const nextSettings = imported.settings || settings
    setSettings(nextSettings)
    saveSettings(nextSettings)
    setAgents(imported.agents)
    setChats(imported.chats)
    setSelectedAgentId(imported.agents[0]?.id)
    setSettingsOpen(false)
  }

  function appendMessage(agentId, message) {
    setChats((current) => ({
      ...current,
      [agentId]: [...(current[agentId] || []), message]
    }))
  }

  async function handleSend(input) {
    if (!selectedAgent) return
    const content = typeof input === 'string' ? input : input.content
    const attachments = typeof input === 'string' ? [] : input.attachments || []
    const agentId = selectedAgent.id
    const history = chats[agentId] || []
    const userMessage = makeMessage('user', content, { attachments })

    appendMessage(agentId, userMessage)
    setTypingAgentId(agentId)

    try {
      const reply = await sendChatCompletion({
        settings,
        agent: selectedAgent,
        history,
        input: {
          content,
          attachments
        }
      })
      appendMessage(agentId, makeMessage('assistant', reply))
    } catch (error) {
      appendMessage(
        agentId,
        makeMessage('error', `请求失败：${error.message || '未知错误'}`)
      )
    } finally {
      setTypingAgentId(null)
    }
  }

  function handleClearChat() {
    if (!selectedAgent) return
    setChats((current) => ({
      ...current,
      [selectedAgent.id]: []
    }))
  }

  function handleDeleteMessage(messageId) {
    if (!selectedAgent) return
    const confirmed = window.confirm('确定删除这条聊天记录吗？')
    if (!confirmed) return

    setChats((current) => ({
      ...current,
      [selectedAgent.id]: (current[selectedAgent.id] || []).filter(
        (message) => message.id !== messageId
      )
    }))
  }

  function handleDeleteMessages(messageIds) {
    if (!selectedAgent || messageIds.length === 0) return
    const confirmed = window.confirm(`确定删除选中的 ${messageIds.length} 条聊天记录吗？`)
    if (!confirmed) return
    const idSet = new Set(messageIds)

    setChats((current) => ({
      ...current,
      [selectedAgent.id]: (current[selectedAgent.id] || []).filter(
        (message) => !idSet.has(message.id)
      )
    }))
  }

  function handleSelectAgent(agentId) {
    setSelectedAgentId(agentId)
    setMobileScreen('chat')
  }

  function handleAddAgent() {
    const agent = makeAgent()
    setEditorState({ mode: 'create', agentId: agent.id, agent })
  }

  function handleEditAgent(agentId) {
    setEditorState({ mode: 'edit', agentId })
  }

  function handleCloneAgent(agentId) {
    const source = agents.find((agent) => agent.id === agentId)
    if (!source) return

    const cloned = makeAgent({
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} 副本`
    })

    setEditorState({ mode: 'create', agentId: cloned.id, agent: cloned })
  }

  function handleSaveAgent(nextAgent) {
    const savedAgent = makeAgent(nextAgent)
    setAgents((current) => {
      const exists = current.some((agent) => agent.id === savedAgent.id)
      return exists
        ? current.map((agent) =>
            agent.id === savedAgent.id ? savedAgent : agent
          )
        : [...current, savedAgent]
    })
    setSelectedAgentId(savedAgent.id)
    setEditorState(null)
  }

  function handleDeleteAgent(agentId) {
    const target = agents.find((agent) => agent.id === agentId)
    if (!target) return

    const confirmed = window.confirm(
      `确定删除「${target.name}」吗？该联系人的聊天记录也会一起删除。`
    )
    if (!confirmed) return

    setAgents((current) => current.filter((agent) => agent.id !== agentId))
    setChats((current) => {
      const next = { ...current }
      delete next[agentId]
      return next
    })
    setEditorState(null)
  }

  function handleRestoreDefault(agentId) {
    const original = defaultAgentMap[agentId]
    if (!original) return editingAgent

    const restored = makeAgent({
      ...original,
      id: agentId
    })

    setAgents((current) =>
      current.map((agent) => (agent.id === agentId ? restored : agent))
    )
    return restored
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white">
      <AppSidebar
        activeItem={activeRailItem}
        onSelect={handleRailSelect}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <ContactList
        agents={agents}
        selectedAgentId={selectedAgent?.id}
        chats={chats}
        viewMode={activeRailItem === 'friends' ? 'friends' : 'chats'}
        mobileVisible={mobileScreen === 'list'}
        onSelectAgent={handleSelectAgent}
        onAddAgent={handleAddAgent}
        onEditAgent={handleEditAgent}
        onCloneAgent={handleCloneAgent}
      />
      {selectedAgent ? (
        <ChatWindow
          agent={selectedAgent}
          selfProfile={{
            name: settings.userName || '我',
            avatar: settings.userName?.[0] || '我',
            avatarImage: settings.userAvatarImage || '',
            accent: '#FEE500'
          }}
          messages={currentMessages}
          isTyping={isTyping}
          mobileVisible={mobileScreen === 'chat'}
          onBack={() => setMobileScreen('list')}
          onSend={handleSend}
          onClearChat={handleClearChat}
          onDeleteMessage={handleDeleteMessage}
          onDeleteMessages={handleDeleteMessages}
        />
      ) : (
        <EmptyChatPanel
          mobileVisible={mobileScreen === 'chat'}
          onBack={() => setMobileScreen('list')}
          onAddAgent={handleAddAgent}
        />
      )}
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />
      <ContactEditorPanel
        open={Boolean(editorState)}
        mode={editorState?.mode || 'edit'}
        agent={editingAgent}
        onClose={() => setEditorState(null)}
        onSave={handleSaveAgent}
        onDelete={handleDeleteAgent}
        onRestoreDefault={handleRestoreDefault}
      />
      <InfoPanel
        type={infoPanelType}
        agents={agents}
        chats={chats}
        onClose={() => setInfoPanelType(null)}
        onOpenSettings={() => {
          setInfoPanelType(null)
          setSettingsOpen(true)
        }}
      />
    </div>
  )
}

function EmptyChatPanel({ mobileVisible, onBack, onAddAgent }) {
  return (
    <main
      className={`h-[100dvh] min-w-0 flex-1 flex-col items-center justify-center bg-kakao-chat px-6 pb-[64px] text-center lg:flex lg:pb-0 ${
        mobileVisible ? 'flex' : 'hidden'
      }`}
    >
      <div className="max-w-sm rounded-md bg-white/60 px-6 py-5">
        <p className="text-base font-semibold text-kakao-text">还没有联系人</p>
        <p className="mt-2 text-sm leading-6 text-kakao-muted">
          点击新增联系人，填写名称、状态和 system prompt 后就可以开始聊天。
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 flex-1 rounded-md border border-kakao-line bg-white text-sm font-medium text-kakao-text lg:hidden"
          >
            返回列表
          </button>
          <button
            type="button"
            onClick={onAddAgent}
            className="h-10 flex-1 rounded-md bg-kakao-yellow text-sm font-semibold text-kakao-text"
          >
            新增联系人
          </button>
        </div>
      </div>
    </main>
  )
}

function normalizeImportPayload(payload) {
  if (!payload || typeof payload !== 'object') return null

  const agents =
    Array.isArray(payload.agents)
      ? payload.agents
      : Array.isArray(payload.contacts)
        ? payload.contacts
        : Array.isArray(payload.data?.agents)
          ? payload.data.agents
          : null

  if (!agents) return null

  const chats =
    payload.chats && typeof payload.chats === 'object'
      ? payload.chats
      : payload.messages && typeof payload.messages === 'object'
        ? payload.messages
        : payload.data?.chats && typeof payload.data.chats === 'object'
          ? payload.data.chats
          : {}

  const settings =
    payload.settings ||
    payload.apiSettings ||
    payload.data?.settings ||
    null

  return {
    agents,
    chats,
    settings
  }
}
