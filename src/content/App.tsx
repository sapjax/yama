import { useRef, useState, useEffect, useCallback, useEffectEvent } from 'react'
import { useDebounce, useDebouncedCallback } from 'use-debounce'
import { FloatingArrow, arrow, flip, hide, offset, shift, size, useFloating, useDismiss, useInteractions } from '@floating-ui/react'
import { sendMessage } from 'webext-bridge/content-script'
import { Pin } from 'lucide-react'
import { Highlighter, injectColors, initHighlighter } from '@/lib/highlight'
import { initTheme } from '@/lib/theme'
import { AppSettings, getSettings } from '@/lib/settings'
import { DictName } from '@/lib/core/dict'
import { Messages } from '@/lib/message'
import { cn, listenColorSchemeChange } from '@/lib/utils'
import ErrorBoundary from '@/components/ErrorBoundary'
import Dict from './components/Dict'
import Toolbar from './components/Toolbar'
import { AiExplain, AiExplainHandler } from './components/AiExplain'
import { SegmentedToken } from '@/lib/core/segment'

function App() {
  const [curWord, setCurWord] = useState('')
  const [curRange, setCurRange] = useState<Range | null>(null)
  const [settings, setSettings] = useState<AppSettings>()
  const [deferredWord] = useDebounce(curWord, 150, { leading: true, trailing: true })
  const dictNames = settings?.dicts.filter(d => d.enabled).map(d => d.id as DictName) ?? []
  const highlightRef = useRef<Highlighter>(null)
  const styleContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

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

  const { refs, floatingStyles, context } = useFloating({
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
          // reduce 100px to leave some space for the toolbar and 20px for margin
          const value = `${Math.max(0, availableHeight - 100 - 20)}px`
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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const stayEnoughDebounce = useDebouncedCallback(useEffectEvent(() => {
    if (highlightRef.current?.getColorKey(curWord) === 'UnSeen') {
      highlightRef.current?.markWord(curWord, 'Searched', curRange)
    }
  }), 5000)

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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const hideDelay = useDebouncedCallback(useEffectEvent(() => {
    if (isPinned) return
    setIsOpen(false)
  }), 500)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const showDelay = useDebouncedCallback(useEffectEvent(() => {
    setIsOpen(true)
  }), 200)

  const onPanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) return
    e.preventDefault()
    e.stopPropagation()
    hideDelay.cancel()
  }

  const updateWord = useEffectEvent((segment: SegmentedToken, range: Range, rect: DOMRect) => {
    setIsDetached(false) // Finding a new word re-attaches the panel
    stayEnoughDebounce.cancel()
    setCurWord(segment.baseForm)
    setCurRange(range)
    if (!isPinned) {
      refs.setPositionReference({
        getBoundingClientRect: () => rect,
      })
    }
    if (!isPinned && anchorRef.current) {
      // Position the anchor element based on the word's rect, including scroll offsets
      Object.assign(anchorRef.current.style, {
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.top + window.scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
    }
  })

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const updateWordDebounce = useDebouncedCallback(updateWord, 150)

  const onMouseMove = useEffectEvent(async (e: MouseEvent) => {
    if (isDragging.current) return

    const highlighter = highlightRef.current
    if (!highlighter) return
    mousePointerRef.current = { x: e.clientX, y: e.clientY }

    const { range, rect } = highlighter.getRangeAtPoint(e) ?? {}

    if (range && rect) {
      // If the word is different, debounce the update.
      // If it's the same, we still call cancel to clear any pending hide timers.
      if (range !== curRange) {
        const segment = highlighter.getSegmentByRange(range)
        segment && updateWordDebounce(segment, range, rect)
      }
      hideDelay.cancel()
      showDelay()
    } else {
      if (!isPinned) {
        refs.setPositionReference(null)
      }
      updateWordDebounce.cancel()
      showDelay.cancel()
      hideDelay()
    }
  })

  const panelEnterPosRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })

  const onPanelMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    panelEnterPosRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    hideDelay.cancel()
    updateWordDebounce.cancel()
  }, [hideDelay, updateWordDebounce])

  const onPanelMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      panelEnterPosRef.current.x !== e.nativeEvent.clientX
      && panelEnterPosRef.current.y !== e.nativeEvent.clientY) {
      hideDelay()
    }
  }

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

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

  const onDragging = useEffectEvent((e: MouseEvent) => {
    if (!isDragging.current || !isPinned) return
    if (!panelRef.current) return

    const newX = e.clientX - dragOffset.current.x
    const newY = e.clientY - dragOffset.current.y

    latestPosition.current = { x: newX, y: newY }

    // Update style directly to avoid re-renders
    panelRef.current.style.transform = `translate(${newX}px, ${newY}px)`
  })

  const onDragEnd = useEffectEvent(() => {
    if (!isDragging.current) return
    isDragging.current = false

    // Sync React state with the final position
    setPosition(latestPosition.current)
  })

  useEffect(() => {
    window.addEventListener('mousemove', onDragging)
    window.addEventListener('mouseup', onDragEnd)
    return () => {
      window.removeEventListener('mousemove', onDragging)
      window.removeEventListener('mouseup', onDragEnd)
    }
  }, [])

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
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
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
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
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
      e.stopImmediatePropagation()
    }
  })

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const floatingProps = isManuallyPositioned ? {} : getFloatingProps()

  const floatingPositionStyle = isManuallyPositioned
    ? {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      transform: `translate(${position.x}px, ${position.y}px)`,
      transition: 'none',
    }
    : floatingStyles

  return (
    <>
      <div ref={styleContainerRef}></div>
      {/* This is the anchor for the popover */}
      <div
        id="yama-anchor"
        ref={anchorRef}
        inert
        className={cn(
          'pointer-events-none absolute bg-foreground/10 dark:bg-foreground/30  z-1000000000  transition-all will-change-auto mix-blend-color-burn',
          !isOpen && 'bg-transparent!',
        )}
      />
      <div
        id="yama-popover"
        className="isolate z-1000000000 rounded-lg border-2 border-border bg-muted text-card-foreground shadow-xl select-text selection:bg-primary selection:text-primary-foreground"
        ref={(node) => {
          refs.setFloating(node)
          panelRef.current = node
        }}
        data-popover-open={isOpen}
        inert={!isOpen}
        style={{
          ...floatingPositionStyle,
          width: settings?.misc?.panelWidth ?? 384,
          maxWidth: '90vw',
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
            minHeight: '150px',
          }}
          ref={containerRef}
        >
          {!!settings?.ai && <AiExplain word={curWord} range={curRange} ref={aiExplainRef} panelRef={panelRef} />}
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
