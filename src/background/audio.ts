const playAudio = async (
  { audioUrl, text, volume = 100, tabId }:
  { audioUrl?: string, text?: string, volume?: number, tabId?: number },
) => {
  if (!audioUrl && !text) return

  if (audioUrl) {
    const audioPageUrl = chrome.runtime.getURL('src/offscreen/audio.html')

    await setupOffscreenDocument(audioPageUrl)
    chrome.runtime.sendMessage({
      type: 'play-audio',
      target: 'offscreen',
      data: {
        audio: audioUrl,
        volume,
        tabId,
      },
    })
  }

  if (!audioUrl && text) {
    const voices = await chrome.tts.getVoices()
    const googleVoice = voices.find(v => v.voiceName === 'Google 日本語')?.voiceName
    const options = { lang: 'ja-JP', rate: 0.9, voiceName: googleVoice }
    chrome.tts.speak(text, options)
    return
  }
}

const setupOffscreenDocument = async (path: string) => {
  if (await checkOffscreenDocumentExist(path)) return

  await chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'play audio for word pronunciation',
  })

  // Wait for the offscreen document to be ready
  await new Promise<void>((resolve) => {
    const listener = (message: any) => {
      if (message.type === 'offscreen-ready') {
        chrome.runtime.onMessage.removeListener(listener)
        resolve()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
  })
}

const checkOffscreenDocumentExist = async (offscreenUrl: string) => {
  if (chrome.runtime.getContexts) {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [offscreenUrl],
    })
    return existingContexts.length > 0
    // @ts-ignore
  } else if (globalThis.clients) {
    // @ts-ignore
    const matchedClients = await globalThis.clients.matchAll()

    for (const client of matchedClients) {
      if (client.url === offscreenUrl) {
        return true
      }
    }
    return false
  }
  return false
}

export { playAudio }
