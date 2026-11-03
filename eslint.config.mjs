import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Allow explicit any in limited cases (store immer drafts)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Unused vars — warn, not error, during active development
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Enforce consistent imports
      'import/no-duplicates': 'error',
      // React
      'react/self-closing-comp': 'warn',
      'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
      // Hooks
      'react-hooks/exhaustive-deps': 'warn',
      // Next.js
      '@next/next/no-html-link-for-pages': 'error',
    },
  },
]

export default eslintConfig
