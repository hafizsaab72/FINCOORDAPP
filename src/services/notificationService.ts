import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { navigate } from '../navigation/navigationRef';

import { API_URL as API_BASE } from '../constants/config';

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
      data: remoteMessage.data,
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
      const data = detail.notification?.data;
      if (!data) return;
      handleNotificationTap(data);
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
      data: remoteMessage.data,
      android: {
        channelId: 'fincoord-default',
        pressAction: { id: 'default' },
      },
    });
  });

  // Notifee background event handler
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      const data = detail.notification?.data;
      if (!data) return;
      handleNotificationTap(data);
    }
  });
}

// ─── Notification Tap Navigation ──────────────────────────────────────────────

function handleNotificationTap(data: Record<string, any>) {
  const notificationType = data?.type;
  switch (notificationType) {
    case 'bill_reminder':
      if (data?.billId) {
        navigate('BillDetail', { billId: data.billId });
      }
      break;
    case 'friend_request':
      navigate('Friends');
      break;
    case 'friend_request_accepted':
      navigate('Friends');
      break;
    default:
      // Fallback: navigate to home
      navigate('MainTabs');
      break;
  }
}
