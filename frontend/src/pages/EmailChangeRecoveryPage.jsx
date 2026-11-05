import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export default function EmailChangeRecoveryPage() {
  const { language } = useLanguage();
  const en = language === 'en';
  const [state, setState] = useState('checking');
  const token = useRef(new URLSearchParams(window.location.hash.slice(1)).get('token') || '');

  useEffect(() => {
    if (!TOKEN.test(token.current)) { setState('invalid'); return; }
    let active = true;
    api.post('/auth/email-change-recovery/check', { token: token.current })
      .then(response => { if (active) setState(response.data?.valid === true ? 'ready' : 'invalid'); })
      .catch(() => { if (active) setState('invalid'); });
    return () => { active = false; };
  }, []);

  const restore = async () => {
    if (state !== 'ready') return;
    setState('restoring');
    try {
      await api.post('/auth/email-change-recovery/confirm', { token: token.current });
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      token.current = '';
      setState('done');
    } catch {
      setState('invalid');
    }
  };

  const copy = en ? {
    title: 'Restore your previous sign-in email',
    checking: 'Checking the recovery link…',
    description: 'Use this only if you did not change your SelfForge sign-in email. Restoring it signs out every session.',
    button: 'Restore previous email', restoring: 'Restoring…',
    doneTitle: 'Your previous email was restored',
    done: 'All signed-in sessions were signed out. Sign in again with the restored email. If you suspect someone knew your password, reset it before continuing.',
    invalidTitle: 'This recovery link is unavailable',
    invalid: 'It may be expired, already used, or no longer match the current account email.',
    login: 'Go to sign in',
  } : {
    title: 'Khôi phục email đăng nhập trước đó',
    checking: 'Đang kiểm tra liên kết khôi phục…',
    description: 'Chỉ dùng nếu bạn không thực hiện đổi email đăng nhập SelfForge. Việc khôi phục sẽ đăng xuất mọi phiên.',
    button: 'Khôi phục email trước đó', restoring: 'Đang khôi phục…',
    doneTitle: 'Đã khôi phục email trước đó',
    done: 'Mọi phiên đăng nhập đã được đăng xuất. Hãy đăng nhập lại bằng email đã khôi phục. Nếu nghi ngờ ai đó biết mật khẩu, hãy đặt lại mật khẩu trước khi tiếp tục.',
    invalidTitle: 'Liên kết khôi phục không dùng được',
    invalid: 'Liên kết có thể đã hết hạn, đã được dùng hoặc không còn khớp với email hiện tại của tài khoản.',
    login: 'Đi đến đăng nhập',
  };

  return <main className="auth-page"><section className="auth-card" aria-live="polite">
    <h1>{state === 'done' ? copy.doneTitle : state === 'invalid' ? copy.invalidTitle : copy.title}</h1>
    {state === 'checking' && <p role="status">{copy.checking}</p>}
    {state === 'ready' && <><p>{copy.description}</p><button type="button" className="btn btn-primary" onClick={restore}>{copy.button}</button></>}
    {state === 'restoring' && <p role="status">{copy.restoring}</p>}
    {state === 'done' && <><p>{copy.done}</p><Link className="btn btn-primary" to="/login">{copy.login}</Link></>}
    {state === 'invalid' && <><p role="alert">{copy.invalid}</p><Link className="btn btn-secondary" to="/login">{copy.login}</Link></>}
  </section></main>;
}
