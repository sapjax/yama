import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { AppSettings, getSettings, updateSettings } from '@/lib/settings'
import { getThemeCss } from '@/lib/theme'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import defaultTheme from '@/assets/themes/default.css?raw'

const themes = ['default', 'neo_brutalism', 'claude', 'pastel_dreams']
const STYLE_ID = 'yama-theme'

export function ThemeSettings() {
  const [settings, setSettings] = useState<AppSettings['theme']>()
  const [customCss, setCustomCss] = useState('')
  const [saveState, setSaveState] = useState('Save')

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s.theme)
      setCustomCss(s.theme.custom)
    })
  }, [])

  useEffect(() => {
    if (!settings) return

    let style = document.getElementById(STYLE_ID)
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = getThemeCss(settings)
  }, [settings])

  const updateThemeSettings = useDebouncedCallback((newThemeSettings: AppSettings['theme']) => {
    updateSettings({ theme: newThemeSettings })
  }, 200)

  const handleTypeChange = (type: 'default' | 'claude' | 'custom') => {
    if (settings) {
      const newSettings = { ...settings, type }
      setSettings(newSettings)
      updateThemeSettings(newSettings)
    }
  }

  const handleSave = () => {
    if (settings) {
      const newSettings = { ...settings, custom: customCss }
      setSettings(newSettings)
      updateThemeSettings(newSettings)
      setSaveState('Saved!')
      setTimeout(() => setSaveState('Save'), 2000)
    }
  }

  if (!settings) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-10">
      <h2 className="text-xl font-bold">Theme</h2>
      <div className="space-y-4">
        <Label className="font-bold">Select Theme</Label>
        <RadioGroup
          value={settings.type}
          onValueChange={value => handleTypeChange(value as 'default' | 'claude' | 'custom')}
          className="flex items-center space-x-4"
        >
          {[...themes, 'custom'].map(theme => (
            <div key={theme} className="flex items-center space-x-2">
              <RadioGroupItem value={theme} id={`theme-${theme}`} />
              <Label htmlFor={`theme-${theme}`} className="cursor-pointer capitalize">{theme}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {settings.type === 'custom' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-bold" htmlFor="custom-theme-css">Custom CSS</Label>
          </div>
          <p className="text-muted-foreground">
            The theme follow shadcn's design system, you can copy & paste themes from
            {' '}
            <a
              href="https://shadcnstudio.com/theme-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              here
            </a>
            {' '}
            .
          </p>
          <Textarea
            id="custom-theme-css"
            value={customCss}
            onChange={e => setCustomCss(e.target.value)}
            className="max-h-[500px] min-h-[200px] font-mono"
            placeholder={defaultTheme}
          />
          <Button onClick={handleSave}>{saveState}</Button>
        </div>
      )}
    </div>
  )
}
