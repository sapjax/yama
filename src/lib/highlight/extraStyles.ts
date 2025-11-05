/**
 * Special styles for YouTube subtitles to fixed their position.
 * avoid jumping when hovering controls.
 */
const youtubeSubtitleStyle = `
  .ytp-delhi-modern .caption-window.ytp-caption-window-bottom {
    margin-bottom: 3.5% !important;
  }
`

export const extraStyles = [youtubeSubtitleStyle].join('\n')
