import type { SegmentedToken, Segmenter } from '../interface'
import __wbg_init, { Tokenizer, TokenizerBuilder } from 'lindera-wasm-ipadic'

type LinderaToken = {
  baseForm: string
  byteEnd: number
  byteStart: number
  conjugationForm: string
  conjugationType: string
  partOfSpeech: string
  partOfSpeechSubcategory1: string
  partOfSpeechSubcategory2: string
  partOfSpeechSubcategory3: string
  pronunciation: string
  reading: string
  surface: string
  wordId: number
}

// https://github.com/lindera/lindera
class LinderaSegmenter implements Segmenter {
  private tokenizer: Tokenizer | null = null
  isReady = false

  async init() {
    await __wbg_init()
    this.isReady = true
    const builder = new TokenizerBuilder()
    builder.setDictionary('embedded://ipadic')
    // Set the tokenizer mode to "normal"
    // You can also use "decompose" for decomposing the compound words into their components
    builder.setMode('normal')
    this.tokenizer = builder.build()
  }

  segment(input: string): SegmentedToken[] {
    if (!this.tokenizer) {
      throw new Error('LinderaSegmenter is not initialized. Please call init() before segment().')
    }

    const tokens = this.tokenizer.tokenize(input) as LinderaToken[]
    const filteredTokens = tokens.filter(t => !!t.baseForm && t.partOfSpeech !== '記号')

    const segmentTokens = filteredTokens.map(token => ({
      surfaceForm: token.surface || '',
      baseForm: token.baseForm || '',
      startIndex: byteIndexToCharIndex(input, token.byteStart),
      endIndex: byteIndexToCharIndex(input, token.byteEnd),
      reading: token.reading || '',
      isWordLike: true,
    }))

    return segmentTokens
  }
}

function byteIndexToCharIndex(str: string, byteIndex: number): number {
  if (byteIndex < 0) {
    return -1
  }
  if (byteIndex === 0) {
    return 0
  }

  let byteCount = 0
  let charIndex = 0

  for (let i = 0; i < str.length; i++) {
    const codePoint = str.codePointAt(i)!

    let byteLength: number

    if (codePoint <= 0x7f) {
      byteLength = 1
    } else if (codePoint <= 0x7ff) {
      byteLength = 2
    } else if (codePoint <= 0xffff) {
      byteLength = 3
    } else {
      byteLength = 4
      i++
    }

    byteCount += byteLength

    if (byteCount > byteIndex) {
      return charIndex
    } else if (byteCount === byteIndex) {
      return charIndex + 1
    }

    charIndex++
  }

  return charIndex
}

export { LinderaSegmenter }
