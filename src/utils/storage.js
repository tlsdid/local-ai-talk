import { defaultAgents } from '../data/agents.js'

const SETTINGS_KEY = 'local-ai-talk-settings'
const CHATS_KEY = 'local-ai-talk-chats'
const AGENTS_KEY = 'local-ai-talk-agents'
const DB_NAME = 'local-ai-talk-db'
const DB_VERSION = 1
const STORE_NAME = 'keyval'

export const defaultSettings = {
  uiStyle: 'kakao',
  userName: '',
  userAvatarImage: '',
  userAvatarImageSize: 0,
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
  const normalized = { ...defaultSettings, ...settings }
  writeDbValue(SETTINGS_KEY, normalized)
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized))
    return true
  } catch (error) {
    console.warn('Failed to mirror settings to localStorage', error)
    return false
  }
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
  const normalized = agents.map(normalizeAgent)
  writeDbValue(AGENTS_KEY, normalized)
  try {
    localStorage.setItem(AGENTS_KEY, JSON.stringify(normalized))
    return true
  } catch (error) {
    console.warn('Failed to mirror agents to localStorage', error)
    return false
  }
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
  writeDbValue(CHATS_KEY, chats)
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
    return true
  } catch (error) {
    console.warn('Failed to mirror chats to localStorage', error)
    return false
  }
}

export async function loadPersistedData() {
  const [settings, agents, chats] = await Promise.all([
    readDbValue(SETTINGS_KEY, null),
    readDbValue(AGENTS_KEY, null),
    readDbValue(CHATS_KEY, null)
  ])

  const nextSettings = settings
    ? { ...defaultSettings, ...settings }
    : loadSettings()
  const nextAgents = Array.isArray(agents)
    ? agents.map(normalizeAgent)
    : loadAgents()
  const nextChats = chats && typeof chats === 'object' ? chats : loadChats()

  if (!settings) writeDbValue(SETTINGS_KEY, nextSettings)
  if (!agents) writeDbValue(AGENTS_KEY, nextAgents)
  if (!chats) writeDbValue(CHATS_KEY, nextChats)

  return {
    settings: nextSettings,
    agents: nextAgents,
    chats: nextChats
  }
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
    avatarImage: '',
    avatarImageSize: 0,
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
    avatarImage: agent.avatarImage || '',
    avatarImageSize: agent.avatarImageSize || 0,
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
