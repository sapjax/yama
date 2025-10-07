import { WordStatistics } from '@/lib/message'
import { AppSettings } from '@/lib/settings'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface StatisticsChartProps {
  stats: WordStatistics | null
  settings: AppSettings | null
}

const STATUS_ORDER: (keyof WordStatistics)[] = [
  'Ignored',
  'UnSeen',
  'Searched',
  'Tracking',
  'Never_Forget',
]

export function StatisticsChart({ stats, settings }: StatisticsChartProps) {
  if (!stats || !settings) {
    return <div className="h-3 w-full animate-pulse rounded-full bg-muted"></div>
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return null
  }

  const colorMap = {
    ...settings.colors,
    ...settings.reviewColors,
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-3 w-full overflow-hidden">
        {STATUS_ORDER.map((status) => {
          const count = stats[status]
          if (count === 0) return null
          const percentage = (count / total) * 100
          const color = colorMap[status]?.color || '#888888'

          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <div
                  className="h-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {status}
                  :
                  {' '}
                  {count}
                  {' '}
                  (
                  {percentage.toFixed(1)}
                  %)
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
