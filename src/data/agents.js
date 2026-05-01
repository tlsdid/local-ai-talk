export const resourceSearchAgent = {
  id: 'resource-search-assistant',
  type: 'resource-search',
  name: '资源搜索助手',
  group: '工具',
  status: '输入剧名或关键词搜索资源',
  avatar: '搜',
  avatarImage: '',
  avatarImageSize: 0,
  accent: '#4F8F7B',
  model: '',
  systemPrompt: '这个联系人只用于资源搜索，不调用 AI 模型。',
  apiConfig: {
    enabled: false,
    providerName: '',
    apiType: 'openai-compatible',
    requestMode: 'auto',
    baseUrl: '',
    apiKey: '',
    model: ''
  }
}

export const defaultAgents = [resourceSearchAgent]

export const defaultAgentMap = {
  [resourceSearchAgent.id]: resourceSearchAgent
}
