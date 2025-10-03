import type { WordMarker } from '@/lib/core/mark/marker'
import type { Vocabulary, WordStatus, MarkedWordsMap } from '@/lib/core/mark'

interface Synchronizer {
  login(token: string): Promise<boolean>
  sync(wordMarker: WordMarker): Promise<void>
  set(word: Vocabulary, oldStatus?: WordStatus): Promise<Vocabulary>
}

export type { Synchronizer }
