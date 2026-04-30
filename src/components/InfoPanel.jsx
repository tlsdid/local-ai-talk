import { Bell, MoreHorizontal, X } from 'lucide-react'

export default function InfoPanel({ type, agents, chats, onClose, onOpenSettings }) {
  if (!type) return null

  const isNotifications = type === 'notifications'
  const totalMessages = Object.values(chats).reduce(
    (sum, messages) => sum + messages.length,
    0
  )
  const customAgents = agents.filter((agent) => {
    return !['general', 'korean', 'translator', 'paper', 'code'].includes(agent.id)
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/10" onClick={onClose}>
      <section
        className="h-[100dvh] w-full bg-white shadow-2xl lg:w-[360px] lg:border-l lg:border-kakao-line"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[64px] items-center justify-between border-b border-kakao-line px-4 lg:h-[72px] lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-kakao-section text-zinc-700">
              {isNotifications ? <Bell size={19} /> : <MoreHorizontal size={20} />}
            </div>
            <h2 className="text-lg font-semibold text-kakao-text">
              {isNotifications ? '通知' : '更多'}
            </h2>
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

        {isNotifications ? (
          <div className="space-y-3 p-6">
            <Notice title="本地模式运行中" body="联系人、聊天记录和 API 配置都会保存在当前浏览器 localStorage。" />
            <Notice title="消息统计" body={`当前共有 ${agents.length} 个联系人，${totalMessages} 条本地消息。`} />
            <Notice title="API 提醒" body="请求失败时，错误会直接显示在当前聊天窗口里。" />
          </div>
        ) : (
          <div className="space-y-2 p-6">
            <MenuButton onClick={onOpenSettings}>全局 API 设置</MenuButton>
            <div className="rounded-md bg-kakao-section px-4 py-3 text-sm text-kakao-muted">
              自定义联系人：{customAgents.length} 个
            </div>
            <div className="rounded-md bg-kakao-section px-4 py-3 text-sm text-kakao-muted">
              当前版本：本地前端 + Electron 桌面壳
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Notice({ title, body }) {
  return (
    <div className="rounded-md border border-kakao-line px-4 py-3">
      <p className="text-sm font-semibold text-kakao-text">{title}</p>
      <p className="mt-1 text-sm leading-5 text-kakao-muted">{body}</p>
    </div>
  )
}

function MenuButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 w-full rounded-md border border-kakao-line px-4 text-left text-sm font-medium text-kakao-text transition hover:bg-kakao-section"
    >
      {children}
    </button>
  )
}
