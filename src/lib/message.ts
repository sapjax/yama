import type { WordStatus, Vocabulary } from '@/lib/core/mark'
import type { DictionaryEntry, DictName } from '@/lib/core/dict'
import { SegmentedToken } from '@/lib/core/segment/interface'
import { ProtocolWithReturn, ProtocolMap } from 'webext-bridge'

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
    [Messages.get_tab_whitelist_status]: ProtocolWithReturn<{ domain: string }, boolean>
    [Messages.toggle_whitelist_status]: { domain: string, tabId: number }

  }
}

export type Deck = {
  id: number
  name: string
}

enum Messages {
  segment = 'segment',
  mark_word = 'mark_word',
  get_marked_words = 'get_marked_words',
  app_available = 'app_available',
  lookup = 'lookup',
  playAudio = 'playAudio',
  jpdb_login = 'jpdb-login',
  jpdb_sync = 'jpdb-sync',
  jpdb_get_decks = 'jpdb_get_decks',
  get_tab_whitelist_status = 'get_tab_whitelist_status',
  toggle_whitelist_status = 'toggle_whitelist_status',
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
  Messages,
  sendMessageToAllTabs,
}
