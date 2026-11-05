import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { useResendCooldown } from '../hooks/useResendCooldown';
import { retryAfterSeconds } from '../utils/retryAfter';
import PasswordInput from './PasswordInput';

export default function EmailChange({ currentEmail, disabled = false, onChanged }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(null);
  const [target, setTarget] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const guard = useRef(false);
  const resend = useResendCooldown();

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setAvailable(null); setError('');
    api.get('/profile/email-change/availability').then(({ data }) => {
      if (active && typeof data?.enabled === 'boolean') setAvailable(data.enabled);
      else if (active) setAvailable(false);
    }).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, [open]);

  const request = async event => {
    event.preventDefault();
    if (guard.current || resend.blocked()) return;
    guard.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await api.post('/profile/email-change/request', { email: target, currentPassword: password });
      setSent(true); setCode(''); setPassword(''); resend.start(60); setMessage(response.data.message);
    } catch (failure) {
      if (failure.response?.status === 429) resend.start(retryAfterSeconds(failure.response.headers));
      setError(failure.response?.data?.detail || (en ? 'Could not request a verification code.' : 'Chưa gửi được yêu cầu mã xác nhận.'));
    } finally { guard.current = false; setBusy(false); }
  };
  const confirm = async event => {
    event.preventDefault();
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try {
      await api.post('/profile/email-change/confirm', { code });
      setCode('');
      await onChanged();
    } catch (failure) {
      setError(failure.response?.data?.detail || (en ? 'The change could not be confirmed. If your connection failed, sign in using the new email first.' : 'Chưa xác nhận được thay đổi. Nếu mất kết nối, hãy thử đăng nhập bằng email mới trước.'));
    } finally { guard.current = false; setBusy(false); }
  };
  const close = () => {
    if (busy) return;
    if ((target || password || code) && !window.confirm(en ? 'Discard this email change request?' : 'Bỏ yêu cầu đổi email đang nhập?')) return;
    setOpen(false); setTarget(''); setPassword(''); setCode(''); setSent(false); setError(''); setMessage('');
  };

  return <section className="card">
    <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>{en ? 'Change account email' : 'Đổi email tài khoản'}</h3>
    {!open ? <><p>{en ? 'Verify control of a new email with a one-time code. Changing it signs out every device.' : 'Xác nhận quyền sở hữu email mới bằng mã một lần. Đổi email sẽ đăng xuất trên mọi thiết bị.'}</p><button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setOpen(true)}>{en ? 'Change email' : 'Đổi email'}</button></> : <>
      {available === null && <p role="status">{en ? 'Checking email verification…' : 'Đang kiểm tra xác nhận email…'}</p>}
      {available === false && <p role="alert">{en ? 'Email verification is not available for this deployment. Your account email has not changed.' : 'Xác nhận email chưa sẵn sàng ở bản phát hành này. Email tài khoản chưa thay đổi.'}</p>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {available && <form onSubmit={sent ? confirm : request}><fieldset disabled={busy || disabled} style={{ border: 0, padding: 0, margin: 0 }}>
        {!sent ? <><div className="form-group"><label className="form-label" htmlFor="email-change-target">{en ? 'New email' : 'Email mới'}</label><input id="email-change-target" type="email" autoComplete="email" className="form-input" maxLength={254} value={target} onChange={event => setTarget(event.target.value)} required /><p>{en ? 'Current email: ' : 'Email hiện tại: '}{currentEmail}</p></div>
          <div className="form-group"><label className="form-label" htmlFor="email-change-password">{en ? 'Current password' : 'Mật khẩu hiện tại'}</label><PasswordInput id="email-change-password" className="form-input" autoComplete="current-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required /></div></> : <><p>{en ? 'A six-digit code was requested for the new email. It expires in 10 minutes; requesting a fresh code replaces the old one.' : 'Mã sáu chữ số đã được yêu cầu tới email mới. Mã có hiệu lực 10 phút; mã gửi lại sẽ thay thế mã cũ.'}</p><div className="form-group"><label className="form-label" htmlFor="email-change-code">{en ? 'Verification code' : 'Mã xác nhận'}</label><input id="email-change-code" className="form-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} required /></div></>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}><button type="submit" className="btn btn-primary" disabled={!sent && resend.seconds > 0}>{busy ? (en ? 'Working…' : 'Đang xử lý…') : sent ? (en ? 'Confirm and sign out' : 'Xác nhận và đăng xuất') : (en ? 'Send verification code' : 'Gửi mã xác nhận')}</button>{sent && <button type="button" className="btn btn-secondary" disabled={resend.seconds > 0} onClick={request}>{resend.seconds > 0 ? (en ? `Resend in ${resend.seconds}s` : `Gửi lại sau ${resend.seconds}s`) : (en ? 'Resend code' : 'Gửi lại mã')}</button>}</div>
        {!sent && resend.seconds > 0 && <p role="status">{en ? `Try again in ${resend.seconds}s.` : `Thử lại sau ${resend.seconds}s.`}</p>}
      </fieldset></form>}
      <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} disabled={busy} onClick={close}>{en ? 'Cancel' : 'Hủy'}</button>
    </>}
  </section>;
}
