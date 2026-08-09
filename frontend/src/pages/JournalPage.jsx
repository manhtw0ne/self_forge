import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

export default function JournalPage() {
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState({ win: '', obstacle: '', lesson: '', tomorrowFocus: '' });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [journalDates, setJournalDates] = useState([]);
  const toast = useToast();

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

  const loadEntry = useCallback((date) => {
    setLoading(true);
    api.get(`/journal?date=${date}`)
      .then(r => {
        setEntry(r.data);
        setForm({
          win: r.data.win || '',
          obstacle: r.data.obstacle || '',
          lesson: r.data.lesson || '',
          tomorrowFocus: r.data.tomorrowFocus || '',
        });
      })
      .catch(() => {
        setEntry(null);
        setForm({ win: '', obstacle: '', lesson: '', tomorrowFocus: '' });
      })
      .finally(() => setLoading(false));
  }, []);

  const loadDates = useCallback(() => {
    api.get('/journal/dates')
      .then(r => setJournalDates(r.data || []))
      .catch(() => setJournalDates([]));
  }, []);

  useEffect(() => {
    loadEntry(selectedDate);
    loadDates();
  }, [loadEntry, loadDates, selectedDate]);

  const goToDate = (date) => {
    setSelectedDate(date);
  };

  const goDay = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const next = d.toISOString().split('T')[0];
    if (next > today) return;
    goToDate(next);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/journal', { ...form, date: selectedDate });
      setEntry(res.data);
      toast.success('💾 Đã lưu nhật ký thành công!');
      loadDates();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu');
    }
  };

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📝 Nhật ký</h1>
        <p>Suy ngẫm cuối ngày — ghi lại để tiến bộ</p>
      </div>

      {/* Date Navigation */}
      <div className="journal-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => goDay(-1)}>← Trước</button>
        <div className="journal-date-display">
          {isToday ? '📅 Hôm nay' : '📅'} — {formatDisplayDate(selectedDate)}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => goDay(1)} disabled={selectedDate >= today}>Sau →</button>
        {!isToday && (
          <button className="btn btn-primary btn-sm" onClick={() => goToDate(today)}>Về hôm nay</button>
        )}
      </div>

      {/* Recent journal dates */}
      {journalDates.length > 0 && (
        <div className="journal-dates-list">
          {journalDates.slice(0, 14).map(d => (
            <button
              key={d}
              className={`journal-date-chip ${d === selectedDate ? 'active' : ''}`}
              onClick={() => goToDate(d)}
            >
              {new Date(d + 'T00:00:00').getDate()}/{new Date(d + 'T00:00:00').getMonth() + 1}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="card-grid card-grid-2" style={{ marginBottom: '1rem' }}>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--success)' }}>🏆 Điều thắng được</label>
              <textarea className="form-textarea" value={form.win} onChange={e => setForm({ ...form, win: e.target.value })} placeholder="Hôm nay bạn đã làm tốt điều gì?" />
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--danger)' }}>🚧 Trở ngại</label>
              <textarea className="form-textarea" value={form.obstacle} onChange={e => setForm({ ...form, obstacle: e.target.value })} placeholder="Khó khăn gặp phải?" />
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--info)' }}>💡 Bài học</label>
              <textarea className="form-textarea" value={form.lesson} onChange={e => setForm({ ...form, lesson: e.target.value })} placeholder="Rút ra bài học gì?" />
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--warning)' }}>🎯 Trọng tâm ngày mai</label>
              <textarea className="form-textarea" value={form.tomorrowFocus} onChange={e => setForm({ ...form, tomorrowFocus: e.target.value })} placeholder="Ngày mai sẽ tập trung vào gì?" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary">💾 Lưu nhật ký</button>
          {entry && entry.date && (
            <span className="badge badge-info">Đã lưu lần cuối: {entry.date}</span>
          )}
        </div>
      </form>
    </div>
  );
}
