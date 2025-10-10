import { AppSettings } from '@/lib/settings'
import { AiService } from './interface'
import { GeminiService } from './gemini'
import { OpenAiService } from './openai'

export function createAiService(settings: AppSettings['ai']): AiService {
  switch (settings.apiType) {
    case 'gemini':
      return new GeminiService(settings.gemini)
    case 'openai':
    default:
      return new OpenAiService(settings.openai)
  }
}
