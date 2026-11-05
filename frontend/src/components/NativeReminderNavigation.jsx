import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addNativeReminderActionListener } from '../utils/nativeReminderNotifications';

/** Opens the notified habit, ready for today's check-in, after a user taps a SelfForge notification. */
export default function NativeReminderNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let listener = null;
    void addNativeReminderActionListener(path => navigate(path)).then(handle => {
      listener = handle;
      if (!active && listener) void listener.remove();
    }).catch(() => { /* Notification navigation remains optional. */ });
    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [navigate]);

  return null;
}
