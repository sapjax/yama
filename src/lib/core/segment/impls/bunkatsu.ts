/**
 * ref: https://github.com/vincelwt/bunkatsu
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

export type UnmergedToken = {
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
  'される',
  'られる',
  'せる',
  // past / progressive
  'た',
  'てる',
  'てた',

  // examples
  'たり',
  'だり',

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

const HONORIFIC_PREFIXES = ['ご', 'お']
const PREFIXES = ['再', '未', '超', '非', '無', '最', '新', '多']
const COUNTERS = ['つ']
const FIXED_IDIOMS = [
  'まったくもう',
  '気になる',
  'なんだ',
  'えっと',
  '気がつく',
  '気がつき',
  'どうしたの',
  'またね',
  'あらすじ',
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
const COMPOUND_VERB_SUFFIXES = new Set(['出す', '始める', '続ける', '終わる', '込む', '過ぎる', '直す', '変える'])
const KATA_UNITS = new Set(['キロ', 'メートル', 'センチ', 'グラム'])
const NUM_UNITS = new Set(['円', '%', '点', '年', '歳', 'kg', 'km'])

const isKatakana = (s: string) => /^[ァ-ヶー－]+$/.test(s)
const isNumeric = (t: UnmergedToken) => t.pos === 'UNK' && /^[1-9]$/.test(t.surfaceForm)

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
  'いる',
])

const EXPLAN_ENDINGS = new Set(['っぽい', 'みたい', 'らしい'])
const HONORIFICS = new Set(['ちゃん', 'さん', '君', 'くん', '様'])
const NOMINALISERS = new Set(['さ', 'み'])

type Predicate = {
  shouldMerge: boolean
  base?: string
}

const shouldMergeForward = (
  prev: UnmergedToken,
  curr: UnmergedToken,
): Predicate => {
  const { pos, posSub1, baseForm, surfaceForm } = curr

  /* ───────────────────────────────────────────────
     A. very specific manga / SoL glue rules
     ──────────────────────────────────────────── */

  // 0. Disallow the polite prefix 「お」 unless next token is a noun
  if (prev.surfaceForm === 'お' && pos !== '名詞')
    return {
      shouldMerge: false,
    }

  // 1. Polite auxiliaries after a verb  e.g. 食べ <ます>
  if (prev.pos === '動詞' && AUX_POLITE.has(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 2. Progressive contractions  e.g. 見 <てる> / 見 <ちゃう>
  if (prev.pos === '動詞' && PROGRESSIVES.has(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 2.1. Verb + て particle
  if (prev.pos === '動詞' && surfaceForm === 'て' && pos === '助詞') {
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }
  }

  // 3. て + あげる／くれる／…   見 <てあげる>
  if (prev.surfaceForm.endsWith('て') && TE_HELPERS.has(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 4. Light‑verb compounds (verb+こと/もの/ところ)
  if (prev.pos === '動詞' && ['こと', 'もの', 'ところ'].includes(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm + baseForm,
    }

  // 5. Sentence‑ending combos  e.g. 最高 <じゃん>
  if (SENT_ENDING.has(surfaceForm) && prev.pos !== '記号')
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 6. Katakana word + long‑vowel bar  e.g. カワイ <イー>
  if (surfaceForm === 'ー' && isKatakana(prev.surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 7. Laugh filler "w"/"www"
  if (/^w{1,5}$/.test(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  /* ───────────────────────────────────────────────
     B. core morphology glue
     ──────────────────────────────────────────── */

  // 8. verb core + auxiliary or verb suffix
  // 食べ + <られる/たい/せる/させる/そうだ>
  if (pos === '助動詞' && prev.pos === '動詞')
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }
  // 食べ + <たがる>
  if (posSub1 === '接尾' && prev.pos === '動詞')
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // refined volitional 「…う」
  if (
    surfaceForm === 'う'
    && prev.pos === '動詞'
    && /[いえ]$/.test(prev.surfaceForm)
  )
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // <ましょ/でしょ> + う
  if (
    surfaceForm === 'う'
    && (prev.surfaceForm.endsWith('ましょ') || prev.surfaceForm.endsWith('でしょ'))
  )
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  if (AUX_VERBS.includes(surfaceForm) && surfaceForm !== 'う' && prev.isWordLike)
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 9. passive / potential れ + る
  if (prev.surfaceForm.endsWith('れ') && surfaceForm === 'る')
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 10. progressive contraction て + た／だ
  if (prev.surfaceForm.endsWith('て') && ['た', 'だ'].includes(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 10.1. Compound verbs V1-masu + V2  (走り+出す)
  if (
    prev.pos === '動詞'
    && curr.pos === '動詞'
    && COMPOUND_VERB_SUFFIXES.has(curr.baseForm)
  ) {
    return {
      shouldMerge: true,
      base: prev.baseForm + curr.baseForm,
    }
  }

  // 11. noun + common noun suffix  一日 + <中>
  if (prev.pos === '名詞' && NOUN_SUFFIXES.includes(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm + baseForm,
    }

  // 小説 + <家>
  if (posSub1 === '接尾'
    && !HONORIFICS.has(surfaceForm)
    && prev.pos === '名詞'
    && prev.posSub1 !== '副詞可能'
  )
    return {
      shouldMerge: true,
      base: prev.baseForm + baseForm,
    }

  // 12. Adjective stem + さ／み  (高 + さ, 重 + み)
  if (prev.pos === '形容詞' && NOMINALISERS.has(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm + baseForm,
    }

  // 12.1 Adjective-verb (na-adj) + copula   (静か + だ/だった/じゃない)
  if (
    prev.pos === '形容動詞'
    && (curr.pos === '助動詞' || curr.surfaceForm === 'じゃない')
  ) {
    return {
      shouldMerge: true,
      base: prev.baseForm, // base form is just the na-adj, e.g. 静か
    }
  }

  // 12.2 Noun + な (e.g. 静か + な)
  if (
    prev.pos === '名詞'
    && prev.posSub1 === '形容動詞語幹'
    && curr.surfaceForm === 'な'
    && curr.pos === '助動詞'
  ) {
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }
  }

  // 13. Honorifics after a name   太郎 <くん>  / アリス <さん>
  if (posSub1 === '接尾' && HONORIFICS.has(surfaceForm))
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 14. っぽい／みたい／らしい adnominal endings
  if (EXPLAN_ENDINGS.has(surfaceForm) && prev.pos !== '記号')
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 15. 促音便 stem + と／こ／ちゃ…   思っ <とく>
  if (
    prev.surfaceForm.endsWith('っ')
    && ['と', 'こ', 'ちゃ', 'ちま', 'ちゅ'].includes(surfaceForm)
  )
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 15.2 促音便 stem + て／た…   持って, やって
  if (
    prev.pos === '動詞'
    && prev.surfaceForm.endsWith('っ')
    && ['て', 'た'].includes(surfaceForm)
  )
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 16. prefix + noun/verb   再 <開> / ご <飯>
  if (PREFIXES.includes(prev.surfaceForm) && ['名詞', '動詞'].includes(pos))
    return {
      shouldMerge: true,
      base: prev.baseForm + baseForm,
    }

  // お + <名前 / 城>
  if (HONORIFIC_PREFIXES.includes(prev.surfaceForm) && ['名詞'].includes(pos))
    return {
      shouldMerge: true,
      base: baseForm,
    }

  // 17. Katakana noun + する verb  (ガード + する)
  if (prev.pos === '名詞' && isKatakana(prev.surfaceForm) && surfaceForm === 'する')
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  // 18. explanatory んだ／んだな
  if (
    /^[んえ]だ/.test(surfaceForm)
    && ['形容詞', '動詞', '名詞'].includes(prev.pos)
  )
    return {
      shouldMerge: true,
      base: prev.baseForm,
    }

  /* ───────────────────────────────────────────────
     C. things we explicitly do NOT merge
     ──────────────────────────────────────────── */

  // never merge particles forward
  if (pos === '助詞')
    return {
      shouldMerge: false,
    }

  // 20. numeric + unit/counter
  if (
    isNumeric(prev)
    && COUNTERS.includes(surfaceForm)
  ) {
    return {
      shouldMerge: true,
      base: (prev.baseForm || prev.surfaceForm) + baseForm,
    }
  }

  return {
    shouldMerge: false,
  }
}

const mergeIdioms = (tokens: UnmergedToken[]): UnmergedToken[] => {
  const result: UnmergedToken[] = []
  const MAX_IDIOM_PARTS = 4
  let i = 0
  while (i < tokens.length) {
    let bestMatch: UnmergedToken[] | null = null

    // Find the longest possible idiom match starting at current token `i`
    for (const idiom of FIXED_IDIOMS) {
      let temp_j = i
      let currentSurface = ''
      const matchedTokens: UnmergedToken[] = []

      while (temp_j < tokens.length && currentSurface.length < idiom.length && matchedTokens.length < MAX_IDIOM_PARTS) {
        const currentToken = tokens[temp_j]
        currentSurface += currentToken.surfaceForm
        matchedTokens.push(currentToken)
        temp_j++
      }

      if (currentSurface === idiom) {
        if (!bestMatch || matchedTokens.length > bestMatch.length) {
          bestMatch = matchedTokens
        }
      }
    }

    if (bestMatch) {
      const firstToken = bestMatch[0]
      const lastToken = bestMatch[bestMatch.length - 1]
      const mergedIdiom: UnmergedToken = {
        surfaceForm: bestMatch.map(t => t.surfaceForm).join(''),
        baseForm: bestMatch.map(t => t.surfaceForm).join(''),
        startIndex: firstToken.startIndex,
        endIndex: lastToken.endIndex,
        reading: bestMatch.map(t => t.reading).join(''),
        pos: lastToken.pos, // Heuristic: use the POS of the last token
        posSub1: lastToken.posSub1, // Heuristic
        isWordLike: true,
      }
      result.push(mergedIdiom)
      i += bestMatch.length
    } else {
      result.push(tokens[i])
      i++
    }
  }
  return result
}

const mergeTokens = (tokens: UnmergedToken[]): SegmentedToken[] => {
  const afterIdiomPass = mergeIdioms(tokens)

  const merged: UnmergedToken[] = []
  for (const tok of afterIdiomPass) {
    const prev = merged.at(-1)
    if (prev) {
      const { shouldMerge, base } = shouldMergeForward(prev, tok)
      if (shouldMerge) {
        prev.baseForm = base ?? prev.baseForm
        prev.surfaceForm += tok.surfaceForm
        prev.endIndex = tok.endIndex
        prev.reading += tok.reading
        prev.pos = tok.pos
        prev.posSub1 = tok.posSub1
        prev.isWordLike = true
        continue
      }
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
