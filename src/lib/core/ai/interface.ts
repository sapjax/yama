export interface AiService {
  explain(sentence: string, word: string, onChunk: (chunk: string) => void, signal: AbortSignal): Promise<void>
}
