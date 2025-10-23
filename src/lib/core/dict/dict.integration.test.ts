import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JpdbDict } from './impls/jpdbDict'

function createMockResponse(html: string) {
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

describe('JpdbDict Integration Test', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should correctly parse a non-Kanji vocabulary entry', async () => {
    const mockHtml = `
      <div class="result vocabulary">
        <div class="primary-spelling"><ruby>送<rt>おく</rt>る</ruby></div>
        <div class="part-of-speech">v5r (godan)</div>
        <div class="description">1. to send (a thing); to dispatch; to despatch</div>
        <a class="view-conjugations-link" href="/conjugate?q=%E9%80%81%E3%82%8B"></a>
        <div class="vocabulary-audio" data-audio="m1/bd13ad0f5a3d,f1/6c77df2442e0"></div>
      </div>
    `
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(mockHtml))

    const result = await JpdbDict.lookup('送る')

    expect(fetch).toHaveBeenCalledWith('https://jpdb.io/search?q=%E9%80%81%E3%82%8B', expect.any(Object))

    expect(result).not.toBeNull()
    expect(result?.definitions).toHaveLength(1)

    const def = result!.definitions[0]
    expect(def.spelling?.replace(/\s/g, '')).toBe('送る')
    expect(def.reading).toBe('おく')
    expect(def.pos).toBe('v5r (godan)')
    expect(def.meanings[0].explain).toContain('to send')
    expect(def.audioUrls).toEqual(['https://jpdb.io/static/v/m1/bd13ad0f5a3d', 'https://jpdb.io/static/v/f1/6c77df2442e0'])
    expect(def.conjugation?.link).toBe('https://jpdb.io/conjugate?q=%E9%80%81%E3%82%8B')
  })

  it('should correctly parse a Kanji entry', async () => {
    const mockHtml = `
      <div class="result kanji">
        <div class="kanji-reading-list-common">
          <a href="/kanji/1098/%E9%80%81#987">おく</a>
        </div>
        <div class="subsection">
          <table><tr><td>Top 1000</td></tr></table>
          1. send
        </div>
      </div>
    `
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createMockResponse(mockHtml))

    const result = await JpdbDict.lookup('送')

    expect(fetch).toHaveBeenCalledOnce()
    expect(result).not.toBeNull()
    expect(result?.definitions).toHaveLength(1)

    const def = result!.definitions[0]
    expect(def.spelling).toBe('送')
    expect(def.reading).toBe('おく')
    expect(def.frequency).toContain('Top 1000')
    expect(def.meanings[0].explain).toContain('send')
  })

  it('should return null if the fetch request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network Error'))

    const result = await JpdbDict.lookup('単語')

    expect(result).toBeNull()
  })
})
