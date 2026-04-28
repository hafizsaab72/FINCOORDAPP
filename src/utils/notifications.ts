import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'bill-reminders';

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Bill Reminders',
    importance: AndroidImportance.HIGH,
  });
}

/**
 * Schedule a bill reminder notification 1 day before the due date at 9 AM.
 * Uses the bill's id as the notification id so it can be cancelled later.
 */
export async function scheduleBillReminder(
  billId: string,
  title: string,
  dueDateISO: string,
): Promise<void> {
  try {
    const dueDate = new Date(dueDateISO);
    if (isNaN(dueDate.getTime())) return;

    // Trigger 1 day before at 09:00
    const triggerDate = new Date(dueDate);
    triggerDate.setDate(triggerDate.getDate() - 1);
    triggerDate.setHours(9, 0, 0, 0);

    // Don't schedule if the trigger time is in the past
    if (triggerDate.getTime() <= Date.now()) return;

    await ensureChannel();

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        id: billId,
        title: `Reminder: ${title}`,
        body: `Your bill "${title}" is due tomorrow.`,
        android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
        ios: { sound: 'default' },
      },
      trigger,
    );
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] scheduleBillReminder failed:', e);
  }
}

/**
 * Cancel a previously scheduled bill reminder by bill id.
 */
export async function cancelBillReminder(billId: string): Promise<void> {
  try {
    await notifee.cancelTriggerNotification(billId);
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] cancelBillReminder failed:', e);
  }
}
