import { getContrastingColor, rgbStringToHsva } from '@uiw/color-convert'
import { AppSettings, defaultColors, defaultReviewColor, SETTINGS_KEY, type ColorSettings, type ReviewColorSettings } from '@/lib/settings'

type Colors = ColorSettings & ReviewColorSettings
type ColorKey = keyof Colors

const MarkStyles = [
  'none',
  'background',
  'background-underline',
  'text',
  'underline',
  'double-underline',
  'wavy',
  'dotted',
  'dashed',
]

function getCSSHighlightKey(colorKey?: keyof Colors) {
  return `yama-${colorKey?.toLowerCase()}`
}

function createCSSHighlights() {
  const allColors = { ...defaultColors, ...defaultReviewColor }
  const highlights = new Map<ColorKey, Highlight>()
  for (const key in allColors) {
    const highlight = new Highlight()
    CSS.highlights.set(getCSSHighlightKey(key as ColorKey), highlight)
    highlights.set(key as ColorKey, highlight)
  }
  return highlights
}

function genMarkStyles(colors: Colors, markStyle: typeof MarkStyles[number] = 'text') {
  if (markStyle === 'none') {
    return ''
  }

  return Object.entries(colors)
    .map(([status, { color, enabled }]) => {
      const hlKey = getCSSHighlightKey(status as keyof Colors)
      const textColor = getContrastingColor(rgbStringToHsva(color))

      const cssVarDefinition = `
        :root {
          --${hlKey}: ${color}
        }
      `
      if (!enabled) return cssVarDefinition

      const styleMappings: Record<string, string> = {
        'background': `
        ::highlight(${hlKey}) {
          color: ${textColor};
          background-color: ${color};
        }
      `,
        'background-underline': `
        ::highlight(${hlKey}) {
          color: ${textColor};
          background-color: ${color};
          text-decoration: underline;
          text-decoration-color: ${textColor};
        }
      `,
        'text': `
        ::highlight(${hlKey}) {
          color: ${color};
        }
      `,
        'underline': `
        ::highlight(${hlKey}) {
          text-decoration: underline;
          text-decoration-color: ${color};
        }
      `,
        'double-underline': `
        ::highlight(${hlKey}) {
          text-decoration: underline double;
          text-decoration-color: ${color};
        }
      `,
        'wavy': `
        ::highlight(${hlKey}) {
          text-decoration: underline wavy;
          text-decoration-color: ${color};
        }
      `,
        'dotted': `
        ::highlight(${hlKey}) {
          text-decoration: underline dotted;
          text-decoration-color: ${color};
        }
      `,
        'dashed': `
        ::highlight(${hlKey}) {
          text-decoration: underline dashed;
          text-decoration-color: ${color};
        }
      `,
      }

      return cssVarDefinition + '\n' + styleMappings[markStyle]
    }).join('\n')
}

function injectColors(settings: AppSettings) {
  const style = document.createElement('style')
  style.id = 'yama-style'
  style.textContent = genMarkStyles(
    { ...settings.colors, ...settings.reviewColors },
    settings.markStyle,
  )
  document.head.appendChild(style)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) {
      const newSettings = changes[SETTINGS_KEY].newValue
      style.textContent = genMarkStyles(
        { ...newSettings.colors, ...newSettings.reviewColors },
        newSettings.markStyle,
      )
    }
  })
}

export { type ColorKey, genMarkStyles, getCSSHighlightKey, createCSSHighlights, MarkStyles, injectColors }
