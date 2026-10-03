export default [
  {
    ignores: ['dist/', 'node_modules/', '*.config.*'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': await import('@typescript-eslint/eslint-plugin'),
      vitest: await import('eslint-plugin-vitest'),
    },
    rules: {
      ...(await import('@typescript-eslint/eslint-plugin')).configs.recommended.rules,
      ...(await import('eslint-plugin-vitest')).configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
    },
  },
];