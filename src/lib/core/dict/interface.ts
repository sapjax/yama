import { JLPTLevel } from '@/lib/core/tag/type'

export type DictionaryEntry = {
  definitions: Definition[]
}

type Definition = {
  spelling: string
  reading: string
  audioUrl?: string
  frequency?: string
  meanings: { explain: string, note?: string }[]
  altSpellings?: { spelling: string, percent?: string, furigana?: string }[]
  altReadings?: { reading: string, percent?: string }[]
  pos?: string
  pitchAccent?: string
  examples?: Example[]
  jlpt?: JLPTLevel
}

type Example = {
  text: string
  translation?: string
  audioUrl?: string
  ref?: LinkRef
}

type LinkRef = {
  text: string
  url: string
  icon?: string
}

export interface Dictionary {
  lookup(word: string): Promise<DictionaryEntry | null>
  getWebLink?: (word: string) => string
  getIcon?: () => string
}
