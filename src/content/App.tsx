import { useRef, useState, useEffect, useCallback } from 'react'
import { useDebounce, useDebouncedCallback } from 'use-debounce'
import { FloatingArrow, arrow, flip, hide, offset, shift, size, useFloating, useDismiss, useInteractions, useTransitionStyles } from '@floating-ui/react'
import { sendMessage } from 'webext-bridge/content-script'
import { Pin } from 'lucide-react'
import { Highlighter, injectColors, initHighlighter } from '@/lib/highlight'
import { initTheme } from '@/lib/theme'
import { AppSettings, getSettings } from '@/lib/settings'
import { DictName } from '@/lib/core/dict'
import { Messages } from '@/lib/message'
import { listenColorSchemeChange } from '@/lib/utils'
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
  const panelRef = useRef<HTMLDivElement>(null)

  // Draggable and Pinnable state
  const [isPinned, setIsPinned] = useState(false)
  const [isDetached, setIsDetached] = useState(false) // New state for post-unpin behavior
  const isDragging = useRef(false)
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 192, y: window.innerHeight / 3 }) // 192 is half of w-96
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const latestPosition = useRef(position)

  const isManuallyPositioned = isPinned || isDetached

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
    strategy: 'fixed',
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

  const { styles: transitionStyles } = useTransitionStyles(context)

  const dismiss = useDismiss(context, {
    enabled: !isPinned,
  })
  const { getFloatingProps } = useInteractions([
    dismiss,
  ])

  // Re-calculate position when the panel size changes
  useEffect(() => {
    if (panelRef.current) {
      const observer = new ResizeObserver(() => {
        if (!isManuallyPositioned) { // Use combined state
          context.update()
        }
      })
      observer.observe(panelRef.current)
      return () => observer.disconnect()
    }
  }, [panelRef, context, isManuallyPositioned])

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
    if (isPinned) return
    setIsOpen(false)
  }, [isPinned]), 500)

  const showDelay = useDebouncedCallback(useCallback(() => {
    setIsOpen(true)
  }, []), 200)

  const onPanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) return
    e.preventDefault()
    e.stopPropagation()
    hideDelay.cancel()
  }

  const updateWord = useCallback((segment: SegmentedToken, range: Range, rect: DOMRect) => {
    setIsDetached(false) // Finding a new word re-attaches the panel
    stayEnoughDebounce.cancel()
    setCurWord(segment.baseForm)
    setCurRange(range)
    if (!isPinned) {
      refs.setPositionReference({
        getBoundingClientRect: () => rect,
      })
    }
  }, [refs, stayEnoughDebounce, isPinned])

  const updateWordDebounce = useDebouncedCallback(updateWord, 200)

  const onMouseMove = useCallback(async (e: MouseEvent) => {
    if (isDragging.current) return

    const highlighter = highlightRef.current
    if (!highlighter) return
    mousePointerRef.current = { x: e.clientX, y: e.clientY }

    const { range, rect } = highlighter.getRangeAtPoint(e) ?? {}

    if (range && rect) {
      const segment = highlighter.getSegmentByRange(range)
      if (segment) {
        if (isOpen) {
          updateWordDebounce(segment, range, rect)
          hideDelay.cancel()
          showDelay()
        } else {
          updateWord(segment, range, rect)
          hideDelay.cancel()
          showDelay()
        }
      }
    } else {
      if (!isPinned) {
        refs.setPositionReference(null)
      }
      showDelay.cancel()
      hideDelay()
    }
  }, [isOpen, updateWord, updateWordDebounce, refs, hideDelay, showDelay, isPinned])

  const onPanelMouseEnter = useCallback(() => {
    hideDelay.cancel()
    updateWordDebounce.cancel()
  }, [hideDelay, updateWordDebounce])

  const onPanelMouseLeave = hideDelay

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [onMouseMove])

  // Drag and Pin logic
  const onDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinned) return

    // Ignore mousedown on buttons within the drag handle
    if ((e.target as HTMLElement).closest('button')) {
      return
    }

    const floating = panelRef.current
    if (!floating) return

    isDragging.current = true
    latestPosition.current = position

    const rect = floating.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    // Prevent text selection while dragging
    e.preventDefault()
  }, [isPinned, panelRef, position])

  const onDragging = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !isPinned) return
    if (!panelRef.current) return

    const newX = e.clientX - dragOffset.current.x
    const newY = e.clientY - dragOffset.current.y

    latestPosition.current = { x: newX, y: newY }

    // Update style directly to avoid re-renders
    panelRef.current.style.transform = `translate(${newX}px, ${newY}px)`
  }, [isPinned])

  const onDragEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false

    // Sync React state with the final position
    setPosition(latestPosition.current)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onDragging)
    window.addEventListener('mouseup', onDragEnd)
    return () => {
      window.removeEventListener('mousemove', onDragging)
      window.removeEventListener('mouseup', onDragEnd)
    }
  }, [onDragging, onDragEnd])

  const togglePin = () => {
    const newIsPinned = !isPinned

    if (newIsPinned) {
      // Pinning
      const floating = panelRef.current
      if (!floating) return
      const rect = floating.getBoundingClientRect()
      setPosition({ x: rect.left, y: rect.top })
      setIsOpen(true)
      setIsDetached(false) // Ensure it is not detached when pinned
    } else {
      // Unpinning
      setIsDetached(true) // Detach panel, will stay in place until new word is found
    }
    setIsPinned(newIsPinned)
  }

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

  const floatingProps = isManuallyPositioned ? {} : getFloatingProps()

  const floatingPositionStyle = isManuallyPositioned
    ? {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      transform: `translate(${position.x}px, ${position.y}px)`,
    }
    : floatingStyles

  return (
    <>
      <div ref={styleContainerRef}></div>
      <div
        className="isolate z-[1000000000] w-96 rounded-lg border-2 border-border bg-muted text-card-foreground shadow-xl selection:bg-primary selection:text-primary-foreground"
        ref={(node) => {
          refs.setFloating(node)
          panelRef.current = node
        }}
        inert={!isOpen}
        style={{
          ...floatingPositionStyle,
          ...(!isPinned && transitionStyles),
          opacity: isOpen ? 1 : 0,
        }}
        {...floatingProps}
        onMouseEnter={onPanelMouseEnter}
        onMouseLeave={onPanelMouseLeave}
        onMouseMove={onPanelMouseMove}
      >
        {!isManuallyPositioned && (
          <FloatingArrow
            ref={arrowRef}
            context={context}
            tipRadius={2}
            strokeWidth={2}
            stroke="var(--border)"
            fill="var(--muted)"
          />
        )}
        <div className="rounded-t-lg bg-muted">
          <div
            className="relative border-b border-border p-2"
            style={{ cursor: isPinned ? 'move' : 'default' }}
            onMouseDown={onDragStart}
            onMouseEnter={() => setIsHeaderHovered(true)}
            onMouseLeave={() => setIsHeaderHovered(false)}
          >
            <div className="flex items-center justify-center">
              <h3 className="text-base font-semibold text-foreground">{curWord}</h3>
            </div>
            {(isHeaderHovered || isPinned) && (
              <button
                onClick={togglePin}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-foreground/60 hover:bg-accent hover:text-foreground"
                title={isPinned ? 'Unpin panel' : 'Pin panel'}
              >
                <Pin
                  size={16}
                  color={isPinned ? 'IndianRed' : 'currentColor'}
                  fill={isPinned ? 'IndianRed' : 'transparent'}
                />
              </button>
            )}
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
