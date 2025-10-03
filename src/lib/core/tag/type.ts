interface Tag {
  name: string
  items: string[]
}

type JLPTLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5'

interface JLPT extends Tag {
  name: 'JLPT'
  items: JLPTLevel[]
}

export type { Tag, JLPT, JLPTLevel }
