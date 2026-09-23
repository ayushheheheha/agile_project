import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process:  'readonly',
        require:  'readonly',
        module:   'readonly',
        exports:  'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console:  'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Buffer:   'readonly',
        // Jest globals
        describe: 'readonly',
        test:     'readonly',
        expect:   'readonly',
        it:       'readonly',
        beforeEach: 'readonly',
        afterEach:  'readonly',
        beforeAll:  'readonly',
        afterAll:   'readonly',
        jest:     'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'eqeqeq': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
];
