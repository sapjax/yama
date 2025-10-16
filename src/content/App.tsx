import { useRef, useState, useEffect, useCallback } from 'react'
import { useDebounce, useDebouncedCallback } from 'use-debounce'
import { FloatingArrow, arrow, flip, hide, offset, shift, size, useFloating, useDismiss, useInteractions, useTransitionStyles } from '@floating-ui/react'
import { sendMessage } from 'webext-bridge/content-script'
import { Highlighter, injectColors, initHighlighter } from '@/lib/highlight'
import { initTheme } from '@/lib/theme'
import { AppSettings, getSettings } from '@/lib/settings'
import { DictName } from '@/lib/core/dict'
import { Messages } from '@/lib/message'
import { listenColorSchemeChange, cn } from '@/lib/utils'
import ErrorBoundary from '@/components/ErrorBoundary'
import Dict from './components/Dict'
import Toolbar from './components/Toolbar'
import { AiExplain, AiExplainHandler } from './components/AiExplain'
import { SegmentedToken } from '@/lib/core/segment'

function App() {
  const [curWord, setCurWord] = useState('')
  const [curRange, setCurRange] = useState<Range | null>(null)
  const [settings, setSettings] = useState<AppSettings>()
  const [deferredWord] = useDebounce(curWord, 300, { leading: true, trailing: true })
  const dictNames = settings?.dicts.filter(d => d.enabled).map(d => d.id as DictName) ?? []
  const highlightRef = useRef<Highlighter>(null)
  const styleContainerRef = useRef<HTMLDivElement>(null)

  // Init highlighter
  useEffect(() => {
    initHighlighter().then(
      async (highlighter) => {
        highlightRef.current = highlighter
        const settings = await getSettings()
        setSettings(settings)
        injectColors(settings)
        // this styles should place outside the shadow dom
        initTheme(styleContainerRef.current!)
      },
    )

    listenColorSchemeChange((colorScheme) => {
      sendMessage(Messages.set_color_scheme, { colorScheme }, 'background')
    })
  }, [])

  // panel status and styles
  const containerRef = useRef<HTMLDivElement>(null)
  const aiExplainRef = useRef<AiExplainHandler>(null)
  const [isOpen, setIsOpen] = useState(false)
  const mousePointerRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })
  const arrowRef = useRef<SVGSVGElement>(null)

  const { refs, floatingStyles, middlewareData, context } = useFloating({
    placement: 'bottom',
    strategy: 'absolute',
    open: isOpen,
    transform: true,
    onOpenChange: setIsOpen,
    middleware: [
      offset(9),
      flip(),
      size({
        apply({ availableHeight, elements }) {
          // reduce 100px to leave some space for the toolbar and 10px for margin
          const value = `${Math.max(0, availableHeight - 100 - 10)}px`
          elements.floating.style.setProperty(
            '--available-height',
            value,
          )
        },
      }),
      shift({ padding: 5 }),
      arrow({ element: arrowRef.current! }),
      hide(),
    ],
  })

  const { styles } = useTransitionStyles(context)

  const dismiss = useDismiss(context)
  const { getFloatingProps } = useInteractions([
    dismiss,
  ])

  // Re-calculate position when the panel size changes
  useEffect(() => {
    if (refs.floating.current) {
      const observer = new ResizeObserver(() => {
        context.update()
      })
      observer.observe(refs.floating.current)
      return () => observer.disconnect()
    }
  }, [refs.floating, context])

  // handle stay events
  const onStayEnough = useCallback(() => {
    if (highlightRef.current?.getColorKey(curWord) === 'UnSeen') {
      highlightRef.current?.markWord(curWord, 'Searched', curRange)
    }
  }, [curWord, curRange])

  const stayEnoughDebounce = useDebouncedCallback(onStayEnough, 5000)

  useEffect(() => {
    if (isOpen) {
      const status = highlightRef.current?.getWordStatus(curWord)
      if (status === 'UnSeen') {
        stayEnoughDebounce()
      }
    } else {
      stayEnoughDebounce.cancel()
    }
  }, [isOpen, stayEnoughDebounce, curWord])

  // panel open status
  const hideDelay = useDebouncedCallback(useCallback(() => {
    setIsOpen(false)
  }, []), 500)

  const showDelay = useDebouncedCallback(useCallback(() => {
    setIsOpen(true)
  }, []), 200)

  const onPanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    hideDelay.cancel()
  }

  const updateWord = useCallback((segment: SegmentedToken, range: Range, rect: DOMRect) => {
    stayEnoughDebounce.cancel()
    setCurWord(segment.baseForm)
    setCurRange(range)
    refs.setPositionReference({
      getBoundingClientRect: () => rect,
    })
    hideDelay.cancel()
    showDelay()
  }, [refs, hideDelay, showDelay, stayEnoughDebounce])

  const updateWordDebounce = useDebouncedCallback(updateWord, 200)

  const onMouseMove = useCallback(async (e: MouseEvent) => {
    const highlighter = highlightRef.current
    if (!highlighter) return
    mousePointerRef.current = { x: e.clientX, y: e.clientY }

    const { range, rect } = highlighter.getRangeAtPoint(e) ?? {}

    if (range && rect) {
      const segment = highlighter.getSegmentByRange(range)
      if (segment) {
        if (isOpen) {
          updateWordDebounce(segment, range, rect)
        } else {
          updateWord(segment, range, rect)
        }
      } else {
        if (isOpen) {
        }
      }
    } else {
      refs.setPositionReference(null)
      showDelay.cancel()
      hideDelay()
    }
  }, [isOpen, updateWord, updateWordDebounce, refs, hideDelay, showDelay])

  const onPanelMouseEnter = () => {
    hideDelay.cancel()
    updateWordDebounce.cancel()
  }
  const onPanelMouseLeave = hideDelay

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [onMouseMove])

  // shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!curWord) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const shortcuts = settings?.shortcuts
      if (!shortcuts) return
      if (!isOpen) return

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
        case shortcuts.pronounce:
          const audioButton = containerRef.current?.querySelector('[data-pronounce]') as HTMLElement
          audioButton?.click()
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
  }, [curWord, curRange, settings, isOpen])

  return (
    <>
      <div ref={styleContainerRef}></div>
      <div
        className="absolute top-0 left-0 isolate z-[1000000000] w-96 rounded-lg border-2 border-border bg-muted text-card-foreground shadow-xl selection:bg-primary selection:text-primary-foreground"
        ref={refs.setFloating}
        inert={!isOpen}
        style={{
          ...floatingStyles,
          ...styles,
          display: isOpen ? 'opacity-100' : 'opacity-0',
          visibility: middlewareData.hide?.referenceHidden
            ? 'hidden'
            : 'visible',
        }}
        {...getFloatingProps()}
        onMouseEnter={onPanelMouseEnter}
        onMouseLeave={onPanelMouseLeave}
        onMouseMove={onPanelMouseMove}
      >
        <FloatingArrow
          ref={arrowRef}
          context={context}
          tipRadius={2}
          strokeWidth={2}
          stroke="var(--border)"
          fill="var(--muted)"
        />
        <div className="rounded-t-lg bg-muted">
          <div className="border-b border-border p-2">
            <div className="flex items-center justify-center">
              <h3 className="text-base font-semibold text-foreground">{curWord}</h3>
            </div>
          </div>
          {highlightRef.current
            && (
              <Toolbar
                word={curWord}
                highlighter={highlightRef.current}
                range={curRange}
                colors={settings?.colors}
              />
            )}
        </div>
        <div
          className="scrollbar-thin relative overflow-y-auto overscroll-contain p-3 pr-1"
          style={{
            maxHeight: 'min(400px, var(--available-height))',
          }}
          ref={containerRef}
        >
          {!!settings?.ai && <AiExplain word={curWord} range={curRange} ref={aiExplainRef} />}
          {!!curWord && dictNames.map(dictName => (
            <ErrorBoundary
              key={dictName}
              fallback={(
                <div className="text-destructive">
                  Error loading dictionary:
                  {' '}
                  {dictName}
                </div>
              )}
            >
              <Dict word={deferredWord} dictName={dictName} />
            </ErrorBoundary>
          ),
          )}
        </div>
      </div>
    </>
  )
}

export default App
