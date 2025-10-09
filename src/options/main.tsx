import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Options } from './Options'
import '../assets/global.css'
import { initTheme } from '@/lib/theme'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Options />
  </StrictMode>,
)
