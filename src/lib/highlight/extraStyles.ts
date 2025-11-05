/**
 * Special styles for YouTube subtitles to fixed their position.
 * avoid jumping when hovering controls.
 */
const youtubeSubtitleStyle = `
  .ytp-delhi-modern .caption-window.ytp-caption-window-bottom {
    margin-bottom: calc(var(--yt-delhi-bottom-controls-height, 72px) + 2px) !important;
  }
`

export const extraStyles = [youtubeSubtitleStyle].join('\n')
