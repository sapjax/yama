import { useEffect, useRef, useState, useCallback } from 'react'
import { useDebounce } from 'use-debounce'
import { Highlighter, genMarkStyles, initHighlighter } from '@/lib/highlight'
import { AppSettings, getSettings } from '@/lib/settings'
import Dict from './components/Dict'
import Toolbar from './components/Toolbar'
import Panel, { PanelHandler } from './components/Panel'
import { AiExplain, AiExplainHandler } from './components/AiExplain'
import { DictName } from '@/lib/core/dict'

function App() {
  const [curWord, setCurWord] = useState('')
  const [curRange, setCurRange] = useState<Range | null>(null)
  const [settings, setSettings] = useState<AppSettings>()
  const highlightRef = useRef<Highlighter>(null)
  const [deferredWord] = useDebounce(curWord, 300, { leading: true, trailing: true })
  const dictNames = settings?.dicts.filter(d => d.enabled).map(d => d.id as DictName) ?? []
  const panelRef = useRef<PanelHandler>(null)
  const aiExplainRef = useRef<AiExplainHandler>(null)

  useEffect(() => {
    initHighlighter().then(
      async (highlighter) => {
        highlightRef.current = highlighter
        // this styles should place outside the shadow dom
        const settings = await getSettings()
        setSettings(settings)

        const style = document.createElement('style')
        style.id = 'yama-style'
        style.textContent = genMarkStyles(
          { ...settings.colors, ...settings.reviewColors },
          settings.markStyle,
        )
        document.head.appendChild(style)

        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'sync' && changes.settings) {
            const newSettings = changes.settings.newValue
            setSettings(newSettings)
            style.textContent = genMarkStyles(
              { ...newSettings.colors, ...newSettings.reviewColors },
              newSettings.markStyle,
            )
          }
        })
      },
    )
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!curWord) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const shortcuts = settings?.shortcuts
      if (!shortcuts) return

      let matched = false
      switch (e.key) {
        case shortcuts.tracking:
          highlightRef.current?.markWord(curWord, 'Tracking', curRange)
          matched = true
          break
        case shortcuts.ignored:
          highlightRef.current?.markWord(curWord, 'Ignored', curRange)
          matched = true
          break
        case shortcuts.never_forget:
          highlightRef.current?.markWord(curWord, 'Never_Forget', curRange)
          matched = true
          break
        case shortcuts.ai_explain:
          aiExplainRef.current?.handleExplain()
          matched = true
          break
      }

      if (matched) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [curWord, curRange, settings])

  const onStayEnough = useCallback(() => {
    if (highlightRef.current?.getColorKey(curWord) === 'UnSeen') {
      highlightRef.current?.markWord(curWord, 'Searched', curRange)
    }
  }, [curWord, curRange])

  const onMouseMove = useCallback(async (e: MouseEvent) => {
    const highlighter = highlightRef.current
    if (!highlighter) return

    const newRange = highlighter.getRangeAtPoint(e)
    if (newRange) {
      const baseForm = highlighter.getBaseFormByRange(newRange)
      if (baseForm) {
        setCurWord(baseForm)
        setCurRange(newRange)
        panelRef.current?.setTrigger(newRange)
      }
    } else {
      panelRef.current?.setTrigger(null)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [onMouseMove])

  return (
    <Panel ref={panelRef} onStayEnough={onStayEnough}>
      <>
        <div className="rounded-t-lg bg-muted/50">
          <div className="border-b border-border p-2">
            <div className="flex items-center justify-center">
              <h3 className="text-base font-semibold text-foreground">{curWord}</h3>
            </div>
          </div>
          {highlightRef.current && <Toolbar word={curWord} highlighter={highlightRef.current} range={curRange} />}
        </div>
        <div
          className="scrollbar-thin relative overflow-y-scroll p-3 pr-1.5"
          style={{
            maxHeight: 'min(400px, var(--available-height))',
          }}
        >
          {!!settings?.ai && <AiExplain word={curWord} range={curRange} ref={aiExplainRef} />}
          {!!curWord && dictNames.map(dictName =>
            <Dict key={dictName} word={deferredWord} dictName={dictName} />,
          )}
        </div>
      </>
    </Panel>
  )
}

export default App
