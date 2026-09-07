import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';
import next from '@next/eslint-plugin-next';
import globals from 'globals';
import unicorn from 'eslint-plugin-unicorn';
import importPlugin from 'eslint-plugin-import';
import boundaries from 'eslint-plugin-boundaries';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      prettier,
      '@next/next': next,
      unicorn,
      import: importPlugin,
      boundaries,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: true,
        node: true,
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        { type: 'server', pattern: 'src/server/**' },
        { type: 'features', pattern: 'src/features/**' },
        { type: 'components', pattern: 'src/components/**' },
        { type: 'hooks', pattern: 'src/hooks/**' },
        { type: 'lib', pattern: 'src/lib/**' },
        { type: 'types', pattern: 'src/types/**' },
        { type: 'constants', pattern: 'src/constants/**' },
      ],
    },
    rules: {
      // 기본
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...next.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'prettier/prettier': 'error',

      // 콘솔 & any
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // 네이밍 컨벤션
      '@typescript-eslint/naming-convention': [
        'error',
        // 기본 변수: camelCase, UPPER_CASE, PascalCase 허용
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        // 함수: camelCase, PascalCase (컴포넌트)
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        // 타입/인터페이스: PascalCase
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // boolean 규칙은 코드리뷰로 해결
        // PascalCase에 is/has/can/should prefix 필요
      ],

      // 파일명: kebab-case 또는 PascalCase
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
          },
        },
      ],

      // Import 순서
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [
            { pattern: 'react', group: 'builtin', position: 'before' },
            { pattern: 'next/**', group: 'builtin', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
        },
      ],
      'import/no-duplicates': 'error',

      // Feature 간 import 금지
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // app은 모든 곳에서 import 가능
            {
              from: { type: 'app' },
              allow: { to: { type: ['server', 'features', 'components', 'hooks', 'lib', 'types', 'constants'] } },
            },
            { from: { type: 'server' }, allow: { to: { type: ['server', 'types', 'constants'] } } },
            // features는 공용만 import 가능 (다른 feature 금지)
            {
              from: { type: 'features' },
              allow: { to: { type: ['components', 'hooks', 'lib', 'types', 'constants'] } },
            },
            // 공용은 공용끼리만
            {
              from: { type: 'components' },
              allow: { to: { type: ['components', 'hooks', 'lib', 'types', 'constants'] } },
            },
            { from: { type: 'hooks' }, allow: { to: { type: ['hooks', 'lib', 'types', 'constants'] } } },
            { from: { type: 'lib' }, allow: { to: { type: ['lib', 'types', 'constants'] } } },
            { from: { type: 'types' }, allow: { to: { type: 'types' } } },
            { from: { type: 'constants' }, allow: { to: { type: ['constants', 'types'] } } },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/server', '@/server/*'], message: 'Client-capable modules cannot import server-only code.' },
          ],
        },
      ],
    },
  },
  // Node.js 스크립트
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // 테스트 및 스토리북 파일 규칙 완화
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@next/next/no-img-element': 'off',
      'no-console': 'off',
      'import/order': 'off',
    },
  },
  {
    ignores: ['.next/*', 'node_modules/*', 'storybook-static/*', '*.config.*'],
  },
];
