import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/generated/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Underscore prefix marks intentionally unused params (e.g. Express error middleware signature).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
