import { useLanguage } from '../context/useLanguage';
import { useEffect, useRef, useState } from 'react';
import api from '../api/client';

export default function PasswordResetForm({ initialEmail, onBack }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState(initialEmail || '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const requestCode = async (event) => {
    event?.preventDefault();
    if (guard.current || cooldown > 0) return;
    guard.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/auth/password-reset/request', { email });
      setSent(true);
      setCode('');
      setCooldown(60);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Chưa gửi được yêu cầu. Vui lòng thử lại sau.');
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    if (guard.current) return;
    if (password !== confirmation) {
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
                className="form-input" value={email} disabled={sent}
                onChange={event => setEmail(event.target.value)} required />
            </div>
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
                  <input id="reset-password" type="password" autoComplete="new-password" className="form-input"
                    minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="reset-confirm" className="form-label">{t('Nhập lại mật khẩu mới')}</label>
                  <input id="reset-confirm" type="password" autoComplete="new-password" className="form-input"
                    minLength={8} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} required />
                </div>
              </>
            )}
            <button className="btn btn-primary" type="submit">{busy ? t('Đang xử lý…') : sent ? t('Đặt lại mật khẩu') : t('Gửi mã xác nhận')}</button>
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