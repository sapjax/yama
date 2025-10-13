import { JpdbDict } from './impls/jpdbDict'
import { kumaDict } from './impls/kumaDict'

export type { Dictionary, DictionaryEntry, Definition } from './interface'

export const dictAdapters = {
  jpdb: JpdbDict,
  kuma: kumaDict,
} as const

export type DictName = keyof typeof dictAdapters
