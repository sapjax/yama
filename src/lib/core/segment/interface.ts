export type SegmentedToken = {
  surfaceForm: string
  baseForm: string
  startIndex: number
  endIndex: number
  reading: string
  isWordLike: boolean
  pos?: string
}

export type SegmentOptions = {
  mergeTokens?: boolean
}

export interface Segmenter {
  isReady: boolean
  init (): Promise<void>
  segment(input: string, options?: SegmentOptions): SegmentedToken[]
}
