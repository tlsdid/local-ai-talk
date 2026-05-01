const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(body)
  }
}

function joinUrl(baseURL, path) {
  return `${String(baseURL).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: '只支持 POST 请求' })
  }

  try {
    let payload = {}
    try {
      payload = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: '请求体不是有效 JSON' })
    }

    const {
      baseURL,
      apiKey,
      model,
      messages,
      temperature,
      max_tokens
    } = payload

    if (!baseURL || !apiKey || !model || !Array.isArray(messages)) {
      return json(400, {
        error: '缺少 baseURL、apiKey、model 或 messages'
      })
    }

    const upstream = await fetch(joinUrl(baseURL, '/chat/completions'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
        stream: false
      })
    })

    const text = await upstream.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }

    if (!upstream.ok) {
      return json(upstream.status, {
        error:
          data?.error?.message ||
          data?.message ||
          text ||
          upstream.statusText ||
          '上游接口请求失败'
      })
    }

    return json(200, {
      content: data?.choices?.[0]?.message?.content || '',
      raw: data
    })
  } catch (error) {
    return json(500, {
      error: error?.message || 'Netlify 代理请求失败'
    })
  }
}
