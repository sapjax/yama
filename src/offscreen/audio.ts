// this message listener is for chrome version 110 or higher, which support chrome.offscreen
// no need to close window here, we can use it for the next audio
// chrome will auto close the window after 30s
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return
  if (message.type === 'play-audio') {
    try {
      let src = message.data.audio
      if (src?.startsWith('https://jpdb.io/')) {
        src = await getJPDBAudioUrl(src)
      }

      const audio = new Audio(src)
      audio.volume = message.data?.volume / 100
      audio.play().catch(error => console.log(error))
    } catch (error) {
      console.log(error)
    }
  }
})

async function getJPDBAudioUrl(src: string) {
  const [buffer, _mime] = await getAudioBuffer(src)
  const blob = new Blob([buffer!])
  return URL.createObjectURL(blob)
}

async function getAudioBuffer(src: string) {
  const res = await fetch(src, {
    method: 'GET',
    headers: {
      'X-Access': 'please don\'t steal these files',
    },
  })

  if (res.ok) {
    const mime = res.headers.get('content-type')
    let buffer = await res.arrayBuffer()
    const ua = new Uint8Array(buffer)
    ua.set([ua[0] ^ 0x06, ua[1] ^ 0x23, ua[2] ^ 0x54, ua[3] ^ 0x0f])
    buffer = ua.buffer
    return [buffer, mime]
  } else {
    throw new Error(res.statusText)
  }
}
