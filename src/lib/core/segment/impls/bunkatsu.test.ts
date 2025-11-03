import { describe, it, expect } from 'vitest'
import { mergeTokens, type UnmergedToken } from './bunkatsu'

/**
 * Helper function to create mock tokens for tests.
 * Simulates the output of a tokenizer like kuromojin.
 */
const createToken = (
  surfaceForm: string,
  pos: string,
  posSub1 = '*' as string,
  baseForm?: string,
): UnmergedToken => ({
  surfaceForm,
  baseForm: baseForm ?? surfaceForm,
  pos,
  posSub1,
  startIndex: 0,
  endIndex: 0,
  reading: '',
  isWordLike: true,
})

describe('bunkatsu mergeTokens', () => {
  it('should not merge independent words like noun and particle', () => {
    const tokens: UnmergedToken[] = [
      createToken('私', '名詞', '代名詞'),
      createToken('は', '助詞', '係助詞'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(2)
    expect(result[0].surfaceForm).toBe('私')
    expect(result[1].surfaceForm).toBe('は')
  })

  it('should merge polite verb forms (食べます)', () => {
    const tokens: UnmergedToken[] = [
      createToken('食べ', '動詞', '自立', '食べる'),
      createToken('ます', '助動詞', '*', 'ます'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('食べます')
    expect(result[0].baseForm).toBe('食べる')
  })

  it('should merge progressive forms (見ている)', () => {
    const tokens: UnmergedToken[] = [
      createToken('見', '動詞', '自立', '見る'),
      createToken('て', '助詞', '接続助詞'),
      createToken('いる', '動詞', '非自立', 'いる'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('見ている')
    expect(result[0].baseForm).toBe('見る')
  })

  it('should merge causative/passive forms (食べられる)', () => {
    const tokens: UnmergedToken[] = [
      createToken('食べ', '動詞', '自立', '食べる'),
      createToken('られる', '助動詞', '*', 'られる'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('食べられる')
    expect(result[0].baseForm).toBe('食べる')
  })

  it('should merge desiderative forms (食べたい)', () => {
    const tokens: UnmergedToken[] = [
      createToken('食べ', '動詞', '自立', '食べる'),
      createToken('たい', '助動詞', '*', 'たい'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('食べたい')
    expect(result[0].baseForm).toBe('食べる')
  })

  it('should merge na-adjectives with copula (静かだ)', () => {
    const tokens: UnmergedToken[] = [
      createToken('静か', '形容動詞', 'タリ', '静かだ'),
      createToken('だ', '助動詞', '*', 'だ'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('静かだ')
    expect(result[0].baseForm).toBe('静かだ')
  })

  it('should merge na-adjectives with negative copula (静かじゃない)', () => {
    const tokens: UnmergedToken[] = [
      createToken('静か', '形容動詞', 'タリ', '静かだ'),
      createToken('じゃ', '助動詞', '*', 'だ'),
      createToken('ない', '助動詞', '*', 'ない'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('静かじゃない')
    expect(result[0].baseForm).toBe('静かだ')
  })

  it('should merge compound verbs (走り出す)', () => {
    const tokens: UnmergedToken[] = [
      createToken('走り', '動詞', '自立', '走る'),
      createToken('出す', '動詞', '非自立', '出す'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('走り出す')
    expect(result[0].baseForm).toBe('走る出す') // As per current logic
  })

  it('should merge numbers with counters (100円)', () => {
    const tokens: UnmergedToken[] = [
      createToken('100', '名詞', '数詞'),
      createToken('円', '名詞', '接尾'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('100円')
    expect(result[0].baseForm).toBe('100円')
  })

  it('should merge fixed idioms (気になる)', () => {
    const tokens: UnmergedToken[] = [
      createToken('気', '名詞', '一般', '気'),
      createToken('に', '助詞', '格助詞', 'に'),
      createToken('なる', '動詞', '自立', 'なる'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('気になる')
  })

  it('should merge katakana word with long vowel mark (サーバー)', () => {
    const tokens: UnmergedToken[] = [
      createToken('サーバ', '名詞', '一般'),
      createToken('ー', '記号', '一般'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('サーバー')
  })

  it('should merge noun with suffix (一日中)', () => {
    const tokens: UnmergedToken[] = [
      createToken('一日', '名詞', '数詞'),
      createToken('中', '名詞', '接尾'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('一日中')
  })

  it('should merge prefix with noun (再開)', () => {
    const tokens: UnmergedToken[] = [
      createToken('再', '接頭詞', '名詞接続'),
      createToken('開', '名詞', 'サ変接続'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('再開')
  })

  it('should merge sentence-ending combos (最高じゃん)', () => {
    const tokens: UnmergedToken[] = [
      createToken('最高', '名詞', '一般', '最高'),
      createToken('じゃん', '助詞', '終助詞', 'じゃん'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('最高じゃん')
  })

  it('should merge laugh filler (www)', () => {
    const tokens: UnmergedToken[] = [
      createToken('w', '記号', '一般', 'w'),
      createToken('w', '記号', '一般', 'w'),
      createToken('w', '記号', '一般', 'w'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('www')
  })

  it('should merge katakana-suru verbs (キャンセルする)', () => {
    const tokens: UnmergedToken[] = [
      createToken('キャンセル', '名詞', 'サ変接続', 'キャンセル'),
      createToken('する', '動詞', '自立', 'する'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('キャンセルする')
  })

  it('should merge explanatory endings (行くんだ)', () => {
    const tokens: UnmergedToken[] = [
      createToken('行く', '動詞', '自立', '行く'),
      createToken('んだ', '助動詞', '*', 'んだ'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('行くんだ')
  })

  it('should merge polite volitional form (食べましょう)', () => {
    const tokens: UnmergedToken[] = [
      createToken('食べましょ', '助動詞', '*', 'ます'),
      createToken('う', '助動詞', '*', 'う'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('食べましょう')
  })

  it('should merge auxiliary verb patterns (食べやすい)', () => {
    const tokens: UnmergedToken[] = [
      createToken('食べ', '動詞', '自立', '食べる'),
      createToken('やすい', '形容詞', '接尾', 'やすい'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('食べやすい')
    expect(result[0].baseForm).toBe('食べる')
  })

  it('should merge progressive contraction with past tense (見てた)', () => {
    const tokens: UnmergedToken[] = [
      createToken('見', '動詞', '自立', '見る'),
      createToken('て', '助詞', '接続助詞', 'て'),
      createToken('た', '助動詞', '*', 'た'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('見てた')
    expect(result[0].baseForm).toBe('見る')
  })

  it('should merge adjective nominalisers (高さ)', () => {
    const tokens: UnmergedToken[] = [
      createToken('高', '形容詞', '自立', '高い'),
      createToken('さ', '名詞', '接尾', 'さ'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('高さ')
  })

  it('should merge honorifics (田中さん)', () => {
    const tokens: UnmergedToken[] = [
      createToken('田中', '名詞', '固有名詞', '田中'),
      createToken('さん', '名詞', '接尾', 'さん'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('田中さん')
  })

  it('should merge explanatory endings like っぽい (子供っぽい)', () => {
    const tokens: UnmergedToken[] = [
      createToken('子供', '名詞', '一般', '子供'),
      createToken('っぽい', '助詞', '接尾', 'っぽい'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('子供っぽい')
  })

  it('should merge sokuonbin (促音便) forms (思って)', () => {
    const tokens: UnmergedToken[] = [
      createToken('思っ', '動詞', '自立', '思う'),
      createToken('て', '助詞', '接続助詞', 'て'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('思って')
    expect(result[0].baseForm).toBe('思う')
  })

  it('should merge progressive contraction ちゃう (食べちゃう)', () => {
    const tokens: UnmergedToken[] = [
      createToken('食べ', '動詞', '自立', '食べる'),
      createToken('ちゃう', '助動詞', '*', 'ちゃう'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('食べちゃう')
    expect(result[0].baseForm).toBe('食べる')
  })

  it('should merge te-form requests (見てください)', () => {
    const tokens: UnmergedToken[] = [
      createToken('見', '動詞', '自立', '見る'),
      createToken('て', '助詞', '接続助詞', 'て'),
      createToken('ください', '動詞', '非自立', 'ください'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('見てください')
    expect(result[0].baseForm).toBe('見る')
  })

  it('should merge general noun suffixes (小説家)', () => {
    const tokens: UnmergedToken[] = [
      createToken('小説', '名詞', '一般', '小説'),
      createToken('家', '名詞', '接尾', '家'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('小説家')
  })

  it('should merge honorific prefixes (ご飯)', () => {
    const tokens: UnmergedToken[] = [
      createToken('ご', '接頭詞', '名詞接続', 'ご'),
      createToken('飯', '名詞', '一般', '飯'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('ご飯')
  })

  it('should merge noun + na but preserve noun baseform', () => {
    const tokens: UnmergedToken[] = [
      createToken('静か', '名詞', '形容動詞語幹', '静か'),
      createToken('な', '助動詞', '*', 'だ'),
    ]
    const result = mergeTokens(tokens)
    expect(result).toHaveLength(1)
    expect(result[0].surfaceForm).toBe('静かな')
    expect(result[0].baseForm).toBe('静か')
  })
})
