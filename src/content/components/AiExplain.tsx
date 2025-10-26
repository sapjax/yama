import { useEffect, useState, useCallback, useImperativeHandle, useEffectEvent, Ref, lazy, Suspense } from 'react'
import { Messages } from '@/lib/message'
import { getSentenceFromRange, cn } from '@/lib/utils'
import { Bot } from 'lucide-react'
import { sendMessage, onMessage } from 'webext-bridge/content-script'
import markdownStyle from '../../assets/markdown.css?inline'

const Markdown = lazy(() => import('markdown-to-jsx'))

export type AiExplainHandler = {
  handleExplain: () => void
}

type Props = {
  word: string
  range: Range | null
  ref?: Ref<AiExplainHandler>
  panelRef: React.RefObject<HTMLDivElement | null>
}

export function AiExplain({ word, range, ref, panelRef }: Props) {
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    handleExplain,
  }))

  useEffect(() => {
    setExplanation('')
    sendMessage(Messages.ai_explain_stream_cancel, {}, 'background')
  }, [word])

  const handleExplain = useCallback(async () => {
    if (!range || loading) return
    setLoading(true)
    panelRef.current?.classList.add('ai-loading')
    setExplanation('')
    const sentence = getSentenceFromRange(range)!
    sendMessage(Messages.ai_explain_stream_start, { sentence, word }, 'background')
  }, [range, word, loading, panelRef])

  useEffect(() => {
    const chunkSub = onMessage(Messages.ai_explain_stream_chunk, ({ data }) => {
      setExplanation(prev => prev + data.chunk)
    })
    const endSub = onMessage(Messages.ai_explain_stream_end, () => {
      setLoading(false)
      panelRef.current?.classList.remove('ai-loading')
    })

    return () => {
      chunkSub()
      endSub()
    }
  }, [panelRef])

  // Register CSS custom property metadata at runtime.
  // Note: you cannot declare an @property rule inside an element's inline `style` attribute.
  // The JS API `CSS.registerProperty` is the correct way to register property metadata from script.
  useEffect(() => {
    if (typeof window.CSS !== 'undefined' && typeof window.CSS.registerProperty === 'function') {
      try {
        window.CSS.registerProperty({
          name: '--angle',
          syntax: '<angle>',
          inherits: true,
          initialValue: '0turn',
        })
      } catch (e) {
        // ignore: property may already be registered or the call may fail on some browsers
      }
    }
  }, [])

  if (!word) return null

  return (
    <>
      {!explanation && (
        <div
          className="absolute top-[6px] right-0.5 inline-flex size-7
        shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-all outline-none hover:bg-accent  hover:text-accent-foreground dark:hover:bg-accent/50"
          role="button"
          title="AI Explain"
        >
          <Bot
            strokeWidth={2}
            aria-disabled={loading}
            className={cn(
              'size-4 rounded-sm',
              loading && 'opacity-50',
            )}
            color="currentColor"
            onClick={handleExplain}
          />
        </div>
      )}
      {explanation && (
        <div className="mb-4">
          <div
            className="mb-2 flex items-center gap-1.5 pb-1 text-primary"
          >
            <Bot className="size-4 rounded-sm text-foreground" />
            <span className="text-sm font-medium text-foreground">
              AI Explain
            </span>
          </div>
          {explanation && (
            <div className="space-y-2 rounded-md border border-border bg-card p-2.5 text-xs text-card-foreground">
              <div className="markdown-body">
                <Suspense fallback={<div>Loading...</div>}>
                  <Markdown options={{ forceBlock: true, enforceAtxHeadings: true }}>
                    {explanation}
                  </Markdown>
                </Suspense>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{markdownStyle}</style>
    </>
  )
}
