export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'no-debugger': 'error',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'valid-typeof': 'error',
    },
  },
];
