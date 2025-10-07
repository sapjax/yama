import type { Theme } from './theme'

const colors = {
  light: {
    body: '#666666', // Dark gray-blue
    outline: '#666666',
    badge: 'white',
  },
  dark: {
    body: '#eeeeee', // Dark gray-blue
    outline: '#eeeeee',
    badge: 'black',
  },
  unknown: {
    body: '#eeeeee', // Dark gray-blue
    outline: 'black',
    badge: 'black',
  },
}

export function updateIconBadge(count: number, theme?: Theme) {
  const size = 32
  const canvas = new OffscreenCanvas(size, size)
  const context = drawIcon(canvas, size, theme)

  let badgeText = ''
  if (count > 0) {
    badgeText = String(count)
    if (count >= 10000) {
      badgeText = Math.floor(count / 1000) + 'k'
    }

    // Text properties
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const fontSize = badgeText.length > 3 ? 11 : 12
    context.font = `bold ${fontSize}px sans-serif`

    // Semi-transparent plaque behind the text
    const plaqueHeight = fontSize + 4
    const plaqueY = 18 // Adjusted Y for the new mountain shape

    // White text on the plaque
    context.fillStyle = colors[theme ?? 'unknown'].badge
    context.fillText(badgeText, size / 2, plaqueY + plaqueHeight / 2 - 1)
  }

  const imageData = context.getImageData(0, 0, size, size)
  chrome.action.setIcon({ imageData })
  chrome.action.setTitle({ title: badgeText })
}

export function drawIcon(canvas: OffscreenCanvas, size: number = 32, theme?: Theme) {
  const context = canvas.getContext('2d')!

  const color = colors[theme ?? 'unknown']

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
  context.fillStyle = color.body
  context.strokeStyle = color.outline
  context.lineWidth = lineWidth
  context.fill()
  context.stroke()

  return context
}
