export type Theme = 'light' | 'dark'

export function getThemeMode(): Theme {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
  return isDarkMode ? 'dark' : 'light'
}
