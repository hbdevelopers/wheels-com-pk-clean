// mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json', '.node'],
          alias: {
            '@': '.',
            '@services': './services',
            '@store': './store',
            '@constants': './constants',
            '@components': './components',
          },
        },
      ],
    ],
  };
};
