import PasswordInput from './PasswordInput';
import { useResendCooldown } from '../hooks/useResendCooldown';
import { retryAfterSeconds } from '../utils/retryAfter';
import { useLanguage } from '../context/useLanguage';
import { useRef, useState } from 'react';
import api from '../api/client';
import { hasPasswordConfirmationMismatch } from '../utils/passwordConfirmation';

export default function PasswordResetForm({ initialEmail, onBack }) {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState(initialEmail || '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const resend = useResendCooldown();
  const cooldown = resend.seconds;
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const passwordMismatch = hasPasswordConfirmationMismatch(password, confirmation);

  const requestCode = async (event) => {
    event?.preventDefault();
    if (guard.current || resend.blocked()) return;
    guard.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/auth/password-reset/request', { email });
      setSent(true);
      setCode('');
      resend.start(60);
      setMessage(response.data.message);
    } catch (err) {
      if (err.response?.status === 429) resend.start(retryAfterSeconds(err.response.headers));
      setError(err.response?.data?.detail || 'Chưa gửi được yêu cầu. Vui lòng thử lại sau.');
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    if (guard.current) return;
    if (passwordMismatch) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    guard.current = true;
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/password-reset/confirm', {
        email, code, newPassword: password, confirmPassword: confirmation,
      });
      setDone(true);
      setCode('');
      setPassword('');
      setConfirmation('');
      setMessage('Đã đặt lại mật khẩu và đăng xuất các thiết bị. Bạn có thể đăng nhập bằng mật khẩu mới.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Nếu mất kết nối, hãy thử đăng nhập bằng mật khẩu mới.');
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <h2>{t('Quên mật khẩu')}</h2>
      {message && <p role="status">{t(message)}</p>}
      {error && <div className="auth-error" role="alert">{t(error)}</div>}
      {!done && (
        <form onSubmit={sent ? confirm : requestCode}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="form-group">
              <label htmlFor="reset-email" className="form-label">{t('Email tài khoản')}</label>
              <input id="reset-email" type="email" autoComplete="email" maxLength={254}
                className="form-input" autoFocus value={email} disabled={sent}
                onChange={event => setEmail(event.target.value)} required />
            </div>
            {sent && <button type="button" className="btn btn-secondary" onClick={() => {
              if ((code || password || confirmation) && !window.confirm(t('Đổi email sẽ xóa mã và mật khẩu đang nhập. Tiếp tục?'))) return;
              setSent(false); setCode(''); setPassword(''); setConfirmation(''); setMessage(''); setError('');
            }}>{t('Sửa email nhận mã')}</button>}
            {sent && (
              <>
                <p>{t('Mã gồm 6 chữ số, có hiệu lực 10 phút. Mã gửi mới sẽ thay thế mã cũ.')}</p>
                <div className="form-group">
                  <label htmlFor="reset-code" className="form-label">{t('Mã xác nhận')}</label>
                  <input id="reset-code" className="form-input" inputMode="numeric" autoComplete="one-time-code"
                    pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="reset-password" className="form-label">{t('Mật khẩu mới')}</label>
                  <PasswordInput id="reset-password" type="password" autoComplete="new-password" className="form-input"
                    minLength={10} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="reset-confirm" className="form-label">{t('Nhập lại mật khẩu mới')}</label>
                  <PasswordInput id="reset-confirm" type="password" autoComplete="new-password" className="form-input"
                    minLength={10} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} required
                    aria-invalid={passwordMismatch || undefined} aria-describedby={passwordMismatch ? 'reset-confirm-password-error' : undefined} />
                  {passwordMismatch && <p id="reset-confirm-password-error" role="status" className="password-confirmation-error">{t('Mật khẩu xác nhận không khớp.')}</p>}
                </div>
                <p>{language === 'en' ? 'Use at least 10 characters; do not use your email as the password.' : 'Mật khẩu mới cần ít nhất 10 ký tự; không dùng email làm mật khẩu.'}</p>
              </>
            )}
            <button className="btn btn-primary" type="submit" disabled={(!sent && cooldown > 0) || (sent && passwordMismatch)}>{busy ? t('Đang xử lý…') : sent ? t('Đặt lại mật khẩu') : t('Gửi mã xác nhận')}</button>
            {!sent && cooldown > 0 && <p role="status">{t('Gửi lại sau {seconds}s', { seconds: cooldown })}</p>}
            {sent && <button className="btn btn-secondary" type="button" style={{ marginTop: '0.75rem' }}
              disabled={cooldown > 0} onClick={requestCode}>{cooldown ? t('Gửi lại sau {seconds}s', { seconds: cooldown }) : t('Gửi lại mã')}</button>}
          </fieldset>
        </form>
      )}
      <button type="button" className="btn btn-secondary" disabled={busy}
        style={{ marginTop: '1rem' }} onClick={onBack}>{t('Quay lại đăng nhập')}</button>
    </>
  );
}
