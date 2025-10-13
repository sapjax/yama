import { JLPTLevel } from '@/lib/core/tag/type'

export type DictionaryEntry = {
  definitions: Definition[]
}

export type Definition = {
  spelling: string
  reading: string
  audioUrls?: string[]
  frequency?: string
  meanings: { explain: string, note?: string }[]
  altSpellings?: { spelling: string, percent?: string, furigana?: string }[]
  altReadings?: { reading: string, percent?: string }[]
  pitchAccents?: { audioUrl: string, html: string }[]
  pos?: string
  conjugation?: {
    link: string
    info?: {
      link: string
      text: string
    }
  }
  examples?: Example[]
  images?: {
    src: string
    alt?: string
    width: number
    height: number
  }[]
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
