import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React configuration
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
      "unused-imports": unusedImports,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Console usage - ERROR in production, warn in dev
      "no-console": process.env.NODE_ENV === 'production' 
        ? ["error", { allow: ["warn", "error"] }]
        : ["warn", { allow: ["warn", "error"] }],

      // CRITICAL RULES - Now enforced as errors
      "@typescript-eslint/no-explicit-any": "error",  // Was: warn - Forces proper typing
      "@typescript-eslint/no-non-null-assertion": "error",  // Was: warn - Prevents null reference bugs
      
      // Pre-existing technical debt - still warnings but tracked
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-undef": "off", // TypeScript handles undefined references
      "no-prototype-builtins": "warn",
      "no-empty": "warn",
      "no-fallthrough": "warn",
      "no-control-regex": "warn",
      "no-cond-assign": "warn",
      "no-func-assign": "warn",
      "@typescript-eslint/no-this-alias": "warn",

      // TypeScript - Progressive tightening
      "@typescript-eslint/no-unused-vars": "off", // Replaced by unused-imports
      "unused-imports/no-unused-imports": "warn",
      // Disabled: too noisy, 172 warnings of low priority - will fix incrementally
      // "unused-imports/no-unused-vars": ["warn", {...}],
      "unused-imports/no-unused-vars": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/triple-slash-reference": "warn",

      // General - downgrade some rules to warnings
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "no-case-declarations": "warn",

      // React
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off", // Using TypeScript
      "react/jsx-no-target-blank": "warn",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],

      // React Hooks
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js - disabled: high false-positive rate for external links and SVGs
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // General best practices
      "no-debugger": "warn",
      "no-alert": "off", // 38 occurrences - will migrate to toast/dialog incrementally
      "no-var": "warn",
      "no-constant-condition": "warn",
      "no-misleading-character-class": "warn",
      "no-unsafe-finally": "warn",
      "no-unreachable": "warn",
      "no-self-assign": "warn",
      "no-const-assign": "warn",
      "no-constant-binary-expression": "warn",
      "no-empty-pattern": "warn",
      "no-unsafe-optional-chaining": "warn",
      "no-async-promise-executor": "warn",
      "no-redeclare": "warn",
      "valid-typeof": "warn",
      "getter-return": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",

      // Disable rules that may be referenced in bundled code but aren't installed
      // These rules don't exist in our config but may be referenced in eslint-disable comments

      "eqeqeq": ["warn", "always", { null: "ignore" }],
    },
  },

  // Relaxed rules for test files and scripts
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/tests/**/*",
      "**/e2e/**/*",
      "**/*.mjs",
      "**/*.js",
      "**/test-*.ts",
      "**/test-*.mjs",
      "**/*setup.ts",
      "**/*setup.mjs",
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-vars": "off",
      "no-debugger": "off",
      "no-redeclare": "off",  // Common to redeclare mocks in test blocks
    },
  },

  // Relaxed rules for CLI tools, migration scripts, and config files
  {
    files: [
      "lib/db/**/*.ts",
      "lib/test-utils/**/*.ts",
      "vitest.config*.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "_archive/**",
      "storybook-static/**",
      "**/chunks/**",
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",  // Generated Playwright test reports
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "scripts/**",  // Use root eslint.config.mjs for scripts
      "db/**",
      "supabase/**",
    ],
  },
];
