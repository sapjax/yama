import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AppSettings, getSettings, updateSettings } from '@/lib/settings'
import { useEffect, useState } from 'react'

export function SegmenterSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const handleMergeTokensChange = (checked: boolean) => {
    if (!settings) return
    const newSegmenterSettings = {
      ...settings.segmenter,
      linderaMergeTokens: checked,
    }
    updateSettings({ segmenter: newSegmenterSettings })
    // The settings state will be updated via the chrome.storage.onChanged listener
    // in the settings.ts module, which will cause a re-render here if needed,
    // but for instant UI feedback, we can update the state directly.
    setSettings(prev => prev ? { ...prev, segmenter: newSegmenterSettings } : null)
  }

  if (!settings) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Segmenter Settings</h2>
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="merge-tokens-switch" className="text-lg">
              Enable Token Merging
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              When enabled, combines smaller tokens into larger, more meaningful words. for example:
              <br />
              見え、 まし、た
              <span className="mx-2 text-primary">
                ⟶
              </span>
              見えました
              <br />
              い、ませ、ん
              <span className="mx-2 text-primary">
                ⟶
              </span>
              いません
            </p>
          </div>
          <Switch
            id="merge-tokens-switch"
            checked={settings.segmenter.linderaMergeTokens}
            onCheckedChange={handleMergeTokensChange}
          />
        </div>
      </div>
    </div>
  )
}
