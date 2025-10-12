import type { WordStatus, Vocabulary } from '@/lib/core/mark'
import type { DictionaryEntry, DictName } from '@/lib/core/dict'
import { SegmentedToken } from '@/lib/core/segment/interface'
import { ProtocolWithReturn, ProtocolMap } from 'webext-bridge'

type WordStatistics = Record<WordStatus, number>

declare module 'webext-bridge' {
  interface ProtocolMap {
    [Messages.segment]: ProtocolWithReturn<{ text: string }, SegmentedToken[]>
    [Messages.mark_word]: { spelling: string, status: WordStatus, sentence?: string }
    [Messages.get_marked_words]: ProtocolWithReturn<{}, Record<string, Vocabulary>>
    [Messages.app_available]: { app_available: boolean }
    [Messages.lookup]: ProtocolWithReturn<{ word: string, dictName: DictName }, DictionaryEntry | null>
    [Messages.playAudio]: { text: string, audioUrl?: string, options?: chrome.tts.TtsOptions }
    [Messages.jpdb_login]: ProtocolWithReturn<{ apiKey: string }, boolean>
    [Messages.jpdb_sync]: {}
    [Messages.jpdb_get_decks]: ProtocolWithReturn<{}, Deck[]>
    [Messages.toggle_whitelist_status]: { domain: string, tabId: number }
    [Messages.set_color_scheme]: { colorScheme: 'light' | 'dark' }

    // AI streaming
    [Messages.ai_explain_stream_start]: { sentence: string, word: string }
    [Messages.ai_explain_stream_chunk]: { chunk: string }
    [Messages.ai_explain_stream_end]: {}
    [Messages.ai_explain_stream_cancel]: {}

    // Statistics
    [Messages.get_statistics]: ProtocolWithReturn<{}, WordStatistics>
  }
}

export type Deck = {
  id: number
  name: string
}

const enum Messages {
  segment = 'segment',
  mark_word = 'mark_word',
  get_marked_words = 'get_marked_words',
  app_available = 'app_available',
  lookup = 'lookup',
  playAudio = 'playAudio',
  jpdb_login = 'jpdb-login',
  jpdb_sync = 'jpdb-sync',
  jpdb_get_decks = 'jpdb_get_decks',
  toggle_whitelist_status = 'toggle_whitelist_status',
  set_color_scheme = 'set_color_scheme',

  ai_explain_stream_start = 'ai_explain_stream_start',
  ai_explain_stream_chunk = 'ai_explain_stream_chunk',
  ai_explain_stream_end = 'ai_explain_stream_end',
  ai_explain_stream_cancel = 'ai_explain_stream_cancel',
  get_statistics = 'get_statistics',

}

async function sendMessageToAllTabs<T extends Messages>(action: T, data: ProtocolMap[T]) {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    // Note: use chrome.tabs.sendMessage instead of sendMessage from webext-bridge
    // because the sendMessage from webext-bridge is only send to main frame by default
    // but we need to send message to all frames
    if (!tab.url?.startsWith('chrome://extension')) {
      chrome.tabs.sendMessage(tab.id!, { action, ...data })
    }
  }
}

export {
  type WordStatistics,
  Messages,
  sendMessageToAllTabs,
}
