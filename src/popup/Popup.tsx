import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Switch } from '@/components/ui/switch'
import { sendMessage } from 'webext-bridge/popup'
import { Messages, WordStatistics } from '@/lib/message'
import { AppSettings, getSettings } from '@/lib/settings'
import { StatisticsChart } from './StatisticsChart'

function Popup() {
  const [currentDomain, setCurrentDomain] = useState<string | null>(null)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<WordStatistics | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    async function setup() {
      setIsLoading(true)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url && tab.id) {
        try {
          const url = new URL(tab.url)
          const domain = url.hostname || url.pathname
          setCurrentDomain(domain)
          setCurrentTabId(tab.id)

          const [whitelisted, statistics, appSettings] = await Promise.all([
            sendMessage(Messages.get_tab_whitelist_status, { domain }, 'background'),
            sendMessage(Messages.get_statistics, {}, {
              context: 'content-script',
              tabId: tab.id,
            }),
            getSettings(),
          ])

          setIsWhitelisted(whitelisted)
          setStats(statistics)
          setSettings(appSettings)
        } catch (e) {
          setCurrentDomain(null)
        }
      }
      setIsLoading(false)
    }
    setup()
  }, [])

  const handleToggle = async () => {
    if (!currentDomain || !currentTabId) return
    const newStatus = !isWhitelisted
    setIsWhitelisted(newStatus)
    await sendMessage(Messages.toggle_whitelist_status, { domain: currentDomain, tabId: currentTabId }, 'background')
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-muted-foreground">Loading...</div>
    }

    if (!currentDomain) {
      return <div className="text-center text-muted-foreground">Cannot activate on this page.</div>
    }

    return (
      <>
        <div className="max-w-[200px] truncate text-lg font-semibold text-foreground">{currentDomain}</div>
        <div className="mt-4 flex items-center justify-center">
          <span className={clsx('mr-3 text-sm font-medium', isWhitelisted ? 'text-primary' : 'text-muted-foreground')}>
            {isWhitelisted ? 'Activated' : 'Deactivated'}
          </span>
          <Switch
            checked={isWhitelisted}
            onCheckedChange={handleToggle}
            aria-label="Toggle whitelist status"
          />
        </div>
      </>
    )
  }

  return (
    <main className="flex w-64 flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
      <StatisticsChart stats={stats} settings={settings} />
      <div className="flex h-full min-h-32 flex-col items-center justify-center">
        {renderContent()}
      </div>
    </main>
  )
}

export default Popup
