import { useEffect, useState, useMemo } from 'react'
import { getSettings, updateSettings } from '@/lib/settings'
import { sendMessage } from 'webext-bridge/options'
import { Messages, Deck } from '@/lib/message'
import { cn } from '@/lib/utils/className'
import { AlertCircleIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function JpdbSettings() {
  const [apiKey, setApiKey] = useState('')
  const [decks, setDecks] = useState<Deck[]>([])
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')

  const isApiKeyValid = /^[0-9a-z]{32}$/.test(apiKey)

  useEffect(() => {
    getSettings().then((settings) => {
      setApiKey(settings.jpdbApiKey || '')
      setLastSync(settings.jpdbLastSync || null)
      setSelectedDeckId(String(settings.jpdbMiningDeckId || ''))
    })
  }, [])

  useEffect(() => {
    const updateDecks = async (apiKey: string) => {
      const loginSuccess = await sendMessage(Messages.jpdb_login, { apiKey }, 'background')
      if (loginSuccess) {
        const decks = await sendMessage(Messages.jpdb_get_decks, { apiKey }, 'background')
        setDecks(decks)
      }
    }

    if (isApiKeyValid) {
      updateDecks(apiKey)
    }
  }, [apiKey, isApiKeyValid])

  const status = useMemo(() => {
    if (actionStatus) return actionStatus
    if (isSyncing) {
      return 'Syncing...'
    } else if (!apiKey) {
      return 'Please enter your JPDB API key.'
    } else if (lastSync) {
      return `Last synced: ${new Date(lastSync).toLocaleString()}`
    } else {
      return 'Ready to sync.'
    }
  }, [apiKey, lastSync, isSyncing, actionStatus])

  const handleSync = async () => {
    if (!selectedDeckId) {
      setActionStatus('Please select a mining deck.')
      return
    }

    setIsSyncing(true)

    try {
      const loginSuccess = await sendMessage(Messages.jpdb_login, { apiKey }, 'background')
      if (!loginSuccess) {
        throw new Error('Login failed. Please check your API key.')
      }
      await updateSettings({ jpdbApiKey: apiKey, jpdbMiningDeckId: Number(selectedDeckId) })
      await sendMessage(Messages.jpdb_sync, {}, 'background')
      const now = Date.now()
      await updateSettings({ jpdbLastSync: now })
      setLastSync(now)
      setActionStatus('Sync successful!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.'
      setActionStatus(`Error: ${message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">JPDB Sync</h2>
      <p className="text-muted-foreground">
        Sync your word status with your jpdb.io account. Find your API key
        {' '}
        <a
          href={'https://jpdb.io/settings#:~:text=' + encodeURIComponent('API key')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          here
        </a>
        .
      </p>
      <div className="space-y-8">
        <div className="flex flex-col space-y-4">
          <Label>API key :</Label>
          <Input
            type="text"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setActionStatus(null)
            }}
            autoCapitalize="off"
            placeholder="Enter your JPDB API key"
            className={cn(
              'w-64',
              apiKey && !isApiKeyValid && 'border-destructive',
            )}
            disabled={isSyncing}
          />
        </div>

        {isApiKeyValid && (
          <div className="flex flex-col space-y-4">
            <Label>Mining deck :</Label>
            {apiKey && (
              <Select
                value={selectedDeckId}
                onValueChange={(value) => {
                  setSelectedDeckId(value)
                  setActionStatus(null)
                }}
                disabled={isSyncing || !apiKey}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="-- Select a deck as mining deck --" />
                </SelectTrigger>
                <SelectContent>
                  {decks.map(deck => (
                    <SelectItem key={deck.id} value={String(deck.id)}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

      </div>
      <div className="mt-10 space-y-4">
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Please note some limitation of JPDB sync.</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc text-xs">
              <li>Words are synced to JPDB, when you mark the word status.</li>
              <li>
                It will automatically perform full sync only when the browser starts.
              </li>
              <li>When full syncing, it will always be synced from JPDB to local, except that the first time sync to yama-learning deck.</li>
              <li>If you don't restart your browser frequently, you need to perform sync manually after you have done a lot of review on JPDB.</li>
            </ul>
          </AlertDescription>
        </Alert>
        <Button
          onClick={handleSync}
          disabled={!isApiKeyValid || isSyncing || !selectedDeckId}
        >
          {isSyncing ? 'Syncing...' : 'Save & Sync'}
        </Button>
        <p className={cn(
          'text-xs',
          status?.startsWith('Error') ? 'text-destructive' : 'text-muted-foreground',
        )}
        >
          {status}
        </p>
      </div>
    </div>
  )
}
