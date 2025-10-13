import { JLPTDict } from './impls/jlptDict'
import { JishoDict } from './impls/jishoDict'
import { JpdbDict } from './impls/jpdbDict'
import { kumaDict } from './impls/kumaDict'

export type { Dictionary, DictionaryEntry, Definition } from './interface'

export const dictAdapters = {
  jlpt: JLPTDict,
  jpdb: JpdbDict,
  jisho: JishoDict,
  kuma: kumaDict,
} as const

export type DictName = keyof typeof dictAdapters
