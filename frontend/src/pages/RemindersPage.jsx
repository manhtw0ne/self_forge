import {reminderEditPayload,reminderSnapshot,readLatestReminder} from '../utils/reminderEdit';
import {defaultHabitReminderDays,scheduledHabitReminderDays,reminderDaysFitHabit} from '../utils/habitReminder';
import ReminderWeek from '../components/ReminderWeek';
import ModalOverlay from '../components/ModalOverlay';
import { createReminderSafely, readPendingReminder, removePendingReminder } from '../utils/pendingReminder';
import { reminderCalendar } from '../utils/reminderCalendar';
import NativeReminderNotifications from '../components/NativeReminderNotifications';
import { Link } from 'react-router-dom';
import { createLatestRequest } from '../utils/latestRequest';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { publishAccountDataChange, subscribeAccountDataChanges } from '../utils/accountDataSync';

export default function RemindersPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [pending, setPending] = useState(() => {
    try { return readPendingReminder(sessionStorage, user.id); } catch { return { invalid: true }; }
  });
  const [editing, setEditing] = useState(null);
  const [editConflict,setEditConflict]=useState(false),[latestReminder,setLatestReminder]=useState(null);
  const initialForm = useRef(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(20);
  const [reminders, setReminders] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ habitId: '', reminderTime: '07:00', daysOfWeek: '', message: '' });
  const toast = useToast();
  const inFlight = useRef(false);
  const requests = useRef(createLatestRequest());
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    return requests.current.run(() => Promise.all([api.get('/reminders'), api.get('/habits')]),
      ([r, h]) => {
        const activeHabits = new Map(h.data.map(habit => [habit.id, habit]));
        setReminders(r.data.map(reminder => {
          const habit = activeHabits.get(reminder.habitId);
          return {
            ...reminder,
            habitActive: reminder.habitActive ?? Boolean(habit),
            habitScheduledDays: reminder.habitScheduledDays ?? habit?.scheduledDays ?? null,
          };
        }));
        setHabits(h.data);
      },
      () => setLoadError(true), () => setLoading(false));
  }, []);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  const announceReminderChange = () => {
    if (typeof window !== 'undefined' && user?.id) publishAccountDataChange(user.id, 'reminders', window.localStorage);
  };

  useEffect(() => {
    load();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return undefined;
    return subscribeAccountDataChanges(window, user.id, change => {
      if (change.resource !== 'reminders' && change.resource !== 'habits') return;
      if (showModal || pending || inFlight.current) {
        setNeedsRefresh(true);
        return;
      }
      loadRef.current();
    });
  }, [user?.id, showModal, pending]);

  const dirty = showModal && initialForm.current && Object.keys(form).some(key => form[key] !== initialForm.current[key]);
  const closeForm = () => {
    if (inFlight.current) return;
    if (dirty && !window.confirm(t('Đóng biểu mẫu và bỏ thay đổi chưa lưu?'))) return;
    setShowModal(false);
  };
  useEffect(() => {
    if (!dirty) return;
    const guard = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  const openCreate = () => {
    if (inFlight.current || pending) return;
    setEditing(null);setEditConflict(false);setLatestReminder(null);
    const next = { habitId: '', reminderTime: '07:00', daysOfWeek: '', message: '' };
    initialForm.current = next; setForm(next);
    setShowModal(true);
  };
  const openEdit = reminder => {
    if (inFlight.current || pending) return;
    setEditing(reminder);setEditConflict(false);setLatestReminder(null);
    const next = { habitId: String(reminder.habitId), reminderTime: reminder.reminderTime.substring(0, 5),
      daysOfWeek: reminder.daysOfWeek, message: reminder.message || '' };
    initialForm.current = next; setForm(next);
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (inFlight.current||editConflict) return;
    if (pending?.invalid) return;
    if (!pending && !form.daysOfWeek) { toast.error(t('Chọn ít nhất một ngày.')); return; }
    if (!pending && !reminderDaysFitHabit(form.daysOfWeek.split(',').filter(Boolean), formHabitSchedule)) {
      toast.error(t('Chỉ chọn ngày thực hiện của thói quen.')); return;
    }
    inFlight.current = true; setBusy(true);
    try {
      if (editing && !pending) {
        await api.patch('/reminders/' + editing.id,reminderEditPayload(form,editing));
      } else {
        await createReminderSafely(sessionStorage, user.id, form, payload => api.post('/reminders', payload));
        setPending(null);
      }
      setForm({ habitId: '', reminderTime: '07:00', daysOfWeek: '', message: '' });
      setShowModal(false);
      toast.success(t(editing && !pending ? 'Đã cập nhật lịch nhắc.' : 'Đã tạo nhắc nhở! 🔔'));
      setEditing(null);
      await load();
      announceReminderChange();
    } catch (err) {
      if(editing&&!pending&&err.response?.status===409){setEditConflict(true);setLatestReminder(null);}
      if (!editing || pending) {
        try { const waiting = readPendingReminder(sessionStorage, user.id); setPending(waiting); if (waiting) setShowModal(false); }
        catch { setPending({ invalid: true }); setShowModal(false); }
      }
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { inFlight.current = false; setBusy(false); }
  };

  const handleToggle = async reminder => {
    const {id,enabled}=reminder;
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.patch(`/reminders/${id}`, { enabled: !enabled,expected:reminderSnapshot(reminder) });
      toast.info(t(enabled ? 'Đã tắt nhắc nhở' : 'Đã bật nhắc nhở'));
      await load();
      announceReminderChange();
    } catch (err) {
      toast.error(t(err.response?.data?.detail||'Chưa xác nhận được kết quả. Hãy kiểm tra danh sách sau khi tải lại.'));
      await load();
    } finally { inFlight.current = false; setBusy(false); }
  };

  const exportCalendar = items => {
    let url;
    try {
      const calendar = reminderCalendar(items, user.timezone || 'Asia/Ho_Chi_Minh');
      if (!calendar.count) { toast.info(t('Không có lần nhắc nào để xuất.')); return; }
      url = URL.createObjectURL(new Blob([calendar.content], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'selfforge-reminders.ics';
      document.body.appendChild(link); link.click(); link.remove();
      toast.success(t('Đã xuất {count} lần nhắc trong 90 ngày.', { count: calendar.count }));
    } catch { toast.error(t('Không thể xuất lịch nhắc.')); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  };

  const handleDelete = async (id) => {
    if (inFlight.current || !window.confirm(t('Xóa lịch nhắc này?'))) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.delete(`/reminders/${id}`);
      toast.info(t("Đã xóa nhắc nhở"));
      await load();
      announceReminderChange();
    } catch {
      toast.error(t('Chưa xác nhận được kết quả. Hãy kiểm tra danh sách sau khi tải lại.'));
      await load();
    } finally { inFlight.current = false; setBusy(false); }
  };

  if (loadError) return <div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu.')}</p><button disabled={busy} className="btn btn-secondary" onClick={load}>{t('Thử lại')}</button></div>;
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const query = normalize(search.trim());
  const visibleReminders = reminders.filter(item =>
    (filter === 'all' || (filter === 'enabled' ? item.enabled && item.habitActive !== false : filter === 'paused' ? item.enabled && item.habitActive === false : !item.enabled)) &&
    normalize(item.habitName + ' ' + (item.message || '')).includes(query));
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayLabels = { MON: 'T2', TUE: 'T3', WED: 'T4', THU: 'T5', FRI: 'T6', SAT: 'T7', SUN: 'CN' };
  const formHabit = habits.find(habit => String(habit.id) === form.habitId);
  const formHabitSchedule = formHabit?.scheduledDays ?? (editing ? reminders.find(reminder => reminder.habitId === editing.habitId)?.habitScheduledDays : null);
  const allowedFormDays = scheduledHabitReminderDays(formHabitSchedule);
  const formDays = form.daysOfWeek.split(',').filter(Boolean);
  const formScheduleValid = reminderDaysFitHabit(formDays, formHabitSchedule);

  const toggleDay = (day) => {
    const current = formDays;
    if (!allowedFormDays || (!allowedFormDays.includes(day) && !current.includes(day))) return;
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setForm({ ...form, daysOfWeek: newDays.join(',') });
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t("🔔 Nhắc nhở")}</h1>
          <p>{t("Đặt lịch nhắc nhở cho từng thói quen")}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button disabled={busy || showModal} className="btn btn-secondary" onClick={() => { setNeedsRefresh(false); load(); }}>{t('Tải lại lịch nhắc')}</button>
          <button disabled={busy || !!pending || habits.length === 0} className="btn btn-primary" onClick={openCreate}>{t("+ Tạo nhắc nhở")}</button>
        </div>
      </div>

      <ReminderWeek reminders={reminders} timezone={user.timezone} disabled={busy||!!pending} onEdit={id=>{const reminder=reminders.find(row=>row.id===id);if(reminder&&!inFlight.current&&!pending)openEdit(reminder);}}/>
      {needsRefresh && <section className="card" role="status" style={{ marginBottom: '1rem' }}>
        <p>{t('Lịch nhắc hoặc thói quen liên quan đã thay đổi ở cửa sổ khác. Nội dung đang nhập được giữ nguyên.')}</p>
        <button disabled={busy || showModal} className="btn btn-secondary" onClick={() => { setNeedsRefresh(false); load(); }}>{t('Tải phiên bản mới')}</button>
      </section>}
      {pending && <section className="card" role="status" style={{ marginBottom: '1rem' }}>
        <p>{t(pending.invalid ? 'Không thể đọc yêu cầu tạo lịch nhắc trên trình duyệt.' : 'Có yêu cầu tạo lịch nhắc chưa xác nhận. Thử lại sẽ dùng cùng mã để tránh tạo trùng.')}</p>
        {!pending.invalid && <p>{pending.reminderTime} · {pending.message}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {!pending.invalid && <button disabled={busy} className="btn btn-primary" onClick={() => { setEditing(null); handleCreate(); }}>{t('Thử lại')}</button>}
          <button disabled={busy} className="btn btn-secondary" onClick={() => {
            if (!window.confirm(t('Bỏ yêu cầu trên thiết bị? Lịch có thể đã được tạo; kiểm tra danh sách trước khi tạo lại.'))) return;
            try { removePendingReminder(sessionStorage, user.id); setPending(null); } catch { toast.error(t('Không thể đọc yêu cầu tạo lịch nhắc trên trình duyệt.')); }
          }}>{t('Bỏ yêu cầu trên thiết bị')}</button>
        </div>
      </section>}
      <NativeReminderNotifications owner={user.id} reminders={reminders} disabled={busy || !!pending} />
      <p role="note">{language === 'en'
        ? 'On the web, reminders stay in the app; use a calendar file or install SelfForge to receive them while the site is closed.'
        : 'Trên web, lịch chỉ được lưu trong ứng dụng; dùng file lịch hoặc cài ứng dụng SelfForge để nhận nhắc khi không mở trang.'}</p>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>{t('Nhắc qua ứng dụng lịch')}</h2>
        <p>{t('Tải file .ics rồi nhập vào ứng dụng lịch. File chứa các lần nhắc trong 90 ngày tới theo múi giờ tài khoản; giờ không tồn tại khi đổi giờ mùa hè được bỏ qua.')}</p>
        <p>{t('Đây là bản sao: sửa hoặc tắt lịch trong SelfForge không cập nhật lịch đã nhập. Xóa bản cũ trước khi nhập lại để tránh trùng. Thông báo phụ thuộc ứng dụng lịch và quyền trên thiết bị.')}</p>
        <p>{t('File có tên thói quen và lời nhắc. Chỉ nhập vào lịch bạn muốn chia sẻ dữ liệu này.')}</p>
        <button className="btn btn-secondary" disabled={busy || !reminders.some(r => r.enabled && r.habitActive !== false)} onClick={() => exportCalendar(reminders)}>{t('Xuất lịch đang bật (.ics)')}</button>
      </div>
      <p>{t('Giờ nhắc theo múi giờ {timezone}.', { timezone: user.timezone || 'Asia/Ho_Chi_Minh' })}</p>
      {habits.length === 0 && <div className="card"><p>{t('Tạo một thói quen trước để đặt lịch nhắc.')}</p><Link className="btn btn-primary" to="/habits">{t('+ Tạo thói quen')}</Link></div>}
      {reminders.length > 0 && <div style={{ margin: '1rem 0' }}>
        <label className="form-label" htmlFor="reminder-search">{t('Tìm lịch nhắc')}</label>
        <input id="reminder-search" type="search" className="form-input" maxLength={255} value={search} onChange={e => { setSearch(e.target.value); setVisibleLimit(20); }} placeholder={t('Tên thói quen hoặc lời nhắc')} />
        <label className="form-label" htmlFor="reminder-filter">{t('Hiển thị lịch nhắc')}</label>
        <select id="reminder-filter" className="form-select" value={filter} onChange={e => { setFilter(e.target.value); setVisibleLimit(20); }}>
          <option value="all">{t('Tất cả')} ({reminders.length})</option>
          <option value="enabled">{t('Đang bật')} ({reminders.filter(r => r.enabled && r.habitActive !== false).length})</option>
          <option value="paused">{t('Tạm dừng')} ({reminders.filter(r => r.enabled && r.habitActive === false).length})</option>
          <option value="disabled">{t('Đang tắt')} ({reminders.filter(r => !r.enabled).length})</option>
        </select>
      </div>}
      {reminders.length > 0 && visibleReminders.length === 0 && <p role="status">{t('Không có lịch nhắc phù hợp bộ lọc.')}</p>}
      {reminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <p>{t("Chưa có nhắc nhở nào")}</p>
          <button disabled={busy || !!pending || habits.length === 0} className="btn btn-primary" onClick={openCreate}>{t("Tạo nhắc nhở đầu tiên")}</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visibleReminders.slice(0, visibleLimit).map((r, i) => (
            <div key={r.id} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s`, flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', fontFamily: 'Outfit', fontWeight: 700, color: 'var(--accent-primary)', minWidth: '70px' }}>
                {r.reminderTime?.substring(0, 5)}
              </div>
              <div className="habit-info">
                <div className="habit-name">{r.habitName} <span className="badge badge-info">{t(r.enabled ? r.habitActive === false ? 'Tạm dừng' : 'Đang bật' : 'Đang tắt')}</span></div>
                <div className="habit-meta">
                  {r.habitActive === false && <span>{t('Tạm dừng vì thói quen đã tắt. Khôi phục thói quen để dùng lịch này.')} <Link to="/habits">{t('Thói quen')}</Link></span>}
                  <span>{r.daysOfWeek.split(',').map(d => t(dayLabels[d] || d)).join(', ')}</span>
                  {r.message && <span>💬 {r.message}</span>}
                </div>
              </div>
              <div className="habit-actions">
                <button disabled={busy || !r.enabled || r.habitActive === false} className="btn btn-secondary btn-sm" aria-label={t('Xuất lịch của {name}', { name: r.habitName })} onClick={() => exportCalendar([r])}>{t('Xuất .ics')}</button>
                <button disabled={busy || !!pending} className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>{t('Sửa')}</button>
                <button disabled={busy} className={`btn btn-sm ${r.enabled ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggle(r)}>
                  {t(r.enabled ? 'Tắt' : 'Bật')}
                </button>
                <button disabled={busy} className="btn btn-danger btn-sm" aria-label={t("Xóa")} onClick={() => handleDelete(r.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {visibleReminders.length > visibleLimit && <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setVisibleLimit(n => n + 20)}>{t('Xem thêm lịch nhắc')}</button>}

      {showModal && (
        <ModalOverlay onClose={closeForm}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="reminder-title" onClick={e => e.stopPropagation()} onKeyDown={event => {
            if (event.key === 'Escape') { event.stopPropagation(); closeForm(); }
            if (event.key === 'Tab') {
              const controls = [...event.currentTarget.querySelectorAll('button, input, select')].filter(node => !node.matches(':disabled'));
              const first = controls[0], last = controls[controls.length - 1];
              if (!first) { event.preventDefault(); return; }
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
          }}>
            <h2 id="reminder-title" className="modal-title">{t(editing ? 'Sửa lịch nhắc' : 'Tạo nhắc nhở')}</h2>
            {editConflict&&<section role="alert" style={{margin:'1rem 0'}}>
              <p>{t('Lịch nhắc đã thay đổi. Nội dung đang nhập được giữ; tải bản mới trước khi quyết định lưu tiếp.')}</p>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={async()=>{
                if(inFlight.current)return;inFlight.current=true;setBusy(true);setLatestReminder(null);
                try{const {data}=await api.get('/reminders/'+editing.id);const latest=readLatestReminder(data,editing.id);if(latest.habitId!==editing.habitId)throw Error('Invalid reminder habit');setLatestReminder(latest);}
                catch{toast.error(t('Chưa tải được bản lịch nhắc mới. Lịch có thể đã bị xóa; nội dung đang nhập được giữ.'));}
                finally{inFlight.current=false;setBusy(false);}
              }}>{t('Xem lịch nhắc mới nhất')}</button>
              {latestReminder&&<div style={{marginTop:'.75rem',overflowWrap:'anywhere'}}>
                <p>{latestReminder.reminderTime} · {latestReminder.daysOfWeek} · {t(latestReminder.enabled?'Đang bật':'Đang tắt')}</p>
                {latestReminder.message&&<p style={{whiteSpace:'pre-wrap'}}>{latestReminder.message}</p>}
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>{
                  initialForm.current={habitId:String(latestReminder.habitId),reminderTime:latestReminder.reminderTime.slice(0,5),daysOfWeek:latestReminder.daysOfWeek,message:latestReminder.message||''};
                  setEditing(latestReminder);setLatestReminder(null);setEditConflict(false);
                }}>{t('Dùng bản mới làm mốc và giữ nội dung đang nhập')}</button>
              </div>}
            </section>}
            <form onSubmit={handleCreate} aria-busy={busy}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label htmlFor="reminder-habit" className="form-label">{t("Thói quen *")}</label>
                <select id="reminder-habit" autoFocus={!editing} disabled={Boolean(editing)} className="form-select" value={form.habitId} onChange={e => {
                  const habit = habits.find(row => String(row.id) === e.target.value);
                  setForm({ ...form, habitId: e.target.value, daysOfWeek: habit ? defaultHabitReminderDays(habit.scheduledDays).join(',') : '' });
                }} required>
                  <option value="">{t("-- Chọn --")}</option>
                  {editing && !habits.some(h => h.id === editing.habitId) && <option value={String(editing.habitId)}>{editing.habitName}</option>}
                  {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="reminder-time" className="form-label">{t("Giờ nhắc")}</label>
                <input id="reminder-time" autoFocus={Boolean(editing)} required type="time" className="form-input" value={form.reminderTime} onChange={e => setForm({ ...form, reminderTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("Ngày trong tuần")}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {days.map(d => {
                    const selected = formDays.includes(d);
                    const unavailable = !allowedFormDays || !allowedFormDays.includes(d);
                    return <button key={d} type="button" disabled={unavailable && !selected} className={`btn btn-sm ${selected ? unavailable ? 'btn-danger' : 'btn-primary' : 'btn-secondary'}`}
                      aria-pressed={selected} onClick={() => toggleDay(d)} style={{ minWidth: '36px', padding: '0.4rem', opacity: unavailable && !selected ? .6 : 1 }}>
                      {t(dayLabels[d])}
                    </button>;
                  })}
                </div>
                {!form.habitId ? <p className="form-hint">{t('Chọn thói quen trước; ngày nhắc sẽ theo lịch thực hiện.')}</p>
                  : !allowedFormDays ? <p role="alert">{t('Không đọc được lịch thực hiện của thói quen. Hãy tải lại trước khi lưu.')}</p>
                  : !formScheduleValid && <p role="alert">{t('Chỉ chọn ngày thực hiện của thói quen. Bỏ các ngày nghỉ trước khi lưu.')}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="reminder-message" className="form-label">{t("Lời nhắn (tùy chọn)")}</label>
                <input id="reminder-message" maxLength={255} className="form-input" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={t("VD: Đã đến lúc đọc sách!")} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeForm}>{t("Hủy")}</button>
                <button type="submit" className="btn btn-primary" disabled={editConflict || !formScheduleValid}>{t(busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo')}</button>
              </div>
            </fieldset></form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
