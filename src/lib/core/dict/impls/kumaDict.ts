import type { Dictionary, DictionaryEntry } from '../interface'
import { abortable, cacheable } from '../fetcher'

// https://app.kumalearn.com/dictionary/%E9%A3%9F%E3%81%B9%E3%82%8B
const _fetch = async (word: string, signal: AbortSignal): Promise<DictionaryEntry | null> => {
  try {
    const response = await fetch(`https://app.kumalearn.com/dictionary/${encodeURIComponent(word)}`, { signal })
    if (!response.ok) {
      throw new Error(`Failed to fetch from kuma API: ${response.statusText}`)
    }

    const html = await response.text()
    const res = parseDocument(word, html)
    return res
  } catch (e) {
    return null
  }
}

const parseDocument = async (word: string, html: string) => {
  const dataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/)
  const jsonString = dataMatch?.[1]

  if (jsonString) {
    const json: any = JSON.parse(jsonString)
    const imgObject = json.props.pageProps.words[0].imgs[0]
    if (!imgObject) return null

    return {
      definitions: [{
        spelling: '',
        reading: '',
        meanings: [],
        images: [{
          src: imgObject.staticThumbnail,
          alt: imgObject.alt,
          width: imgObject.width,
          height: imgObject.height,
        }],
      }],
    } as DictionaryEntry
  }

  return null
}

const kumaDict: Dictionary = {
  lookup: cacheable(abortable(_fetch)),
  getWebLink: (word: string) => `https://app.kumalearn.com/dictionary/${encodeURIComponent(word)}`,
  getIcon: () => chrome.runtime.getURL('kuma.svg'),
}

export { kumaDict }
