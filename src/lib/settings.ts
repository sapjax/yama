const SETTINGS_KEY = 'yama-app-settings'

export const defaultColors = {
  UnSeen: { color: 'rgba(216, 226, 38, 0.5)', enabled: true },
  Searched: { color: 'rgba(73, 186, 211, 0.5)', enabled: true },
  Tracking: { color: 'rgba(160, 58, 166, 0.5)', enabled: true },
  Ignored: { color: 'rgb(119, 119, 119)', enabled: false },
  Never_Forget: { color: 'currentColor', enabled: false },
}

// https://jpdb.io/faq#ReviewGrading
export const defaultReviewColor = {
  failed: { color: 'rgba(240, 55, 90, 0.5)', enabled: true }, // review as 'Nothing' or 'Something'
  known: { color: 'rgba(125, 210, 33, 0.5)', enabled: true }, // review as 'Okey' or 'Easy'
}

export type ColorSettingItem = { color: string, enabled: boolean }
export type ColorSettings = Record<keyof typeof defaultColors, ColorSettingItem>
export type ReviewColorSettings = Record<keyof typeof defaultReviewColor, ColorSettingItem>

export interface DictSettingItem {
  id: string
  enabled: boolean
}

export type DictSettings = DictSettingItem[]

const defaultDictSettings: DictSettings = [
  { id: 'jpdb', enabled: true },
  { id: 'jisho', enabled: false },
  { id: 'jlpt', enabled: false },
]

export interface AppSettings {
  colors: ColorSettings
  reviewColors: ReviewColorSettings
  dicts: DictSettings
  jpdbApiKey: string
  jpdbMiningDeckId: number | null
  jpdbLastSync: number | null
  markStyle: string
}

export const defaultSettings: AppSettings = {
  colors: defaultColors,
  reviewColors: defaultReviewColor,
  dicts: defaultDictSettings,
  jpdbApiKey: '',
  jpdbMiningDeckId: null,
  jpdbLastSync: null,
  markStyle: 'background',
}

/**
 * Merges saved settings with defaults to ensure all keys are present and in a consistent order.
 */
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const data = await chrome.storage.sync.get(SETTINGS_KEY)
    const savedSettings = data[SETTINGS_KEY] as Partial<AppSettings> | undefined

    if (savedSettings?.dicts) {
      const savedDictsMap = new Map(savedSettings.dicts.map(d => [d.id, d]))

      // Ensure the order from saved settings is respected, while adding any new default dictionaries
      const finalDicts = [...savedSettings.dicts]
      const finalDictIds = new Set(finalDicts.map(d => d.id))
      defaultSettings.dicts.forEach((defaultDict) => {
        if (!finalDictIds.has(defaultDict.id)) {
          finalDicts.push(defaultDict)
        }
      })

      savedSettings.dicts = finalDicts.map(d => ({
        ...d,
        enabled: savedDictsMap.get(d.id)?.enabled ?? d.enabled,
      }))
    }

    return {
      ...defaultSettings,
      ...savedSettings,
      colors: { ...defaultSettings.colors, ...savedSettings?.colors },
      reviewColors: { ...defaultSettings.reviewColors, ...savedSettings?.reviewColors },
      dicts: savedSettings?.dicts || defaultSettings.dicts,
    }
  } catch (error) {
    console.error('Error getting settings:', error)
    return defaultSettings
  }
}

export const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
  try {
    const currentSettings = await getSettings()
    const mergedSettings: AppSettings = {
      ...currentSettings,
      ...newSettings,
      colors: { ...currentSettings.colors, ...(newSettings.colors || {}) },
      // For dicts, directly replace the array if it exists in the new settings
      dicts: newSettings.dicts || currentSettings.dicts,
    }
    await chrome.storage.sync.set({ [SETTINGS_KEY]: mergedSettings })
  } catch (error) {
    console.error('Error updating settings:', error)
  }
}
