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
  private highlightContainerMap = new WeakMap<Node, Map<ColorKey, Set<Range>>>()
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
            this.highlight(node)
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

  scheduleHighlight(node: Node) {
    const textNodes = getTextNodes(node)
    for (const node of textNodes) {
      this.addToIntersectionObserver(node)
    }
  }

  async highlight(node: Node) {
    // Optimization: Check if the complex path is needed.
    // If no ruby tags are present, use a simpler, faster path.
    const isElement = node.nodeType === Node.ELEMENT_NODE
    const hasRuby = isElement && (node as Element).querySelector('ruby')

    if (hasRuby) {
      await this.highlightComplex(node)
    } else {
      await this.highlightSimple(node)
    }
  }

  private async highlightSimple(container: Node) {
    const textNodes = getTextNodes(container)
    const containersToObserve = new Set<Node>()

    for (const node of textNodes) {
      const text = node.nodeValue || ''
      if (!text.trim()) continue
      if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]+/u.test(text)) continue

      const segments = await this.segmentFn(text)

      const pNode = node.parentElement
      if (!pNode) continue

      for (const segment of segments) {
        if (segment.isWordLike) {
          const range = new Range()
          range.setStart(node, segment.startIndex)
          range.setEnd(node, segment.endIndex)

          const baseFrom = segment.baseForm
          const colorKey = this.getColorKey(baseFrom)

          this.wordToBaseFormMap.set(segment.surfaceForm, segment.baseForm)
          this.cacheNodeRanges(pNode, colorKey, range)
        }
      }
      containersToObserve.add(pNode)
    }

    for (const container of containersToObserve) {
      this.paintIntersectionObserver.observe(container as Element)
    }
  }

  private async highlightComplex(node: Node) {
    const textNodes = getTextNodes(node)
    if (textNodes.length === 0) {
      return
    }

    const textContent = textNodes.map(n => n.nodeValue ?? '').join('')
    if (!textContent.trim()) return
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]+/u.test(textContent)) return

    let textOffset = 0
    const nodeOffsets = textNodes.map((node) => {
      const start = textOffset
      textOffset += node.length
      return { node, start, end: textOffset }
    })

    const findNodeForCharIndex = (index: number) => {
      if (index === textContent.length) {
        const lastNodeInfo = nodeOffsets[nodeOffsets.length - 1]
        return {
          node: lastNodeInfo.node,
          localOffset: lastNodeInfo.node.length,
        }
      }
      const nodeInfo = nodeOffsets.find(info => index >= info.start && index < info.end)
      if (!nodeInfo) return null

      return {
        node: nodeInfo.node,
        localOffset: index - nodeInfo.start,
      }
    }

    const sentences: string[] = textContent.match(/[^.!?。]+[.!?。]?/g) || []
    if (sentences.length === 0 && textContent.length > 0) {
      sentences.push(textContent)
    }

    let sentenceStartOffset = 0
    const containersToObserve = new Set<Node>()

    for (const sentence of sentences) {
      const segments = await this.segmentFn(sentence)

      for (const segment of segments) {
        if (segment.isWordLike) {
          const globalStartIndex = sentenceStartOffset + segment.startIndex
          const globalEndIndex = sentenceStartOffset + segment.endIndex

          const startPos = findNodeForCharIndex(globalStartIndex)
          const endPos = findNodeForCharIndex(globalEndIndex)

          if (!startPos || !endPos) continue

          const range = new Range()
          range.setStart(startPos.node, startPos.localOffset)
          range.setEnd(endPos.node, endPos.localOffset)

          const baseFrom = segment.baseForm
          const colorKey = this.getColorKey(baseFrom)

          this.wordToBaseFormMap.set(segment.surfaceForm, segment.baseForm)

          const pNode = range.commonAncestorContainer
          const container = pNode.nodeType === Node.ELEMENT_NODE ? pNode : pNode.parentElement

          if (container) {
            this.cacheNodeRanges(container, colorKey, range)
            containersToObserve.add(container)
          }
        }
      }

      sentenceStartOffset += sentence.length
    }

    for (const container of containersToObserve) {
      this.paintIntersectionObserver.observe(container as Element)
    }
  }

  addToIntersectionObserver(node: CharacterData) {
    if (node.parentElement) {
      this.segmentIntersectionObserver.observe(node.parentElement)
    }
  }

  cacheNodeRanges(node: Node, colorKey: ColorKey, range: Range) {
    let rangesMap = this.highlightContainerMap.get(node) ?? new Map<ColorKey, Set<Range>>()
    this.highlightContainerMap.set(node, rangesMap)
    const rangeSet = rangesMap.get(colorKey) ?? new Set()
    rangeSet.add(range)
    rangesMap.set(colorKey, rangeSet)
  }

  paintNodeRanges(node: Node) {
    const rangesMap = this.highlightContainerMap.get(node) ?? new Map<ColorKey, Set<Range>>()
    for (const [colorKey, rangeSet] of rangesMap) {
      for (const range of rangeSet) {
        this.highlights.get(colorKey)?.add(range)
      }
    }
  }

  clearNodeRanges(node: Node, detach = false) {
    const rangesMap = this.highlightContainerMap.get(node) ?? new Map<ColorKey, Set<Range>>()
    for (const [colorKey, rangeSet] of rangesMap) {
      for (const range of rangeSet) {
        this.highlights.get(colorKey)?.delete(range)
        detach && this.detachRange(range)
      }
    }
  }

  detachRange(range: Range) {
    this.wordToBaseFormMap.delete(range.toString())
    range.detach()
  }

  getBaseFormByRange(range: Range) {
    return this.wordToBaseFormMap.get(range.toString())
  }

  getRangeAtPoint(e: MouseEvent) {
    const element = e.target as HTMLElement
    const nodeRangeMap = this.highlightContainerMap.get(element) ?? new Map()
    const rangeSets = [...nodeRangeMap.values()].flat()
    const ranges = rangeSets.flatMap(set => Array.from(set)) as Range[]

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

  observeDomChange() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          if (mutation.target.nodeType === Node.TEXT_NODE) {
            if (isTextNodeValid(mutation.target as Text)) {
              this.addToIntersectionObserver(mutation.target as Text)
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
                this.addToIntersectionObserver(node as Text)
              }
            } else {
              if (
                (node as HTMLElement).isContentEditable
                || node.parentElement?.isContentEditable
              ) {
                return false
              }
              this.scheduleHighlight(node)
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

  listenBackgroundMessage() {
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

  getWordStatus(spelling: string) {
    return this.markedWords.get(spelling)?.status ?? 'UnSeen'
  }

  getColorKey(spelling: string) {
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

  async markWord(spelling: string, status: WordStatus, range: Range | null) {
    const existingWord = this.markedWords.get(spelling) ?? {}
    this.markedWords.set(spelling, { ...existingWord, status, spelling })
    this.notify()
    const sentence = range ? getSentenceFromRange(range) : undefined
    await sendMessage(Messages.mark_word, { spelling, status, sentence }, 'background')
  }

  handleMarkWordResponse(spelling: string, newStatus: WordStatus) {
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
    !invalidTags.includes(walker.currentNode.parentElement?.tagName ?? '') && textNodes.push(walker.currentNode as Text)
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
  highlighter.scheduleHighlight(document.body)
  highlighter.observeDomChange()
  highlighter.listenBackgroundMessage()
  return highlighter
}

export { Highlighter, initHighlighter }
