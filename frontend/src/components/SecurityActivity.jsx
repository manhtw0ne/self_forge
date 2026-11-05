import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { readSecurityEventPage } from '../utils/securityEvents';

const labels = {
  REGISTERED: ['Đã tạo tài khoản', 'Account created'],
  SIGNED_IN: ['Đăng nhập bằng mật khẩu', 'Signed in with password'],
  SIGNED_IN_WITH_OAUTH: ['Đăng nhập bằng tài khoản liên kết', 'Signed in with a linked account'],
  PASSWORD_CHANGED: ['Đã đổi mật khẩu', 'Password changed'],
  PASSWORD_RESET: ['Đã đặt lại mật khẩu', 'Password reset'],
  EMAIL_CHANGED: ['Đã đổi email tài khoản', 'Account email changed'],
  EMAIL_CHANGE_RECOVERED: ['Đã khôi phục email tài khoản', 'Account email restored'],
  EMAIL_VERIFIED: ['Đã xác minh email tài khoản', 'Account email verified'],
  SESSION_REVOKED: ['Đã đăng xuất một phiên', 'A session was signed out'],
  OTHER_SESSIONS_REVOKED: ['Đã đăng xuất các phiên khác', 'Other sessions were signed out'],
};

export default function SecurityActivity({ disabled = false }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [state, setState] = useState('loading');
  const latest = useRef(0);
  const copy = value => en ? value[1] : value[0];

  const load = async (beforeId = null, append = false) => {
    const request = ++latest.current;
    setState(append ? 'loading-more' : 'loading');
    try {
      const response = await api.get('/profile/security-events', { params: beforeId ? { beforeId } : undefined });
      const page = readSecurityEventPage(response.data);
      if (request !== latest.current) return;
      setItems(current => append ? [...current, ...page.items] : page.items);
      setCursor(page.nextCursor);
      setState('ready');
    } catch {
      if (request === latest.current) setState('error');
    }
  };

  useEffect(() => { void load(); return () => { latest.current += 1; }; }, []);
  const date = value => new Date(value).toLocaleString(en ? 'en-US' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

  return <section className="card" style={{ marginTop: '1.5rem' }} aria-labelledby="security-activity-title">
    <h3 id="security-activity-title">{en ? 'Account activity' : 'Hoạt động bảo mật'}</h3>
    <p>{en ? 'Shows account-security actions from the last 90 days. It does not store IP addresses, device details, tokens, passwords, or private app content.' : 'Hiển thị các thao tác bảo mật của tài khoản trong 90 ngày gần đây. Phần này không lưu địa chỉ IP, thông tin thiết bị, token, mật khẩu hoặc nội dung riêng tư trong ứng dụng.'}</p>
    {state === 'loading' && <p role="status">{en ? 'Loading activity…' : 'Đang tải hoạt động…'}</p>}
    {state === 'error' && <p role="alert">{en ? 'Could not load account activity.' : 'Chưa tải được hoạt động bảo mật.'}</p>}
    {state !== 'loading' && state !== 'error' && <>
      {!items.length ? <p>{en ? 'No recent security activity is available.' : 'Chưa có hoạt động bảo mật gần đây.'}</p> : <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
        {items.map(item => <li key={item.id} style={{ padding: '0.875rem 0', borderBottom: '1px solid var(--border-color)' }}>
          <strong>{copy(labels[item.type])}</strong><div>{date(item.occurredAt)}</div>
        </li>)}
      </ul>}
    </>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || state === 'loading' || state === 'loading-more'} onClick={() => void load()}>{en ? 'Refresh' : 'Tải lại'}</button>
      {cursor && <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || state === 'loading-more'} onClick={() => void load(cursor, true)}>{state === 'loading-more' ? (en ? 'Loading…' : 'Đang tải…') : (en ? 'Show more' : 'Xem thêm')}</button>}
    </div>
  </section>;
}
