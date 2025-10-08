import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtCbMqwU07jbNiel7b1HVlLM/emo5lgU12lW8RHoC/lJQWygbSDNrBs9M+iazY9Bu28JiN9mmw5TXUeD53rRgXdrzhWIlTsvtB/USr2KoeIHoUr7XMjYulYOObt/B6PpcDfYPqLhn8nBOdhgCf2LM0iQKhlU6KclO64wBsMMWHKGoS7opb4tDbWYmSVp2U7U8EpOZHVcBZfPowmPSZYE7LRT3geec8tKeL23bQCsrhWlzSaZCTebG2o2YO6zVCAVzXfG/eusWj3dY7Ovz8rAc10dj2PCl5xyfUBFK/yv/PS7YPiaz5dA2lerQEc1kqRNByd08EYTxzxaFtFNSou2+iwIDAQAB',
  icons: {
    128: 'public/logo.png',
  },
  action: {
    default_icon: {
      32: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  host_permissions: ['*://*/*', 'file://*/*'],
  permissions: [
    'storage',
    'tabs',
    'tts',
    'scripting',
    'activeTab',
    'offscreen',
  ],
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  web_accessible_resources: [
    {
      resources: ['assets/*.js', '*.png'],
      matches: ['<all_urls>', 'file://*/*'],
    },
  ],
  content_security_policy: {
    extension_pages: 'script-src \'self\' \'wasm-unsafe-eval\';',
  },
})
