import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import styleText from './style.css?inline'

const host = document.createElement('yama-root')
host.id = 'yama-root'
document.body.appendChild(host)

const shadow = host.attachShadow({ mode: 'open' })
const style = document.createElement('style')
style.textContent = styleText
shadow.appendChild(style)

const appContainer = document.createElement('div')
shadow.appendChild(appContainer)

createRoot(appContainer).render(
  <App />,
)
