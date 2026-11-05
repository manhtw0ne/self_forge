import ModalOverlay from './ModalOverlay';
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
  const [confirmation, setConfirmation] = useState(null);
  const closeConfirmation = () => { if (!inFlight.current) setConfirmation(null); };
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    api.get('/profile/sessions').then(r => { if (active) setSessions(r.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  function askRevoke(session) {
    if (inFlight.current || loading || error) return;
    const prompt = session?.current
      ? t('Đăng xuất phiên hiện tại? Bạn sẽ cần đăng nhập lại trên thiết bị này.')
      : session
        ? t('Đăng xuất phiên bắt đầu lúc {date}?', { date: date(session.createdAt) })
        : t('Đăng xuất {count} phiên khác? Phiên hiện tại vẫn được giữ.', { count: sessions.filter(item => !item.current).length });
    setConfirmation({ session, prompt });
  }
  async function revoke(session) {
    if (inFlight.current || loading || error) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.delete('/profile/sessions/' + (session ? session.id : 'others'));
      if (session?.current) { await logout(); return; }
      toast.success(t('Đã thu hồi phiên đăng nhập.'));
      setLoading(true); setAttempt(a => a + 1);
    } catch {
      toast.error(t('Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      setLoading(true); setAttempt(a => a + 1);
    } finally { inFlight.current = false; setBusy(false); setConfirmation(null); }
  }
  const date = value => value ? new Date(value).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN') : '—';
  return <section className="card" style={{ marginTop: '1.5rem' }}>
    <h3>{t('Phiên đăng nhập')}</h3>
    <p>{t('Danh sách phiên không xác định chính xác số thiết bị; một thiết bị có thể có nhiều phiên.')}</p>
    <p>{t('Mỗi lần đăng nhập tạo một phiên. Thời gian bên dưới theo múi giờ thiết bị của bạn.')}</p>
    {!loading && !error && <p role="status">{t('{count} phiên đang hoạt động', { count: sessions.length })}</p>}
    {loading ? <p role="status">{t('Đang tải…')}</p> : error ? <p role="alert">{t('Không thể tải dữ liệu.')}</p> : <ul style={{ listStyle: 'none', padding: 0 }}>
      {sessions.map(session => <li key={session.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div><strong>{t(session.current ? 'Phiên hiện tại' : 'Phiên khác')}</strong>
          <div>{t('Đăng nhập lúc')}: {date(session.createdAt)}</div>
          <div>{t('Hết hạn lúc')}: {date(session.expiresAt)}</div></div>
        <button className="btn btn-secondary" disabled={busy || loading || error} onClick={() => askRevoke(session)}>{t('Đăng xuất phiên này')}</button>
      </li>)}
    </ul>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
      <button className="btn btn-secondary" disabled={busy || loading} onClick={() => { setLoading(true); setAttempt(a => a + 1); }}>{t('Tải lại')}</button>
      <button className="btn btn-secondary" disabled={busy || loading || error || !sessions.some(s => !s.current)} onClick={() => askRevoke(null)}>{t('Đăng xuất tất cả phiên khác')}</button>
    </div>
    {confirmation && <ModalOverlay onClose={closeConfirmation}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="session-revoke-title" aria-describedby="session-revoke-description" aria-busy={busy} onClick={event => event.stopPropagation()}>
        <h2 id="session-revoke-title" className="modal-title">{t('Xác nhận đăng xuất phiên')}</h2>
        <p id="session-revoke-description">{confirmation.prompt}</p>
        {confirmation.session && <p style={{ marginTop: '0.75rem' }}>{t('Hết hạn lúc')}: {date(confirmation.session.expiresAt)}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          <button autoFocus className="btn btn-secondary" disabled={busy} onClick={closeConfirmation}>{t('Hủy')}</button>
          <button className="btn btn-danger" disabled={busy || loading || error} onClick={() => revoke(confirmation.session)}>{t(busy ? 'Đang xử lý…' : 'Xác nhận đăng xuất')}</button>
        </div>
      </div>
    </ModalOverlay>}
  </section>;
}
