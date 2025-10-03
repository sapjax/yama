import { Vocabulary, REVIEW_STATE } from '@/lib/core/mark'

const JPDB_API_BASE = 'https://jpdb.io/api/v1'

export type Deck = {
  id: number
  name: string
}

type IdPair = [vid: number, sid: number ]

type ParsedToken = [
  vid: number,
  sid: number,
  spelling: string,
  card_state: REVIEW_STATE[] | null,
]

type ReviewGrade = 'nothing' | 'something' | 'hard' | 'okay' | 'easy'

export class JpdbClient {
  private apiKey: string = ''

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  public get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, 'GET')
  }

  public post<T>(endpoint: string, body: object): Promise<T> {
    return this.request<T>(endpoint, 'POST', body)
  }

  private async request<T>(endpoint: string, method: string, body?: object): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }

    const config: RequestInit = {
      method,
      headers,
    }

    if (body) {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(`${JPDB_API_BASE}${endpoint}`, config)

    if (!response.ok) {
      throw new Error(`JPDB API request failed: ${response.statusText}`)
    }

    return response.json()
  }

  public async ping() {
    await this.get('/ping')
  }

  // return user created decks
  public async getUserDecks(): Promise<Deck[]> {
    const response = await this.post<{ decks: [number, string][] }>('/list-user-decks', {
      fields: ['id', 'name'],
    })
    return response.decks.map(deck => ({ id: deck[0], name: deck[1] }))
  }

  public async createDeck(name: string): Promise<Deck> {
    const response = await this.post<{ id: number }>('/deck/create-empty', { name, position: 0 })
    return {
      id: response.id,
      name,
    }
  }

  public async getDeckVocabulary(deckId: number | string): Promise<IdPair[]> {
    const response = await this.post<{ vocabulary: IdPair[] }>('/deck/list-vocabulary', {
      id: deckId,
    })
    return response.vocabulary
  }

  public async addVocabularyToDeck(deckId: number | string, vocabulary: Vocabulary[]): Promise<void> {
    await this.post('/deck/add-vocabulary', {
      id: deckId,
      vocabulary: vocabulary.map(v => [v.vid, v.sid]),
      ignore_unknown: true,
    })
  }

  public async removeVocabularyFromDeck(deckId: number | string, vocabulary: Vocabulary[]): Promise<void> {
    await this.post('/deck/remove-vocabulary', {
      id: deckId,
      vocabulary: vocabulary.map(v => [v.vid, v.sid]),
    })
  }

  public async lookupVocabulary(vids: IdPair[]): Promise<ParsedToken[]> {
    const response = await this.post<any>('/lookup-vocabulary', {
      list: vids,
      fields: ['vid', 'sid', 'spelling', 'card_state'],
    })
    return response.vocabulary_info
  }

  public async parse(text: string[]): Promise<ParsedToken[]> {
    const response = await this.post<{ vocabulary: ParsedToken[] }>('/parse', {
      text,
      token_fields: [],
      position_length_encoding: 'utf16',
      vocabulary_fields: ['vid', 'sid', 'spelling', 'card_state'],
    })
    return response.vocabulary
  }

  public async setCardSentence(vocabulary: Vocabulary, sentence: string) {
    await this.post('/set-card-sentence', {
      vid: vocabulary.vid,
      sid: vocabulary.sid,
      sentence,
    })
  }

  public async review(vocabulary: Vocabulary, grade: ReviewGrade) {
    await this.post('/review', {
      vid: vocabulary.vid,
      sid: vocabulary.sid,
      grade,
    })
  }
}
