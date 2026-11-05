import JournalWeekPlan from '../components/JournalWeekPlan';
import JournalMonthDownload from '../components/JournalMonthDownload';
import {appendRestartReflection} from '../utils/restartReflection';
import RestartJournalReflection from '../components/RestartJournalReflection';
import JournalComparison from '../components/JournalComparison';
import PreviousJournal from '../components/PreviousJournal';
import JournalCalendar from '../components/JournalCalendar';
import JournalTemplatePicker from '../components/JournalTemplatePicker';
import {applyJournalTemplate} from '../utils/journalTemplates';
import {useSearchParams} from 'react-router-dom';
import {readJournalDateTarget} from '../utils/journalNavigation';
import JournalDeleteDialog from '../components/JournalDeleteDialog';
import {journalDeletePayload} from '../utils/journalDelete';
import {journalSaveConfirmed} from '../utils/journalSaveRecovery';
import JournalSearch from '../components/JournalSearch';
import JournalEvidence from '../components/JournalEvidence';
import JournalCoach from '../components/JournalCoach';
import {appendJournalEvidence} from '../utils/journalEvidence';
import SavedJournalDownload from '../components/SavedJournalDownload';
import DraftDownload from '../components/DraftDownload';
import DraftLibrary from '../components/DraftLibrary';
import { useAccountDate } from '../hooks/useAccountDate';
import { JOURNAL_LIMIT, journalFields, oversizedJournalFields } from '../utils/journalLimits';
import { readJournalDraft, writeJournalDraft, removeJournalDraft } from '../utils/journalDraft';
import { createLatestRequest } from '../utils/latestRequest';
import { useLanguage } from '../context/useLanguage';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';
import {isConnectionFailure} from '../utils/networkStatus';
import { useAuth } from '../context/useAuth';
import { todayInTimezone, shiftDate, formatCalendarDate } from '../utils/dates';
import {publishAccountDataChange,subscribeAccountDataChanges} from '../utils/accountDataSync';

