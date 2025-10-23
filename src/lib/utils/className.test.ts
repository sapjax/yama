import { describe, it, expect } from 'vitest'
import { cn } from './className'

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('should handle conditional classes', () => {
    expect(cn('a', false, 'b', { c: true, d: false })).toBe('a b c')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4 font-bold')).toBe('py-1 px-4 font-bold')
  })

  it('should return an empty string for all falsy values', () => {
    expect(cn(false, null, undefined, 0, '')).toBe('')
  })
})
