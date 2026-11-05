import { useEffect, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';

export default function TimezoneSelector({ value, onChange, disabled }) {
  const { t } = useLanguage();
  const [zones, setZones] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    api.get('/profile/timezones').then(({ data }) => { if (active) setZones(data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  let deviceZone = '';
  try { deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* Manual selection remains available. */ }
  const matches = zones.filter(zone => zone.toLowerCase().replaceAll('_', ' ').includes(query.trim().toLowerCase().replaceAll('_', ' ')));
  const options = [...new Set([value, ...matches].filter(Boolean))];
  return <div className="form-group">
    <label className="form-label" htmlFor="timezone-search">{t('Tìm múi giờ')}</label>
    <input id="timezone-search" className="form-input" type="search" value={query} disabled={disabled}
      placeholder={t('Nhập tên thành phố, ví dụ: Paris')} onChange={e => setQuery(e.target.value)} />
    <label className="form-label" htmlFor="profile-timezone" style={{ marginTop: '0.75rem' }}>{t('Múi giờ')}</label>
    <select id="profile-timezone" className="form-select" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
      {options.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
    </select>
    {query && matches.length === 0 && <p role="status">{t('Không có kết quả. Múi giờ hiện tại vẫn được giữ.')}</p>}
    {error && <p role="status">{t('Không thể tải danh sách múi giờ.')} <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setAttempt(a => a + 1)}>{t('Thử lại')}</button></p>}
    {zones.includes(deviceZone) && <button type="button" className="btn btn-secondary" disabled={disabled || value === deviceZone}
      style={{ marginTop: '0.75rem' }} onClick={() => { onChange(deviceZone); setQuery(''); }}>{t('Dùng múi giờ thiết bị')}: {deviceZone.replaceAll('_', ' ')}</button>}
    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('Múi giờ quyết định ngày check-in, nhật ký và lịch nhắc. Thay đổi chỉ có hiệu lực sau khi lưu.')}</p>
  </div>;
}
