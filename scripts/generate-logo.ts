import { createCanvas } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'
import { drawIcon } from '../src/lib/utils/icon'

function generateIcon(size: number) {
  const canvas = createCanvas(size, size)
  drawIcon(canvas as any, size, 'light')
  return canvas
}

const size = 128
const canvas = generateIcon(size)
const buffer = canvas.toBuffer('image/png')
const outputPath = path.resolve(__dirname, '..', 'public', 'logo.png')

fs.writeFileSync(outputPath, buffer)

console.log(`Logo generated and saved to ${outputPath}`)
