import { JLPTDict } from './impls/jlptDict'
import { JishoDict } from './impls/jishoDict'
import { JpdbDict } from './impls/jpdbDict'

export type { Dictionary, DictionaryEntry } from './interface'

export const dictAdapters = {
  jlpt: JLPTDict,
  jpdb: JpdbDict,
  jisho: JishoDict,
} as const

export type DictName = keyof typeof dictAdapters
