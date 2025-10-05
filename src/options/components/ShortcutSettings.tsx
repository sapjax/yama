import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppSettings, getSettings, updateSettings } from '@/lib/settings'
import { useEffect, useState } from 'react'

type ShortcutAction = keyof AppSettings['shortcuts']

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
        {renderShortcutInput('tracking', 'Mark as Tracking')}
        {renderShortcutInput('ignored', 'Mark as Ignored')}
        {renderShortcutInput('never_forget', 'Mark as Never Forget')}
        {renderShortcutInput('ai_explain', 'Trigger AI Explain')}
      </div>
      <Button onClick={handleSave}>{saveState}</Button>
    </div>
  )
}
