import { JOURNAL_LIMIT, journalFields, oversizedJournalFields } from '../utils/journalLimits';
import { readJournalDraft, writeJournalDraft, removeJournalDraft } from '../utils/journalDraft';
import { createLatestRequest } from '../utils/latestRequest';
import { useLanguage } from '../context/useLanguage';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { useAuth } from '../context/useAuth';
import { todayInTimezone, shiftDate, formatCalendarDate } from '../utils/dates';

export default function JournalPage() {
  const { user } = useAuth();
  return <JournalContent key={user.id} />;
}
function JournalContent() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState({ win: '', obstacle: '', lesson: '', tomorrowFocus: '' });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => todayInTimezone(user?.timezone));
  const [journalDates, setJournalDates] = useState([]);
  const toast = useToast();
  const requests = useRef(createLatestRequest());
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [datesError, setDatesError] = useState(false);
  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const changeField = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next); setDirty(true);
    try { writeJournalDraft(window.sessionStorage, user.id, selectedDate, next); setDraftSaved(true); setDraftError(false); }
    catch { setDraftError(true); setDraftSaved(false); }
  };
  const restoreDraft = () => {
    if (!draft || savingRef.current) return;
    setForm(draft); setDirty(true); setDraft(null); setDraftSaved(true);
  };
  const discardDraft = () => {
    if (!window.confirm(t('Xóa bản nháp trên tab này? Bài viết trên server không thay đổi.'))) return;
    try { removeJournalDraft(window.sessionStorage, user.id, selectedDate); setDraft(null); setDraftError(false); setDraftSaved(false); }
    catch { setDraftError(true); }
  };
  useEffect(() => {
    const warn = event => { if (dirty || savingRef.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const today = todayInTimezone(user?.timezone);
  const isToday = selectedDate === today;

  const loadEntry = useCallback((date) => {
    setLoading(true);
    setLoadError(false);
    setDraftSaved(false);
    setDraft(null);
    setDraftError(false);
    try { setDraft(readJournalDraft(window.sessionStorage, user.id, date)); }
    catch { setDraftError(true); }
    void requests.current.run(() => api.get('/journal?date=' + date), r => {
      setEntry(r.data);
      setForm({ win: r.data.win || '', obstacle: r.data.obstacle || '', lesson: r.data.lesson || '', tomorrowFocus: r.data.tomorrowFocus || '' });
      setDirty(false);
    }, error => {
      if (error.response?.status === 404) {
        setEntry(null);
        setForm({ win: '', obstacle: '', lesson: '', tomorrowFocus: '' });
        setDirty(false);
      } else setLoadError(true);
    }, () => setLoading(false));
  }, [user.id]);

  const loadDates = useCallback(() => {
    setDatesError(false);
    api.get('/journal/dates')
      .then(r => setJournalDates(r.data || []))
      .catch(() => setDatesError(true));
  }, []);

  useEffect(() => {
    loadEntry(selectedDate);
    const gate = requests.current;
    return () => gate.invalidate();
  }, [loadEntry, selectedDate]);

  useEffect(() => { loadDates(); }, [loadDates]);

  const goToDate = (date) => {
    if (savingRef.current || date === selectedDate) return;
    if (dirty && !draftSaved && !window.confirm(t('Bạn có thay đổi chưa lưu. Bỏ thay đổi để chuyển ngày?'))) return;
    requests.current.invalidate();
    setLoading(true);
    setSelectedDate(date);
  };

  const goDay = (offset) => {
    const next = shiftDate(selectedDate, offset);
    if (next > today) return;
    goToDate(next);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (savingRef.current || loading || loadError || oversizedJournalFields(form).length > 0) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await api.post('/journal', { ...form, date: selectedDate });
      setEntry(res.data);
      setDirty(false);
      try { removeJournalDraft(window.sessionStorage, user.id, selectedDate); setDraft(null); setDraftSaved(false); setDraftError(false); }
      catch { setDraftError(true); }
      toast.success(t("💾 Đã lưu nhật ký thành công!"));
      loadDates();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu'));
    } finally { savingRef.current = false; setSaving(false); }
  };



  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{t("📝 Nhật ký")}</h1>
        <p>{t("Suy ngẫm cuối ngày — ghi lại để tiến bộ")}</p>
      </div>

      {/* Date Navigation */}
      <div className="journal-nav">
        <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => goDay(-1)}>{t("← Trước")}</button>
        <div className="journal-date-display">
          {isToday ? t('📅 Hôm nay') : '📅'} — {formatCalendarDate(selectedDate, language)}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => goDay(1)} disabled={saving || selectedDate >= today}>{t("Sau →")}</button>
        {!isToday && (
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => goToDate(today)}>{t("Về hôm nay")}</button>
        )}
      </div>

      {datesError && <div role="status"><p>{t('Không thể tải danh sách ngày nhật ký.')}</p><button className="btn btn-secondary btn-sm" onClick={loadDates}>{t('Thử lại')}</button></div>}
      {/* Recent journal dates */}
      {journalDates.length > 0 && (
        <div className="journal-dates-list">
          {journalDates.slice(0, 14).map(d => (
            <button
              key={d}
              className={`journal-date-chip ${d === selectedDate ? 'active' : ''}`}
              disabled={saving} onClick={() => goToDate(d)}
            >
              {formatCalendarDate(d, language, { month: 'numeric', day: 'numeric' })}
            </button>
          ))}
        </div>
      )}

      {draftError && <div role="alert"><p>{t('Không thể đọc hoặc lưu bản nháp. Giữ trang mở để tránh mất nội dung.')}</p><button className="btn btn-secondary" disabled={saving} onClick={discardDraft}>{t('Xóa bản nháp')}</button></div>}
      {draft && !loadError && <div className="card" role="status"><p>{t('Có bản nháp trên tab này. Khôi phục sẽ thay nội dung biểu mẫu, chưa ghi lên server.')}</p><button className="btn btn-primary" disabled={saving} onClick={restoreDraft}>{t('Khôi phục bản nháp')}</button><button className="btn btn-secondary" disabled={saving} onClick={discardDraft}>{t('Xóa bản nháp')}</button></div>}
      {draftSaved && <p role="status">{t('Đã giữ bản nháp trong tab này — chưa lưu lên server.')}</p>}
      {loadError ? <div role="alert"><p>{t('Không thể tải nhật ký. Hãy thử lại trước khi chỉnh sửa.')}</p><button className="btn btn-secondary" onClick={() => loadEntry(selectedDate)}>{t('Thử lại')}</button></div> : <form onSubmit={handleSave} aria-busy={saving}>
        {oversizedJournalFields(form).length > 0 && <div role="alert">
          <p>{t('Một số mục vượt 5.000 ký tự. Hãy rút ngắn trước khi lưu; bản nháp chưa bị cắt.')}</p>
          <ul>{oversizedJournalFields(form).map(field => <li key={field}>{t(journalFields[field])}: {form[field].length}/{JOURNAL_LIMIT}</li>)}</ul>
        </div>}
        <fieldset disabled={saving || !!draft} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="card-grid card-grid-2" style={{ marginBottom: '1rem' }}>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--success)' }}>{t("🏆 Điều thắng được")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" value={form.win} onChange={e => changeField('win', e.target.value)} placeholder={t("Hôm nay bạn đã làm tốt điều gì?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.win.length}/5000</small>
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--danger)' }}>{t("🚧 Trở ngại")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" value={form.obstacle} onChange={e => changeField('obstacle', e.target.value)} placeholder={t("Khó khăn gặp phải?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.obstacle.length}/5000</small>
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--info)' }}>{t("💡 Bài học")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" value={form.lesson} onChange={e => changeField('lesson', e.target.value)} placeholder={t("Rút ra bài học gì?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.lesson.length}/5000</small>
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label className="form-label" style={{ color: 'var(--warning)' }}>{t("🎯 Trọng tâm ngày mai")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" value={form.tomorrowFocus} onChange={e => changeField('tomorrowFocus', e.target.value)} placeholder={t("Ngày mai sẽ tập trung vào gì?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.tomorrowFocus.length}/5000</small>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" disabled={oversizedJournalFields(form).length > 0} className="btn btn-primary">{t(saving ? 'Đang xử lý…' : '💾 Lưu nhật ký')}</button>
          {entry && entry.date && (
            <span className="badge badge-info">{t('Ngày nhật ký:')} {formatCalendarDate(entry.date, language)}</span>
          )}
        </div>
        </fieldset>
      </form>}
    </div>
  );
}
