const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  globalIgnores([
    'dist/',
    'node_modules/',
    '.expo/',
    'src/content/index.generated.ts',
    'server/',
    'workers/',
    // Has a stale disable comment for a rule that no longer exists, which ESLint reports as an error.
    'metro.config.js',
  ]),
  expoConfig,
  prettierConfig,
  {
    rules: {
      // New React Compiler-era rules from eslint-plugin-react-hooks; existing code predates them. Re-enable and fix incrementally.
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      // Copy contains apostrophes/quotes in JSX text; cosmetic only.
      'react/no-unescaped-entities': 'off',
      // Style preference, not a bug; already mixed across the codebase.
      '@typescript-eslint/array-type': 'off',
      // Cannot resolve the namespace import of expo-haptics in LessonPlayer; false positive.
      'import/namespace': 'off',
    },
  },
]);
