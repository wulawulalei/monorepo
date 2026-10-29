'use strict';

module.exports = [
  {
    // extends: ['prettier'],
    // plugins: ['prettier'],
    rules: {
      'prettier/prettier': 'error',
      'max-lines': [
        'warn',
        { max: 800, skipBlankLines: true, skipComments: true },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
