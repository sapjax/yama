import { getSettings, SETTINGS_KEY } from '@/lib/settings'
import { AiService } from './interface'
import { createAiService } from './index'

export class AiServiceProxy implements AiService {
  private realServicePromise: Promise<AiService> | null = null

  constructor() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[SETTINGS_KEY]) {
        console.log('AI settings changed, invalidating AI service cache.')
        this.invalidate()
      }
    })
  }

  public invalidate(): void {
    this.realServicePromise = null
  }

  private getRealService(): Promise<AiService> {
    if (!this.realServicePromise) {
      this.realServicePromise = (async () => {
        const settings = await getSettings()
        const service = createAiService(settings.ai) as AiService
        return service
      })()
    }
    return this.realServicePromise
  }

  async explain(sentence: string, word: string, onChunk: (chunk: string) => void, signal: AbortSignal): Promise<void> {
    const service = await this.getRealService()
    return service.explain(sentence, word, onChunk, signal)
  }
}
