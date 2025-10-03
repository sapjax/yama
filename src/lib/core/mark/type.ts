export const WordStatusList = [
  'Ignored', // treat as if it not a word
  'UnSeen', // the word you never saw before
  'Searched', // the word you searched with dictionary but never tracking to learn it
  'Tracking', // the word you are learning
  'Never_Forget', // the word you already known or fully learned
] as const

export type WordStatus = (typeof WordStatusList)[number]

// review state of https://jpdb.io/faq#CardStates
export type REVIEW_STATE = 'new' | 'learning' | 'known' | 'due' | 'failed' | 'locked' | 'never-forget' | 'suspended' | 'blacklisted' | 'redundant'

export interface Vocabulary {
  spelling: string
  status: WordStatus
  vid?: number
  sid?: number
  review?: REVIEW_STATE
}

// Map of word to its status, the UnSeen words are not included
// the key of the map is always in baseForm of a word
export type MarkedWordsMap = Map<string, Vocabulary>
