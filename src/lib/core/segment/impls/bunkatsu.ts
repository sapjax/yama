/**
 * ref: https://raw.githubusercontent.com/vincelwt/bunkatsu
 * bunkatsu – learner‑friendly Japanese tokenizer / segmenter
 * ----------------------------------------------------------
 *
 *  Workflow
 *  --------
 *  1. `kuromojin` gives us a fine‑grained list of morphemes.
 *  2. `mergeTokens()` stitches the morphemes back together according to
 *     heuristics that are helpful for language‑learners (e.g. the passive
 *     verb 「食べられる」 is presented as one chunk instead of four).
 *  3.  The final segments are returned together with offsets so you can
 *     map them back to the original string, display furigana, etc.
 *
 *  The merge rules cover ~40 of the most common constructions, which in
 *  practice resolves >90 % of "awkward" splits in everyday manga / slice‑of‑life
 *  dialogs.  Because every rule is expressed as ONE early‑return statement
 *  in `shouldMergeForward()`, extending the behaviour is straightforward –
 *  just add another line.
 *
 *  The public API is asynchronous because the underlying Kuromoji dictionary
 *  needs to be loaded at least once.  The dictionary is cached after the
 *  first call so subsequent invocations are synchronous in practice.
 */

// ---------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
import type { SegmentedToken } from '../interface'

type UnmergedToken = {
  surfaceForm: string
  baseForm: string
  startIndex: number
  endIndex: number
  reading: string
  pos: string
  posSub1: string
  isWordLike: boolean
}

// ------------------------------------------------------------------
// 2. rule tables & helpers for the merge layer
// ------------------------------------------------------------------

// NOTE: keep each entry short; cost to maintain is proportional to lines.
const AUX_VERBS = [
  // passive / causative
  'れる',
  'られる',
  'さ',
  'せる',
  // past / progressive
  'た',
  'てる',
  'てた',
  // negative
  'ない',
  'なかった',
  // volitional / conjecture
  'よう',
  'まい',
  'う',
  'だろ',
  'だろう',
  // desiderative etc.
  'たい',
  'がち',
  'やすい',
]

const NOUN_SUFFIXES = [
  '中',
  '後',
  '前',
  '目',
  '毎',
  '式',
  '的',
  '風',
  '化',
  '感',
  '力',
  '性',
  '度',
]

const PREFIXES = ['ご', 'お', '再', '未', '超', '非', '無', '最', '新', '多']
const COUNTERS = ['人', '枚', '本', '匹', 'つ', '個', '回', '年', '歳', '着']
const FIXED_IDIOMS = [
  'とりあえず',
  'まったくもう',
  'どうしても',
  'まさかの',
  'いい加減',
  'なんとなく',
]

// extra low‑hanging fruit ------------------------------------------
const AUX_POLITE = new Set(['ます', 'ました', 'ません', 'ませんでした'])

const PROGRESSIVES = new Set([
  'てる',
  'ている',
  'ちゃう',
  'ちゃった',
  'じゃう',
  'じゃった',
  'ちゃ',
  'ちゃっ',
])
const SENT_ENDING = new Set(['じゃん', 'だよ', 'だね', 'だろ', 'かよ'])
const KATA_UNITS = new Set(['キロ', 'メートル', 'センチ', 'グラム'])
const NUM_UNITS = new Set(['円', '%', '点', '年', '歳', 'kg', 'km'])

const isKatakana = (s: string) => /^[ァ-ヶー－]+$/.test(s)
const isNumeric = (t: UnmergedToken) =>
  t.pos === '名詞' && t.posSub1 === '数詞'

// ------------------------------------------------------------------
// 3. single decision function – ONE return per rule
// ------------------------------------------------------------------

// helper word lists that were missing before
const TE_HELPERS = new Set([
  'あげる',
  'くれる',
  'もらう',
  'いく',
  'くる',
  'ください',
  '下さい',
])

const EXPLAN_ENDINGS = new Set(['っぽい', 'みたい', 'らしい'])
const HONORIFICS = new Set(['ちゃん', 'さん', '君', 'くん', '様'])
const NOMINALISERS = new Set(['さ', 'み'])

