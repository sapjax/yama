import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppSettings, getSettings, updateSettings } from '@/lib/settings'
import { useEffect, useState } from 'react'

type ShortcutAction = keyof AppSettings['shortcuts']

const modifierKeyOptions = [
  { value: 'None', label: 'None' },
  { value: 'Control', label: 'Ctrl' },
  { value: 'Alt', label: 'Alt' },
  { value: 'Meta', label: 'Meta' },
  { value: 'Shift', label: 'Shift' },
] as const

export function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<AppSettings['shortcuts']>()
  const [saveState, setSaveState] = useState('Save')

  useEffect(() => {
    getSettings().then(s => setShortcuts(s.shortcuts))
  }, [])

  const handleSave = () => {
    if (shortcuts) {
      updateSettings({ shortcuts })
      setSaveState('Saved!')
      setTimeout(() => setSaveState('Save'), 2000)
    }
  }

  const handleChange = (action: ShortcutAction, key: string) => {
    if (shortcuts) {
      setShortcuts({ ...shortcuts, [action]: key })
    }
  }

  if (!shortcuts) {
    return <div>Loading...</div>
  }

  const renderShortcutInput = (action: ShortcutAction, label: string) => (
    <div className="flex items-center gap-4">
      <Label htmlFor={`shortcut-${action}`} className="w-48">{label}</Label>
      <Input
        readOnly
        id={`shortcut-${action}`}
        type="text"
        value={shortcuts[action]}
        onKeyDown={(e) => {
          e.preventDefault()
          if (e.key === 'Backspace') {
            handleChange(action, '')
          } else {
            handleChange(action, e.key)
          }
        }}
        className="w-24"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Label htmlFor="shortcut-holdModifierKey" className="w-48">Hold to Show Dictionary</Label>
          <Select
            value={shortcuts.holdModifierKey}
            onValueChange={value => handleChange('holdModifierKey', value)}
          >
            <SelectTrigger id="shortcut-holdModifierKey" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modifierKeyOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {renderShortcutInput('tracking', 'Mark as Tracking')}
        {renderShortcutInput('ignored', 'Mark as Ignored')}
        {renderShortcutInput('never_forget', 'Mark as Never Forget')}
        {renderShortcutInput('ai_explain', 'Trigger AI Explain')}
        {renderShortcutInput('pronounce', 'Pronounce Word')}
      </div>
      <Button onClick={handleSave}>{saveState}</Button>
    </div>
  )
}
