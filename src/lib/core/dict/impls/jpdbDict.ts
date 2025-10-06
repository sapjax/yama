import { DomParser } from '@thednp/domparser/dom-parser'
import { Dictionary, DictionaryEntry } from '../interface'
import { abortable, cacheable } from '../fetcher'

// https://jisho.org/api/v1/search/words?keyword=%E9%A3%9F%E3%81%B9%E3%82%8B
const _fetchJPDB = async (word: string, signal: AbortSignal): Promise<DictionaryEntry | null> => {
  const response = await fetch(`https://jpdb.io/search?q=${encodeURIComponent(word)}`, { signal })
  if (!response.ok) {
    throw new Error(`Failed to fetch from JPDB API: ${response.statusText}`)
  }

  const html = await response.text()
  return parseDocument(word, html)
}

const parseDocument = async (word: string, html: string) => {
  const doc = DomParser({
    filterTags: [
      'script', 'style', 'iframe', 'object', 'embed', 'base', 'form',
      'input', 'button', 'textarea', 'select', 'option',
    ],
  }).parseFromString(html).root

  const root = doc.querySelector('#result-0')
  // not a kanji
  if (root) {
    const reading = root.querySelector('.primary-spelling')?.querySelectorAll('rt')?.map(rt => rt.textContent).join()
    const frequency = [...root.querySelectorAll('.tag')].map(n => n.textContent).find(t => t.startsWith('Top'))
    const meanings = [...root.querySelectorAll('.description')].map(
      (node) => {
        const noteNode = node.querySelector('div')
        const note = noteNode?.textContent?.replace(/^\d+./, '').replaceAll('&#39;', '\'').replaceAll('&quot;', '\"')
        noteNode?.remove()
        const explain = node.textContent?.replace(/^\d+./, '').replaceAll('&#39;', '\'').replaceAll('&quot;', '\"')
        return {
          explain,
          note,
        }
      },
    )

    const audioUrls = root.querySelector('.vocabulary-audio')
      ?.getAttribute('data-audio')?.split(',')
      .map(url => 'https://jpdb.io/static/v/' + url)

    const altSpellings = [...root.querySelectorAll('.alt-spelling')].map((node) => {
      const spelling = node.querySelectorAll('ruby').map(n => n.outerHTML).join('')
      return {
        spelling,
        percent: node.querySelector('.property-text')?.textContent,
      }
    })

    return {
      definitions: [{
        spelling: word,
        reading: reading ?? '',
        frequency,
        meanings,
        audioUrls,
        altSpellings,
      }],
    } as DictionaryEntry
  // kanji
  } else {
    const root = doc.querySelector('.kanji')
    if (!root) return null
    const readingListNode = root.querySelector('.kanji-reading-list-common')
    const reading = readingListNode?.querySelector('a')?.textContent
    const frequency = [...root.querySelector('.subsection')?.querySelectorAll('td') ?? []].find(t => t.textContent?.startsWith('Top'))?.textContent
    const meanings = [{
      explain: root.querySelector('.subsection')?.textContent,
    }]
    const altReadings = readingListNode?.children.map((node) => {
      return {
        reading: node.querySelector('a')?.textContent,
        percent: node.querySelector('div')?.textContent?.replace(/\(|\)/g, ''),
      }
    })

    return {
      definitions: [{
        spelling: word,
        reading: reading ?? '',
        frequency,
        meanings,
        altReadings,
      }],
    } as DictionaryEntry
  }
}

const JpdbDict: Dictionary = {
  lookup: cacheable(abortable(_fetchJPDB)),
  getWebLink: (word: string) => `https://jpdb.io/search?q=${encodeURIComponent(word)}`,
  getIcon: () => chrome.runtime.getURL('jpdb.png'),
}

export { JpdbDict }
