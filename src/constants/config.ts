import { Platform } from 'react-native';

// ─── Environment-based API URL ─────────────────────────────────────────────
// __DEV__ is a React Native global:
//   • true  → running via Metro bundler (development)
//   • false → release build (production)
//
// Android emulator: 10.0.2.2 maps to the host machine's localhost
// iOS simulator:    localhost works directly
// ────────────────────────────────────────────────────────────────────────────

// const REMOTE_URL = 'http://187.124.96.129/api';
const REMOTE_URL = 'https://fincoordapi.onrender.com/api';

const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const LOCAL_URL = `http://${LOCAL_HOST}:3050/api`;

export const API_URL = __DEV__ ? LOCAL_URL : REMOTE_URL;