export default function JournalPage() {
  const { user } = useAuth();
  const [searchParams,setSearchParams]=useSearchParams();
  const target=readJournalDateTarget(searchParams.toString(),todayInTimezone(user.timezone));
  const navigateDate=date=>{const next=new URLSearchParams(searchParams);next.set('date',date);setSearchParams(next);};
  return <JournalContent key={user.id+':'+(target?.date??'default')} target={target} onNavigate={navigateDate}/>;
}
function JournalContent({target,onNavigate}) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [deleteOpen,setDeleteOpen]=useState(false),[deleteFailed,setDeleteFailed]=useState(false);
  const deleteRequest=useRef(null);
  const [form, setForm] = useState({ win: '', obstacle: '', lesson: '', tomorrowFocus: '' });
  const [loading, setLoading] = useState(true);
  const [selectedDate] = useState(() => target?.date??todayInTimezone(user?.timezone));
  const [historyMonth, setHistoryMonth] = useState('ALL');
  const [historyLimit, setHistoryLimit] = useState(14);
  const [journalDates, setJournalDates] = useState([]);
  const toast = useToast();
  const requests = useRef(createLatestRequest());
  const dateRequests = useRef(createLatestRequest());
  const [datesLoading, setDatesLoading] = useState(false);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
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

  const today = useAccountDate(user?.timezone);
  const isToday = selectedDate === today;

  const loadEntry = useCallback((date) => {
    setLoading(true);
    setLoadError(false);
    setConflict(false);
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
    setDatesLoading(true);
    return dateRequests.current.run(() => api.get('/journal/dates'),
      r => setJournalDates(r.data || []), () => setDatesError(true), () => setDatesLoading(false));
  }, []);
  const announceJournalChange = () => {
    try { publishAccountDataChange(user.id, 'journal', window.localStorage); } catch { /* Cross-tab refresh is optional. */ }
  };

  useEffect(() => {
    loadEntry(selectedDate);
    const gate = requests.current;
    return () => gate.invalidate();
  }, [loadEntry, selectedDate]);

  useEffect(() => {
    loadDates();
    const gate = dateRequests.current;
    return () => gate.invalidate();
  }, [loadDates]);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    return subscribeAccountDataChanges(window, user.id, change => {
      if (change.resource !== 'journal') return;
      // A different tab must never replace writing or a recoverable draft in this tab.
      if (savingRef.current || dirty || draft || deleteOpen) return;
      loadEntry(selectedDate);
      loadDates();
    });
  }, [user.id, selectedDate, loadEntry, loadDates, dirty, draft, deleteOpen]);

  const goToDate = (date) => {
    if (savingRef.current || !date || date > today || date === selectedDate) return;
    if (dirty && !draftSaved && !window.confirm(t('Bạn có thay đổi chưa lưu. Bỏ thay đổi để chuyển ngày?'))) return;
    requests.current.invalidate();
    setLoading(true);
    onNavigate(date);
  };

  const goDay = (offset) => {
    const next = shiftDate(selectedDate, offset);
    if (next > today) return;
    goToDate(next);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (savingRef.current || loading || loadError || conflict || oversizedJournalFields(form).length > 0) return;
    savingRef.current = true;
    setSaving(true);
    const submitted = { ...form };
    try {
      const res = await api.post('/journal', { ...submitted, date: selectedDate, expected: { id: entry?.id ?? null, win: entry?.win || '', obstacle: entry?.obstacle || '', lesson: entry?.lesson || '', tomorrowFocus: entry?.tomorrowFocus || '' } });
      setEntry(res.data);
      setDirty(false);
      try { removeJournalDraft(window.sessionStorage, user.id, selectedDate); setDraft(null); setDraftSaved(false); setDraftError(false); }
      catch { setDraftError(true); }
      toast.success(t("💾 Đã lưu nhật ký thành công!"));
      loadDates();
      announceJournalChange();
    } catch (err) {
      let confirmed = null;
      if (isConnectionFailure(err)) {
        try {
          const response = await api.get('/journal?date=' + selectedDate);
          if (journalSaveConfirmed(response.data, selectedDate, submitted)) confirmed = response.data;
        } catch { /* The original draft remains available when confirmation cannot be read. */ }
      }
      if (confirmed) {
        setEntry(confirmed);
        setDirty(false);
        try { removeJournalDraft(window.sessionStorage, user.id, selectedDate); setDraft(null); setDraftSaved(false); setDraftError(false); }
        catch { setDraftError(true); }
        toast.success(language === 'en' ? 'Journal save confirmed.' : 'Đã xác nhận nhật ký đã lưu.');
        loadDates();
        announceJournalChange();
        return;
      }
      if (err.response?.status === 409) setConflict(true);
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu'));
    } finally { savingRef.current = false; setSaving(false); }
  };



  const openDelete=()=>{if(!entry||savingRef.current||dirty||draft||loadError||conflict)return;try{deleteRequest.current=journalDeletePayload(entry);setDeleteFailed(false);setDeleteOpen(true);}catch{toast.error(t('Tải lại bài nhật ký trước khi xóa.'));}};
  const closeDelete=()=>{if(savingRef.current)return;if(deleteFailed)setConflict(true);setDeleteOpen(false);};
  const deleteEntry=async()=>{
    if(savingRef.current||!deleteRequest.current)return;savingRef.current=true;setSaving(true);
    try{await api.delete('/journal',{data:deleteRequest.current});setEntry(null);setForm({win:'',obstacle:'',lesson:'',tomorrowFocus:''});setDirty(false);setConflict(false);setDeleteOpen(false);setDeleteFailed(false);deleteRequest.current=null;
      try{removeJournalDraft(sessionStorage,user.id,selectedDate);setDraft(null);setDraftSaved(false);setDraftError(false);}catch{setDraftError(true);}
      toast.success(t('Đã xóa bài nhật ký đã lưu.'));loadDates();announceJournalChange();
    }catch(error){if(error.response?.status===409){setConflict(true);setDeleteOpen(false);toast.error(t('Bài nhật ký đã thay đổi. Tải bản mới và kiểm tra trước khi xóa.'));}else{setDeleteFailed(true);}}
    finally{savingRef.current=false;setSaving(false);}
  };

  const sortedDates = [...new Set(journalDates)].sort((a, b) => b.localeCompare(a));
  const months = [...new Set(sortedDates.map(date => date.slice(0, 7)))];
  const historyDates = historyMonth === 'ALL' ? sortedDates : sortedDates.filter(date => date.startsWith(historyMonth));

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      {target?.invalid&&<p role="alert">{t('Ngày trong đường dẫn không hợp lệ hoặc ở tương lai. Hãy chọn ngày nhật ký bên dưới.')}</p>}
      <div className="page-header">
        <h1>{t("📝 Nhật ký")}</h1>
        <p>{t("Suy ngẫm cuối ngày — ghi lại để tiến bộ")}</p>
      </div>

      <div style={{ marginBottom: '1rem' }}><DraftDownload kind="journal" date={selectedDate} form={draft || form} disabled={saving || loading || loadError} label={draft ? 'Tải bản nháp (.txt)' : 'Tải nội dung đang mở (.txt)'} /></div>
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

      <div className="form-group" style={{ maxWidth: '20rem' }}>
        <label className="form-label" htmlFor="journal-date-picker">{t('Chọn ngày nhật ký')}</label>
        <input id="journal-date-picker" className="form-input" type="date" max={today} value={selectedDate} disabled={saving}
          onChange={event => { if (event.target.validity.valid) goToDate(event.target.value); }} />
      </div>
      <JournalCalendar dates={journalDates} today={today} selectedDate={selectedDate} loading={datesLoading} error={datesError} disabled={saving} onOpen={goToDate} onRetry={loadDates}/>
      {datesError && <div role="status"><p>{t('Không thể tải danh sách ngày nhật ký.')}</p><button className="btn btn-secondary btn-sm" disabled={datesLoading} onClick={loadDates}>{t('Thử lại')}</button></div>}
      {journalDates.length > 0 && <section className="card" style={{ marginBottom: '1rem' }} aria-label={t('Ngày đã viết nhật ký')}>
        <label className="form-label" htmlFor="journal-history-month">{t('Lọc nhật ký theo tháng')}</label>
        <select id="journal-history-month" className="form-select" style={{ maxWidth: '20rem' }} value={historyMonth} onChange={event => { setHistoryMonth(event.target.value); setHistoryLimit(14); }}>
          <option value="ALL">{t('Tất cả các tháng')}</option>
          {months.map(month => <option key={month} value={month}>{formatCalendarDate(month + '-01', language, { month: 'long', year: 'numeric' })}</option>)}
          {historyMonth !== 'ALL' && !months.includes(historyMonth) && <option value={historyMonth}>{historyMonth}</option>}
        </select>
        <p role="status" style={{ marginTop: '0.75rem' }}>{t('{count} ngày đã viết nhật ký', { count: historyDates.length })}</p>
        <div className="journal-dates-list">
          {historyDates.slice(0, historyLimit).map(date => <button key={date} className={'journal-date-chip' + (date === selectedDate ? ' active' : '')}
            aria-pressed={date === selectedDate} aria-label={formatCalendarDate(date, language)} title={formatCalendarDate(date, language)} disabled={saving} onClick={() => goToDate(date)}>
            {formatCalendarDate(date, language, { year: 'numeric', month: 'numeric', day: 'numeric' })}
          </button>)}
        </div>
        {historyDates.length > historyLimit && <button className="btn btn-secondary btn-sm" onClick={() => setHistoryLimit(limit => limit + 14)}>{t('Xem thêm ngày nhật ký')}</button>}
        {historyLimit > 14 && <button className="btn btn-secondary btn-sm" style={{ marginLeft: '0.5rem' }} onClick={() => setHistoryLimit(14)}>{t('Thu gọn')}</button>}
        {historyDates.length === 0 && <p>{t('Chưa có nhật ký trong tháng này.')}</p>}
      </section>}

      {conflict && <section className="card" role="alert" style={{ marginBottom: '1rem' }}>
        <p>{t('Nội dung trên máy chủ đã thay đổi. Bản nháp được giữ; tải bản mới trước khi lưu tiếp.')}</p>
        <button className="btn btn-secondary" disabled={saving} onClick={() => {
          if (!draftSaved && !window.confirm(t('Trình duyệt chưa giữ được bản nháp. Sao chép nội dung trước khi tải bản mới. Tiếp tục?'))) return;
          loadEntry(selectedDate);
        }}>{t('Tải bản mới từ máy chủ')}</button>
      </section>}
      {draftError && <div role="alert"><p>{t('Không thể đọc hoặc lưu bản nháp. Giữ trang mở để tránh mất nội dung.')}</p><button className="btn btn-secondary" disabled={saving} onClick={discardDraft}>{t('Xóa bản nháp')}</button></div>}
      {draft && !loadError && <div className="card" role="status"><p>{t('Có bản nháp trên tab này. Khôi phục sẽ thay nội dung biểu mẫu, chưa ghi lên server.')}</p><button className="btn btn-primary" disabled={saving} onClick={restoreDraft}>{t('Khôi phục bản nháp')}</button><button className="btn btn-secondary" disabled={saving} onClick={discardDraft}>{t('Xóa bản nháp')}</button></div>}
      {draftSaved && <p role="status">{t('Đã giữ bản nháp trong tab này — chưa lưu lên server.')}</p>}
      <JournalMonthDownload key={'month-copy:'+user.id+':'+today+':'+user.timezone} today={today} timezone={user.timezone} disabled={saving||loading||loadError||Boolean(draft)||conflict}/>
      <JournalTemplatePicker disabled={saving||loading||loadError||Boolean(draft)||conflict} onApply={(id,fields)=>{
        if(savingRef.current||loading||loadError||draft||conflict)return false;
        try{const next=applyJournalTemplate(form,id,fields,t);setForm(next);setDirty(true);
          try{writeJournalDraft(window.sessionStorage,user.id,selectedDate,next);setDraftSaved(true);setDraftError(false);}catch{setDraftSaved(false);setDraftError(true);}
          return true;
        }catch{toast.error(t('Không thể thêm nội dung vì mục nhật ký đã chạm giới hạn. Nội dung hiện tại được giữ.'));return false;}
      }}/>
      <RestartJournalReflection key={'restart:'+user.id+':'+selectedDate} date={selectedDate} disabled={saving||loading||loadError||Boolean(draft)||conflict} onInsert={(field,text)=>{if(savingRef.current||loading||loadError||draft||conflict)return;try{changeField(field,appendRestartReflection(form,field,text));}catch{toast.error(t('Không thể thêm nội dung vì mục nhật ký đã chạm giới hạn. Nội dung hiện tại được giữ.'));}}}/>
      <PreviousJournal key={'previous:'+user.id+':'+selectedDate} date={selectedDate} disabled={saving||loading||loadError||Boolean(draft)||conflict} onOpen={goToDate} onInsert={(field,text)=>{if(savingRef.current||loading||loadError||draft||conflict)return;try{changeField(field,appendJournalEvidence(form,field,text));}catch{toast.error(t('Không thể thêm nội dung vì mục nhật ký đã chạm giới hạn. Nội dung hiện tại được giữ.'));}}}/>
      <JournalSearch today={today} disabled={saving} onOpen={goToDate}/>
      <JournalComparison today={today} dates={journalDates} datesLoading={datesLoading} datesError={datesError} onRetryDates={loadDates} disabled={saving||loading||loadError||Boolean(draft)||conflict} onOpen={goToDate} onInsert={(field,text)=>{if(savingRef.current||loading||loadError||draft||conflict)return;try{changeField(field,appendJournalEvidence(form,field,text));}catch{toast.error(t('Không thể thêm nội dung vì mục nhật ký đã chạm giới hạn. Nội dung hiện tại được giữ.'));}}}/>
      <JournalEvidence key={user.id+':'+selectedDate} date={selectedDate} timezone={user.timezone} disabled={saving||loading||loadError||Boolean(draft)||conflict} onInsert={(field,text)=>{if(savingRef.current||loading||loadError||draft||conflict)return;try{changeField(field,appendJournalEvidence(form,field,text));}catch{toast.error(t('Không thể thêm nội dung vì mục nhật ký đã chạm giới hạn. Nội dung hiện tại được giữ.'));}}}/>
      {loadError ? <div role="alert"><p>{t('Không thể tải nhật ký. Hãy thử lại trước khi chỉnh sửa.')}</p><button className="btn btn-secondary" onClick={() => loadEntry(selectedDate)}>{t('Thử lại')}</button></div> : <form onSubmit={handleSave} aria-busy={saving}>
        {oversizedJournalFields(form).length > 0 && <div role="alert">
          <p>{t('Một số mục vượt 5.000 ký tự. Hãy rút ngắn trước khi lưu; bản nháp chưa bị cắt.')}</p>
          <ul>{oversizedJournalFields(form).map(field => <li key={field}>{t(journalFields[field])}: {form[field].length}/{JOURNAL_LIMIT}</li>)}</ul>
        </div>}
        <fieldset disabled={saving || !!draft} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="card-grid card-grid-2" style={{ marginBottom: '1rem' }}>
          <div className="journal-card">
            <div className="journal-section">
              <label htmlFor="journal-win" className="form-label" style={{ color: 'var(--success)' }}>{t("🏆 Điều thắng được")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" id="journal-win" value={form.win} onChange={e => changeField('win', e.target.value)} placeholder={t("Hôm nay bạn đã làm tốt điều gì?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.win.length}/5000</small>
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label htmlFor="journal-obstacle" className="form-label" style={{ color: 'var(--danger)' }}>{t("🚧 Trở ngại")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" id="journal-obstacle" value={form.obstacle} onChange={e => changeField('obstacle', e.target.value)} placeholder={t("Khó khăn gặp phải?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.obstacle.length}/5000</small>
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label htmlFor="journal-lesson" className="form-label" style={{ color: 'var(--info)' }}>{t("💡 Bài học")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" id="journal-lesson" value={form.lesson} onChange={e => changeField('lesson', e.target.value)} placeholder={t("Rút ra bài học gì?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.lesson.length}/5000</small>
            </div>
          </div>
          <div className="journal-card">
            <div className="journal-section">
              <label htmlFor="journal-tomorrowFocus" className="form-label" style={{ color: 'var(--warning)' }}>{t("🎯 Trọng tâm ngày mai")}</label>
              <textarea maxLength={JOURNAL_LIMIT} className="form-textarea" id="journal-tomorrowFocus" value={form.tomorrowFocus} onChange={e => changeField('tomorrowFocus', e.target.value)} placeholder={t("Ngày mai sẽ tập trung vào gì?")} />
              <small style={{ color: 'var(--text-muted)' }}>{form.tomorrowFocus.length}/5000</small>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" disabled={conflict || oversizedJournalFields(form).length > 0} className="btn btn-primary">{t(saving ? 'Đang xử lý…' : '💾 Lưu nhật ký')}</button>
          {entry && entry.date && (
            <span className="badge badge-info">{t('Ngày nhật ký:')} {formatCalendarDate(entry.date, language)}</span>
          )}
        </div>
        </fieldset>
      </form>}
      {entry?.id && <div style={{marginTop:'1rem',display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><SavedJournalDownload entry={entry} disabled={saving||loading||loadError}/><button className="btn btn-danger btn-sm" disabled={saving||dirty||Boolean(draft)||loadError||conflict} onClick={openDelete}>{t('Xóa bài đã lưu')}</button>{(dirty||draft)&&<p>{t('Lưu hoặc xử lý bản nháp trước khi xóa bài đã lưu.')}</p>}</div>}
      <JournalCoach key={'journal-coach:'+user.id+':'+selectedDate} owner={user.id} date={selectedDate} form={form} disabled={saving||loading||loadError||Boolean(draft)||conflict} onUseTomorrowAction={text=>{if(savingRef.current||loading||loadError||draft||conflict)return;try{changeField('tomorrowFocus',appendJournalEvidence(form,'tomorrowFocus',text));}catch{toast.error(t('Không thể thêm nội dung vì mục nhật ký đã chạm giới hạn. Nội dung hiện tại được giữ.'));}}}/>
      {entry?.id&&<JournalWeekPlan key={'journal-week:'+user.id+':'+selectedDate} entry={entry} owner={user.id} today={today} disabled={saving||loading||loadError||Boolean(draft)||conflict}/>}
      {deleteOpen&&entry&&<JournalDeleteDialog entry={entry} busy={saving} failed={deleteFailed} onDelete={deleteEntry} onClose={closeDelete}/>}
      <DraftLibrary userId={user.id} kind="journal" currentDate={selectedDate} maximumDate={today} onOpen={goToDate} />
    </div>
  );
}
