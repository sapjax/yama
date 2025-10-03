import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Switch } from '@/components/ui/switch'
import { sendMessage } from 'webext-bridge/popup'
import { Messages } from '@/lib/message'

function Popup() {
  const [currentDomain, setCurrentDomain] = useState<string | null>(null)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function setup() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url && tab.id) {
        try {
          const url = new URL(tab.url)
          const domain = url.hostname || url.pathname
          setCurrentDomain(domain)
          setCurrentTabId(tab.id)
          const whitelisted = await sendMessage(Messages.get_tab_whitelist_status, { domain }, 'background')
          setIsWhitelisted(whitelisted)
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
        <div className="max-w-[90%] truncate text-lg font-semibold text-foreground">{currentDomain}</div>
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
    <main className="flex min-h-48 w-64 flex-col items-center justify-center bg-background p-4 text-foreground">
      {renderContent()}
    </main>
  )
}

export default Popup
