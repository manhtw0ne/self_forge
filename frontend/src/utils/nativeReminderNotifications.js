import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  nativeReminderIds,
  nativeReminderNotifications,
  nativeReminderTarget,
  nativeRemindersEnabled,
  saveNativeReminderIds,
  setNativeRemindersEnabled,
} from './nativeReminders.js';

function storage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; }
  catch { return null; }
}

function permission(result) {
  return result?.display === 'granted' ? 'granted' : result?.display ?? 'denied';
}

export function nativeLocalNotificationsSupported() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
}

export async function nativeReminderStatus(owner) {
  const store = storage();
  if (!nativeLocalNotificationsSupported() || !store) {
    return { supported: false, enabled: false, permission: 'unavailable', scheduled: 0 };
  }
  const checked = await LocalNotifications.checkPermissions();
  const ids = nativeReminderIds(store, owner);
  return {
    supported: true,
    enabled: nativeRemindersEnabled(store, owner),
    permission: permission(checked),
    scheduled: ids.length,
  };
}

async function sync(owner, reminders, language) {
  const store = storage();
  if (!store || !nativeLocalNotificationsSupported()) throw new Error('Native notifications unavailable');
  const previous = nativeReminderIds(store, owner);
  if (previous.length) await LocalNotifications.cancel({ notifications: previous.map(id => ({ id })) });
  const next = nativeReminderNotifications(reminders, language);
  if (next.notifications.length) await LocalNotifications.schedule({ notifications: next.notifications });
  saveNativeReminderIds(store, owner, next.ids);
  return next.ids.length;
}

export async function enableNativeReminders(owner, reminders, language) {
  if (!nativeLocalNotificationsSupported()) return { enabled: false, permission: 'unavailable', scheduled: 0 };
  let checked = await LocalNotifications.checkPermissions();
  if (permission(checked) !== 'granted') checked = await LocalNotifications.requestPermissions();
  const currentPermission = permission(checked);
  if (currentPermission !== 'granted') return { enabled: false, permission: currentPermission, scheduled: 0 };
  const scheduled = await sync(owner, reminders, language);
  const store = storage();
  if (!store) throw new Error('Storage unavailable');
  setNativeRemindersEnabled(store, owner, true);
  return { enabled: true, permission: currentPermission, scheduled };
}

export async function syncEnabledNativeReminders(owner, reminders, language) {
  const store = storage();
  if (!store || !nativeLocalNotificationsSupported() || !nativeRemindersEnabled(store, owner)) {
    return { enabled: false, scheduled: 0 };
  }
  const checked = await LocalNotifications.checkPermissions();
  if (permission(checked) !== 'granted') return { enabled: true, permission: permission(checked), scheduled: 0 };
  return { enabled: true, permission: 'granted', scheduled: await sync(owner, reminders, language) };
}

export async function disableNativeReminders(owner) {
  const store = storage();
  if (!store) return;
  const ids = nativeReminderIds(store, owner);
  if (nativeLocalNotificationsSupported() && ids.length) {
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  }
  setNativeRemindersEnabled(store, owner, false);
}

export async function sendNativeReminderTest(language) {
  if (!nativeLocalNotificationsSupported()) return { sent: false, permission: 'unavailable' };
  let checked = await LocalNotifications.checkPermissions();
  if (permission(checked) !== 'granted') checked = await LocalNotifications.requestPermissions();
  const currentPermission = permission(checked);
  if (currentPermission !== 'granted') return { sent: false, permission: currentPermission };
  await LocalNotifications.schedule({
    notifications: [{
      id: 2147483647,
      title: 'SelfForge',
      body: language === 'en' ? 'Your device reminders are ready.' : 'Nhắc trên thiết bị đã sẵn sàng.',
      schedule: { at: new Date(Date.now() + 3000) },
      extra: { source: 'self-forge-reminder-test' },
    }],
  });
  return { sent: true, permission: currentPermission };
}

export async function addNativeReminderActionListener(onReminder) {
  if (!nativeLocalNotificationsSupported() || typeof onReminder !== 'function') return null;
  return LocalNotifications.addListener('localNotificationActionPerformed', action => {
    const target = nativeReminderTarget(action?.notification?.extra);
    if (target) onReminder(target);
  });
}
