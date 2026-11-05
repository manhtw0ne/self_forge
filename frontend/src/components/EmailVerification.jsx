import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { useResendCooldown } from '../hooks/useResendCooldown';
import { retryAfterSeconds } from '../utils/retryAfter';

export default function EmailVerification({ email, verified, disabled = false, onVerified }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const guard = useRef(false);
  const resend = useResendCooldown();

  useEffect(() => {
    if (!open || verified) return undefined;
    let active = true;
    setAvailable(null); setError('');
    api.get('/profile/email-verification/availability').then(({ data }) => {
      if (!active) return;
      setAvailable(data?.enabled === true);
      if (data?.verified === true) void onVerified?.();
    }).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, [open, verified, onVerified]);

  const request = async event => {
    event?.preventDefault();
    if (guard.current || resend.blocked()) return;
    guard.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await api.post('/profile/email-verification/request');
      setSent(true); setCode(''); resend.start(60); setMessage(response.data?.message || '');
    } catch (failure) {
      if (failure.response?.status === 429) resend.start(retryAfterSeconds(failure.response.headers));
      setError(failure.response?.data?.detail || (en ? 'Could not request a verification code.' : 'Chưa gửi được mã xác nhận.'));
    } finally { guard.current = false; setBusy(false); }
  };
  const confirm = async event => {
    event.preventDefault();
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try {
      await api.post('/profile/email-verification/confirm', { code });
      setCode(''); setMessage(en ? 'Your email is verified.' : 'Email của bạn đã được xác minh.');
      await onVerified?.();
    } catch (failure) {
      setError(failure.response?.data?.detail || (en ? 'The code could not be confirmed.' : 'Chưa xác nhận được mã.'));
    } finally { guard.current = false; setBusy(false); }
  };
  const close = () => {
    if (busy) return;
    if ((sent || code) && !window.confirm(en ? 'Discard this verification request?' : 'Bỏ yêu cầu xác minh đang thực hiện?')) return;
    setOpen(false); setSent(false); setCode(''); setError(''); setMessage('');
  };

  return <section className="card" aria-labelledby="email-verification-title">
    <h3 id="email-verification-title" style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>{en ? 'Email verification' : 'Xác minh email'}</h3>
    {verified ? <p role="status">{en ? 'Your account email is verified.' : 'Email tài khoản của bạn đã được xác minh.'}</p> : <>
      {!open ? <><p>{en ? 'Verify that you control this account email. It helps protect account recovery and security changes.' : 'Xác minh quyền sở hữu email tài khoản. Điều này hỗ trợ khôi phục tài khoản và bảo vệ các thay đổi bảo mật.'}</p><p>{email}</p><button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setOpen(true)}>{en ? 'Verify email' : 'Xác minh email'}</button></> : <>
        {available === null && <p role="status">{en ? 'Checking email delivery…' : 'Đang kiểm tra gửi email…'}</p>}
        {available === false && <p role="alert">{en ? 'Email verification is not available for this deployment. Your account stays unchanged.' : 'Xác minh email chưa sẵn sàng ở bản phát hành này. Tài khoản của bạn không thay đổi.'}</p>}
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
        {available && <form onSubmit={sent ? confirm : request}><fieldset disabled={busy || disabled} style={{ border: 0, padding: 0, margin: 0 }}>
          {sent && <><p>{en ? 'Enter the six-digit code sent to your existing account email. It expires in 10 minutes.' : 'Nhập mã sáu chữ số đã gửi tới email tài khoản hiện tại. Mã có hiệu lực 10 phút.'}</p><div className="form-group"><label className="form-label" htmlFor="account-email-verification-code">{en ? 'Verification code' : 'Mã xác nhận'}</label><input id="account-email-verification-code" className="form-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} required /></div></>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}><button type="submit" className="btn btn-primary" disabled={!sent && resend.seconds > 0}>{busy ? (en ? 'Working…' : 'Đang xử lý…') : sent ? (en ? 'Confirm email' : 'Xác nhận email') : (en ? 'Send verification code' : 'Gửi mã xác nhận')}</button>{sent && <button type="button" className="btn btn-secondary" disabled={resend.seconds > 0} onClick={request}>{resend.seconds > 0 ? (en ? `Resend in ${resend.seconds}s` : `Gửi lại sau ${resend.seconds}s`) : (en ? 'Resend code' : 'Gửi lại mã')}</button>}</div>
          {!sent && resend.seconds > 0 && <p role="status">{en ? `Try again in ${resend.seconds}s.` : `Thử lại sau ${resend.seconds}s.`}</p>}
        </fieldset></form>}
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} disabled={busy} onClick={close}>{en ? 'Cancel' : 'Hủy'}</button>
      </>}
    </>}
  </section>;
}
