module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['nativewind/babel', 'react-native-auto-route/plugin'],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
  },
};
