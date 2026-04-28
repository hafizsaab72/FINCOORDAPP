import { Platform } from 'react-native';

// Toggle: true = use remote server, false = use local dev server
const USE_REMOTE = true;

// Remote server
const REMOTE_URL = 'http://187.124.96.129/api';

// Local dev: Android emulator → 10.0.2.2 maps to host machine's localhost
//            iOS simulator   → localhost works directly
const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const LOCAL_URL = `http://${LOCAL_HOST}:3000/api`;

export const API_URL = USE_REMOTE ? REMOTE_URL : LOCAL_URL;
