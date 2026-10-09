import { createLatestRequest } from '../utils/latestRequest';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

export default function RemindersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ habitId: '', reminderTime: '07:00', daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN', message: '' });
  const toast = useToast();
  const inFlight = useRef(false);
  const requests = useRef(createLatestRequest());
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    return requests.current.run(() => Promise.all([api.get('/reminders'), api.get('/habits')]),
      ([r, h]) => { setReminders(r.data); setHabits(h.data); },
      () => setLoadError(true), () => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ habitId: '', reminderTime: '07:00', daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN', message: '' });
    setShowModal(true);
  };
  const openEdit = reminder => {
    setEditing(reminder);
    setForm({ habitId: String(reminder.habitId), reminderTime: reminder.reminderTime.substring(0, 5),
      daysOfWeek: reminder.daysOfWeek, message: reminder.message || '' });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (!form.daysOfWeek) { toast.error(t('Chọn ít nhất một ngày.')); return; }
    inFlight.current = true; setBusy(true);
    try {
      if (editing) {
        await api.patch('/reminders/' + editing.id, {
          reminderTime: form.reminderTime, daysOfWeek: form.daysOfWeek, message: form.message,
        });
      } else await api.post('/reminders', { ...form, habitId: parseInt(form.habitId) });
      setForm({ habitId: '', reminderTime: '07:00', daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN', message: '' });
      setShowModal(false);
      toast.success(t(editing ? 'Đã cập nhật lịch nhắc.' : 'Đã tạo nhắc nhở! 🔔'));
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { inFlight.current = false; setBusy(false); }
  };

  const handleToggle = async (id, enabled) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.patch(`/reminders/${id}`, { enabled: !enabled });
      toast.info(t(enabled ? 'Đã tắt nhắc nhở' : 'Đã bật nhắc nhở'));
      await load();
    } catch {
      toast.error(t("Không thể cập nhật"));
    } finally { inFlight.current = false; setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (inFlight.current || !window.confirm(t('Xóa lịch nhắc này?'))) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.delete(`/reminders/${id}`);
      toast.info(t("Đã xóa nhắc nhở"));
      await load();
    } catch {
      toast.error(t("Không thể xóa"));
    } finally { inFlight.current = false; setBusy(false); }
  };

  if (loadError) return <div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu.')}</p><button disabled={busy} className="btn btn-secondary" onClick={load}>{t('Thử lại')}</button></div>;
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
          <h1>{t("🔔 Nhắc nhở")}</h1>
          <p>{t("Đặt lịch nhắc nhở cho từng thói quen")}</p>
        </div>
        <button disabled={busy} className="btn btn-primary" onClick={openCreate}>{t("+ Tạo nhắc nhở")}</button>
      </div>

      <p role="note">{t('Lịch này hiện chỉ được lưu trong ứng dụng; chưa gửi thông báo tới thiết bị.')}</p>
      <p>{t('Giờ nhắc theo múi giờ {timezone}.', { timezone: user.timezone || 'Asia/Ho_Chi_Minh' })}</p>
      {reminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <p>{t("Chưa có nhắc nhở nào")}</p>
          <button disabled={busy} className="btn btn-primary" onClick={openCreate}>{t("Tạo nhắc nhở đầu tiên")}</button>
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
                  <span>{r.daysOfWeek.split(',').map(d => t(dayLabels[d] || d)).join(', ')}</span>
                  {r.message && <span>💬 {r.message}</span>}
                </div>
              </div>
              <div className="habit-actions">
                <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>{t('Sửa')}</button>
                <button disabled={busy} className={`btn btn-sm ${r.enabled ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggle(r.id, r.enabled)}>
                  {t(r.enabled ? 'Tắt' : 'Bật')}
                </button>
                <button disabled={busy} className="btn btn-danger btn-sm" aria-label={t("Xóa")} onClick={() => handleDelete(r.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { if (!inFlight.current) setShowModal(false); }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{t(editing ? 'Sửa lịch nhắc' : 'Tạo nhắc nhở')}</h2>
            <form onSubmit={handleCreate} aria-busy={busy}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label className="form-label">{t("Thói quen *")}</label>
                <select disabled={Boolean(editing)} className="form-select" value={form.habitId} onChange={e => setForm({ ...form, habitId: e.target.value })} required>
                  <option value="">{t("-- Chọn --")}</option>
                  {editing && !habits.some(h => h.id === editing.habitId) && <option value={String(editing.habitId)}>{editing.habitName}</option>}
                  {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t("Giờ nhắc")}</label>
                <input required type="time" className="form-input" value={form.reminderTime} onChange={e => setForm({ ...form, reminderTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("Ngày trong tuần")}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {days.map(d => (
                    <button key={d} type="button" className={`btn btn-sm ${form.daysOfWeek.includes(d) ? 'btn-primary' : 'btn-secondary'}`}
                      aria-pressed={form.daysOfWeek.split(',').includes(d)} onClick={() => toggleDay(d)} style={{ minWidth: '36px', padding: '0.4rem' }}>
                      {t(dayLabels[d])}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("Lời nhắn (tùy chọn)")}</label>
                <input maxLength={255} className="form-input" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={t("VD: Đã đến lúc đọc sách!")} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { if (!inFlight.current) setShowModal(false); }}>{t("Hủy")}</button>
                <button type="submit" className="btn btn-primary">{t(busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo')}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}
    </div>
  );
}
