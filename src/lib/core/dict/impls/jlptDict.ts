import type { Dictionary, DictionaryEntry } from '../interface'
import type { JLPTLevel } from '@/lib/core/tag'

// https://jlpt-vocab-api.vercel.app/
type JLPTDictEntry = {
  word: string
  meaning: string
  furigana: string
  romaji: string
  level: 1 | 2 | 3 | 4 | 5
}

let entries: JLPTDictEntry[] = []

async function lookup(word: string): Promise<DictionaryEntry | null> {
  if (!entries.length) {
    const res = await fetch(chrome.runtime.getURL('/jlpt.json'))
    entries = await res.json()
  }
  const entry = entries.find(e => e.word === word)
  if (entry) {
    const result = {
      definitions: [
        {
          spelling: entry.word,
          reading: entry.furigana,
          meanings: [{ explain: entry.meaning }],
          jlpt: `N${entry.level}` as JLPTLevel,
        },
      ],
    }
    return result
  }
  return null
}

const JLPTDict: Dictionary = {
  lookup,
}

export { JLPTDict }
