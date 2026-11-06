import { useCallback, useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
import PasswordInput from './PasswordInput';
import { readOAuthLinkAuthorization } from '../utils/oauthLink';
import { readNativeOAuthStart } from '../utils/nativeOAuth';

const labels = {
  vi: {
    title: 'Liên kết đăng nhập mạng xã hội',
    detail: 'Liên kết thêm một cách đăng nhập với tài khoản hiện tại. Email tài khoản SelfForge sẽ không thay đổi.',
    password: 'Nhập mật khẩu hiện tại để tiếp tục',
    google: 'Liên kết Google',
    facebook: 'Liên kết Facebook',
    working: 'Đang mở trang xác minh an toàn…',
    error: 'Không thể bắt đầu liên kết. Mật khẩu hiện tại có thể không đúng.',
  },
  en: {
    title: 'Linked social sign-in',
    detail: 'Add another way to sign in to this account. Your SelfForge account email will not change.',
    password: 'Enter your current password to continue',
    google: 'Link Google',
    facebook: 'Link Facebook',
    working: 'Opening secure verification…',
    error: 'Could not start linking. Your current password may be incorrect.',
  },
};

export default function OAuthLinkSettings({ disabled = false, nativePlatform = false }) {
  const { language } = useLanguage();
  const toast = useToast();
  const copy = labels[language === 'en' ? 'en' : 'vi'];
  const [providers, setProviders] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [nativeHandoff, setNativeHandoff] = useState(null);

  useEffect(() => {
    let active = true;
    setProviders(null);
    api.get('/auth/oauth/availability').then(({ data }) => {
      if (!active) return;
      if (typeof data?.google === 'boolean' && typeof data?.facebook === 'boolean') setProviders(data);
    }).catch(() => { /* Keep this optional setting hidden while availability is unknown. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!nativePlatform) return undefined;
    let active = true;
    let listener;
    Browser.addListener('browserFinished', () => {
      if (!active) return;
      setNativeHandoff(null);
      setBusy(false);
    }).then(handle => { if (active) listener = handle; else void handle.remove(); }).catch(() => {});
    return () => { active = false; if (listener) void listener.remove(); };
  }, [nativePlatform]);

  useEffect(() => {
    if (!nativeHandoff) return undefined;
    let active = true;
    let timer;
    const poll = async () => {
      try {
        const result = await api.post('/auth/oauth/native/link/complete', { handoff: nativeHandoff },
          { validateStatus: status => status === 200 || status === 202 });
        if (!active) return;
        if (result.status === 202) {
          timer = window.setTimeout(poll, 1200);
          return;
        }
        setNativeHandoff(null);
        setBusy(false);
        await Browser.close().catch(() => {});
        toast.success(language === 'en' ? 'Social sign-in was linked to this account.' : 'Đã liên kết đăng nhập mạng xã hội với tài khoản này.');
      } catch {
        if (!active) return;
        setNativeHandoff(null);
        setBusy(false);
        await Browser.close().catch(() => {});
        toast.error(copy.error);
      }
    };
    timer = window.setTimeout(poll, 800);
    return () => { active = false; window.clearTimeout(timer); };
  }, [copy.error, language, nativeHandoff, toast]);

  const begin = useCallback(async (provider) => {
    if (busy || disabled || !password || nativePlatform) return;
    setBusy(true);
    try {
      if (nativePlatform) {
        const { data } = await api.post(`/auth/oauth/${provider}/native/link/start`, {
          currentPassword: password,
          next: '/profile',
        });
        const started = readNativeOAuthStart(data);
        if (!started) throw new Error('Invalid native OAuth link start');
        setPassword('');
        setNativeHandoff(started.handoff);
        await Browser.open({ url: started.authorizationUrl, toolbarColor: '#0c0b1b' });
        return;
      }
      const { data } = await api.post(`/auth/oauth/${provider}/link/start`, {
        currentPassword: password,
        next: '/profile',
      });
      const destination = readOAuthLinkAuthorization(data);
      if (!destination) throw new Error('Invalid OAuth authorization URL');
      setPassword('');
      window.location.assign(destination);
    } catch {
      setPassword('');
      toast.error(copy.error);
      setBusy(false);
    }
  }, [busy, copy.error, disabled, nativePlatform, password, toast]);

  if (providers === null || (!providers.google && !providers.facebook)) return null;

  return <section className="card" aria-labelledby="oauth-link-title">
    <h3 id="oauth-link-title">{copy.title}</h3>
    <p>{copy.detail}</p>
    <div className="form-group">
      <label className="form-label" htmlFor="oauth-link-current-password">{copy.password}</label>
      <PasswordInput id="oauth-link-current-password" type="password" autoComplete="current-password" className="form-input"
        minLength={1} maxLength={128} value={password} disabled={busy || disabled}
        onChange={event => setPassword(event.target.value)} />
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      {providers.google && <button type="button" className="btn btn-secondary" disabled={busy || disabled || !password} onClick={() => begin('google')}>{copy.google}</button>}
      {providers.facebook && <button type="button" className="btn btn-secondary" disabled={busy || disabled || !password} onClick={() => begin('facebook')}>{copy.facebook}</button>}
    </div>
    {busy && <p role="status">{copy.working}</p>}
  </section>;
}
