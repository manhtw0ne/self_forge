import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { appendHabitStateHistory, readHabitStateHistoryPage } from '../utils/habitStateHistory';

const copy = {
  vi: {
    open: 'Xem lịch sử thay đổi', hide: 'Ẩn lịch sử thay đổi', title: 'Lịch sử thói quen',
    description: 'Chỉ hiển thị các trạng thái SelfForge đã ghi nhận. Ứng dụng không suy diễn lịch trước đó hoặc tự sửa check-in cũ.',
    loading: 'Đang tải lịch sử thay đổi…', loadMore: 'Tải thêm lịch sử', refresh: 'Tải lại lịch sử',
    error: 'Chưa tải được lịch sử thay đổi. Dữ liệu thói quen hiện tại không bị ảnh hưởng.',
    empty: 'Chưa có trạng thái lịch nào được ghi nhận cho thói quen này.',
    created: 'Đã tạo', observed: 'Bắt đầu ghi nhận', changed: 'Đã cập nhật',
    active: 'Đang bật', inactive: 'Đã tắt', target: '{count} lần/tuần', schedule: 'Lịch: {days}',
  },
  en: {
    open: 'View schedule history', hide: 'Hide schedule history', title: 'Schedule change history',
    description: 'This shows only states recorded by SelfForge. It does not infer an earlier schedule or rewrite old check-ins.',
    loading: 'Loading schedule history…', loadMore: 'Load more history', refresh: 'Refresh history',
    error: 'The schedule history could not be loaded. Your current habit data is unchanged.',
    empty: 'No schedule state has been recorded for this habit yet.',
    created: 'Created', observed: 'Began recording', changed: 'Updated',
    active: 'Active', inactive: 'Paused', target: '{count} times/week', schedule: 'Schedule: {days}',
  },
};

function displayTime(entry, language) {
  try {
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: entry.timezone,
    }).format(new Date(entry.recordedAt));
  } catch {
    return entry.calendarDate;
  }
}

export default function HabitStateHistory({ habitId, stateVersion }) {
  const { language } = useLanguage();
  const text = copy[language === 'en' ? 'en' : 'vi'];
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const request = useRef(0);
  const regionId = `habit-state-history-${habitId}`;

  const loadPage = useCallback(async (cursor, replace) => {
    const ticket = ++request.current;
    setLoading(true);
    setError(false);
    try {
      const response = await api.get(`/habits/${habitId}/state-history`, {
        params: cursor === null ? undefined : { beforeId: cursor },
      });
      const page = readHabitStateHistoryPage(response.data, cursor);
      if (ticket !== request.current) return;
      setItems(current => replace ? page.items : appendHabitStateHistory(current, page.items));
      setNextCursor(page.nextCursor);
    } catch {
      if (ticket === request.current) setError(true);
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, [habitId]);

  useEffect(() => {
    // A new target/state must start from the newest page, never an old cursor.
    setItems([]);
    setNextCursor(null);
    setError(false);
    setLoading(false);
    if (!open) return undefined;
    void loadPage(null, true);
    return () => { request.current += 1; };
  }, [open, stateVersion, loadPage]);

  const toggle = () => {
    // Collapsing also invalidates an in-flight response through effect cleanup.
    setOpen(value => !value);
  };
  const phrase = (template, count) => template.replace('{count}', String(count));
  const schedule = entry => entry.scheduledDays.split(',').map(day => language === 'en'
    ? ({ MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' }[day])
    : ({ MON: 'T2', TUE: 'T3', WED: 'T4', THU: 'T5', FRI: 'T6', SAT: 'T7', SUN: 'CN' }[day])).join(', ');
  const kind = { CREATED: text.created, OBSERVED: text.observed, CHANGED: text.changed };

  return <section style={{ marginTop: '0.75rem' }}>
    <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} aria-controls={regionId} onClick={toggle}>
      {open ? text.hide : text.open}
    </button>
    {open && <div id={regionId} className="card" aria-busy={loading} aria-labelledby={`${regionId}-title`} style={{ marginTop: '0.75rem', padding: '1rem' }}>
      <h3 id={`${regionId}-title`} style={{ fontSize: '1rem' }}>{text.title}</h3>
      <p>{text.description}</p>
      {loading && <p role="status">{text.loading}</p>}
      {error && <div role="alert"><p>{text.error}</p><button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={() => void loadPage(null, true)}>{text.refresh}</button></div>}
      {!loading && !error && items.length === 0 && <p>{text.empty}</p>}
      {items.length > 0 && <ol style={{ paddingLeft: '1.25rem', margin: '1rem 0 0' }}>
        {items.map(entry => <li key={entry.id} style={{ marginBottom: '0.75rem', overflowWrap: 'anywhere' }}>
          <strong>{kind[entry.kind]}</strong> · {entry.active ? text.active : text.inactive} · {phrase(text.target, entry.targetPerWeek)} · {phrase(text.schedule, schedule(entry))}
          <br /><small>{displayTime(entry, language)} · {entry.timezone}</small>
        </li>)}
      </ol>}
      {items.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
        {nextCursor !== null && <button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={() => void loadPage(nextCursor, false)}>{loading ? text.loading : text.loadMore}</button>}
        <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={() => void loadPage(null, true)}>{text.refresh}</button>
      </div>}
    </div>}
  </section>;
}
