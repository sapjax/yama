import React, { useState, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import App from './App.tsx'
import styleText from './style.css?inline'

// =========== Helper Functions ===========

function createStyledShadowRoot(hostElement: HTMLElement, styleText: string): ShadowRoot {
  const shadow = hostElement.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = styleText
  shadow.appendChild(style)
  return shadow
}

function useFullscreenContainer() {
  const [fullscreenContainer, setFullscreenContainer] = useState<Element | null>(null)
  useEffect(() => {
    const handleFullscreenChange = () => setFullscreenContainer(document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    handleFullscreenChange()
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  return fullscreenContainer
}

// =========== Core Component ===========

interface FullscreenManagerProps {
  styleText: string
  children: React.ReactNode
}

function FullscreenManager({ styleText, children }: FullscreenManagerProps) {
  const fullscreenContainer = useFullscreenContainer()

  // Memoize the entire portal infrastructure. It's only created once.
  const portal = useMemo(() => {
    const host = document.createElement('yama-portal-host')
    const shadow = createStyledShadowRoot(host, styleText)
    return { host, shadow }
  }, [styleText])

  useEffect(() => {
    if (fullscreenContainer) {
      // Entering fullscreen: attach the portal host.
      fullscreenContainer.appendChild(portal.host)
      return () => {
        // Exiting fullscreen: remove the portal host.
        if (portal.host.parentNode) {
          fullscreenContainer.removeChild(portal.host)
        }
      }
    }
  }, [fullscreenContainer, portal])

  // If in fullscreen, portal the children. Otherwise, render them directly.
  return fullscreenContainer ? createPortal(children, portal.shadow) : <>{children}</>
}

// =========== App Mounting ===========

let host = document.getElementById('yama-root')
if (!host) {
  host = document.createElement('yama-root')
  host.id = 'yama-root'
  document.body.appendChild(host)

  const shadow = createStyledShadowRoot(host, styleText)

  const appContainer = document.createElement('div')
  shadow.appendChild(appContainer)

  createRoot(appContainer).render(
    <FullscreenManager styleText={styleText}>
      <App />
    </FullscreenManager>,
  )
}
