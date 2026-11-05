import { CONNECTION_UNCERTAIN } from '../utils/networkStatus';
import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';

export default function NetworkStatus() {
  const { t } = useLanguage();
  const [state, setState] = useState(() => navigator.onLine === false ? 'offline' : 'hidden');
  const [checking, setChecking] = useState(false);
  const active = useRef(true);
  const generation = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    active.current = true;
    const invalidate = () => { generation.current++; };
    const offline = () => { generation.current++; setState('offline'); };
    const online = () => { generation.current++; setState('reconnected'); };
    const unavailable = () => { generation.current++; setState(navigator.onLine === false ? 'offline' : 'unavailable'); };
    window.addEventListener(CONNECTION_UNCERTAIN, unavailable);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      active.current = false; invalidate();
      window.removeEventListener(CONNECTION_UNCERTAIN, unavailable);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, []);
  const check = async () => {
    if (busy.current) return;
    busy.current = true; setChecking(true);
    const version = generation.current;
    try {
      const { data } = await api.get('/health');
      if (active.current && version === generation.current) setState(data.status === 'UP' ? 'connected' : 'unavailable');
    } catch {
      if (active.current && version === generation.current) setState(navigator.onLine === false ? 'offline' : 'unavailable');
    } finally {
      busy.current = false;
      if (active.current) setChecking(false);
    }
  };
  if (state === 'hidden') return null;
  const messages = {
    offline: 'Đang mất mạng. Thao tác mới cần có mạng để lưu; giữ trang mở nếu đang nhập nội dung.',
    reconnected: 'Mạng đã trở lại. Kiểm tra kết quả của thao tác báo lỗi trước khi thử lại.',
    connected: 'Đã kết nối được máy chủ. Nội dung chưa lưu vẫn cần bạn bấm lưu hoặc xác nhận lại.',
    unavailable: 'Chưa kết nối được máy chủ. Giữ nội dung đang nhập và thử kiểm tra lại sau.',
  };
  return <aside className="card" role="status" aria-label={t('Trạng thái kết nối')} style={{ marginBottom: '1rem' }}>
    <p>{t(messages[state])}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
      <button type="button" className="btn btn-secondary btn-sm" disabled={checking} onClick={check}>{t(checking ? 'Đang kiểm tra…' : 'Kiểm tra kết nối')}</button>
      {state !== 'offline' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { generation.current++; setState('hidden'); }}>{t('Đóng thông báo')}</button>}
    </div>
  </aside>;
}
