import { RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { defaultAgentMap } from '../data/agents.js'

const apiTypes = [
  {
    value: 'openai-compatible',
    label: 'OpenAI Compatible Chat Completions'
  }
]

export default function ContactEditorPanel({
  open,
  mode,
  agent,
  onClose,
  onSave,
  onDelete,
  onRestoreDefault
}) {
  const [draft, setDraft] = useState(agent)
  const hasDefault = Boolean(defaultAgentMap[agent?.id])

  useEffect(() => {
    setDraft(agent)
  }, [agent])

  if (!open || !draft) return null

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function updateApiConfig(field, value) {
    setDraft((current) => ({
      ...current,
      apiConfig: {
        ...current.apiConfig,
        [field]: value
      }
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <section className="chat-scrollbar h-[100dvh] w-full overflow-y-auto bg-white shadow-2xl lg:w-[460px] lg:border-l lg:border-kakao-line">
        <div className="sticky top-0 z-10 flex h-[64px] items-center justify-between border-b border-kakao-line bg-white px-4 lg:h-[72px] lg:px-6">
          <div>
            <h2 className="text-lg font-semibold text-kakao-text">
              {mode === 'create' ? '新增联系人' : '编辑联系人'}
            </h2>
            <p className="mt-1 text-xs text-kakao-muted">
              联系人配置会保存在 localStorage
            </p>
          </div>
          <button
            type="button"
            title="关闭"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-kakao-section"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-4 pb-28 pt-5 lg:px-6 lg:pb-6 lg:pt-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-sm font-semibold text-white"
              style={{ backgroundColor: draft.accent }}
            >
              {draft.avatar || 'AI'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-kakao-text">
                {draft.name || '未命名联系人'}
              </p>
              <p className="mt-1 truncate text-xs text-kakao-muted">
                {draft.status || '暂无状态文字'}
              </p>
            </div>
          </div>

          <Field label="联系人名称">
            <input
              value={draft.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="头像">
              <input
                value={draft.avatar}
                onChange={(event) => updateField('avatar', event.target.value)}
                maxLength={8}
                className="input"
              />
            </Field>
            <Field label="头像色">
              <input
                type="color"
                value={draft.accent}
                onChange={(event) => updateField('accent', event.target.value)}
                className="h-10 w-full rounded-md border border-kakao-line bg-white p-1"
              />
            </Field>
            <Field label="所属分组">
              <input
                value={draft.group}
                onChange={(event) => updateField('group', event.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="状态文字">
            <input
              value={draft.status}
              onChange={(event) => updateField('status', event.target.value)}
              className="input"
            />
          </Field>

          <Field label="单独指定模型">
            <input
              value={draft.model}
              onChange={(event) => updateField('model', event.target.value)}
              placeholder="留空则使用全局默认模型"
              className="input"
            />
          </Field>

          <Field label="system prompt / 人设提示词">
            <textarea
              value={draft.systemPrompt}
              onChange={(event) =>
                updateField('systemPrompt', event.target.value)
              }
              rows={7}
              className="chat-scrollbar min-h-40 w-full resize-y rounded-md border border-kakao-line px-3 py-2.5 text-sm leading-6 outline-none focus:border-zinc-400"
            />
          </Field>

          <div className="rounded-md border border-kakao-line">
            <label className="flex items-center justify-between border-b border-kakao-line px-4 py-3">
              <span className="text-sm font-semibold text-kakao-text">
                使用联系人单独 API 配置
              </span>
              <input
                type="checkbox"
                checked={draft.apiConfig.enabled}
                onChange={(event) =>
                  updateApiConfig('enabled', event.target.checked)
                }
                className="h-4 w-4 accent-kakao-yellow"
              />
            </label>

            <div className="space-y-4 p-4">
              <Field label="Provider Name">
                <input
                  value={draft.apiConfig.providerName}
                  onChange={(event) =>
                    updateApiConfig('providerName', event.target.value)
                  }
                  placeholder="留空则沿用全局"
                  className="input"
                />
              </Field>
              <Field label="API Type">
                <select
                  value={draft.apiConfig.apiType}
                  onChange={(event) =>
                    updateApiConfig('apiType', event.target.value)
                  }
                  className="input bg-white"
                >
                  {apiTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Base URL">
                <input
                  value={draft.apiConfig.baseUrl}
                  onChange={(event) =>
                    updateApiConfig('baseUrl', event.target.value)
                  }
                  placeholder="留空则沿用全局"
                  className="input"
                />
              </Field>
              <Field label="API Key">
                <input
                  type="password"
                  value={draft.apiConfig.apiKey}
                  onChange={(event) =>
                    updateApiConfig('apiKey', event.target.value)
                  }
                  placeholder="留空则沿用全局"
                  className="input"
                />
              </Field>
              <Field label="Model">
                <input
                  value={draft.apiConfig.model}
                  onChange={(event) =>
                    updateApiConfig('model', event.target.value)
                  }
                  placeholder="留空则使用联系人模型或全局模型"
                  className="input"
                />
              </Field>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t border-kakao-line bg-white px-4 py-3 lg:static lg:mx-0 lg:border-t-0 lg:px-0 lg:py-0">
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="h-10 flex-1 rounded-md bg-kakao-yellow text-sm font-semibold text-kakao-text transition hover:brightness-95"
            >
              保存联系人
            </button>
            {hasDefault && (
              <button
                type="button"
                title="恢复默认人设"
                aria-label="恢复默认人设"
                onClick={() => {
                  const restored = onRestoreDefault(draft.id)
                  setDraft(restored)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-kakao-line text-zinc-600 transition hover:bg-kakao-section"
              >
                <RotateCcw size={18} />
              </button>
            )}
            {mode === 'edit' && (
              <button
                type="button"
                title="删除联系人"
                aria-label="删除联系人"
                onClick={() => onDelete(draft.id)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-kakao-text">
        {label}
      </span>
      {children}
    </label>
  )
}
