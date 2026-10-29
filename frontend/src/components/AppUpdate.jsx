import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/useLanguage';
import { createVersionChecker } from '../utils/appVersion';

export default function AppUpdate() {
  const { t } = useLanguage();
  const [available, setAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const waitingRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    // Listen for a waiting service worker (new version installed but waiting).
    const trackWaiting = reg => {
      if (reg.waiting) { setAvailable(true); waitingRef.current = reg.waiting; }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingRef.current = newWorker;
            setAvailable(true);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then(reg => { if (reg) trackWaiting(reg); });

    // Reload automatically when the controller changes (after skipWaiting).
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Periodic version file check (unchanged from before).
    const checker = createVersionChecker({
      version: __APP_BUILD_ID__,
      publish: setAvailable,
      fetchVersion: async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch('/assets/app-version.json', {
            cache: 'no-store', credentials: 'omit', signal: controller.signal,
          });
          if (!response.ok) throw Error('Version unavailable');
          return await response.json();
        } finally { clearTimeout(timer); }
      },
    });
    const refresh = () => { if (document.visibilityState === 'visible') void checker.check(); };
    refresh();
    const timer = setInterval(refresh, 300_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      checker.stop();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (reloading) return;
    setReloading(true);
    if (waitingRef.current) {
      // Tell the waiting SW to take control; 'controllerchange' triggers reload.
      waitingRef.current.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!available) return null;
  return (
    <section role="status" className="card" style={{ marginBottom: '1rem' }}>
      <strong>{t('Có phiên bản SelfForge mới')}</strong>
      <p>{t('Lưu nội dung đang nhập và hoàn tất yêu cầu đang chờ trước khi tải lại. Bạn có thể tiếp tục dùng rồi cập nhật sau.')}</p>
      <button className="btn btn-secondary" disabled={reloading} onClick={handleUpdate}>
        {reloading ? t('Đang tải lại…') : t('Tải phiên bản mới')}
      </button>
    </section>
  );
}
