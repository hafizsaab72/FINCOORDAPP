/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

const mockStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(key => Promise.resolve(mockStorage.get(key) ?? null)),
    setItem: jest.fn((key, value) => Promise.resolve(mockStorage.set(key, value))),
    removeItem: jest.fn(key => Promise.resolve(mockStorage.delete(key))),
    getAllKeys: jest.fn(() => Promise.resolve([...mockStorage.keys()])),
    multiGet: jest.fn(keys => Promise.resolve(keys.map(k => [k, mockStorage.get(k) ?? null]))),
    multiSet: jest.fn(entries => Promise.resolve(entries.forEach(([k, v]) => mockStorage.set(k, v)))),
    multiRemove: jest.fn(keys => Promise.resolve(keys.forEach(k => mockStorage.delete(k)))),
  },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(),
    getNotificationSettings: jest.fn(),
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
    cancelNotification: jest.fn(),
    getTriggerNotifications: jest.fn(),
    createTriggerNotification: jest.fn(),
    cancelTriggerNotifications: jest.fn(),
  },
  TriggerType: { TIMESTAMP: 0 },
  AndroidImportance: { HIGH: 4 },
  EventType: { DELIVERED: 3, PRESS: 1, DISMISSED: 2 },
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onAuthStateChanged: jest.fn(),
    signInWithPhoneNumber: jest.fn(),
    confirmCode: jest.fn(),
    signOut: jest.fn(),
    currentUser: null,
  })),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    requestPermission: jest.fn(),
    getToken: jest.fn(),
    onMessage: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
    getInitialNotification: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
  })),
}));

jest.mock('react-native-contacts', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    requestPermission: jest.fn(),
    checkPermission: jest.fn(),
  },
}));

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: {
    trigger: jest.fn(),
  },
}));

jest.mock('react-native-vision-camera', () => ({
  __esModule: true,
  default: 'Camera',
  Camera: 'Camera',
  useCameraDevice: jest.fn(),
  useCameraPermission: jest.fn(() => ({ hasPermission: true, requestPermission: jest.fn() })),
  useCodeScanner: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    DocumentDirectoryPath: '/mock/path',
    writeFile: jest.fn(),
    readFile: jest.fn(),
    exists: jest.fn(),
    mkdir: jest.fn(),
  },
}));
