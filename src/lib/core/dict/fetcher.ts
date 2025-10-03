import { DictionaryEntry } from './interface'

// A function that performs a lookup, suitable for caching.
type LookupFn = (word: string) => Promise<DictionaryEntry | null>

// A function that performs the actual fetching, requiring a signal.
type FetchFn = (word: string, signal: AbortSignal) => Promise<DictionaryEntry | null>

/**
 * HOF that adds caching to a lookup function.
 */
export function cacheable(fn: LookupFn): LookupFn {
  const cache = new Map<string, DictionaryEntry>()

  return async (word: string) => {
    if (cache.has(word)) {
      return cache.get(word)!
    }
    const result = await fn(word)
    if (result) {
      cache.set(word, result)
    }
    return result
  }
}

/**
 * HOF that adds request cancellation to a fetch function.
 */
export function abortable(fetchFn: FetchFn): LookupFn {
  let abortController: AbortController | null = null

  return async (word: string) => {
    if (abortController) {
      abortController.abort()
    }
    abortController = new AbortController()
    const { signal } = abortController

    try {
      return await fetchFn(word, signal)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null
      }
      throw error
    } finally {
      abortController = null
    }
  }
}
