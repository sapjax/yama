import type { WordStatus, MarkedWordsMap, Vocabulary } from './type'

type EventCallback = (data: any) => void

class WordMarker {
  private storageKey = 'markedWords'
  private storage = chrome.storage.local
  private markedWords: MarkedWordsMap = new Map()
  private events: Map<string, EventCallback[]> = new Map()

  constructor() {
    this.markedWords = new Map()
  }

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
  }

  private emit(event: string, data: any) {
    if (this.events.has(event)) {
      this.events.get(event)!.forEach(callback => callback(data))
    }
  }

  async init() {
    const result = await this.storage.get([this.storageKey])
    if (result[this.storageKey]) {
      const entries = Object.entries(result[this.storageKey] as Record<string, Vocabulary>)
      this.markedWords = new Map(entries)
    }
  }

  has(word: string): boolean {
    return this.markedWords.has(word)
  }

  get(word: string): Vocabulary | undefined {
    return this.markedWords.get(word)
  }

  set(spelling: string, status: WordStatus, sentence?: string) {
    const existingWord = this.markedWords.get(spelling)
    const oldStatus = existingWord?.status
    const newWordState: Vocabulary = {
      ...(existingWord ?? { spelling }),
      status,
    }
    this.markedWords.set(spelling, newWordState)
    this.persist()
    this.emit('wordChanged', { newWord: newWordState, oldStatus, sentence })
  }

  updateWord(spelling: string, newWord: Vocabulary) {
    this.markedWords.set(spelling, newWord)
    this.persist()
  }

  delete(spelling: string) {
    if (this.markedWords.has(spelling)) {
      this.markedWords.delete(spelling)
      this.persist()
    }
  }

  private persist() {
    this.storage.set({ [this.storageKey]: Object.fromEntries(this.markedWords) })
  }

  getAll(): MarkedWordsMap {
    return this.markedWords
  }

  getCounting(): Record<WordStatus, number> {
    const stats = {} as Record<WordStatus, number>
    for (const vocabulary of this.markedWords.values()) {
      stats[vocabulary.status] ||= 0
      stats[vocabulary.status]++
    }
    return stats
  }
}

export { WordMarker }
