import type { SegmentedToken, Segmenter } from '../interface'

class BrowserSegmenter implements Segmenter {
  private tokenizer: Intl.Segmenter | null = null
  isReady = false

  async init() {
    this.tokenizer = new Intl.Segmenter('ja-JP', { granularity: 'word' })
    this.isReady = true
  }

  isWordLike(segment: Intl.SegmentData): boolean {
    // Only keep segments that are Hiragana or Katakana or Kanji
    return !!segment.isWordLike
      && segment.segment.trim().length > 0
      && /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]+/u.test(segment.segment)
  }

  segment(input: string): SegmentedToken[] {
    if (!this.tokenizer) {
      throw new Error('Segmenter is not initialized. Please call init() before segment().')
    }

    const tokens = this.tokenizer.segment(input)
    const filteredTokens = [...tokens].filter(t => this.isWordLike(t))

    const segmentTokens = filteredTokens.map(token => ({
      surfaceForm: token.segment || '',
      baseForm: token.segment || '',
      startIndex: token.index,
      endIndex: token.index + token.segment.length,
      reading: '',
      isWordLike: true,
    }))

    return segmentTokens
  }
}
export { BrowserSegmenter }
