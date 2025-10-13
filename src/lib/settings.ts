import { dictAdapters } from '@/lib/core/dict'

export const SETTINGS_KEY = 'yama-app-settings'

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
  { id: 'kuma', enabled: false },
]

export interface AppSettings {
  colors: ColorSettings
  reviewColors: ReviewColorSettings
  dicts: DictSettings
  jpdbApiKey: string
  jpdbMiningDeckId: number | null
  jpdbLastSync: number | null
  markStyle: string
  theme: {
    type: 'default' | 'claude' | 'custom'
    custom: string
  }
  ai: {
    apiType: 'openai' | 'gemini'
    openai: {
      apiKey: string
      endpoint: string
      model: string
      prompt: string
    }
    gemini: {
      apiKey: string
      endpoint: string
      model: string
      prompt: string
    }
  }
  shortcuts: {
    tracking: string
    never_forget: string
    ignored: string
    ai_explain: string
    pronounce: string
  }
}

export const defaultSettings: AppSettings = {
  colors: defaultColors,
  reviewColors: defaultReviewColor,
  dicts: defaultDictSettings,
  jpdbApiKey: '',
  jpdbMiningDeckId: null,
  jpdbLastSync: null,
  markStyle: 'background',
  theme: {
    type: 'default',
    custom: '',
  },
  ai: {
    apiType: 'openai',
    openai: {
      apiKey: '',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: '',
      prompt: 'explain the grammar of this sentence:『 ${context}』and the word:『 ${word}』, response with English, keep simple.',
    },
    gemini: {
      apiKey: '',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      model: 'gemini-2.5-flash-lite',
      prompt: 'explain the grammar of this sentence:『 ${context}』and the word:『 ${word}』, response with Chinese, keep simple',
    },
  },
  shortcuts: {
    tracking: 's',
    never_forget: 'd',
    ignored: 'a',
    ai_explain: 'w',
    pronounce: 'r',
  },
}

/**
 * Merges saved settings with defaults, synchronizes with available dictionaries,
 * and ensures all keys are present.
 */
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const data = await chrome.storage.sync.get(SETTINGS_KEY)
    const savedSettings = data[SETTINGS_KEY] as Partial<AppSettings> | undefined

    const availableDictIds = Object.keys(dictAdapters)
    const userDicts = savedSettings?.dicts || defaultSettings.dicts
    const validUserDicts = userDicts.filter(d => availableDictIds.includes(d.id))

    // Identify new dicts that are in the code but not in user settings yet.
    const userDictIds = new Set(validUserDicts.map(d => d.id))
    const newDicts = availableDictIds
      .filter(id => !userDictIds.has(id))
      .map(id => ({ id, enabled: false })) // Add new dicts as disabled by default.

    const finalDicts = [...validUserDicts, ...newDicts]

    return {
      ...defaultSettings,
      ...savedSettings,
      colors: { ...defaultSettings.colors, ...savedSettings?.colors },
      reviewColors: { ...defaultSettings.reviewColors, ...savedSettings?.reviewColors },
      dicts: finalDicts,
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
      dicts: newSettings.dicts || currentSettings.dicts,
    }

    //  ensure that only valid dictionaries are ever written to storage.
    const availableDictIds = Object.keys(dictAdapters)
    mergedSettings.dicts = mergedSettings.dicts.filter(d => availableDictIds.includes(d.id))

    await chrome.storage.sync.set({ [SETTINGS_KEY]: mergedSettings })
  } catch (error) {
    console.error('Error updating settings:', error)
  }
}
