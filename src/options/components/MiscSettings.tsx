import { useEffect, useState } from 'react'
import { AppSettings, getSettings, updateSettings } from '@/lib/settings'
import { Messages } from '@/lib/message'
import { sendMessage } from 'webext-bridge/options'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function MiscSettings() {
  const [misc, setMisc] = useState<AppSettings['misc']>({
    panelWidth: 384,
    panelShowDelay: 200,
    panelHideDelay: 250,
    showBadgeCount: false,
  })

  useEffect(() => {
    getSettings().then((settings) => {
      if (settings.misc) {
        setMisc(settings.misc)
      }
    })
  }, [])

  const handleChange = (key: keyof AppSettings['misc']) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) {
      const newMisc = { ...misc, [key]: val }
      setMisc(newMisc)
      updateSettings({ misc: newMisc })
    }
  }

  const handleToggle = (key: keyof AppSettings['misc']) => (checked: boolean) => {
    const newMisc = { ...misc, [key]: checked }
    setMisc(newMisc)
    updateSettings({ misc: newMisc })
    if (key === 'showBadgeCount') {
      sendMessage(Messages.update_badge_count, {})
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Miscellaneous</h2>
        <p className="text-muted-foreground">Other settings for the extension.</p>
      </div>

      <div className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-4">
          <Label htmlFor="panel-width">Panel Width (px)</Label>
          <Input
            type="number"
            id="panel-width"
            value={misc.panelWidth}
            onChange={handleChange('panelWidth')}
            min={200}
            max={1000}
          />
        </div>

        <div className="grid w-full max-w-sm items-center gap-4">
          <Label htmlFor="panel-show-delay">Panel Show Delay (ms)</Label>
          <Input
            type="number"
            id="panel-show-delay"
            value={misc.panelShowDelay}
            onChange={handleChange('panelShowDelay')}
            min={0}
            max={5000}
          />
        </div>

        <div className="grid w-full max-w-sm items-center gap-4">
          <Label htmlFor="panel-hide-delay">Panel Hide Delay (ms)</Label>
          <Input
            type="number"
            id="panel-hide-delay"
            value={misc.panelHideDelay}
            onChange={handleChange('panelHideDelay')}
            min={0}
            max={5000}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-badge-count"
            checked={misc.showBadgeCount}
            onCheckedChange={handleToggle('showBadgeCount')}
          />
          <Label htmlFor="show-badge-count">Show Badge Count</Label>
        </div>
      </div>
    </div>
  )
}
