import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

export default function SessionManager() {
  const { t, language } = useLanguage();
  const { logout } = useAuth();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    api.get('/profile/sessions').then(r => { if (active) setSessions(r.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function revoke(session) {
    if (inFlight.current || !window.confirm(t('Bạn có chắc muốn đăng xuất các phiên đã chọn?'))) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.delete('/profile/sessions/' + (session ? session.id : 'others'));
      if (session?.current) { await logout(); return; }
      toast.success(t('Đã thu hồi phiên đăng nhập.'));
      setAttempt(a => a + 1);
    } catch {
      toast.error(t('Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      setAttempt(a => a + 1);
    } finally { inFlight.current = false; setBusy(false); }
  }
  const date = value => value ? new Date(value).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN') : '—';
  return <section className="card" style={{ marginTop: '1.5rem' }}>
    <h3>{t('Phiên đăng nhập')}</h3>
    <p>{t('Mỗi lần đăng nhập tạo một phiên. Thời gian bên dưới theo múi giờ thiết bị của bạn.')}</p>
    {loading ? <p role="status">{t('Đang tải…')}</p> : error ? <p role="alert">{t('Không thể tải dữ liệu.')}</p> : <ul style={{ listStyle: 'none', padding: 0 }}>
      {sessions.map(session => <li key={session.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div><strong>{t(session.current ? 'Phiên hiện tại' : 'Phiên khác')}</strong>
          <div>{t('Đăng nhập lúc')}: {date(session.createdAt)}</div>
          <div>{t('Hết hạn lúc')}: {date(session.expiresAt)}</div></div>
        <button className="btn btn-secondary" disabled={busy} onClick={() => revoke(session)}>{t('Đăng xuất phiên này')}</button>
      </li>)}
    </ul>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
      <button className="btn btn-secondary" disabled={busy || loading} onClick={() => setAttempt(a => a + 1)}>{t('Tải lại')}</button>
      <button className="btn btn-secondary" disabled={busy || loading || error || !sessions.some(s => !s.current)} onClick={() => revoke(null)}>{t('Đăng xuất tất cả phiên khác')}</button>
    </div>
  </section>;
}
