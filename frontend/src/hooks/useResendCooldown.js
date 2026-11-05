import { useEffect, useState } from 'react';
import { remainingSeconds } from '../utils/retryAfter';
export function useResendCooldown() {
  const [deadline, setDeadline] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setSeconds(remainingSeconds(deadline));
    const visible = () => { if (document.visibilityState === 'visible') tick(); };
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [deadline]);
  return { seconds, blocked: () => remainingSeconds(deadline) > 0,
    start: value => { setDeadline(Date.now() + value * 1000); setSeconds(value); } };
}
