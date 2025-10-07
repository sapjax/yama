import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Switch } from '@/components/ui/switch'
import { sendMessage } from 'webext-bridge/popup'
import { Messages, WordStatistics } from '@/lib/message'
import { AppSettings, getSettings } from '@/lib/settings'
import { StatisticsChart } from './StatisticsChart'

import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

          const isWhitelisted = await sendMessage(Messages.get_tab_whitelist_status, { domain }, 'background')
          setIsWhitelisted(isWhitelisted)
          setIsLoading(false)

          if (!isWhitelisted) return

          sendMessage(Messages.get_statistics, {}, {
            context: 'content-script',
            tabId: tab.id,
          }).then(setStats)

          getSettings().then(setSettings)
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

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
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
    <main className="relative flex w-64 flex-col items-center justify-center gap-4 bg-background p-4 pt-6 pb-8 text-foreground">
      <StatisticsChart stats={stats} settings={settings} />
      <div className="flex h-full min-h-28 flex-col items-center justify-center">
        {renderContent()}
      </div>
      <div className="absolute right-1 bottom-1">
        <Button variant="ghost" size="icon" onClick={handleOpenOptions}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </main>
  )
}

export default Popup
