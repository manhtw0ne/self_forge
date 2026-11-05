import { useEffect, useState } from 'react';
import { todayInTimezone } from '../utils/dates';

export function useAccountDate(timezone) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const visible = () => { if (document.visibilityState === 'visible') tick(); };
    const timer = setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return todayInTimezone(timezone, now);
}
