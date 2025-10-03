import { JLPTLevel } from '@/lib/core/tag'
import { Dictionary, DictionaryEntry } from '../interface'
import { abortable, cacheable } from '../fetcher'

// https://jisho.org/api/v1/search/words?keyword=%E9%A3%9F%E3%81%B9%E3%82%8B
type JishoEntry = {
  slug: string
  is_common: boolean
  tags: string[]
  jlpt: `jlpt-n${1 | 2 | 3 | 4 | 5}`[]
  japanese: {
    word: string
    reading: string
  }[]
  senses: {
    english_definitions: string[]
    parts_of_speech: string[]
    links: { text: string, url: string }[]
    tags: string[]
    see_also: string[]
    antonyms: string[]
    source: string[]
    info: string[]
  }[]
}

const _fetchJisho = async (word: string, signal: AbortSignal): Promise<DictionaryEntry | null> => {
  const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`, { signal })
  if (!response.ok) {
    // jisho.org returns 404 for words not found, which is not an error.
    if (response.status === 404) {
      return null
    }
    throw new Error(`Failed to fetch from Jisho API: ${response.statusText}`)
  }

  const data = await response.json()
  const entry: JishoEntry = data.data?.[0]

  if (!entry) {
    return null
  }

  const jlpt = entry.jlpt?.[0]?.split('-')[1]?.toUpperCase() as JLPTLevel | undefined
  return {
    definitions: entry.senses.map(sense => ({
      spelling: entry.japanese[0]?.word || word,
      reading: entry.japanese[0]?.reading || '',
      meanings: sense.english_definitions.map(meaning => ({ explain: meaning })),
      pos: sense.parts_of_speech?.[0] || '',
      jlpt: jlpt,
    })),
  }
}

const JishoDict: Dictionary = {
  lookup: cacheable(abortable(_fetchJisho)),
  getWebLink: (word: string) => `https://jisho.org/search/${encodeURIComponent(word)}`,
  getIcon: () => chrome.runtime.getURL('jisho.png'),
}

export { JishoDict }
