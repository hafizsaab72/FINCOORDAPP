import { Platform } from 'react-native';

// Android emulator → 10.0.2.2 maps to host machine's localhost
// iOS simulator   → localhost works directly
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = `http://${HOST}:3000/api`;
