import { defaultAgents } from '../data/agents.js'

const SETTINGS_KEY = 'local-ai-talk-settings'
const CHATS_KEY = 'local-ai-talk-chats'
const AGENTS_KEY = 'local-ai-talk-agents'

export const defaultSettings = {
  providerName: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  apiType: 'openai-compatible'
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadAgents() {
  try {
    const raw = localStorage.getItem(AGENTS_KEY)
    const savedAgents = raw ? JSON.parse(raw) : null
    return Array.isArray(savedAgents)
      ? savedAgents.map(normalizeAgent)
      : defaultAgents.map(normalizeAgent)
  } catch {
    return defaultAgents.map(normalizeAgent)
  }
}

export function saveAgents(agents) {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents.map(normalizeAgent)))
}

export function loadChats() {
  try {
    const raw = localStorage.getItem(CHATS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveChats(chats) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
}

export function makeMessage(role, content, meta = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...meta
  }
}

export function makeAgent(overrides = {}) {
  return normalizeAgent({
    id: crypto.randomUUID(),
    name: '新联系人',
    group: '自定义',
    status: '自定义 AI 联系人',
    avatar: 'AI',
    accent: '#8CA6C8',
    model: '',
    systemPrompt: '',
    apiConfig: {
      enabled: false,
      providerName: '',
      apiType: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: ''
    },
    ...overrides
  })
}

function normalizeAgent(agent) {
  return {
    id: agent.id || crypto.randomUUID(),
    name: agent.name || '未命名联系人',
    group: agent.group || '默认',
    status: agent.status || '',
    avatar: agent.avatar || 'AI',
    accent: agent.accent || '#8CA6C8',
    model: agent.model || '',
    systemPrompt: agent.systemPrompt || '',
    apiConfig: {
      enabled: Boolean(agent.apiConfig?.enabled),
      providerName: agent.apiConfig?.providerName || '',
      apiType: agent.apiConfig?.apiType || 'openai-compatible',
      baseUrl: agent.apiConfig?.baseUrl || '',
      apiKey: agent.apiConfig?.apiKey || '',
      model: agent.apiConfig?.model || ''
    }
  }
}
