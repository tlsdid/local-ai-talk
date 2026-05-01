import { RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { defaultAgentMap } from '../data/agents.js'
import {
  API_TYPE_GEMINI,
  apiTypes,
  requestModes
} from '../data/providerPresets.js'
import { prepareAvatarImage } from '../utils/avatarImage.js'

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
  const avatarInputRef = useRef(null)
  const hasDefault = Boolean(defaultAgentMap[agent?.id])
  const isGemini = draft?.apiConfig?.apiType === API_TYPE_GEMINI

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

  function updateApiType(apiType) {
    setDraft((current) => ({
      ...current,
      apiConfig: {
        ...current.apiConfig,
        apiType,
        providerName:
          apiType === API_TYPE_GEMINI
            ? current.apiConfig.providerName || 'Gemini'
            : current.apiConfig.providerName,
        baseUrl: apiType === API_TYPE_GEMINI ? '' : current.apiConfig.baseUrl,
        model:
          apiType === API_TYPE_GEMINI
            ? current.apiConfig.model || current.model || 'gemini-2.5-flash-lite'
            : current.apiConfig.model
      }
    }))
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('请选择图片文件。')
      event.target.value = ''
      return
    }

    const image = await prepareAvatarImage(file)
    setDraft((current) => ({
      ...current,
      avatarImage: image.dataUrl,
      avatarImageSize: image.size
    }))
    event.target.value = ''
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
              联系人配置会保存在本地。
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
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] text-sm font-semibold text-white"
              style={{ backgroundColor: draft.accent }}
            >
              {draft.avatarImage ? (
                <img
                  src={draft.avatarImage}
                  alt={draft.name || 'avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                draft.avatar || 'AI'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="h-9 rounded-md border border-kakao-line px-3 text-sm text-kakao-text transition hover:bg-kakao-section"
                >
                  上传头像
                </button>
                {draft.avatarImage && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        avatarImage: '',
                        avatarImageSize: 0
                      }))
                    }
                    className="h-9 rounded-md border border-red-200 px-3 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    移除头像
                  </button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
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
            <Field label="头像文字">
              <input
                value={draft.avatar}
                onChange={(event) => updateField('avatar', event.target.value)}
                maxLength={8}
                className="input"
              />
            </Field>
            <Field label="头像颜色">
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
                  placeholder={isGemini ? 'Gemini' : '留空则沿用全局'}
                  className="input"
                />
              </Field>
              <Field label="API Type">
                <select
                  value={draft.apiConfig.apiType === 'Gemini' ? API_TYPE_GEMINI : draft.apiConfig.apiType}
                  onChange={(event) => updateApiType(event.target.value)}
                  className="input bg-white"
                >
                  {apiTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
              {!isGemini && (
                <Field label="Request Mode">
                  <select
                    value={draft.apiConfig.requestMode || 'auto'}
                    onChange={(event) =>
                      updateApiConfig('requestMode', event.target.value)
                    }
                    className="input bg-white"
                  >
                    {requestModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Base URL">
                <input
                  value={draft.apiConfig.baseUrl}
                  onChange={(event) =>
                    updateApiConfig('baseUrl', event.target.value)
                  }
                  placeholder={isGemini ? 'Gemini 不需要 Base URL，此项会被忽略' : '留空则沿用全局'}
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
                  placeholder={isGemini ? '输入 Google AI Studio API Key' : '留空则沿用全局'}
                  className="input"
                />
              </Field>
              <Field label="Model">
                <input
                  value={draft.apiConfig.model}
                  onChange={(event) =>
                    updateApiConfig('model', event.target.value)
                  }
                  placeholder={isGemini ? 'gemini-2.5-flash-lite' : '留空则使用联系人模型或全局模型'}
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
