import PasswordInput from '../components/PasswordInput';
import { safeReturnPath } from '../utils/returnPath';
import { useResendCooldown } from '../hooks/useResendCooldown';
import { retryAfterSeconds } from '../utils/retryAfter';
import { readNativeOAuthStart } from '../utils/nativeOAuth';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
const brandLogo = '/icons/icon-512.png';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/useLanguage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

import api from '../api/client';
import PasswordResetForm from '../components/PasswordResetForm';
import { authErrorMessage } from '../utils/authError';
import { hasPasswordConfirmationMismatch } from '../utils/passwordConfirmation';

export default function LoginPage() {
  const { t, language } = useLanguage();
  const [registrationPolicy, setRegistrationPolicy] = useState(null);
  const [registrationCode, setRegistrationCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState('');
  const resend = useResendCooldown();
  const loginCooldown = useResendCooldown();
  const secondsLeft = resend.seconds;
  const busy = useRef(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityFailed, setAvailabilityFailed] = useState(false);
  const [resetAvailable, setResetAvailable] = useState(false);
  const [oauthProviders, setOAuthProviders] = useState(null);
  const [oauthInBrowser, setOauthInBrowser] = useState(false);
  const [nativeHandoff, setNativeHandoff] = useState(null);
  const [resetMode, setResetMode] = useState(false);
  useEffect(() => {
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityFailed(false);
    Promise.allSettled([
      api.get('/auth/registration/availability'),
      api.get('/auth/password-reset/availability'),
      api.get('/auth/oauth/availability'),
    ]).then(([registration, reset, oauth]) => {
      if (!active) return;
      if (registration.status === 'fulfilled') setRegistrationPolicy(registration.value.data);
      if (reset.status === 'fulfilled') setResetAvailable(reset.value.data.enabled);
      if (oauth.status === 'fulfilled' && typeof oauth.value.data?.google === 'boolean' && typeof oauth.value.data?.facebook === 'boolean') setOAuthProviders(oauth.value.data);
      setAvailabilityFailed(registration.status === 'rejected' || reset.status === 'rejected' || oauth.status === 'rejected');
      setAvailabilityLoading(false);
    });
    return () => { active = false; };
  }, [availabilityAttempt]);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthCompleting, setOauthCompleting] = useState(false);
  const oauthAttempted = useRef(false);
  const { login, register, completeOAuth, completeNativeOAuth, storageUnavailable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const query = new URLSearchParams(location.search);
  const requestedMode = query.get('mode');
  const nextPath = safeReturnPath(location.state?.from || query.get('next'));
  const oauthError = query.get('oauth_error');
  const oauthErrorMessage = oauthError === 'terms_required'
    ? (language === 'en' ? 'Accept the Terms of Use and Privacy Notice before creating a social sign-in account.' : 'Hãy đồng ý Điều khoản sử dụng và Thông báo quyền riêng tư trước khi tạo tài khoản bằng đăng nhập mạng xã hội.')
    : (language === 'en' ? 'Social sign-in was cancelled or could not be verified. Please try again.' : 'Đăng nhập mạng xã hội đã bị hủy hoặc chưa xác minh được. Hãy thử lại.');
  const oauthRequested = query.get('oauth') === '1';
  const nativePlatform = Capacitor.isNativePlatform();
  const registrationPasswordMismatch = isRegister && hasPasswordConfirmationMismatch(password, confirmPassword);

  useEffect(() => {
    if (requestedMode === 'register') setIsRegister(true);
  }, [requestedMode]);

  useEffect(() => {
    if (!nativePlatform) return undefined;
    let active = true;
    let listener;
    Browser.addListener('browserFinished', () => {
      if (!active) return;
      setOauthInBrowser(false);
      setNativeHandoff(null);
    }).then(handle => { if (active) listener = handle; else void handle.remove(); }).catch(() => {});
    return () => { active = false; if (listener) void listener.remove(); };
  }, [nativePlatform]);

  useEffect(() => {
    if (!nativeHandoff) return undefined;
    let active = true;
    let timer;
    const poll = async () => {
      try {
        const result = await completeNativeOAuth(nativeHandoff);
        if (!active) return;
        if (!result) { timer = window.setTimeout(poll, 1200); return; }
        setNativeHandoff(null); setOauthInBrowser(false); setOauthCompleting(true);
        await Browser.close().catch(() => {});
        toast.success(t(language === 'en' ? 'Social sign-in complete.' : 'Đăng nhập mạng xã hội thành công.'));
        navigate(nextPath, { replace: true });
      } catch {
        if (!active) return;
        setNativeHandoff(null); setOauthInBrowser(false);
        await Browser.close().catch(() => {});
        setError(language === 'en' ? 'Social sign-in could not be completed. Please try again.' : 'Không hoàn tất được đăng nhập mạng xã hội. Hãy thử lại.');
      } finally {
        if (active) setOauthCompleting(false);
      }
    };
    timer = window.setTimeout(poll, 800);
    return () => { active = false; window.clearTimeout(timer); };
  }, [nativeHandoff, completeNativeOAuth, language, navigate, nextPath, t, toast]);

  useEffect(() => {
    if (!oauthRequested || oauthAttempted.current) return;
    oauthAttempted.current = true;
    setOauthCompleting(true); setError('');
    completeOAuth().then(() => {
      toast.success(t(language === 'en' ? 'Social sign-in complete.' : 'Đăng nhập mạng xã hội thành công.'));
      navigate(nextPath, { replace: true });
    }).catch(() => {
      setError(language === 'en' ? 'Social sign-in could not be completed. Please try again.' : 'Không hoàn tất được đăng nhập mạng xã hội. Hãy thử lại.');
    }).finally(() => setOauthCompleting(false));
  }, [oauthRequested, completeOAuth, language, navigate, nextPath, t, toast]);

  const beginOAuth = useCallback(async provider => {
    if (loading || oauthCompleting || oauthInBrowser) return;
    const consent = isRegister && termsAccepted;
    if (!nativePlatform) {
      window.location.assign(`/api/auth/oauth/${provider}/start?next=${encodeURIComponent(nextPath)}&termsAccepted=${consent}`);
      return;
    }
    setError(''); setOauthInBrowser(true);
    try {
      const { data } = await api.post(`/auth/oauth/${provider}/native/start`, null, { params: { next: nextPath, termsAccepted: consent } });
      const started = readNativeOAuthStart(data);
      if (!started) throw new Error('Invalid native OAuth start');
      setNativeHandoff(started.handoff);
      await Browser.open({ url: started.authorizationUrl, toolbarColor: '#0c0b1b' });
    } catch {
      setNativeHandoff(null); setOauthInBrowser(false);
      setError(language === 'en' ? 'Social sign-in could not be started. Please try again.' : 'Không thể bắt đầu đăng nhập mạng xã hội. Hãy thử lại.');
    }
  }, [loading, oauthCompleting, oauthInBrowser, nativePlatform, nextPath, language, isRegister, termsAccepted]);

  const sendRegistrationCode = async () => {
    if (busy.current || resend.blocked()) return;
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
      resend.start(60);
      toast.info(t(response.data.message));
    } catch (err) {
      if (err.response?.status === 429) resend.start(retryAfterSeconds(err.response.headers));
      setError(err.response?.data?.detail || 'Chưa gửi được yêu cầu mã. Hãy thử lại sau.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy.current || (!isRegister && loginCooldown.blocked())) return;
    if (isRegister && hasPasswordConfirmationMismatch(password, confirmPassword)) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (isRegister && !termsAccepted) {
      setError(language === 'en' ? 'Accept the Terms of Use and Privacy Notice to create an account.' : 'Hãy đồng ý Điều khoản sử dụng và Thông báo quyền riêng tư để tạo tài khoản.');
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
        await register(email, displayName, password, registrationPolicy?.required ? registrationCode : undefined, registrationPolicy?.inviteRequired ? inviteCode : undefined, termsAccepted);
        toast.success(t('Đăng ký thành công! Chào mừng bạn đến với SelfForge 🎉'));
      } else {
        await login(email, password);
        toast.success(t('Đăng nhập thành công!'));
      }
      navigate(nextPath, { replace: true });
    } catch (err) {
      if (!isRegister && err.response?.status === 429) loginCooldown.start(retryAfterSeconds(err.response.headers));
      const msg = authErrorMessage(err, storageUnavailable);
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
      <div className="auth-legal-links"><Link to="/privacy">{language === 'en' ? 'Privacy' : 'Quyền riêng tư'}</Link><Link to="/terms">{language === 'en' ? 'Terms' : 'Điều khoản'}</Link></div>
    </div></div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card scale-in">
        <LanguageSelector /><h1 className="brand-heading"><img src={brandLogo} className="brand-logo" alt="" width="48" height="48" />SelfForge</h1>
        <p className="auth-subtitle">
          {isRegister ? t('Tạo tài khoản để bắt đầu hành trình kỷ luật') : t('Đăng nhập để tiếp tục hành trình')}
        </p>

        {(error || oauthError) && <div role="alert" className="auth-error">⚠ {t(error || oauthErrorMessage)}</div>}

        {(availabilityLoading || availabilityFailed) && <div role="status" style={{ marginBottom: '1rem' }}>
          <p>{t(availabilityLoading ? 'Đang kết nối máy chủ...' : 'Chưa tải được cấu hình tài khoản. Hãy thử lại.')}</p>
          {availabilityFailed && <button type="button" className="btn btn-secondary" disabled={loading}
            onClick={() => setAvailabilityAttempt(attempt => attempt + 1)}>{t('Thử lại')}</button>}
        </div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="auth-email" className="form-label">Email</label>
            <input id="auth-email" autoComplete="email" type="email" className="form-input" value={email} onChange={e => { setEmail(e.target.value); if (e.target.value.trim().toLowerCase() !== codeSentTo) { setRegistrationCode(''); setCodeSentTo(''); } }} placeholder="email@example.com" maxLength={254} disabled={loading} required />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="auth-name" className="form-label">{t('Tên hiển thị')}</label>
              <input id="auth-name" autoComplete="nickname" type="text" className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('Tên của bạn')} maxLength={100} disabled={loading} required />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password" className="form-label">{t('Mật khẩu')}</label>
            <PasswordInput id="auth-password" autoComplete={isRegister ? 'new-password' : 'current-password'} type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={isRegister ? 10 : undefined} maxLength={128} disabled={loading} required />
          </div>

          {isRegister && <div className="form-group">
            <label htmlFor="auth-confirm-password" className="form-label">{t('Nhập lại mật khẩu mới')}</label>
            <PasswordInput id="auth-confirm-password" type="password" autoComplete="new-password" className="form-input"
              value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
              minLength={10} maxLength={128} disabled={loading} required aria-invalid={registrationPasswordMismatch || undefined}
              aria-describedby={registrationPasswordMismatch ? 'auth-confirm-password-error' : undefined} />
            {registrationPasswordMismatch && <p id="auth-confirm-password-error" role="status" className="password-confirmation-error">{t('Mật khẩu xác nhận không khớp.')}</p>}
          </div>}

          {isRegister && <p>{language === 'en' ? 'Use at least 10 characters. A memorable passphrase is welcome; do not use your email as the password.' : 'Dùng ít nhất 10 ký tự. Có thể dùng cụm từ dễ nhớ; không dùng email làm mật khẩu.'}</p>}

          {isRegister && <label className="auth-terms-consent"><input type="checkbox" checked={termsAccepted} disabled={loading} onChange={event => setTermsAccepted(event.target.checked)} /><span>{language === 'en' ? <>I agree to the <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Notice</Link>.</> : <>Tôi đồng ý với <Link to="/terms">Điều khoản sử dụng</Link> và <Link to="/privacy">Thông báo quyền riêng tư</Link>.</>}</span></label>}

          {isRegister && registrationPolicy?.inviteRequired && (
            <div className="form-group">
              <label htmlFor="beta-invite-code" className="form-label">{t('Mã mời beta')}</label>
              <input id="beta-invite-code" className="form-input" autoComplete="off" maxLength={256} value={inviteCode} disabled={loading}
                onChange={event => setInviteCode(event.target.value)} required />
              <p>{t('Nhập mã mời để tham gia beta.')}</p>
            </div>
          )}

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
          {!isRegister && loginCooldown.seconds > 0 && <p role="status">{t('Đăng nhập tạm giới hạn. Thử lại sau {seconds}s.', { seconds: loginCooldown.seconds })}</p>}
          <button type="submit" className="btn btn-primary"
            disabled={loading || oauthCompleting || (!isRegister && loginCooldown.seconds > 0) || (isRegister && (registrationPasswordMismatch || !termsAccepted || !registrationPolicy || (registrationPolicy.required && !registrationPolicy.enabled)))}>
            {loading ? t('Đang xử lý...') : isRegister ? t('Đăng ký') : t('Đăng nhập')}
          </button>
        </form>

        {oauthProviders && (oauthProviders.google || oauthProviders.facebook) && <section style={{ marginTop: '1rem' }} aria-label={language === 'en' ? 'Social sign-in' : 'Đăng nhập mạng xã hội'}>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{language === 'en' ? (isRegister ? 'Or register with' : 'Or continue with') : (isRegister ? 'Hoặc đăng ký với' : 'Hoặc tiếp tục với')}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {oauthProviders.google && <button type="button" className="btn btn-secondary" disabled={loading || oauthCompleting || oauthInBrowser || (isRegister && !termsAccepted)} onClick={() => beginOAuth('google')}>Google</button>}
            {oauthProviders.facebook && <button type="button" className="btn btn-secondary" disabled={loading || oauthCompleting || oauthInBrowser || (isRegister && !termsAccepted)} onClick={() => beginOAuth('facebook')}>Facebook</button>}
          </div>
          {(oauthCompleting || oauthInBrowser) && <p role="status">{oauthInBrowser ? (language === 'en' ? 'Continue in the secure browser…' : 'Tiếp tục trong cửa sổ bảo mật…') : (language === 'en' ? 'Completing sign-in…' : 'Đang hoàn tất đăng nhập…')}</p>}
        </section>}

        {!isRegister && resetAvailable && (
          <button type="button" className="btn btn-secondary" disabled={loading}
            style={{ marginTop: '0.75rem' }} onClick={() => setResetMode(true)}>{t('Quên mật khẩu?')}</button>
        )}
        <div className="auth-toggle">
          {isRegister ? t('Đã có tài khoản? ') : t('Chưa có tài khoản? ')}
          <a href="#" onClick={(e) => { e.preventDefault(); if (busy.current) return; setIsRegister(!isRegister); setPassword(''); setConfirmPassword(''); setInviteCode(''); setTermsAccepted(false); setError(''); }}>
            {isRegister ? t('Đăng nhập') : t('Đăng ký ngay')}
          </a>
        </div>
        <div className="auth-legal-links"><Link to="/privacy">{language === 'en' ? 'Privacy' : 'Quyền riêng tư'}</Link><Link to="/terms">{language === 'en' ? 'Terms' : 'Điều khoản'}</Link></div>
      </div>
    </div>
  );
}
