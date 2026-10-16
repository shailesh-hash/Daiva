const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'scripts/*'],
  },
  {
    files: ['src/hooks/use-color-scheme.web.ts'],
    rules: {
      // Expo static-web hydration pattern from the SDK 58 template.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
