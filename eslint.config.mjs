import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import stylistic from '@stylistic/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import tailwind from 'eslint-plugin-tailwindcss'
import css from '@eslint/css'

export default [
  {
    files: [
      'src/**/*.{js,jsx,ts,tsx}',
    ],
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': ts,
      '@stylistic': stylistic,
      'tailwindcss': tailwind,
    },
    // extends: ['react-hooks/recommended'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.app.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...stylistic.configs.recommended.rules,
      ...tailwind.configs.recommended.rules,

      // Custom formatting rules
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/brace-style': ['error', '1tbs'],

      // react compiler
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      tailwindcss: {
        config: `${import.meta.dirname}/src/content/style.css`,
      },
    },
  },
  {
    files: [
      'scripts/**/*.{js,ts}',
      'eslint.config.mjs',
      'vite.config.ts',
      'manifest.config.ts',
      'postcss.config.ts',
    ],
    plugins: {
      '@typescript-eslint': ts,
      '@stylistic': stylistic,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      ...stylistic.configs.recommended.rules,
      // Custom formatting rules
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/brace-style': ['error', '1tbs'],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'src/components/ui/**'],
  },
  {
    files: ['**/*.css'],
    plugins: {
      css,
    },
    language: 'css/css',
    rules: {
      'css/no-duplicate-imports': 'error',
    },
  },
]
