import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../context/useLanguage';
import {
  disableNativeReminders,
  enableNativeReminders,
  nativeLocalNotificationsSupported,
  nativeReminderStatus,
  sendNativeReminderTest,
  syncEnabledNativeReminders,
} from '../utils/nativeReminderNotifications';

export default function NativeReminderNotifications({ owner, reminders, disabled = false }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const supported = nativeLocalNotificationsSupported();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!supported) return;
    try { setStatus(await nativeReminderStatus(owner)); }
    catch { setStatus({ supported: true, enabled: false, permission: 'unavailable', scheduled: 0, error: true }); }
  }, [owner, supported]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!supported || !status?.enabled) return;
    let active = true;
    void syncEnabledNativeReminders(owner, reminders, language)
      .then(result => { if (active) setStatus(current => ({ ...current, ...result })); })
      .catch(() => { if (active) setMessage(en ? 'Device reminders could not be updated. Try syncing again.' : 'Chưa cập nhật được nhắc trên thiết bị. Hãy đồng bộ lại.'); });
    return () => { active = false; };
  }, [owner, reminders, language, supported, status?.enabled, en]);

  if (!supported) return null;

  const enable = async () => {
    if (busy || disabled) return;
    setBusy(true); setMessage('');
    try {
      const result = await enableNativeReminders(owner, reminders, language);
      setStatus(current => ({ ...current, ...result }));
      setMessage(result.enabled
        ? (en ? `${result.scheduled} device reminder${result.scheduled === 1 ? '' : 's'} synced.` : `Đã đồng bộ ${result.scheduled} lịch nhắc trên thiết bị.`)
        : (en ? 'Notifications are not permitted. You can enable them later in device settings.' : 'Chưa được cấp quyền thông báo. Bạn có thể bật lại trong cài đặt thiết bị.'));
    } catch {
      setMessage(en ? 'Could not schedule device reminders. Your saved reminder data was not changed.' : 'Chưa lên lịch được thông báo thiết bị. Dữ liệu nhắc đã lưu không bị thay đổi.');
    } finally { setBusy(false); }
  };

  const disable = async () => {
    if (busy || disabled) return;
    setBusy(true); setMessage('');
    try {
      await disableNativeReminders(owner);
      setStatus(current => ({ ...current, enabled: false, scheduled: 0 }));
      setMessage(en ? 'Device reminders are off.' : 'Đã tắt nhắc trên thiết bị.');
    } catch {
      setMessage(en ? 'Could not turn off device reminders. Try again.' : 'Chưa tắt được nhắc trên thiết bị. Hãy thử lại.');
    } finally { setBusy(false); }
  };

  const testNotification = async () => {
    if (busy || disabled) return;
    setBusy(true); setMessage('');
    try {
      const result = await sendNativeReminderTest(language);
      setStatus(current => ({ ...current, permission: result.permission }));
      setMessage(result.sent
        ? (en ? 'A test notification is scheduled in a few seconds.' : 'Đã lên lịch thông báo thử trong vài giây.')
        : (en ? 'Notifications are not permitted. You can enable them in device settings.' : 'Chưa được cấp quyền thông báo. Bạn có thể bật trong cài đặt thiết bị.'));
    } catch {
      setMessage(en ? 'Could not schedule a test notification. Try again.' : 'Chưa lên lịch được thông báo thử. Hãy thử lại.');
    } finally { setBusy(false); }
  };

  return <section className="card" style={{ marginBottom: '1rem' }} aria-labelledby="device-reminders-title">
    <h2 id="device-reminders-title">{en ? 'Device notifications' : 'Thông báo trên thiết bị'}</h2>
    <p>{en
      ? 'On the installed SelfForge app, you can schedule local habit notifications that work without the website staying open.'
      : 'Trên ứng dụng SelfForge đã cài, bạn có thể đặt thông báo nhắc thói quen ngay trên thiết bị, kể cả khi không mở trang web.'}</p>
    <p>{en
      ? 'They repeat at the chosen time in the device timezone. The operating system may delay a notification slightly to preserve battery. No reminder content is sent to another notification server.'
      : 'Thông báo lặp theo giờ đã chọn trong múi giờ của thiết bị. Hệ điều hành có thể giao muộn một chút để tiết kiệm pin. Nội dung nhắc không được gửi tới máy chủ thông báo khác.'}</p>
    <p>{en
      ? 'A device notification is scheduled only on weekdays shared by its reminder and its habit schedule.'
      : 'Thông báo thiết bị chỉ được lên lịch vào ngày trùng giữa lịch nhắc và lịch thực hiện của thói quen.'}</p>
    {status?.enabled && <p role="status">{en ? `${status.scheduled ?? 0} device schedules are active.` : `Đang có ${status.scheduled ?? 0} lịch trên thiết bị.`}</p>}
    {status?.permission === 'denied' && <p role="alert">{en ? 'Notifications are blocked in device settings.' : 'Thông báo đang bị chặn trong cài đặt thiết bị.'}</p>}
    {message && <p role="status">{message}</p>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>
      <button type="button" className="btn btn-primary" disabled={busy || disabled || status?.permission === 'denied'} onClick={enable}>
        {busy ? (en ? 'Updating…' : 'Đang cập nhật…') : status?.enabled ? (en ? 'Sync device reminders' : 'Đồng bộ nhắc trên thiết bị') : (en ? 'Enable device reminders' : 'Bật nhắc trên thiết bị')}
      </button>
      <button type="button" className="btn btn-secondary" disabled={busy || disabled || status?.permission === 'denied'} onClick={testNotification}>{en ? 'Send a test notification' : 'Gửi thông báo thử'}</button>
      {status?.enabled && <button type="button" className="btn btn-secondary" disabled={busy || disabled} onClick={disable}>{en ? 'Turn off device reminders' : 'Tắt nhắc trên thiết bị'}</button>}
    </div>
  </section>;
}
