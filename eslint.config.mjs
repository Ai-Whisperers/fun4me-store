/**
 * Root ESLint Configuration
 *
 * Standalone config for root-level scripts.
 * Run from repo root: npx eslint scripts/
 *
 * Note: web/ has its own eslint.config.mjs for the Next.js app.
 */
import js from './web/node_modules/@eslint/js/src/index.js'

export default [
  // Base JavaScript rules
  js.configs.recommended,

  // Scripts configuration
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // Relaxed rules for CLI scripts
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-undef': 'off',
    },
  },

  // Ignore everything except scripts
  {
    ignores: ['web/**', 'node_modules/**', 'docs/**', '.git/**'],
  },
]
