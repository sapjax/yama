import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '@/lib/settings'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function MiscSettings() {
  const [width, setWidth] = useState<number>(384)

  useEffect(() => {
    getSettings().then((settings) => {
      if (settings.misc?.panelWidth) {
        setWidth(settings.misc.panelWidth)
      }
    })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) {
      setWidth(val)
      updateSettings({ misc: { panelWidth: val } })
    } else {
      // Handle empty or invalid input gracefully, maybe just don't update settings yet
      // or allow empty string in state but don't save
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
            defaultValue={384}
            value={width}
            onChange={handleChange}
            min={200}
            max={1000}
          />
        </div>
      </div>
    </div>
  )
}
