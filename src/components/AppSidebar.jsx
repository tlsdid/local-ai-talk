import {
  Bell,
  MessageCircle,
  MoreHorizontal,
  Settings,
  UserRound
} from 'lucide-react'

const items = [
  { id: 'friends', label: '好友', icon: UserRound },
  { id: 'chats', label: '聊天', icon: MessageCircle },
  { id: 'more', label: '更多', icon: MoreHorizontal },
  { id: 'notifications', label: '通知', icon: Bell }
]

export default function AppSidebar({ activeItem, onSelect, onOpenSettings }) {
  return (
    <aside className="fixed bottom-0 left-0 right-0 z-20 flex h-[64px] items-center justify-around border-t border-kakao-line bg-kakao-rail px-2 lg:static lg:h-screen lg:w-[72px] lg:flex-col lg:justify-between lg:border-r lg:border-t-0 lg:py-5">
      <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-kakao-yellow text-sm font-bold text-kakao-text">
          AI
        </div>
        {items.map((item) => {
          const Icon = item.icon
          const selected = activeItem === item.id
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              onClick={() => onSelect(item.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-md transition ${
                selected
                  ? 'bg-white text-kakao-text shadow-sm'
                  : 'text-zinc-600 hover:bg-white/70 hover:text-kakao-text'
              }`}
            >
              <Icon size={22} strokeWidth={1.9} />
            </button>
          )
        })}
      </div>

      <div className="grid w-full grid-cols-5 lg:hidden">
        {items.slice(0, 4).map((item) => {
          const Icon = item.icon
          const selected = activeItem === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              onClick={() => onSelect(item.id)}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition ${
                selected ? 'text-kakao-text' : 'text-zinc-600'
              }`}
            >
              <Icon size={22} strokeWidth={1.9} />
              <span>{item.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          aria-label="设置"
          onClick={onOpenSettings}
          className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-zinc-600 transition"
        >
          <Settings size={22} strokeWidth={1.9} />
          <span>设置</span>
        </button>
      </div>

      <button
        type="button"
        title="设置"
        aria-label="设置"
        onClick={onOpenSettings}
        className="hidden h-11 w-11 items-center justify-center rounded-md text-zinc-600 transition hover:bg-white/70 hover:text-kakao-text lg:flex"
      >
        <Settings size={22} strokeWidth={1.9} />
      </button>
    </aside>
  )
}
