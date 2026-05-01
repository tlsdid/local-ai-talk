import { Download, Upload, X } from 'lucide-react'
import { useRef } from 'react'
import { prepareAvatarImage } from '../utils/avatarImage.js'

const apiTypes = [
  {
    value: 'openai-compatible',
    label: 'OpenAI Compatible Chat Completions'
  }
]

const requestModes = [
  {
    value: 'auto',
    label: '自动选择：本地用代理，GitHub 网页用直连'
  },
  {
    value: 'direct',
    label: '浏览器直连：适合支持 CORS 的服务商'
  },
  {
    value: 'proxy',
    label: '本地代理：适合 NVIDIA 等会被 CORS 拦截的服务商'
  }
]

export default function SettingsPanel({
  open,
  settings,
  onChange,
  onClose,
  onSave,
  onExportData,
  onImportData
}) {
  const importInputRef = useRef(null)
  const avatarInputRef = useRef(null)

  if (!open) return null

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('请选择图片文件。')
      event.target.value = ''
      return
    }

    const image = await prepareAvatarImage(file)
    onChange({
      ...settings,
      userAvatarImage: image.dataUrl,
      userAvatarImageSize: image.size
    })
    event.target.value = ''
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      onImportData(JSON.parse(text))
    } catch {
      window.alert('导入失败：请选择有效的 JSON 备份文件。')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <section className="chat-scrollbar h-[100dvh] w-full overflow-y-auto bg-white shadow-2xl lg:w-[420px] lg:border-l lg:border-kakao-line">
        <div className="sticky top-0 z-10 flex h-[64px] items-center justify-between border-b border-kakao-line bg-white px-4 lg:h-[72px] lg:px-6">
          <div>
            <h2 className="text-lg font-semibold text-kakao-text">
              Global API Settings
            </h2>
            <p className="mt-1 text-xs text-kakao-muted">
              全局配置会保存在本地浏览器存储里
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

        <div className="space-y-5 px-4 pb-8 pt-5 lg:px-6 lg:py-6">
          <button
            type="button"
            onClick={() => {
              window.location.href = window.location.hostname === 'localhost'
                ? 'http://localhost:5174'
                : new URL('wechat/', window.location.href).href
            }}
            className="h-10 w-full rounded-md border border-kakao-line text-sm font-semibold text-kakao-text transition hover:bg-kakao-section"
          >
            切换到微信风格
          </button>

          <div className="rounded-md border border-kakao-line p-4">
            <p className="mb-3 text-sm font-semibold text-kakao-text">
              我的资料
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-kakao-yellow text-sm font-semibold text-kakao-text">
                {settings.userAvatarImage ? (
                  <img
                    src={settings.userAvatarImage}
                    alt={settings.userName || '我的头像'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  settings.userName?.[0] || '我'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  value={settings.userName || ''}
                  onChange={(event) =>
                    onChange({ ...settings, userName: event.target.value })
                  }
                  placeholder="我的昵称"
                  className="input"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-9 rounded-md border border-kakao-line px-3 text-sm text-kakao-text transition hover:bg-kakao-section"
                  >
                    上传头像
                  </button>
                  {settings.userAvatarImage && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...settings,
                          userAvatarImage: '',
                          userAvatarImageSize: 0
                        })
                      }
                      className="h-9 rounded-md border border-red-200 px-3 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      移除头像
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <Field label="Provider Name">
            <input
              value={settings.providerName}
              onChange={(event) =>
                onChange({ ...settings, providerName: event.target.value })
              }
              className="input"
            />
          </Field>

          <Field label="API Type">
            <select
              value={settings.apiType}
              onChange={(event) =>
                onChange({ ...settings, apiType: event.target.value })
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

          <Field label="Request Mode">
            <select
              value={settings.requestMode || 'auto'}
              onChange={(event) =>
                onChange({ ...settings, requestMode: event.target.value })
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

          <Field label="Base URL">
            <input
              value={settings.baseUrl}
              onChange={(event) =>
                onChange({ ...settings, baseUrl: event.target.value })
              }
              placeholder="https://aihubmix.com/v1"
              className="input"
            />
          </Field>

          <Field label="API Key">
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) =>
                onChange({ ...settings, apiKey: event.target.value })
              }
              placeholder="输入你自己的 key"
              className="input"
            />
          </Field>

          <Field label="Model">
            <input
              value={settings.model}
              onChange={(event) =>
                onChange({ ...settings, model: event.target.value })
              }
              placeholder="gpt-4.1-free"
              className="input"
            />
          </Field>

          <button
            type="button"
            onClick={onSave}
            className="h-10 w-full rounded-md bg-kakao-yellow text-sm font-semibold text-kakao-text transition hover:brightness-95"
          >
            Save Settings
          </button>

          <div className="rounded-md border border-kakao-line">
            <div className="border-b border-kakao-line px-4 py-3">
              <p className="text-sm font-semibold text-kakao-text">
                数据导入 / 导出
              </p>
              <p className="mt-1 text-xs leading-5 text-kakao-muted">
                导出内容包含设置、联系人、人设、聊天记录和本地附件。
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={onExportData}
                className="flex h-10 items-center justify-center gap-2 rounded-md border border-kakao-line text-sm font-medium text-kakao-text transition hover:bg-kakao-section"
              >
                <Download size={17} />
                导出 JSON
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="flex h-10 items-center justify-center gap-2 rounded-md border border-kakao-line text-sm font-medium text-kakao-text transition hover:bg-kakao-section"
              >
                <Upload size={17} />
                导入 JSON
              </button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
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
