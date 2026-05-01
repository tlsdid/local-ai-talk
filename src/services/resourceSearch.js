export const RESOURCE_SEARCH_API =
  'https://vcsoso-search-api.netlify.app/.netlify/functions/search-resource'

export function isResourceSearchAgent(agent) {
  return agent?.type === 'resource-search' || agent?.id === 'resource-search-assistant'
}

export async function searchResources(query) {
  const keyword = String(query || '').trim()
  if (!keyword) return '请输入要搜索的剧名或关键词。'

  let response
  try {
    response = await fetch(`${RESOURCE_SEARCH_API}/?q=${encodeURIComponent(keyword)}`)
  } catch {
    return '搜索失败，请稍后重试。'
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    return '搜索失败：返回格式不是有效 JSON'
  }

  if (!response.ok || data?.ok === false) {
    return `搜索失败：${data?.error || data?.message || response.statusText || '未知错误'}`
  }

  const results = Array.isArray(data?.results) ? data.results : []
  if (results.length === 0) return '未找到相关资源。'

  const lines = [
    `剧名：${data?.query || keyword}`,
    '',
    '可用资源：'
  ]

  results.forEach((item, index) => {
    lines.push(`${index + 1}. 标题：${item.title || '未命名资源'}`)
    lines.push(`   链接：${item.url || '无'}`)
    lines.push(`   状态：${item.status || '未知'}`)
  })

  return lines.join('\n')
}
