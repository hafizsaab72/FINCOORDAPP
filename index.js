/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { setupBackgroundHandler } from './src/services/notificationService';

// Register FCM + Notifee background handlers at module level (before any component mounts)
setupBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
