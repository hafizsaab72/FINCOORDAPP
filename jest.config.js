module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((react-native.*)?|(@react-native.*)?|(@react-navigation.*)?|(@react-native-async-storage/.*)?|(@gorhom/.*)?|(@notifee/.*)?|(@react-native-firebase/.*)?|react-native-paper|react-native-vector-icons|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|react-native-reanimated|react-native-linear-gradient|react-native-qrcode-svg|react-native-contacts|react-native-fs|react-native-haptic-feedback|react-native-image-picker|react-native-vision-camera|react-native-worklets|react-native-gifted-charts|gifted-charts-core|react-native-svg)/)',
  ],
  moduleNameMapper: {
    'react-native-linear-gradient': '<rootDir>/__mocks__/react-native-linear-gradient.js',
    'react-native-paper-dates': '<rootDir>/__mocks__/react-native-paper-dates.js',
    'react-native-gifted-charts': '<rootDir>/__mocks__/react-native-gifted-charts.js',
  },
};
