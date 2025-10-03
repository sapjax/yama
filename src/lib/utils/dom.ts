export function getSentenceFromRange(range: Range, maxLength = 40): string | undefined {
  const terminators = ['。\n', '。 ', '。 ', '！', '？', '．', '!', '?', '\n']
  const startNode = range.startContainer

  let contextElement = startNode.parentElement
  while (contextElement) {
    const display = window.getComputedStyle(contextElement).display
    if (['block', 'flex', 'grid'].includes(display) || ['P', 'DIV', 'ARTICLE', 'SECTION', 'LI'].includes(contextElement.tagName)) {
      break
    }
    if (contextElement.parentElement === document.body) break
    contextElement = contextElement.parentElement
  }
  contextElement ??= startNode.parentElement
  if (!contextElement) return undefined

  let fullText = ''
  const nodeOffsets = new Map<Node, number>()
  const walker = document.createTreeWalker(contextElement, NodeFilter.SHOW_TEXT)
  let currentNode
  while (currentNode = walker.nextNode()) {
    nodeOffsets.set(currentNode, fullText.length)
    fullText += currentNode.nodeValue ?? ''
  }

  const rangeStartOffset = nodeOffsets.get(range.startContainer)
  if (rangeStartOffset === undefined) return contextElement.textContent?.trim() // Fallback

  const globalStartOffset = rangeStartOffset + range.startOffset

  let sentenceStart = 0
  for (let i = globalStartOffset; i >= 0; i--) {
    if (terminators.some(t => fullText.substring(i, i + t.length) === t)) {
      sentenceStart = i + 1
      break
    }
  }

  let sentenceEnd = fullText.length
  for (let i = globalStartOffset; i < fullText.length; i++) {
    if (terminators.some(t => fullText.substring(i, i + t.length) === t)) {
      sentenceEnd = i + 1
      break
    }
  }

  const rawSentence = fullText.substring(sentenceStart, sentenceEnd)

  if (rawSentence.trim().length <= maxLength) {
    return rawSentence.trim()
  }

  const wordText = range.toString()
  const wordStartIndex = globalStartOffset - sentenceStart

  const charsAround = Math.floor((maxLength - wordText.length) / 2)
  let start = Math.max(0, wordStartIndex - charsAround)
  let end = Math.min(rawSentence.length, wordStartIndex + wordText.length + charsAround)

  let finalSentence = rawSentence.substring(start, end)

  if (start > 0) {
    finalSentence = `...${finalSentence.trimStart()}`
  }
  if (end < rawSentence.length) {
    finalSentence = `${finalSentence.trimEnd()}...`
  }

  return finalSentence.trim()
}
