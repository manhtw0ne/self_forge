import PasswordInput from './PasswordInput';
import { clearAccountDrafts } from '../utils/accountDraftCleanup';
import { useToast } from '../context/useToast';
import { useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';

export default function DeleteAccount({ disabled, onBusyChange }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const ready = accepted && password && email.trim().toLowerCase() === user.email.toLowerCase();
  const submit = async event => {
    event.preventDefault();
    if (!ready || sending.current || disabled) return;
    if (!window.confirm(t('Xóa vĩnh viễn tài khoản {email} và dữ liệu của tài khoản này?', { email: user.email }))) return;
    sending.current = true; setBusy(true); onBusyChange?.(true); setError('');
    let confirmed = false;
    try {
      const token = localStorage.getItem('sf_token');
      await api.delete('/profile/account', { headers: { Authorization: 'Bearer ' + token }, data: { currentPassword: password, confirmationEmail: email.trim() } });
      confirmed = true;
      setPassword('');
      let cleanupFailed = false;
      for (const getStorage of [() => window.localStorage, () => window.sessionStorage]) {
        try { clearAccountDrafts(getStorage(), user.id); } catch { cleanupFailed = true; }
      }
      toast.info(t(cleanupFailed ? 'Tài khoản đã xóa. Trình duyệt chưa xóa được bản nháp; hãy xóa dữ liệu trang web trên thiết bị này.' : 'Đã xóa tài khoản và dữ liệu trong ứng dụng.'));
      if (localStorage.getItem('sf_token') === token) await logout();
    } catch (failure) {
      setError(confirmed ? 'Tài khoản đã xóa trên server nhưng chưa kết thúc được phiên trên thiết bị. Hãy tải lại trang.' : (failure.response?.data?.detail || 'Chưa xác nhận được việc xóa. Hãy kiểm tra kết nối; nếu tài khoản đã bị xóa, bạn sẽ không đăng nhập lại được.'));
    } finally { sending.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <section className="card" style={{ marginTop: '1.5rem', borderColor: 'var(--danger)' }}>
    <h2 className="card-title">{t('Xóa tài khoản')}</h2>
    <p>{t('Xóa tài khoản và dữ liệu khỏi ứng dụng. Thao tác không thể hoàn tác; các bản sao đã xuất và bản sao lưu không bị xóa bằng thao tác này.')}</p>
    <p><a href="#personal-data-export">{t('Tải bản sao dữ liệu trước khi xóa')}</a></p>
    {!open ? <button className="btn btn-danger" disabled={disabled} onClick={() => setOpen(true)}>{t('Mở yêu cầu xóa tài khoản')}</button>
      : <form onSubmit={submit} aria-busy={busy}><fieldset disabled={busy || disabled} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <div className="form-group"><label className="form-label" htmlFor="delete-account-password">{t('Mật khẩu hiện tại')}</label>
          <PasswordInput id="delete-account-password" className="form-input" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} /></div>
        <div className="form-group"><label className="form-label" htmlFor="delete-account-email">{t('Nhập email {email} để xác nhận', { email: user.email })}</label>
          <input id="delete-account-email" className="form-input" type="email" autoComplete="off" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} /></div>
        <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />{t('Tôi hiểu dữ liệu sẽ bị xóa và mọi phiên đăng nhập sẽ bị thu hồi.')}</label>
        {error && <p role="alert">{t(error)}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn btn-danger" type="submit" disabled={!ready}>{t(busy ? 'Đang xử lý…' : 'Xóa vĩnh viễn tài khoản')}</button>
          <button className="btn btn-secondary" type="button" onClick={() => { setOpen(false); setPassword(''); setEmail(''); setAccepted(false); setError(''); }}>{t('Hủy')}</button>
        </div>
      </fieldset></form>}
  </section>;
}
