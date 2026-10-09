import brandLogo from '../assets/LogoSF.png';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/useLanguage';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

import api from '../api/client';
import PasswordResetForm from '../components/PasswordResetForm';

export default function LoginPage() {
  const { t } = useLanguage();
  const [registrationPolicy, setRegistrationPolicy] = useState(null);
  const [registrationCode, setRegistrationCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const busy = useRef(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityFailed, setAvailabilityFailed] = useState(false);
  useEffect(() => {
    if (!resendAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  const [resetAvailable, setResetAvailable] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  useEffect(() => {
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityFailed(false);
    Promise.allSettled([
      api.get('/auth/registration/availability'),
      api.get('/auth/password-reset/availability'),
    ]).then(([registration, reset]) => {
      if (!active) return;
      if (registration.status === 'fulfilled') setRegistrationPolicy(registration.value.data);
      if (reset.status === 'fulfilled') setResetAvailable(reset.value.data.enabled);
      setAvailabilityFailed(registration.status === 'rejected' || reset.status === 'rejected');
      setAvailabilityLoading(false);
    });
    return () => { active = false; };
  }, [availabilityAttempt]);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const sendRegistrationCode = async () => {
    if (busy.current || secondsLeft > 0) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Vui lòng nhập email hợp lệ trước khi yêu cầu mã.');
      return;
    }
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/registration/request', { email });
      setCodeSentTo(email.trim().toLowerCase());
      setRegistrationCode('');
      setResendAt(Date.now() + 60000);
      toast.info(t(response.data.message));
    } catch (err) {
      setError(err.response?.data?.detail || 'Chưa gửi được yêu cầu mã. Hãy thử lại sau.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy.current) return;
    if (isRegister && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (isRegister && (!registrationPolicy || (registrationPolicy.required && !registrationPolicy.enabled))) {
      setError('Đăng ký chưa sẵn sàng. Vui lòng thử lại sau.');
      return;
    }
    busy.current = true;
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, displayName, password, registrationPolicy?.required ? registrationCode : undefined);
        toast.success(t('Đăng ký thành công! Chào mừng bạn đến với SelfForge 🎉'));
      } else {
        await login(email, password);
        toast.success(t('Đăng nhập thành công!'));
      }
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message;
      const msg = detail === 'Invalid email or password' ? 'Email hoặc mật khẩu không đúng.' : (detail || 'Có lỗi xảy ra');
      setError(msg);
      toast.error(t(msg));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  if (resetMode) return (
    <div className="auth-page"><div className="auth-card scale-in">
      <LanguageSelector /><h1 className="brand-heading"><img src={brandLogo} className="brand-logo" alt="" width="48" height="48" />SelfForge</h1>
      <PasswordResetForm initialEmail={email} onBack={() => { setResetMode(false); setIsRegister(false); setPassword(''); }} />
    </div></div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card scale-in">
        <LanguageSelector /><h1 className="brand-heading"><img src={brandLogo} className="brand-logo" alt="" width="48" height="48" />SelfForge</h1>
        <p className="auth-subtitle">
          {isRegister ? t('Tạo tài khoản để bắt đầu hành trình kỷ luật') : t('Đăng nhập để tiếp tục hành trình')}
        </p>

        {error && <div role="alert" className="auth-error">⚠ {t(error)}</div>}

        {(availabilityLoading || availabilityFailed) && <div role="status" style={{ marginBottom: '1rem' }}>
          <p>{t(availabilityLoading ? 'Đang kết nối máy chủ...' : 'Chưa tải được cấu hình tài khoản. Hãy thử lại.')}</p>
          {availabilityFailed && <button type="button" className="btn btn-secondary" disabled={loading}
            onClick={() => setAvailabilityAttempt(attempt => attempt + 1)}>{t('Thử lại')}</button>}
        </div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="auth-email" className="form-label">Email</label>
            <input id="auth-email" autoComplete="email" type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" maxLength={254} disabled={loading} required />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="auth-name" className="form-label">{t('Tên hiển thị')}</label>
              <input id="auth-name" autoComplete="nickname" type="text" className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('Tên của bạn')} maxLength={100} disabled={loading} required />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password" className="form-label">{t('Mật khẩu')}</label>
            <input id="auth-password" autoComplete={isRegister ? 'new-password' : 'current-password'} type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={isRegister ? 8 : undefined} maxLength={128} disabled={loading} required />
          </div>

          {isRegister && <div className="form-group">
            <label htmlFor="auth-confirm-password" className="form-label">{t('Nhập lại mật khẩu mới')}</label>
            <input id="auth-confirm-password" type="password" autoComplete="new-password" className="form-input"
              value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
              minLength={8} maxLength={128} disabled={loading} required />
          </div>}

          {isRegister && registrationPolicy?.required && (
            <div className="form-group">
              <label htmlFor="registration-code" className="form-label">{t('Mã xác nhận email')}</label>
              <input id="registration-code" className="form-input" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} value={registrationCode} disabled={loading}
                onChange={event => setRegistrationCode(event.target.value)} required />
              <button type="button" className="btn btn-secondary" style={{ marginTop: '0.75rem' }}
                disabled={loading || secondsLeft > 0 || !registrationPolicy.enabled} onClick={sendRegistrationCode}>
                {secondsLeft > 0 ? t('Gửi lại sau {seconds}s', { seconds: secondsLeft }) : t('Gửi mã xác nhận')}
              </button>
              <p>{t('Mã có hiệu lực 10 phút.')} {codeSentTo && t('Đã yêu cầu mã cho {email}.', { email: codeSentTo })}</p>
            </div>
          )}
          {isRegister && (!registrationPolicy || (registrationPolicy.required && !registrationPolicy.enabled)) &&
            <p role="status">{t('Đăng ký chưa sẵn sàng. Vui lòng thử lại sau.')}</p>}
          <button type="submit" className="btn btn-primary"
            disabled={loading || (isRegister && (!registrationPolicy || (registrationPolicy.required && !registrationPolicy.enabled)))}>
            {loading ? t('Đang xử lý...') : isRegister ? t('Đăng ký') : t('Đăng nhập')}
          </button>
        </form>

        {!isRegister && resetAvailable && (
          <button type="button" className="btn btn-secondary" disabled={loading}
            style={{ marginTop: '0.75rem' }} onClick={() => setResetMode(true)}>{t('Quên mật khẩu?')}</button>
        )}
        <div className="auth-toggle">
          {isRegister ? t('Đã có tài khoản? ') : t('Chưa có tài khoản? ')}
          <a href="#" onClick={(e) => { e.preventDefault(); if (busy.current) return; setIsRegister(!isRegister); setPassword(''); setConfirmPassword(''); setError(''); }}>
            {isRegister ? t('Đăng nhập') : t('Đăng ký ngay')}
          </a>
        </div>
      </div>
    </div>
  );
}
