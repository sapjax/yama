import { useRef, PropsWithChildren, useState, useEffect, useCallback, useImperativeHandle } from 'react'
import { FloatingArrow, arrow, flip, hide, offset, shift, size, useFloating, useDismiss, useInteractions, VirtualElement, useTransitionStyles } from '@floating-ui/react'
import clsx from 'clsx'

export type PanelHandler = {
  setTrigger: (trigger: VirtualElement | null) => void
}

type PanelProps = PropsWithChildren<{
  // if the panel has been open for more than 2s, call this callback when closing
  onStayEnough?: () => void
  ref: React.RefObject<PanelHandler | null>
}>

function Panel(props: PanelProps) {
  const { children, ref, onStayEnough } = props
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

  useImperativeHandle(ref, () => {
    return {
      setTrigger: (trigger: VirtualElement | null) => {
        if (!trigger) {
          refs.setPositionReference(null)
        } else {
          refs.setPositionReference({
            getBoundingClientRect: () => {
              const rects = trigger.getClientRects!()
              // for multiple line selections, pick the closest rect to the mouse pointer
              if (rects.length > 1) {
                const pointer = mousePointerRef.current
                let closestRect = rects[0]
                let closestDistance = Infinity
                for (const rect of rects) {
                  const rectCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                  }
                  const distance = Math.hypot(rectCenter.x - pointer.x, rectCenter.y - pointer.y)
                  if (distance < closestDistance) {
                    closestDistance = distance
                    closestRect = rect
                  }
                }
                return closestRect
              } else {
                return rects[0]
              }
            },
            getClientRects: () => trigger.getClientRects!(),
          })
        }
      },
    }
  }, [refs])

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

  const { styles } = useTransitionStyles(context)

  const dismiss = useDismiss(context)
  const { getFloatingProps } = useInteractions([
    dismiss,
  ])

  const stayTimeRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    if (isOpen) {
      stayTimeRef.current && clearTimeout(stayTimeRef.current)
      stayTimeRef.current = setTimeout(() => {
        onStayEnough?.()
      }, 5000)
    } else {
      stayTimeRef.current && clearTimeout(stayTimeRef.current)
    }
  }, [isOpen, onStayEnough])

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hidePopupDelay = (delay = 0) => {
    hideTimer.current && clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setIsOpen(false)
    }, delay)
  }

  const showPopupDelay = () => {
    showTimer.current && clearTimeout(showTimer.current)
    showTimer.current = setTimeout(() => {
      setIsOpen(true)
    }, 200)
  }
  const clearShowTimer = () => {
    showTimer.current && clearTimeout(showTimer.current)
  }
  const clearHideTimer = () => {
    hideTimer.current && clearTimeout(hideTimer.current)
  }

  const onMouseEnter = () => {
    hideTimer.current && clearTimeout(hideTimer.current)
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    const panelRect = refs.floating.current?.getBoundingClientRect()
    const isInsidePanel = isOpen && panelRect
      ? e.clientX >= panelRect.left && e.clientX <= panelRect.right
      && e.clientY >= panelRect.top && e.clientY <= panelRect.bottom
      : false

    if (isInsidePanel) {
      clearHideTimer()
    } else {
      mousePointerRef.current = { x: e.clientX, y: e.clientY }
      const triggerRect = refs.reference.current?.getBoundingClientRect()
      const isInsideTrigger = triggerRect
        ? e.clientX >= triggerRect.left && e.clientX <= triggerRect.right
        && e.clientY >= triggerRect.top && e.clientY <= triggerRect.bottom
        : false

      if (isInsideTrigger) {
        clearHideTimer()
        showPopupDelay()
      } else {
        clearShowTimer()
        isOpen && hidePopupDelay(500)
      }
    }
  }, [isOpen, refs])

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [onMouseMove])

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 isolate z-[1000000000] w-96 rounded-lg border-2 border-border bg-card text-card-foreground shadow-xl',
      )}
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
      onMouseEnter={onMouseEnter}
    >
      <FloatingArrow
        ref={arrowRef}
        context={context}
        tipRadius={2}
        strokeWidth={2}
        stroke="var(--border)"
        fill="var(--card)"
      />
      {children}
    </div>
  )
}

export default Panel
