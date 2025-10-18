import type { WordStatus } from '@/lib/core/mark'
import type { ColorScheme } from '@/lib/utils/colorScheme'

const colors = {
  light: {
    body: '#eeeeee', // Dark gray-blue
    outline: 'black',
    badge: '#666666',
    active: {
      body: '#5afc00',
    },
  },
  dark: {
    body: 'black', // Dark gray-blue
    outline: '#eeeeee',
    badge: '#cccccc',
    active: {
      body: '#5afc00',
    },
  },
}

export function drawIcon(
  canvas: OffscreenCanvas,
  size: number = 32,
  colorScheme?: ColorScheme,
  isActive: boolean = false,
) {
  const context = canvas.getContext('2d')!

  const color = colors[colorScheme ?? 'light']

  const scale = size / 32 // Scale factor from original 32px size
  const lineWidth = 2 * scale

  // A larger, two-peak mountain shape
  context.beginPath()
  context.moveTo(lineWidth / 2, size - lineWidth / 2)
  context.lineTo(10 * scale, lineWidth) // Taller first peak
  context.lineTo(16 * scale, 16 * scale) // Deeper valley
  context.lineTo(24 * scale, 10 * scale) // Lower second peak
  context.lineTo(size - lineWidth / 2, size - lineWidth / 2)
  context.closePath()
  context.fillStyle = isActive ? color.active.body : color.body
  context.strokeStyle = color.outline
  context.lineWidth = lineWidth
  context.fill()
  context.stroke()

  return context
}

let cachedTheme: ColorScheme = 'light'

export function setIconTheme(theme: ColorScheme = 'light') {
  cachedTheme = theme
}

export function updateIcon(theme: ColorScheme = 'light', isActive: boolean = false) {
  if (theme) {
    cachedTheme = theme
  }
  const size = 32
  const canvas = new OffscreenCanvas(size, size)
  const context = drawIcon(canvas, size, theme, isActive)

  const imageData = context.getImageData(0, 0, size, size)
  chrome.action.setIcon({ imageData })
}

export function setIconBadgeError(message: string) {
  chrome.action.setBadgeText({ text: '❌' })
  chrome.action.setBadgeTextColor({ color: 'red' })
  chrome.action.setBadgeBackgroundColor({ color: colors[cachedTheme].badge })
  chrome.action.setTitle({ title: '❌' + message })
}

export function setIconBadgeCounting(counting: Record<WordStatus, number>) {
  const total = counting.Tracking + counting.Never_Forget
  let badgeText = total > 0 ? String(total) : ''
  if (total >= 10000) {
    badgeText = badgeText.at(0)! + badgeText.at(1) + 'k'
  }
  chrome.action.setBadgeText({ text: badgeText })
  chrome.action.setBadgeTextColor({ color: colors[cachedTheme].body })
  chrome.action.setBadgeBackgroundColor({ color: colors[cachedTheme].badge })
  chrome.action.setTitle({ title: `Tracking: ${counting.Tracking} | Never_Forget: ${counting.Never_Forget}` })
}

export function clearIconBadge() {
  chrome.action.setBadgeText({ text: '' })
}
