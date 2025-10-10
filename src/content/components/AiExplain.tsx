import { Messages } from '@/lib/message'
import { getSentenceFromRange, cn } from '@/lib/utils'
import { Bot } from 'lucide-react'
import { useEffect, useState, useCallback, useImperativeHandle, Ref } from 'react'
import { sendMessage, onMessage } from 'webext-bridge/content-script'
import markdownStyle from '../../assets/markdown.css?inline'
import Markdown from 'markdown-to-jsx'

export type AiExplainHandler = {
  handleExplain: () => void
}

export function AiExplain({ word, range, ref }: { word: string, range: Range | null, ref?: Ref<AiExplainHandler> }) {
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
    setExplanation('')
    const sentence = getSentenceFromRange(range)!
    sendMessage(Messages.ai_explain_stream_start, { sentence, word }, 'background')
  }, [range, word, loading])

  useEffect(() => {
    const chunkSub = onMessage(Messages.ai_explain_stream_chunk, ({ data }) => {
      setExplanation(prev => prev + data.chunk)
    })
    const endSub = onMessage(Messages.ai_explain_stream_end, () => {
      setLoading(false)
    })

    return () => {
      chunkSub()
      endSub()
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
        >
          <Bot
            strokeWidth={2}
            className={cn(
              'size-4 rounded-sm',
              loading ? 'animate-spin' : '',
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
                <Markdown options={{ forceBlock: true, enforceAtxHeadings: true }}>
                  {explanation}
                </Markdown>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{markdownStyle}</style>
    </>
  )
}
