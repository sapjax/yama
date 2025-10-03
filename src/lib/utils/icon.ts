export function updateIconBadge(count: number) {
  const size = 32
  const canvas = new OffscreenCanvas(size, size)
  const context = drawIcon(canvas, size)

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
    context.fillStyle = 'white'
    context.fillText(badgeText, size / 2, plaqueY + plaqueHeight / 2 - 1)
  }

  const imageData = context.getImageData(0, 0, size, size)
  chrome.action.setIcon({ imageData })
  chrome.action.setTitle({ title: badgeText })
}

export function drawIcon(canvas: OffscreenCanvas, size: number = 32) {
  const context = canvas.getContext('2d')!

  const scale = size / 32 // Scale factor from original 32px size
  const lineWidth = 1 * scale

  // A larger, two-peak mountain shape
  context.beginPath()
  context.moveTo(lineWidth, size - lineWidth)
  context.lineTo(10 * scale, 2 * scale) // Taller first peak
  context.lineTo(16 * scale, 16 * scale) // Deeper valley
  context.lineTo(24 * scale, 10 * scale) // Lower second peak
  context.lineTo(size - lineWidth, size - lineWidth)
  context.closePath()
  context.fillStyle = '#4A5568' // Dark gray-blue
  context.strokeStyle = 'white' // Light gray for outline
  context.lineWidth = 2
  context.fill()
  context.stroke()

  // A more prominent snow cap on the first peak
  context.beginPath()
  context.moveTo(10 * scale, 2 * scale) // Peak
  context.lineTo(14 * scale, 14 * scale) // Bottom right
  context.lineTo(7 * scale, 14 * scale) // Bottom left
  context.closePath()
  context.fillStyle = 'white'
  context.fill()
  context.closePath()

  // add snow cap on the second peak
  context.beginPath()
  context.moveTo(24 * scale, 10 * scale) // Peak
  context.lineTo(25 * scale, 14 * scale) // Bottom right
  context.lineTo(20 * scale, 14 * scale) // Bottom left
  context.closePath()
  context.fillStyle = 'white'
  context.fill()
  return context
}
