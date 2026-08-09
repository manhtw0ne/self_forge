import { useEffect, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ habitId: '', reminderTime: '07:00', daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN', message: '' });
  const toast = useToast();

  const load = () => {
    Promise.all([api.get('/reminders'), api.get('/habits')])
      .then(([r, h]) => { setReminders(r.data); setHabits(h.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reminders', { ...form, habitId: parseInt(form.habitId) });
      setForm({ habitId: '', reminderTime: '07:00', daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN', message: '' });
      setShowModal(false);
      toast.success('Đã tạo nhắc nhở! 🔔');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await api.patch(`/reminders/${id}`, { enabled: !enabled });
      toast.info(enabled ? 'Đã tắt nhắc nhở' : 'Đã bật nhắc nhở');
      load();
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      toast.info('Đã xóa nhắc nhở');
      load();
    } catch {
      toast.error('Không thể xóa');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayLabels = { MON: 'T2', TUE: 'T3', WED: 'T4', THU: 'T5', FRI: 'T6', SAT: 'T7', SUN: 'CN' };

  const toggleDay = (day) => {
    const current = form.daysOfWeek.split(',').filter(Boolean);
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setForm({ ...form, daysOfWeek: newDays.join(',') });
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🔔 Nhắc nhở</h1>
          <p>Đặt lịch nhắc nhở cho từng thói quen</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo nhắc nhở</button>
      </div>

      {reminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <p>Chưa có nhắc nhở nào</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Tạo nhắc nhở đầu tiên</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reminders.map((r, i) => (
            <div key={r.id} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s`, opacity: r.enabled ? 1 : 0.5 }}>
              <div style={{ fontSize: '1.5rem', fontFamily: 'Outfit', fontWeight: 700, color: 'var(--accent-primary)', minWidth: '70px' }}>
                {r.reminderTime?.substring(0, 5)}
              </div>
              <div className="habit-info">
                <div className="habit-name">{r.habitName}</div>
                <div className="habit-meta">
                  <span>{r.daysOfWeek.split(',').map(d => dayLabels[d] || d).join(', ')}</span>
                  {r.message && <span>💬 {r.message}</span>}
                </div>
              </div>
              <div className="habit-actions">
                <button className={`btn btn-sm ${r.enabled ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggle(r.id, r.enabled)}>
                  {r.enabled ? 'Tắt' : 'Bật'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Tạo nhắc nhở</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Thói quen *</label>
                <select className="form-select" value={form.habitId} onChange={e => setForm({ ...form, habitId: e.target.value })} required>
                  <option value="">-- Chọn --</option>
                  {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Giờ nhắc</label>
                <input type="time" className="form-input" value={form.reminderTime} onChange={e => setForm({ ...form, reminderTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày trong tuần</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {days.map(d => (
                    <button key={d} type="button" className={`btn btn-sm ${form.daysOfWeek.includes(d) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleDay(d)} style={{ minWidth: '36px', padding: '0.4rem' }}>
                      {dayLabels[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Lời nhắn (tùy chọn)</label>
                <input className="form-input" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="VD: Đã đến lúc đọc sách!" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