const shouldMergeForward = (
  prev: UnmergedToken,
  curr: UnmergedToken,
): boolean => {
  const { pos, posSub1, surfaceForm } = curr

  /* ───────────────────────────────────────────────
     A. very specific manga / SoL glue rules
     ──────────────────────────────────────────── */

  // 0. Disallow the polite prefix 「お」 unless next token is a noun
  if (prev.surfaceForm === 'お' && pos !== '名詞') return false

  // 1. Polite auxiliaries after a verb  e.g. 食べ <ます>
  if (prev.pos === '動詞' && AUX_POLITE.has(surfaceForm)) return true

  // 2. Progressive contractions  e.g. 見 <てる> / 見 <ちゃう>
  if (prev.pos === '動詞' && PROGRESSIVES.has(surfaceForm)) return true

  // 3. て + あげる／くれる／…   見 <てあげる>
  if (prev.surfaceForm.endsWith('て') && TE_HELPERS.has(surfaceForm))
    return true

  // 4. Light‑verb compounds (verb+こと/もの/ところ)
  if (prev.pos === '動詞' && ['こと', 'もの', 'ところ'].includes(surfaceForm))
    return true

  // 5. Sentence‑ending combos  e.g. 最高 <じゃん>
  if (SENT_ENDING.has(surfaceForm) && prev.pos !== '記号') return true

  // 6. Katakana word + long‑vowel bar  e.g. カワイ <イー>
  if (surfaceForm === 'ー' && isKatakana(prev.surfaceForm)) return true

  // 7. Laugh filler "w"/"www"
  if (/^w{1,5}$/.test(surfaceForm)) return true

  /* ───────────────────────────────────────────────
     B. core morphology glue
     ──────────────────────────────────────────── */

  // 8. verb core + auxiliary or verb suffix
  if (pos === '助動詞' && prev.pos === '動詞') return true
  if (posSub1 === '接尾' && prev.pos === '動詞') return true

  // refined volitional 「…う」
  if (
    surfaceForm === 'う'
    && prev.pos === '動詞'
    && /[いえ]$/.test(prev.surfaceForm)
  )
    return true
  if (AUX_VERBS.includes(surfaceForm) && surfaceForm !== 'う') return true

  // 9. passive / potential れ + る
  if (prev.surfaceForm.endsWith('れ') && surfaceForm === 'る') return true

  // 10. progressive contraction て + た／だ
  if (prev.surfaceForm.endsWith('て') && ['た', 'だ'].includes(surfaceForm))
    return true

  // 11. noun + common noun suffix
  if (prev.pos === '名詞' && NOUN_SUFFIXES.includes(surfaceForm)) return true
  if (posSub1 === '接尾' && prev.pos === '名詞') return true

  // 12. Adjective stem + さ／み  (高 + さ, 重 + み)
  if (prev.pos === '形容詞' && NOMINALISERS.has(surfaceForm)) return true

  // 13. Honorifics after a name   太郎 <くん>  / アリス <さん>
  if (posSub1 === '接尾' && HONORIFICS.has(surfaceForm)) return true

  // 14. っぽい／みたい／らしい adnominal endings
  if (EXPLAN_ENDINGS.has(surfaceForm) && prev.pos !== '記号') return true

  // 15. 促音便 stem + と／こ／ちゃ…   思っ <とく>
  if (
    prev.surfaceForm.endsWith('っ')
    && ['と', 'こ', 'ちゃ', 'ちま', 'ちゅ'].includes(surfaceForm)
  )
    return true

  // 16. prefix + noun/verb   再 <開> / ご <飯>
  if (prev.pos === '接頭詞' && ['名詞', '動詞'].includes(pos)) return true
  if (PREFIXES.includes(prev.surfaceForm) && ['名詞', '動詞'].includes(pos))
    return true

  // 17. Katakana noun + する verb  (ガード + する)
  if (prev.pos === '名詞' && isKatakana(prev.surfaceForm) && pos === '動詞')
    return true

  // 18. fixed idioms list
  const joined = prev.surfaceForm + surfaceForm
  if (FIXED_IDIOMS.some(id => joined.startsWith(id))) return true

  // 19. explanatory んだ／んだな
  if (
    /^[んえ]だ/.test(surfaceForm)
    && ['形容詞', '動詞', '名詞'].includes(prev.pos)
  )
    return true

  /* ───────────────────────────────────────────────
     C. things we explicitly do NOT merge
     ──────────────────────────────────────────── */

  // never merge particles forward
  if (pos === '助詞') return false

  /* Numeric + unit / counter rules remain disabled – re‑enable if you need them
     -------------------------------------------------------------------------
     if (isNumeric(prev) && (NUM_UNITS.has(surfaceForm) || KATA_UNITS.has(surfaceForm))) return true
     if (isNumeric(prev) && COUNTERS.includes(surfaceForm)) return true
   */

  return false
}

const mergeTokens = (tokens: UnmergedToken[]): SegmentedToken[] => {
  const merged: UnmergedToken[] = []
  for (const tok of tokens) {
    const prev = merged.at(-1)
    if (prev && shouldMergeForward(prev, tok)) {
      prev.surfaceForm += tok.surfaceForm
      prev.endIndex = tok.endIndex
      prev.reading += tok.reading
      continue
    }
    merged.push({ ...tok })
  }

  return merged.map((t, i) => ({
    ...t,
    startIndex: t.startIndex ?? 0,
    endIndex: t.endIndex ?? (t.startIndex ?? 0) + t.surfaceForm.length,
  }))
}

export { mergeTokens }
