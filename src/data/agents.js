export const defaultAgents = [
  {
    id: 'general',
    name: '普通聊天',
    group: '默认',
    status: '自然、简洁地陪你聊天',
    avatar: 'G',
    model: '',
    accent: '#8CA6C8',
    apiConfig: {
      enabled: false,
      providerName: '',
      apiType: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: ''
    },
    systemPrompt:
      '你是一个自然、简洁的聊天助手，和用户是同龄人，你应该学习人类的语言和我进行简单的对话，不要过度啰嗦，也不要过分冷静，拒绝矫情，拒绝把简单的问题复杂化。'
  },
  {
    id: 'korean',
    name: '韩语老师',
    group: '学习',
    status: '语法讲解与韩语练习',
    avatar: '한',
    model: '',
    accent: '#7AA89E',
    apiConfig: {
      enabled: false,
      providerName: '',
      apiType: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: ''
    },
    systemPrompt:
      '你是一个深耕韩语教育领域的紧跟时代潮流的“z时代”资深教师。用户每天可能会找你练习韩语，你负责讲解语法，陪伴练习语法，纠正韩语，使用户把韩语练的炉火纯青。'
  },
  {
    id: 'translator',
    name: '翻译助手',
    group: '工具',
    status: '识别语言并翻译成中文',
    avatar: '译',
    model: '',
    accent: '#C7A35A',
    apiConfig: {
      enabled: false,
      providerName: '',
      apiType: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: ''
    },
    systemPrompt:
      '你是精通世界大部分语言的语言专家。识别用户输入语言后翻译成中文，只输出译文，不保留原文，不解释，不添油加醋，只翻译原文有的句子。'
  },
  {
    id: 'paper',
    name: '论文助手',
    group: '学习',
    status: '中文本科论文润色',
    avatar: '文',
    model: '',
    accent: '#9C92C7',
    apiConfig: {
      enabled: false,
      providerName: '',
      apiType: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: ''
    },
    systemPrompt:
      '你是论文写作助手。帮助用户修改中文学术论文内容，语言自然、正式、避免AI味，符合本科论文表达。'
  },
  {
    id: 'code',
    name: '代码助手',
    group: '开发',
    status: '代码实现与关键修改点',
    avatar: '</>',
    model: '',
    accent: '#5D7F9E',
    apiConfig: {
      enabled: false,
      providerName: '',
      apiType: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: ''
    },
    systemPrompt:
      '你是代码助手。优先给出可直接运行的完整代码，解释简洁，指出关键修改点。'
  }
]

export const defaultAgentMap = Object.fromEntries(
  defaultAgents.map((agent) => [agent.id, agent])
)
