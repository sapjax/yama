import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { AppSettings, getSettings, updateSettings, defaultSettings } from '@/lib/settings'
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

  const handleApiTypeChange = (value: 'openai' | 'gemini') => {
    if (settings) {
      setSettings({ ...settings, apiType: value })
    }
  }

  const handleSubSettingChange = (key: keyof AppSettings['ai']['openai'], value: string) => {
    if (settings) {
      const activeApiType = settings.apiType
      setSettings({
        ...settings,
        [activeApiType]: {
          ...settings[activeApiType],
          [key]: value,
        },
      })
    }
  }

  if (!settings) {
    return <div>Loading...</div>
  }

  const activeSettings = settings[settings.apiType] ?? defaultSettings.ai[settings.apiType]

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">AI Settings</h2>
      <div className="space-y-4">
        <Label>API Type</Label>
        <RadioGroup
          value={settings.apiType}
          onValueChange={handleApiTypeChange}
          className="flex space-x-2"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="openai" id="openai" />
            <Label htmlFor="openai">OpenAI Compatible</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="gemini" id="gemini" />
            <Label htmlFor="gemini">Gemini Compatible</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-apiKey">API Key</Label>
        <Input
          id="ai-apiKey"
          type="password"
          value={activeSettings.apiKey}
          onChange={e => handleSubSettingChange('apiKey', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-endpoint">Endpoint</Label>
        <Input
          id="ai-endpoint"
          value={activeSettings.endpoint}
          onChange={e => handleSubSettingChange('endpoint', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-model">Model</Label>
        <Input
          id="ai-model"
          value={activeSettings.model}
          onChange={e => handleSubSettingChange('model', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Prompt</Label>
        <Textarea
          id="ai-prompt"
          value={activeSettings.prompt}
          onChange={e => handleSubSettingChange('prompt', e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <Button onClick={handleSave}>{saveState}</Button>
    </div>
  )
}
