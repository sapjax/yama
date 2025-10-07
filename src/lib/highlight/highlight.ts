import { invalidTags } from './constant'
import { type WordStatus, type MarkedWordsMap } from '@/lib/core/mark/type'
import { SegmentedToken } from '@/lib/core/segment/interface'
import { Messages } from '@/lib/message'
import { getSentenceFromRange } from '@/lib/utils'
import { sendMessage } from 'webext-bridge/content-script'
import { createCSSHighlights, type ColorKey } from './colors'

class Highlighter {
  private segmentFn: (input: string) => Promise<SegmentedToken[]>
  private markedWords: MarkedWordsMap = new Map()
  private highlights = new Map<ColorKey, Highlight>()
  private wordToBaseFormMap = new Map<string, string>()
  private highlightContainerMap = new WeakMap<Node, Set<Range>>()
  private listeners = new Set<() => void>()

  private segmentIntersectionObserver: IntersectionObserver
  private paintIntersectionObserver: IntersectionObserver

  constructor(
    segmentFn: (input: string) => Promise<SegmentedToken[]>,
    markedWords: MarkedWordsMap,
  ) {
    this.segmentFn = segmentFn
    this.markedWords = markedWords
    this.highlights = createCSSHighlights()
    this.segmentIntersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const node = entry.target
            this.highlightNode(node)
            this.segmentIntersectionObserver.unobserve(node)
          }
        }
      },
    )
    this.paintIntersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const node = entry.target
          if (entry.isIntersecting) {
            this.paintNodeRanges(node)
          } else {
            this.clearNodeRanges(node)
          }
        }
      },
    )
  }

  subscribe(callback: () => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notify() {
    for (const listener of this.listeners) {
      listener()
    }
  }

  public scheduleNodeHighlight(node: Node) {
    const textNodes = getTextNodes(node)
    for (const textNode of textNodes) {
      this.addToSegmentIntersectionObserver(textNode)
    }
  }

  private addToSegmentIntersectionObserver(node: CharacterData) {
    if (node.parentElement) {
      // if ruby tag, expand to ruby's parent element
      if (node.parentElement.tagName === 'RUBY' && node.parentElement.parentElement) {
        this.segmentIntersectionObserver.observe(node.parentElement.parentElement)
      } else {
        this.segmentIntersectionObserver.observe(node.parentElement)
      }
    }
  }

  private async highlightNode(node: Element) {
    const promises = []

    const hasRuby = !![...node.children].find(child => child.tagName === 'RUBY')
    if (hasRuby) {
      promises.push(this.highlightRubyParentNode(node))
    } else {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          promises.push(this.highlightTextNode(child as CharacterData))
        }
      }
    }
    await Promise.allSettled(promises)
    this.paintIntersectionObserver.observe(node)
  }

  private async highlightTextNode(node: CharacterData) {
    const text = node.nodeValue || ''
    if (!text.trim()) return
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]+/u.test(text)) return

    const segments = await this.segmentFn(text)

    const pNode = node.parentElement
    if (!pNode) return

    for (const segment of segments) {
      if (segment.isWordLike) {
        const range = new Range()
        range.setStart(node, segment.startIndex)
        range.setEnd(node, segment.endIndex)

        this.wordToBaseFormMap.set(range.toString(), segment.baseForm)
        this.cacheNodeRanges(pNode, range)
      }
    }
  }

  /**
   *  example:
   *    <ruby>迷<rt>めい</rt> 惑<rt>わく</rt></ruby>
   *      which is segmented as [迷惑]
   *    or
   *    <ruby>向<rt class="kanji">む</rt></ruby>こうに
   *      which is segmented as [向こう, に]
   *
   *  These situation is a little bit of tricky, draw as:
   *    text nodes: ======  ====== =========== ==== ====
   *    segments:   ########## ###   #####   ######
   *
   */
  private async highlightRubyParentNode(node: Element) {
    let textNodes = getTextNodes(node)
    if (textNodes.length === 0) {
      return
    }
    const textContent = textNodes.map(n => n.nodeValue?.trim() ?? '').join('')
    if (!textContent.trim()) return
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]+/u.test(textContent)) return

    // same as trim
    const isWhitespace = (char: string) => {
      return /[\s\uFEFF\xA0]/.test(char)
    }

    let globalConsumedIndex = 0

    const findNodeForCharIndex = (segment: SegmentedToken) => {
      let matchedText = ''
      let startNode = null
      let endNode = null
      let startPos = -1
      let endPos = -1
      let localConsumedIndex = 0

      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i]
        const nodeText = node.nodeValue ?? ''
        for (let j = 0; j < nodeText.length; j++) {
          localConsumedIndex++
          if (localConsumedIndex < globalConsumedIndex) {
            continue
          }

          const char = nodeText[j]
          if (isWhitespace(char)) {
            continue
          }

          if (matchedText) {
            // mismatch, reset the matched state
            const textToMatch = matchedText + char
            if (!segment.surfaceForm.startsWith(textToMatch)) {
              matchedText = ''
              startNode = null
              startPos = -1
              continue
            } else {
              matchedText = textToMatch
            }
          } else {
            // matched the first char
            if (char === segment.surfaceForm[0]) {
              matchedText = char
              startNode = node
              startPos = j
            }
          }

          if (matchedText === segment.surfaceForm) {
            endNode = node
            endPos = j + 1 // + 1 to include the end char
            globalConsumedIndex = localConsumedIndex
            return { startNode, startPos, endNode, endPos }
          }
        }
      }
      return { startNode, startPos, endNode, endPos }
    }

    const segments = await this.segmentFn(textContent)

    for (const segment of segments) {
      if (segment.isWordLike) {
        const { startNode, startPos, endNode, endPos } = findNodeForCharIndex(segment)
        if (!startNode || startPos < 0 || !endNode || endPos < 0) {
          continue
        }

        const range = new Range()
        range.setStart(startNode, startPos)
        range.setEnd(endNode, endPos)

        this.wordToBaseFormMap.set(range.toString(), segment.baseForm)
        this.cacheNodeRanges(node, range)
      }
    }
  }

  private cacheNodeRanges(node: Node, range: Range) {
    let rangesSet = this.highlightContainerMap.get(node) ?? new Set<Range>()
    this.highlightContainerMap.set(node, rangesSet)
    rangesSet.add(range)
  }

  private paintNodeRanges(node: Node) {
    let rangesSet = this.highlightContainerMap.get(node) ?? new Set<Range>()
    for (const range of rangesSet) {
      const colorKey = this.getColorKey(this.getBaseFormByRange(range) ?? '')
      this.highlights.get(colorKey)?.add(range)
    }
  }

  private clearNodeRanges(node: Node, detach = false) {
    let rangesSet = this.highlightContainerMap.get(node) ?? new Set<Range>()
    for (const range of rangesSet) {
      const colorKey = this.getColorKey(this.getBaseFormByRange(range) ?? '')
      this.highlights.get(colorKey)?.delete(range)
      detach && this.detachRange(range)
    }
  }

  private detachRange(range: Range) {
    this.wordToBaseFormMap.delete(range.toString())
    range.detach()
  }

  public getBaseFormByRange(range: Range) {
    return this.wordToBaseFormMap.get(range.toString())
  }

  public getRangeAtPoint(e: MouseEvent) {
    let element = e.target as HTMLElement
    if (element.tagName === 'RT') {
      element = element.parentElement as HTMLElement
    }

    const rangeSet = this.highlightContainerMap.get(element)
      ?? this.highlightContainerMap.get(element.parentElement ?? document.body)
      ?? new Set()

    const ranges = [...rangeSet]

    for (const range of ranges) {
      const rect = range.getBoundingClientRect()
      if (
        rect && rect.left <= e.clientX && rect.right >= e.clientX && rect.top <= e.clientY && rect.bottom >= e.clientY
      ) {
        const rects = range.getClientRects()
        if (rects.length === 1) {
          return range
        } else {
          for (const r of rects) {
            if (r.left <= e.clientX && r.right >= e.clientX && r.top <= e.clientY && r.bottom >= e.clientY) {
              return range
            }
          }
        }
      }
    }
  }

  public observeDomChange() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          if (mutation.target.nodeType === Node.TEXT_NODE) {
            if (isTextNodeValid(mutation.target as Text)) {
              this.addToSegmentIntersectionObserver(mutation.target as Text)
            }
          }
        }
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (!node.isConnected || !node.parentNode?.isConnected) {
              return false
            }
            if (node.nodeType === Node.TEXT_NODE) {
              if (isTextNodeValid(node as Text) && node.nodeValue) {
                this.addToSegmentIntersectionObserver(node as Text)
              }
            } else {
              if (
                (node as HTMLElement).isContentEditable
                || node.parentElement?.isContentEditable
              ) {
                return false
              }
              this.scheduleNodeHighlight(node)
            }
          })

          // when remove node, remove highlight range
          if (mutation.removedNodes.length > 0) {
            let oldRoot: HTMLElement
            mutation.removedNodes.forEach((node) => {
              if (node.nodeName === 'YAMA-ROOT') {
                oldRoot = node as HTMLElement
              }
              if (this.highlightContainerMap.has(node)) {
                this.clearNodeRanges(node)
                this.highlightContainerMap.delete(node)
              }
            })

            // for some sites like calibre reader server
            // it uses `document.body.innerHTML` when page changes between book thumb and book contents
            // which will cause word-hunter card node removed
            // we need to clone the removed root node and append to body, to make card work again
            if (oldRoot!) {
              const root = oldRoot.cloneNode(true)
              oldRoot.remove()
              document.body.appendChild(root)
            }
          }
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: false,
      attributes: false,
    })
  }

  public listenBackgroundMessage() {
    chrome.runtime.onMessage.addListener((msg) => {
      const { action } = msg
      switch (action) {
        case Messages.mark_word: {
          this.handleMarkWordResponse(msg.spelling, msg.status)
          break
        }
        default:
          break
      }
    })
  }

  public getWordStatus(spelling: string) {
    return this.markedWords.get(spelling)?.status ?? 'UnSeen'
  }

  public getColorKey(spelling: string) {
    const word = this.markedWords.get(spelling)
    if (!word) {
      return 'UnSeen'
    }
    if (word.status === 'Tracking') {
      if (word.review === 'known') {
        return 'known'
      }
      if (word.review === 'failed') {
        return 'failed'
      }
    }
    return this.getWordStatus(spelling)
  }

  public async markWord(spelling: string, status: WordStatus, range: Range | null) {
    const existingWord = this.markedWords.get(spelling) ?? {}
    this.markedWords.set(spelling, { ...existingWord, status, spelling })
    this.notify()
    const sentence = range ? getSentenceFromRange(range) : undefined
    await sendMessage(Messages.mark_word, { spelling, status, sentence }, 'background')
  }

  private handleMarkWordResponse(spelling: string, newStatus: WordStatus) {
    const existingWord = this.markedWords.get(spelling) ?? {}
    this.markedWords.set(spelling, { ...existingWord, status: newStatus, spelling })
    const newColorKey = this.getColorKey(spelling)

    this.highlights.forEach((hl, colorKey) => {
      if (newColorKey !== colorKey) {
        hl.forEach((range) => {
          if (spelling === this.getBaseFormByRange(range as Range)) {
            this.highlights.get(newColorKey)?.add(range)
            hl.delete(range)
          }
        })
      }
    })
    this.notify()
  }
}

function getTextNodes(node: Node): Text[] {
  const textNodes = []
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    if (!invalidTags.includes(walker.currentNode.parentElement?.tagName ?? '')) {
      textNodes.push(walker.currentNode as Text)
    }
  }
  return textNodes
}

function isTextNodeValid(textNode: Text) {
  return !invalidTags.includes(textNode.parentNode?.nodeName?.toUpperCase() ?? '')
}

async function initHighlighter() {
  const segmentFn = async (input: string) => {
    const segmentTokens = await sendMessage(Messages.segment, { text: input }, 'background')
    return segmentTokens
  }
  const markedWords = await sendMessage(Messages.get_marked_words, {}, 'background')
  const highlighter = new Highlighter(segmentFn, new Map(Object.entries(markedWords)))
  highlighter.scheduleNodeHighlight(document.body)
  highlighter.observeDomChange()
  highlighter.listenBackgroundMessage()
  return highlighter
}

export { Highlighter, initHighlighter }
