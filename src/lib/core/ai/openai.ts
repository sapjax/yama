import { AppSettings, getSettings } from '@/lib/settings'
import { AiService } from './interface'

export class OpenAiService implements AiService {
  private settings: AppSettings['ai'] | null = null

  async init() {
    this.settings = (await getSettings()).ai
  }

  async explain(sentence: string, word: string, onChunk: (chunk: string) => void, signal: AbortSignal): Promise<void> {
    if (!this.settings?.apiKey) {
      throw new Error('AI API key not set')
    }

    const prompt = this.settings.prompt
      .replace('${context}', sentence)
      .replace('${word}', word)

    const response = await fetch(this.settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`AI API request failed with status ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get stream reader')
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6)
          if (data === '[DONE]') {
            return
          }
          try {
            const json = JSON.parse(data)
            const chunk = json.choices[0]?.delta?.content
            if (chunk) {
              onChunk(chunk)
            }
          } catch (error) {
            console.error('Failed to parse AI stream chunk:', error)
          }
        }
      }
    }
  }
}
