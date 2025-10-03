import type { Plugin } from 'postcss'
import type { Config } from 'postcss-load-config'

// @property in shadow DOM
const removeAtProperty: Plugin = {
  postcssPlugin: 'remove-at-property',
  AtRule: {
    property(atRule) {
      atRule.remove()
    },
  },
}

// https://github.com/tailwindlabs/tailwindcss/blob/v4.1.11/packages/tailwindcss/src/ast.ts#L697-L705
const transformPropertiesLayer: Plugin = {
  postcssPlugin: 'transform-properties-layer',
  AtRule: {
    layer(atRule) {
      if (atRule.params !== 'properties') {
        return
      }

      atRule.walkAtRules('supports', (supportsRule) => {
        const supportedRules = supportsRule.nodes

        supportsRule.remove()

        if (supportedRules) {
          atRule.append(supportedRules)
        }
      })
    },
  },
}

const config: Config = {
  plugins: [removeAtProperty, transformPropertiesLayer],
}

export default config
