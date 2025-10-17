import { Messages, sendMessageToAllTabs } from '@/lib/message'
import { onMessage, sendMessage } from 'webext-bridge/background'
import { services } from '@/background/services'
import { getSettings, updateSettings } from '@/lib/settings'
import { getWhitelist, isUrlWhitelisted, isDomainWhitelisted, removeFromWhitelist, addToWhitelist } from '@/lib/whitelist'
import { updateIcon, setIconBadgeCounting, setIconBadgeError, clearIconBadge } from './icon'
import { playAudio } from './audio'
// @ts-ignore
import contentScriptPath from '@/content/main?script'

// --- Main Initialization ---

async function initialize() {
  // Eagerly initialize services
  await services.ensureInitialized(services.wordMarker)

  // Conditionally set up JPDB sync based on settings
  const settings = await getSettings()
  if (settings.jpdbApiKey && services.jpdbSynchronizer) {
    await services.jpdbSynchronizer.login(settings.jpdbApiKey)
    console.log('JPDB sync is active.')

    // Listen for word changes and sync them
    services.wordMarker.on('wordChanged', async ({ newWord, oldStatus, sentence }) => {
      try {
        const wordWithIds = await services.jpdbSynchronizer.set(newWord, oldStatus, sentence)
        // Update the word in the marker with the new IDs without triggering another event
        services.wordMarker.updateWord(newWord.spelling, wordWithIds)
      } catch (error) {
        console.error('Failed to sync word with JPDB:', error)
      }
    })

    // Perform an initial full sync
    services.jpdbSynchronizer.sync(services.wordMarker)
  }

  // Set initial badge count
  setIconBadgeCounting(services.wordMarker.getCounting())
}

initialize()

// --- Helper Functions ---

async function injectScriptIntoTab(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      injectImmediately: true,
      files: [contentScriptPath],
    })
    console.log(`Injected script into tab ${tabId}`)
  } catch (e) {
    console.error(`Failed to inject script into tab ${tabId}:`, e)
  }
}

// --- Event Listeners ---

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Yama extension installed/updated.')
  const whitelist = await getWhitelist()
  if (whitelist.length === 0) return

  // Inject script into all existing tabs that are on the whitelist
  const tabs = await chrome.tabs.query({ status: 'complete' })
  for (const tab of tabs) {
    if (tab.id && tab.url) {
      if (await isUrlWhitelisted(tab.url)) {
        await injectScriptIntoTab(tab.id)
      }
    }
  }
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (await isUrlWhitelisted(tab.url)) {
      await injectScriptIntoTab(tabId)
    }
  }
})

chrome.tabs.onActivated.addListener(function ({ tabId }) {
  updateTabBadge(tabId)
})

// --- Message Listeners ---

onMessage(Messages.mark_word, async ({ data }) => {
  const { spelling, status, sentence } = data
  services.wordMarker.set(spelling, status, sentence)
  // The 'wordChanged' event will be emitted by the marker, triggering sync if active.
  sendMessageToAllTabs(Messages.mark_word, data)
  setIconBadgeCounting(services.wordMarker.getCounting())
})

onMessage(Messages.get_marked_words, async () => {
  await services.ensureInitialized(services.wordMarker)
  const markedWords = services.wordMarker.getAll()
  // Convert Map to a plain object for the message bridge
  return Object.fromEntries(markedWords.entries())
})

onMessage(Messages.segment, async ({ data }) => {
  await services.ensureInitialized(services.segmenter)
  const { text } = data
  const settings = await getSettings()
  return services.segmenter.segment(text, { mergeTokens: settings.segmenter.linderaMergeTokens })
})

onMessage(Messages.lookup, async ({ data }) => {
  const { word, dictName } = data
  const dict = services.getDictionary(dictName)
  return await dict.lookup(word)
})

onMessage(Messages.playAudio, async ({ data, sender }) => {
  playAudio({ ...data, tabId: sender.tabId })
})

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'audio_state_changed') {
    sendMessage(Messages.audio_state_changed,
      { audioUrl: message.audioUrl, state: message.state },
      { tabId: message.tabId, context: 'content-script' },
    )
  }
})

onMessage(Messages.jpdb_login, async ({ data }) => {
  const { apiKey } = data
  const success = await services.jpdbSynchronizer.login(apiKey)
  if (success) {
    const settings = await getSettings()
    // If no mining deck is set, this is the first login.
    // Create the yama-learning deck and set it as the default.
    if (!settings.jpdbMiningDeckId) {
      const yamaDeck = await services.jpdbSynchronizer.getOrCreateYamaDeck()
      await updateSettings({ jpdbMiningDeckId: yamaDeck.id })
    }
  }
  return success
})

onMessage(Messages.jpdb_get_decks, async () => {
  if (!services.jpdbSynchronizer || !services.jpdbSynchronizer.client) {
    // Return an empty array if not logged in, so the UI can handle it gracefully.
    return []
  }
  return await services.jpdbSynchronizer.client.getUserDecks()
})

onMessage(Messages.jpdb_sync, async () => {
  if (services.jpdbSynchronizer.client) {
    await services.jpdbSynchronizer.sync(services.wordMarker)
  }
})

onMessage(Messages.toggle_whitelist_status, async ({ data }) => {
  const { domain, tabId } = data
  if (!domain || !tabId) return

  const isWhitelisted = await isDomainWhitelisted(domain)
  if (isWhitelisted) {
    await removeFromWhitelist(domain)
    chrome.tabs.reload(tabId)
  } else {
    await addToWhitelist(domain)
    await injectScriptIntoTab(tabId)
  }
  updateTabBadge(tabId)
})

let currentAiStreamController: AbortController | null = null

onMessage(Messages.ai_explain_stream_start, async ({ data, sender }) => {
  if (currentAiStreamController) {
    currentAiStreamController.abort()
  }
  currentAiStreamController = new AbortController()

  const { sentence, word } = data
  const tabId = sender.tabId
  if (!tabId) return

  try {
    await services.aiService.explain(
      sentence,
      word,
      (chunk) => {
        sendMessage(Messages.ai_explain_stream_chunk, { chunk }, { tabId, frameId: sender.frameId, context: 'content-script' })
      },
      currentAiStreamController.signal,
    )
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.error(e)
    }
  } finally {
    sendMessage(Messages.ai_explain_stream_end, {}, { tabId, frameId: sender.frameId, context: 'content-script' })
    currentAiStreamController = null
  }
})

onMessage(Messages.ai_explain_stream_cancel, () => {
  if (currentAiStreamController) {
    currentAiStreamController.abort()
    currentAiStreamController = null
  }
})

onMessage(Messages.set_color_scheme, async ({ data }) => {
  updateIcon(data.colorScheme)
  setIconBadgeCounting(services.wordMarker.getCounting())
})

function updateTabBadge(tabId: number) {
  chrome.tabs.get(tabId, async function (tab) {
    if (await isUrlWhitelisted(tab.url!)) {
      if (chrome.runtime.lastError) {
        setIconBadgeError(chrome.runtime.lastError.message!)
      } else {
        setIconBadgeCounting(services.wordMarker.getCounting())
      }
    } else {
      clearIconBadge()
    }
  })
}
