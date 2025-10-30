import { describe, it, expect, beforeEach } from 'vitest'
import { getSentenceFromRange } from './dom'

describe('getSentenceFromRange', () => {
  let host: HTMLElement

  // Helper to set up a complex DOM and find a specific text node
  const setupDOM = (html: string) => {
    host.innerHTML = html
    const findTextNode = (text: string): Node | undefined => {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
      let node
      while (node = walker.nextNode()) {
        if (node.nodeValue?.includes(text)) {
          return node
        }
      }
      return undefined
    }
    return { findTextNode }
  }

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  it('should extract a simple sentence from a single text node', () => {
    const { findTextNode } = setupDOM('<p>これは最初の文です。これは二番目の文です。</p>')
    const textNode = findTextNode('最初の文')!

    const range = document.createRange()
    range.setStart(textNode, 3) // Select '最'
    range.setEnd(textNode, 4)

    const sentence = getSentenceFromRange(range)
    expect(sentence).toBe('これは最初の文です。')
  })

  it('should extract a sentence that spans across multiple inline elements', () => {
    const { findTextNode } = setupDOM('<p>これは<b><i>二番目の</i>文</b>です！三番目。</p>')
    const textNode = findTextNode('二番目の')! // This node is inside <i> and <b>

    const range = document.createRange()
    range.setStart(textNode, 1) // Select '番'
    range.setEnd(textNode, 2)

    const sentence = getSentenceFromRange(range)
    expect(sentence).toBe('これは二番目の文です！')
  })

  it('should truncate a long sentence based on maxLength (default 40)', () => {
    const longStr = 'この非常に長い文は、現在のシステムの最大長を大幅に超過しているため、最終的には不可避的に切り捨てられるべきであると考えられます。'
    const { findTextNode } = setupDOM(`<p>${longStr}</p>`)
    const textNode = findTextNode('最大長')!
    const rangeStart = textNode.nodeValue!.indexOf('最大長')

    const range = document.createRange()
    range.setStart(textNode, rangeStart)
    range.setEnd(textNode, rangeStart + 3)

    const sentence = getSentenceFromRange(range)

    // Expect truncation with ellipses
    expect(sentence).toContain('...')
    expect(sentence?.length).toBeLessThanOrEqual(40 + 6) // account for ellipses
    expect(sentence).toContain('最大長')
  })

  it('should extract a sentence from a different block element (span)', () => {
    const { findTextNode } = setupDOM('<div><p>最初の段落。</p><span>これがスパン内の文です？</span></div>')
    const textNode = findTextNode('スパン内')!

    const range = document.createRange()
    range.setStart(textNode, 3)
    range.setEnd(textNode, 4)

    const sentence = getSentenceFromRange(range)
    expect(sentence).toBe('これがスパン内の文です？')
  })

  it('should return the whole block content if no terminator is found', () => {
    const { findTextNode } = setupDOM('<p>終了記号のないテキストブロック</p>')
    const textNode = findTextNode('テキスト')!

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 1)

    const sentence = getSentenceFromRange(range)
    expect(sentence).toBe('終了記号のないテキストブロック')
  })

  it('should handle mixed English and Japanese punctuation correctly', () => {
    const { findTextNode } = setupDOM('<p>This is a test.これはテストです。</p>')
    const textNode = findTextNode('This is a test')!

    const range = document.createRange()
    range.setStart(textNode, 5) // Select 'is'
    range.setEnd(textNode, 7)

    const sentence = getSentenceFromRange(range)
    expect(sentence).toBe('This is a test.')
  })
})
