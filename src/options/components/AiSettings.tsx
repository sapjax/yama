import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AppSettings, getSettings, updateSettings } from '@/lib/settings'
import { useEffect, useState } from 'react'

export function AiSettings() {
  const [settings, setSettings] = useState<AppSettings['ai']>()
  const [saveState, setSaveState] = useState('Save')

  useEffect(() => {
    getSettings().then(s => setSettings(s.ai))
  }, [])

  const handleSave = () => {
    if (settings) {
      updateSettings({ ai: settings })
      setSaveState('Saved!')
      setTimeout(() => setSaveState('Save'), 2000)
    }
  }

  const handleChange = (key: keyof AppSettings['ai'], value: string) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  if (!settings) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">AI Settings</h2>
      <div className="space-y-2">
        <Label htmlFor="ai-apiKey">API Key</Label>
        <Input
          id="ai-apiKey"
          type="password"
          value={settings.apiKey}
          onChange={e => handleChange('apiKey', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-endpoint">Endpoint</Label>
        <Input
          id="ai-endpoint"
          value={settings.endpoint}
          onChange={e => handleChange('endpoint', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-model">Model</Label>
        <Input
          id="ai-model"
          value={settings.model}
          onChange={e => handleChange('model', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Prompt</Label>
        <Textarea
          id="ai-prompt"
          value={settings.prompt}
          onChange={e => handleChange('prompt', e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <Button onClick={handleSave}>{saveState}</Button>
    </div>
  )
}
