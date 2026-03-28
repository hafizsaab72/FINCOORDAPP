import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { Alert } from 'react-native';

const API_BASE = 'http://10.0.2.2:3000/api'; // Android emulator → localhost

// ─── Channel Setup ───────────────────────────────────────────────────────────

export async function createNotificationChannel() {
  await notifee.createChannel({
    id: 'fincoord-default',
    name: 'FinCoord Notifications',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
  });
}

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

// ─── Token Registration ───────────────────────────────────────────────────────

export async function registerDeviceToken(authToken: string): Promise<void> {
  try {
    await createNotificationChannel();
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const fcmToken = await messaging().getToken();
    if (!fcmToken) return;

    await fetch(`${API_BASE}/users/device-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: fcmToken }),
    });
  } catch (err) {
    // Non-fatal — app works without push
    console.warn('[notifications] Token registration failed:', err);
  }
}

// ─── Foreground Message Handler ───────────────────────────────────────────────

export function setupForegroundHandler(): () => void {
  // FCM message while app is open → display via Notifee
  const unsubscribeFCM = messaging().onMessage(async remoteMessage => {
    const { title, body } = remoteMessage.notification ?? {};
    if (!title) return;

    await notifee.displayNotification({
      title,
      body: body ?? '',
      android: {
        channelId: 'fincoord-default',
        pressAction: { id: 'default' },
        importance: AndroidImportance.HIGH,
      },
    });
  });

  // Notifee foreground events (user taps in-app notification)
  const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      // TODO: navigate to relevant screen based on detail.notification?.data?.type
    }
  });

  return () => {
    unsubscribeFCM();
    unsubscribeNotifee();
  };
}

// ─── Background / Quit Handler ────────────────────────────────────────────────
// Call these at module level (outside component tree) in index.js

export function setupBackgroundHandler(): void {
  // FCM background message (Android only — iOS needs separate entitlement)
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    const { title, body } = remoteMessage.notification ?? {};
    if (!title) return;

    await notifee.displayNotification({
      title,
      body: body ?? '',
      android: {
        channelId: 'fincoord-default',
        pressAction: { id: 'default' },
      },
    });
  });

  // Notifee background event handler
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    // Handle background notification press if needed
  });
}
