'use strict';

const eslintJs = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

const commonRules = {
  // 文件过长只提示，避免历史文件一次性阻塞质量门禁。
  'max-lines': ['warn', { max: 800, skipBlankLines: true, skipComments: true }],
};

const javascriptFiles = ['**/*.{js,cjs,mjs,jsx,ts,tsx}'];

module.exports = [
  {
    // 构建产物与依赖目录不属于源码检查范围。
    ignores: [
      '**/node_modules/**',
      '**/lib/**',
      '**/es/**',
      '**/dist/**',
      '**/docs-dist/**',
      '**/.dumi/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },
  {
    files: javascriptFiles,
    ...eslintJs.configs.eslintRecommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      ...eslintJs.configs.recommended.rules,
      ...commonRules,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // 类型检查由 tsc 负责，ESLint 只处理代码质量。
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.cjs', 'packages/config/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  prettierConfig,
];
