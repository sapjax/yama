import { useEffect, useState } from 'react'
import ColorPicker from '@uiw/react-color-colorful'
import { rgbaStringToHsva, hsvaToRgbaString } from '@uiw/color-convert'
import { getSettings, updateSettings, AppSettings } from '@/lib/settings'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedCallback } from 'use-debounce'
import { MarkStyles, genMarkStyles } from '@/lib/highlight/colors'
import { initHighlighter } from '@/lib/highlight'
import { cn } from '@/lib/utils'

const STYLE_ID = 'yama-style-preview'

export function ColorSettings() {
  const [settings, setSettings] = useState<AppSettings>()
  useEffect(() => {
    getSettings().then((settings) => {
      setSettings(settings)
    })

    initHighlighter()

    return () => {
      const style = document.getElementById(STYLE_ID)
      if (style) {
        style.remove()
      }
    }
  }, [])

  useEffect(() => {
    if (!settings) return

    let style = document.getElementById(STYLE_ID)
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      document.head.appendChild(style)
    }

    style.textContent = genMarkStyles(
      { ...settings.colors, ...settings.reviewColors },
      settings.markStyle,
    )
  }, [settings])

  const handleMarkStyleChange = (style: string) => {
    if (!settings) return
    const newSettings = { ...settings, markStyle: style }
    setSettings(newSettings)
    updateSettings({ markStyle: style })
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="mb-4 text-2xl font-bold">Highlight Style</h2>
        <p className="mb-4 text-muted-foreground">
          Choose the style of the highlight.
        </p>
        {settings
          && (
            <Select value={settings.markStyle} onValueChange={handleMarkStyleChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                {MarkStyles.map(style => (
                  <SelectItem key={style} value={style}>
                    <span className="capitalize">{style.replace(/_/g, ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
      </div>
      <div>
        <h2 className="mb-4 text-2xl font-bold">Color</h2>
        {settings && <ColorSettingGroup settingKey="colors" settings={settings} setSettings={setSettings} />}
      </div>
      {settings?.jpdbApiKey && !!settings.jpdbMiningDeckId
        && (
          <div>
            <h2 className="mb-4 text-2xl font-bold">Review Color</h2>
            <p className="mb-4 text-muted-foreground">
              These are the colors for JPDB review states, will override the Tracking color.
              <br />
              you can find the description of review states at
              {' '}
              <a
                href="https://jpdb.io/faq#CardStates"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                here
              </a>
              .
            </p>
            {settings && <ColorSettingGroup settingKey="reviewColors" settings={settings} setSettings={setSettings} />}
          </div>
        )}
      <div>
        <h2 className="mb-4 text-2xl font-bold">Preview</h2>
        <div id="example-text">
          <p>
            吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。しかもあとで聞くとそれは書生という人間中で一番獰悪な種族であったそうだ。この書生というのは時々我々を捕えて煮て食うという話である。しかしその当時は何という考もなかったから別段恐しいとも思わなかった。ただ彼の掌に載せられてスーと持ち上げられた時何だかフワフワした感じがあったばかりである。掌の上で少し落ちついて書生の顔を見たのがいわゆる人間というものの見始であろう。この時妙なものだと思った感じが今でも残っている。第一毛をもって装飾されべきはずの顔がつるつるしてまるで薬缶だ。その後猫にもだいぶ逢ったがこんな片輪には一度も出会わした事がない。のみならず顔の真中が妙に突起している。そうしてその穴の中から時々ぷうぷうと煙を吹く。どうも咽せぽくて実に弱った。これが人間の飲む煙草というものである事はようやくこの頃知った。
          </p>
        </div>
      </div>
    </div>
  )
}

type SettingGroupProps<K extends keyof Pick<AppSettings, 'colors' | 'reviewColors'>> = {
  settingKey: K
  settings: AppSettings
  setSettings: React.Dispatch<React.SetStateAction<AppSettings | undefined>>
}

function ColorSettingGroup<K extends keyof Pick<AppSettings, 'colors' | 'reviewColors'>>({ settingKey, settings, setSettings }: SettingGroupProps<K>) {
  const colors = settings[settingKey]

  const handleColorChange = (name: string, color: string) => {
    const key = name as keyof typeof colors
    const newColors = { ...colors, [key]: { ...colors[key], color } }
    const newSettings = { ...settings, [settingKey]: newColors }
    setSettings(newSettings)
    updateSettingsDebounced({ [settingKey]: newColors })
  }

  const handleEnabledChange = (name: string, enabled: boolean) => {
    const key = name as keyof typeof colors
    const newColors = { ...colors, [key]: { ...colors[key], enabled } }
    const newSettings = { ...settings, [settingKey]: newColors }
    setSettings(newSettings)
    updateSettingsDebounced({ [settingKey]: newColors })
  }

  const updateSettingsDebounced = useDebouncedCallback(updateSettings, 200)

  const toHsvaColor = (color: string) => {
    return rgbaStringToHsva(color)
  }

  if (!colors) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Object.entries(colors).map(([name, value]) => (
        <div
          key={name}
          className={cn(
            'flex items-center justify-between rounded-lg border border-border bg-muted p-3 text-muted-foreground shadow-sm',
            name === 'Never_Forget' && 'hidden',
          )}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value.enabled}
              onCheckedChange={checked => handleEnabledChange(name, !!checked)}
            />
            <span className="font-medium capitalize">{name.replace(/_/g, ' ')}</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-8 w-14 cursor-pointer rounded-md border border-border ring hover:ring-primary"
                style={{ backgroundColor: value.color }}
                aria-label={`Change ${name} color`}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <ColorPicker
                color={toHsvaColor(value.color)}
                onChange={(color) => {
                  handleColorChange(name, hsvaToRgbaString(color.hsva))
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      ))}
    </div>
  )
}
