import { AppSettings, getSettings } from '@/lib/settings'
import { AiService } from './interface'

export class GeminiService implements AiService {
  constructor(private settings: AppSettings['ai']['gemini']) {}

  async explain(sentence: string, word: string, onChunk: (chunk: string) => void, signal: AbortSignal): Promise<void> {
    const { apiKey, endpoint, model, prompt } = this.settings
    if (!apiKey) {
      throw new Error('Gemini API key not set')
    }
    if (!endpoint) {
      throw new Error('Gemini endpoint not set')
    }
    if (!model) {
      throw new Error('Gemini model not set')
    }

    if (!prompt) {
      throw new Error('Gemini prompt not set')
    }

    const _prompt = prompt
      .replace('${context}', sentence)
      .replace('${word}', word)

    // Ensure the endpoint is a streaming endpoint and request SSE
    const url = `${endpoint}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: _prompt,
          }],
        }],
        generationConfig: {
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
      signal,
    })

    if (!response.ok) {
      let errorMessage = `AI API request failed with status ${response.status}`
      try {
        const errorBody = await response.json()
        if (errorBody.error?.message) {
          errorMessage = errorBody.error.message
        }
      } catch (e) {
        // ignore json parse error
      }
      throw new Error(errorMessage)
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
          try {
            const json = JSON.parse(data)
            // Extract text from Gemini's specific SSE structure
            const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text
            if (chunk) {
              onChunk(chunk)
            }
          } catch (error) {
            // The stream can end with a final empty data chunk, which is not valid JSON
            if (line.trim() !== 'data:') {
              console.error('Failed to parse AI stream chunk:', data, error)
            }
          }
        }
      }
    }
  }
}
