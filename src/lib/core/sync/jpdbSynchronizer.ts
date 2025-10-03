import { WordMarker } from '@/lib/core/mark/marker'
import { Synchronizer } from './interface'
import { Vocabulary, WordStatus } from '@/lib/core/mark/type'
import { JpdbClient, Deck } from './jpdbClient'
import { AppSettings, getSettings } from '@/lib/settings'

const TRACKING_DECK_NAME = 'yama-learning'
const BLACKLISTED_DECK_ID = 'blacklist'
const NEVER_FORGET_DECK_ID = 'never-forget'

class JpdbSynchronizer implements Synchronizer {
  public client: JpdbClient | null = null
  private decks: Deck[] = []

  constructor() {}

  async login(apiKey: string): Promise<boolean> {
    this.client ||= new JpdbClient(apiKey)
    try {
      this.decks = await this.client.getUserDecks()
      console.log('Logged in to JPDB', this.decks)
      return true
    } catch (e) {
      this.client = null
      this.decks = []
      console.error(e)
      return false
    }
  }

  public async getOrCreateYamaDeck(): Promise<Deck> {
    if (!this.client) throw new Error('Not logged in')
    const name = TRACKING_DECK_NAME
    let deck = this.decks.find(d => d.name === name)
    if (!deck) {
      deck = await this.client.createDeck(name)
      this.decks.push(deck)
    }
    return deck!
  }

  async sync(wordMarker: WordMarker): Promise<void> {
    if (!this.client) throw new Error('Not logged in')

    const settings = await getSettings()
    const { jpdbMiningDeckId, jpdbLastSync } = settings
    const isInitialSync = !jpdbLastSync

    if (!jpdbMiningDeckId || !this.decks.find(d => d.id === jpdbMiningDeckId)) {
      throw new Error('No mining deck configured. skip sync.')
    }

    // --- 1. Fetch all words from JPDB ---
    const [jpdbMiningIdPairs, jpdbBlacklistedIdPairs, jpdbNeverForgetIdPairs] = await Promise.all([
      this.client.getDeckVocabulary(jpdbMiningDeckId),
      this.client.getDeckVocabulary(BLACKLISTED_DECK_ID),
      this.client.getDeckVocabulary(NEVER_FORGET_DECK_ID),
    ])

    const allJpdbIdPairs = [...jpdbMiningIdPairs, ...jpdbBlacklistedIdPairs, ...jpdbNeverForgetIdPairs]
    const jpdbMiningVidSet = new Set(jpdbMiningIdPairs.map(v => v[0]))
    const jpdbBlacklistedVidSet = new Set(jpdbBlacklistedIdPairs.map(v => v[0]))
    const jpdbNeverForgetVidSet = new Set(jpdbNeverForgetIdPairs.map(v => v[0]))

    // --- 2. Sync from JPDB to Local (Add/Update) ---
    if (allJpdbIdPairs.length > 0) {
      const jpdbWordsInfos = await this.client.lookupVocabulary(allJpdbIdPairs)
      jpdbWordsInfos.forEach((info) => {
        if (!info) return
        const [vid, sid, spelling, card_state] = info

        let status: WordStatus = 'UnSeen'
        if (jpdbBlacklistedVidSet.has(vid)) {
          status = 'Ignored'
        } else if (jpdbNeverForgetVidSet.has(vid)) {
          status = 'Never_Forget'
        } else if (jpdbMiningVidSet.has(vid)) {
          status = 'Tracking'
        }

        if (spelling && status !== 'UnSeen') {
          wordMarker.updateWord(spelling, { spelling, vid, sid, status, review: card_state?.[0] })
        }
      })
    }

    // --- 3. Conditionally Sync from Local to JPDB (Upload or Delete) ---
    const localWords = wordMarker.getAll()
    const localWordsToUpload = [...localWords.values()]

    if (localWordsToUpload.length > 0) {
      // Ensure all words to be uploaded have vid/sid
      const wordsWithoutIds = localWordsToUpload.filter(w => !w.vid)
      if (wordsWithoutIds.length > 0) {
        const parsed = await this.client.parse(wordsWithoutIds.map(w => w.spelling))
        parsed.forEach(([vid, sid, spelling, card_state]) => {
          const oldWord = localWords.get(spelling)
          if (oldWord) {
            wordMarker.updateWord(spelling, { ...oldWord, vid, sid, review: card_state?.[0] })
          }
        })
      }

      // Re-get all words from the marker to ensure we have the updated IDs
      const toAddToMining: Vocabulary[] = []
      const toAddToBlacklist: Vocabulary[] = []
      const toAddToNeverForget: Vocabulary[] = []

      // First sync: upload local words to corresponding JPDB decks
      // Subsequent syncs: delete local words that are not on JPDB
      for (const word of localWords.values()) {
        if (word.vid) {
          if (word.status === 'Tracking' && !jpdbMiningVidSet.has(word.vid)) {
            isInitialSync ? toAddToMining.push(word) : wordMarker.delete(word.spelling)
          } else if (word.status === 'Ignored' && !jpdbBlacklistedVidSet.has(word.vid)) {
            isInitialSync ? toAddToBlacklist.push(word) : wordMarker.delete(word.spelling)
          } else if (word.status === 'Never_Forget' && !jpdbNeverForgetVidSet.has(word.vid)) {
            isInitialSync ? toAddToNeverForget.push(word) : wordMarker.delete(word.spelling)
          }
        }
      }

      // Perform uploads to all three decks
      if (toAddToMining.length > 0) {
        await this.client.addVocabularyToDeck(jpdbMiningDeckId, toAddToMining)
      }
      if (toAddToBlacklist.length > 0) {
        await this.client.addVocabularyToDeck(BLACKLISTED_DECK_ID, toAddToBlacklist)
      }
      if (toAddToNeverForget.length > 0) {
        await this.client.addVocabularyToDeck(NEVER_FORGET_DECK_ID, toAddToNeverForget)
      }
    }
  }

  async set(word: Vocabulary, oldStatus?: WordStatus, sentence?: string): Promise<Vocabulary> {
    if (!this.client) throw new Error('JPDB client not initialized')

    let wordWithIds = { ...word }

    if (!wordWithIds.vid || !wordWithIds.sid) {
      const parsed = await this.client.parse([word.spelling])
      if (!parsed.length || !parsed[0].length) {
        throw new Error(`Could not parse word: ${word.spelling}`)
      }
      const [vid, sid] = parsed[0]
      wordWithIds.vid = vid
      wordWithIds.sid = sid
    }

    const settings = await getSettings()
    const deckMap: Partial<Record<WordStatus, number | string | null>> = {
      Tracking: settings.jpdbMiningDeckId,
      Ignored: BLACKLISTED_DECK_ID,
      Never_Forget: NEVER_FORGET_DECK_ID,
    }

    if (oldStatus && deckMap[oldStatus]) {
      await this.client.removeVocabularyFromDeck(deckMap[oldStatus], [wordWithIds])
    }

    if (word.status && deckMap[word.status]) {
      await this.client.addVocabularyToDeck(deckMap[word.status]!, [wordWithIds])
      if (word.status === 'Tracking' && sentence && wordWithIds.vid && wordWithIds.sid) {
        this.client.setCardSentence(wordWithIds, sentence)
      }
    }

    return wordWithIds
  }
}

export { JpdbSynchronizer }
