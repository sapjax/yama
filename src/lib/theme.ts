import { getSettings, AppSettings, SETTINGS_KEY } from './settings'
import defaultTheme from '@/assets/themes/default.css?raw'
import claudeTheme from '@/assets/themes/claude.css?raw'
import neo_brutalismTheme from '@/assets/themes/neo_brutalism.css?raw'
import pastel_dreamsTheme from '@/assets/themes/pastel_dreams.css?raw'

const STYLE_ID = 'yama-theme'

const themes = {
  default: defaultTheme,
  claude: claudeTheme,
  neo_brutalism: neo_brutalismTheme,
  pastel_dreams: pastel_dreamsTheme,
}

function formatStyle(style: string = '') {
  return style
    // remove `@layer base { ... } wrapper`
    .replace(
      /\@layer\s+base\s*\{([\s\S]*?)\}\s+\}/g,
      `$1
          }
        `,
    )
    // :root -> :root, :host
    .replace(
      /\:root\s*\{([\s\S]*?)\}/g,
      `:root, :host {$1
          }
        `,
    )
    // .dark -> @media (prefers-color-scheme: dark)
    .replace(
      /\.dark\s*\{([\s\S]*?)\}/g,
      `@media (prefers-color-scheme: dark) {
          :root, :host {$1
            }
          }`,
    )
}

export function getThemeCss(themeSettings: AppSettings['theme']): string {
  if (themeSettings.type === 'custom') {
    const formattedStyle = themeSettings.custom
    console.log(formatStyle(formattedStyle))
    return formatStyle(themes.default + '\n' + formattedStyle)
  }
  return formatStyle(themes[themeSettings.type] || themes.default)
}

export async function initTheme(container?: HTMLElement) {
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    ;(container ?? document.head).appendChild(style)
  }

  const settings = await getSettings()
  style.textContent = getThemeCss(settings.theme)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) {
      const newSettings = changes[SETTINGS_KEY].newValue as AppSettings
      if (style) {
        style.textContent = getThemeCss(newSettings.theme)
      }
    }
  })
}
