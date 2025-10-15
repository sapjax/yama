import { useSyncExternalStore, useRef } from 'react'
import { WordStatus, WordStatusList } from '@/lib/core/mark'
import { Highlighter, getCSSHighlightKey } from '@/lib/highlight'
import { AppSettings } from '@/lib/settings'
import { hsvaToRgbaString, rgbStringToHsva } from '@uiw/color-convert'
import { cn } from '@/lib/utils/className'

type ToolbarProps = {
  word: string
  highlighter: Highlighter
  range: Range | null
  colors?: AppSettings['colors']
}

const KanjiLabelMap = {
  Ignored: '排除',
  UnSeen: '未知',
  Searched: '検索',
  Tracking: '学習',
  Never_Forget: '習得',
}

const markAbleStatuses = WordStatusList
// The statuses that can be set via the toolbar
type ButtonStatus = (typeof markAbleStatuses)[number]

export default function Toolbar(props: ToolbarProps) {
  const { word, highlighter, range, colors } = props
  const trackRef = useRef<HTMLDivElement>(null)

  const status = useSyncExternalStore(
    callback => highlighter.subscribe(callback),
    () => highlighter.getWordStatus(word),
  )

  const getToolbarStatusColor = (s: WordStatus) => {
    if (s === 'Never_Forget') {
      return 'currentColor'
    }

    if (colors) {
      const color = colors[s].color
      const hsva = rgbStringToHsva(color)
      hsva.a = 1
      return hsvaToRgbaString(hsva)
    } else {
      return `var(--${getCSSHighlightKey(s)})`
    }
  }

  const currentIndex = status ? markAbleStatuses.indexOf(status as ButtonStatus) : -1
  const offsetPercent = `${(currentIndex / (markAbleStatuses.length - 1)) * 100}%`
  const translateX = `-${offsetPercent}`
  const indicatorStyle = {
    left: currentIndex !== -1 ? offsetPercent : '-24px',
    transform: `translate(${translateX}, -50%)`,
    transition: currentIndex !== -1 ? 'all 0.3s ease-in-out' : 'none',
    opacity: currentIndex !== -1 ? 1 : 0,
    borderColor: status ? getToolbarStatusColor(status) : 'transparent',
  }

  const gradientColors = markAbleStatuses.map(s => getToolbarStatusColor(s))
  const gradientBackground = `linear-gradient(to right, ${gradientColors.join(', ')})`

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || !range) return

    const rect = trackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const percentage = clickX / width

    const segmentWidth = 1 / (markAbleStatuses.length - 1)
    const clickedIndex = Math.round(percentage / segmentWidth)
    const newStatus = markAbleStatuses[clickedIndex]

    if (newStatus && newStatus !== status) {
      highlighter.markWord(word, newStatus as ButtonStatus, range)
    }
  }

  return (
    <div className="overflow-clip border-b border-border p-3 select-none">
      <div className="relative flex h-5 items-center">
        <div
          ref={trackRef}
          className="relative h-2 w-full cursor-pointer rounded-full"
          style={{ background: gradientBackground }}
          onClick={handleTrackClick}
        />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-full items-center justify-between">
          {markAbleStatuses.map((s, index) => (
            <div
              key={s}
              className={cn(
                'pointer-events-auto h-2.5 w-2.5 cursor-pointer rounded-full border-2 bg-card transition-transform hover:scale-125',
                '-translate-y-full',
                { 'border-[3px]': index === currentIndex },
              )}
              style={{ borderColor: getToolbarStatusColor(s) }}
              onClick={(e) => {
                e.stopPropagation()
                if (range) {
                  highlighter.markWord(word, s as ButtonStatus, range)
                }
              }}
            />
          ))}
        </div>
        <div
          className="pointer-events-none absolute top-1/2 z-10 h-4 w-4 rounded-full border-2 bg-card shadow-md brightness-150 duration-300 ease-in-out"
          style={{ ...indicatorStyle }}
        />
      </div>
      <div className="mx-[-32px] mt-1 flex justify-between">
        {markAbleStatuses.map((s, i) => (
          <div key={s} className={cn('flex-1 truncate px-0.5 text-center text-[10px]', i === currentIndex ? 'text-foreground' : 'text-muted-foreground')}>
            {KanjiLabelMap[s]}
          </div>
        ))}
      </div>
    </div>
  )
}
