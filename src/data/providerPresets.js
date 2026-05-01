export const API_TYPE_OPENAI = 'openai-compatible'
export const API_TYPE_GEMINI = 'gemini'

export const REQUEST_MODE_AUTO = 'auto'
export const REQUEST_MODE_DIRECT = 'direct'
export const REQUEST_MODE_LOCAL_PROXY = 'proxy'
export const REQUEST_MODE_NETLIFY_PROXY = 'netlify-proxy'

export const NETLIFY_CHAT_PROXY_URL =
  'https://local-ai-talk-api.netlify.app/.netlify/functions/chat-proxy'

export const providerPresets = [
  {
    id: 'custom',
    label: '自定义',
    providerName: '',
    apiType: API_TYPE_OPENAI,
    baseUrl: '',
    model: '',
    requestMode: REQUEST_MODE_AUTO
  },
  {
    id: 'aihubmix',
    label: 'AiHubMix',
    providerName: 'AiHubMix',
    apiType: API_TYPE_OPENAI,
    baseUrl: 'https://aihubmix.com/v1',
    model: 'gpt-4.1-free',
    requestMode: REQUEST_MODE_DIRECT
  },
  {
    id: 'nvidia',
    label: 'NVIDIA',
    providerName: 'NVIDIA',
    apiType: API_TYPE_OPENAI,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'meta/llama-3.1-8b-instruct',
    requestMode: REQUEST_MODE_NETLIFY_PROXY
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    providerName: 'OpenRouter',
    apiType: API_TYPE_OPENAI,
    baseUrl: 'https://openrouter.ai/api/v1',
    model: '',
    requestMode: REQUEST_MODE_NETLIFY_PROXY
  },
  {
    id: 'poixe',
    label: 'Poixe',
    providerName: 'Poixe',
    apiType: API_TYPE_OPENAI,
    baseUrl: 'https://api.poixe.com/v1',
    model: 'gpt-4.1:free',
    requestMode: REQUEST_MODE_NETLIFY_PROXY,
    modelHint:
      '可选：gpt-4.1:free、gpt-5:free、gpt-5-nano:free、gpt-5.1:free、gpt-5.2:free'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    providerName: 'DeepSeek',
    apiType: API_TYPE_OPENAI,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    requestMode: REQUEST_MODE_NETLIFY_PROXY
  },
  {
    id: 'siliconflow',
    label: '硅基流动',
    providerName: '硅基流动',
    apiType: API_TYPE_OPENAI,
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: '',
    requestMode: REQUEST_MODE_NETLIFY_PROXY
  },
  {
    id: 'gemini',
    label: 'Gemini',
    providerName: 'Gemini',
    apiType: API_TYPE_GEMINI,
    baseUrl: '',
    model: 'gemini-2.5-flash-lite',
    requestMode: REQUEST_MODE_DIRECT
  }
]

export const apiTypes = [
  {
    value: API_TYPE_OPENAI,
    label: 'OpenAI Compatible Chat Completions'
  },
  {
    value: API_TYPE_GEMINI,
    label: 'Gemini'
  }
]

export const requestModes = [
  {
    value: REQUEST_MODE_AUTO,
    label: '自动选择：本地用本地代理，网页端优先直连'
  },
  {
    value: REQUEST_MODE_DIRECT,
    label: '浏览器直连：适合支持 CORS 的服务商'
  },
  {
    value: REQUEST_MODE_LOCAL_PROXY,
    label: '本地代理：需要运行 npm run dev:all'
  },
  {
    value: REQUEST_MODE_NETLIFY_PROXY,
    label: 'Netlify 代理：适合 NVIDIA 等 CORS 受限接口'
  }
]

export function getProviderPreset(id) {
  return providerPresets.find((preset) => preset.id === id) || providerPresets[0]
}

export function normalizeApiType(apiType) {
  return apiType === 'Gemini' ? API_TYPE_GEMINI : apiType || API_TYPE_OPENAI
}

export function normalizeRequestMode(requestMode) {
  return requestMode || REQUEST_MODE_AUTO
}

export function providerKeyId(settings = {}) {
  return settings.providerPreset || settings.providerName || 'custom'
}
