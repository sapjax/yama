export type ColorScheme = 'light' | 'dark'

export function listenColorSchemeChange(callback: (colorScheme: ColorScheme) => void) {
  const colorSchemeQueryList = window.matchMedia('(prefers-color-scheme: dark)')

  colorSchemeQueryList.addEventListener('change', ({ matches }) => {
    callback(matches ? 'dark' : 'light')
  })

  callback(colorSchemeQueryList.matches ? 'dark' : 'light')
}
