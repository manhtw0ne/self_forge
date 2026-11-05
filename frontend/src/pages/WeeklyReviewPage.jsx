import PreviousReviewPlan from '../components/PreviousReviewPlan';
import {appendReviewText} from '../utils/previousReview';
import ReviewComparison from '../components/ReviewComparison';
import { selectReviewHistory } from '../utils/reviewHistory';
import DraftDownload from '../components/DraftDownload';
import DraftLibrary from '../components/DraftLibrary';
import { useAccountDate } from '../hooks/useAccountDate';
import { useLanguage } from '../context/useLanguage';
import { calendarWeekStart, todayInTimezone, shiftDate, formatCalendarDate } from '../utils/dates';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { useAuth } from '../context/useAuth';
import { readReviewDraft, writeReviewDraft, removeReviewDraft } from '../utils/reviewDraft';
const RATING_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Rất tệ' },
  { value: 2, emoji: '😟', label: 'Tệ' },
  { value: 3, emoji: '😐', label: 'Ổn' },
  { value: 4, emoji: '😊', label: 'Tốt' },
  { value: 5, emoji: '🤩', label: 'Tuyệt' },
];

export default function WeeklyReviewPage() {
  const { user } = useAuth();
  const today = useAccountDate(user.timezone);
  const currentWeek = calendarWeekStart(today);
  const [week, setWeek] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState(false);
  const { language, t } = useLanguage();
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyYear, setHistoryYear] = useState('ALL');
  const [historyRating, setHistoryRating] = useState('ALL');
  const [historyLimit, setHistoryLimit] = useState(12);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ wins: '', improvements: '', nextWeekPlan: '', rating: 3 });
  const savedForm = useRef(form);
  const saveBusy = useRef(false);
  const mounted = useRef(true);
  const staleWeek = Boolean(week && week !== currentWeek);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm.current);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [statsAttempt, setStatsAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setConflict(false);
    api.get('/weekly-review/context').then(({ data: context }) => {
      const data = context.review;
      if (!active) return;
      const next = { wins: data?.wins || '', improvements: data?.improvements || '', nextWeekPlan: data?.nextWeekPlan || '', rating: data?.rating || 3 };
      setWeek(context.weekStart);
      try { setDraft(readReviewDraft(sessionStorage, user.id, context.weekStart)); setDraftError(false); }
      catch { setDraftError(true); }
      setCurrent(data || null); savedForm.current = next; setForm(next);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, user.id]);
  useEffect(() => {
    let active = true;
    setHistoryLoading(true); setHistoryError(false);
    api.get('/weekly-review/history').then(({ data }) => {
      if (active) { setHistory(data || []); setHistoryError(false); }
    }).catch(() => { if (active) setHistoryError(true); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [historyAttempt]);
  useEffect(() => {
    let active = true;
    api.get('/stats/weekly').then(({ data }) => {
      if (active) { setWeeklyStats(data); setStatsError(false); }
    }).catch(() => { if (active) setStatsError(true); });
    return () => { active = false; };
  }, [statsAttempt]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const updateForm = next => {
    setForm(next);
    try { writeReviewDraft(sessionStorage, user.id, week, next); setDraftError(false); }
    catch { setDraftError(true); }
  };
  const discardDraft = () => {
    try { removeReviewDraft(sessionStorage, user.id, week); setDraft(null); setDraftError(false); }
    catch { setDraftError(true); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saveBusy.current || error || conflict) return;
    if (week !== calendarWeekStart(todayInTimezone(user.timezone))) {
      toast.info(t('Tuần đã đổi. Tải tuần hiện tại trước khi tiếp tục.'));
      return;
    }
    saveBusy.current = true;
    setSaving(true);
    try {
      const res = await api.post('/weekly-review', { ...form, weekStart: week, expected: { id: current?.id ?? null, wins: current?.wins || '', improvements: current?.improvements || '', nextWeekPlan: current?.nextWeekPlan || '', rating: current?.rating ?? null } });
      if (!mounted.current) return;
      savedForm.current = { ...form };
      setCurrent(res.data);
      discardDraft();
      toast.success(t("📋 Đã lưu review tuần!"));
      // Refresh history
      setHistoryAttempt(a => a + 1);
    } catch (err) {
      if (!mounted.current) return;
      if (err.response?.status === 409) setConflict(true);
      toast.error(t(err.response?.data?.detail || "Không thể lưu review"));
    } finally {
      saveBusy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const filteredHistory = selectReviewHistory(history, { query: historyQuery, year: historyYear, rating: historyRating });
  const historyYears = [...new Set(history.map(item => item.weekStart?.slice(0, 4)).filter(Boolean))].sort().reverse();

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (error) return <div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu. Vui lòng thử lại.')}</p><button className="btn btn-secondary" onClick={() => setAttempt(a => a + 1)}>{t('Thử lại')}</button></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{t("📋 Review Tuần")}</h1>
        <p>{t("Nhìn lại và lên kế hoạch cho tuần tiếp theo")}</p>
        <p role="status">{language==='en'?'Weekly review is available to everyone during the public beta.':'Tổng kết tuần đang mở cho mọi người dùng trong giai đoạn beta công khai.'}</p>
      </div>

      <div style={{ marginBottom: '1rem' }}><DraftDownload kind="review" date={week} form={draft || form} disabled={saving || loading || error} label={draft ? 'Tải bản nháp (.txt)' : 'Tải nội dung đang mở (.txt)'} /></div>
      {statsError && <p role="status">{t('Không thể tải thống kê tuần.')} <button className="btn btn-secondary" onClick={() => setStatsAttempt(a => a + 1)}>{t('Thử lại')}</button></p>}
      {week && <p>{t('Tuần {start} – {end}', { start: formatCalendarDate(week, language), end: formatCalendarDate(shiftDate(week, 6), language) })}</p>}
      {staleWeek && <section className="card" role="status" style={{ marginBottom: '1rem' }}>
        <p>{t('Tuần đã đổi. Nội dung đang mở vẫn thuộc tuần cũ; bản nháp tuần cũ được giữ trên tab này.')}</p>
        <button className="btn btn-primary" disabled={saving} onClick={() => {
          if (dirty && !window.confirm(t('Chuyển sang tuần hiện tại? Bản nháp tuần cũ được giữ; hãy sao chép nội dung nếu trình duyệt không lưu được bản nháp.'))) return;
          setAttempt(a => a + 1); setStatsAttempt(a => a + 1); setHistoryAttempt(a => a + 1);
        }}>{t('Tải tuần hiện tại')}</button>
      </section>}
      {/* Weekly Stats Summary */}
      {weeklyStats && !staleWeek && weeklyStats.weekStart === week && (
        <div className="card-grid card-grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card slide-in">
            <div className="stat-label">{t("Tổng điểm tuần")}</div>
            <div className="stat-value">{weeklyStats.totalScore}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-label">{t("Hoàn thành")}</div>
            <div className="stat-value">{weeklyStats.completedCount}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-label">{t("Tỷ lệ")}</div>
            <div className="stat-value">{Math.round(weeklyStats.completionRate * 100)}%</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.3s' }}>
            <div className="stat-label">{t("Streak tốt nhất")}</div>
            <div className="stat-value">🔥 {weeklyStats.bestStreak}</div>
          </div>
        </div>
      )}

      {conflict && <section className="card" role="alert" style={{ marginBottom: '1rem' }}>
        <p>{t('Nội dung trên máy chủ đã thay đổi. Bản nháp được giữ; tải bản mới trước khi lưu tiếp.')}</p>
        <button className="btn btn-secondary" disabled={saving} onClick={() => {
          if (draftError && !window.confirm(t('Trình duyệt chưa giữ được bản nháp. Sao chép nội dung trước khi tải bản mới. Tiếp tục?'))) return;
          setAttempt(a => a + 1);
        }}>{t('Tải bản mới từ máy chủ')}</button>
      </section>}
      {draftError && <p role="alert">{t('Không thể đọc hoặc lưu bản nháp trên trình duyệt. Hãy sao chép nội dung trước khi rời trang.')}</p>}
      {draft && <section className="card" style={{ marginBottom: '1rem' }}>
        <p>{t('Có bản nháp tổng kết tuần trên tab này. Bản nháp chưa được lưu lên máy chủ.')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn btn-primary" disabled={saving || staleWeek} onClick={() => { setForm(draft); setDraft(null); }}>{t('Khôi phục bản nháp')}</button>
          <button className="btn btn-secondary" disabled={saving} onClick={() => { if (window.confirm(t('Xóa bản nháp tổng kết tuần?'))) discardDraft(); }}>{t('Xóa bản nháp')}</button>
        </div>
      </section>}
      <PreviousReviewPlan key={user.id+':'+week} week={week} reviews={history} loading={historyLoading} error={historyError} onRetry={()=>setHistoryAttempt(value=>value+1)} disabled={saving||Boolean(draft)||staleWeek||conflict||error} onInsert={(field,text)=>{
        if(saveBusy.current||draft||staleWeek||conflict||error)return;
        try{updateForm({...form,[field]:appendReviewText(form,field,text)});}catch{toast.error(t('Không thể thêm vì mục tổng kết sẽ vượt 2000 ký tự. Nội dung hiện tại được giữ nguyên.'));}
      }}/>
      {/* Review Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">{t("✍️ Review tuần này")}</span>
          {current && !dirty && <span className="badge badge-success">{t("Đã lưu")}</span>}
        </div>
        {dirty && <p role="status">{t("Bạn có thay đổi chưa lưu.")}</p>}
        <form onSubmit={handleSave}><fieldset disabled={saving || !!draft || staleWeek} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {/* Rating */}
          <div className="form-group">
            <label className="form-label">{t("Tuần này thế nào?")}</label>
            <div className="mood-options" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {RATING_OPTIONS.map(r => (
                <button key={r.value} type="button"
                  aria-pressed={form.rating === r.value} className={`mood-btn ${form.rating === r.value ? 'active' : ''}`}
                  onClick={() => updateForm({ ...form, rating: r.value })}>
                  <span className="mood-emoji">{r.emoji}</span>
                  <span className="mood-label">{t(r.label)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="review-wins">{t("🏆 Chiến thắng tuần này")}</label>
            <textarea id="review-wins" maxLength={2000} className="form-textarea" value={form.wins} onChange={e => updateForm({ ...form, wins: e.target.value })}
              placeholder={t("Điều gì bạn đã làm tốt tuần này?")} rows={3} />
            <small>{form.wins.length}/2000</small>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="review-improvements">{t("🔧 Cần cải thiện")}</label>
            <textarea id="review-improvements" maxLength={2000} className="form-textarea" value={form.improvements} onChange={e => updateForm({ ...form, improvements: e.target.value })}
              placeholder={t("Điều gì có thể làm tốt hơn?")} rows={3} />
            <small>{form.improvements.length}/2000</small>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="review-nextWeekPlan">{t("🎯 Kế hoạch tuần sau")}</label>
            <textarea id="review-nextWeekPlan" maxLength={2000} className="form-textarea" value={form.nextWeekPlan} onChange={e => updateForm({ ...form, nextWeekPlan: e.target.value })}
              placeholder={t("Bạn muốn tập trung vào điều gì tuần tới?")} rows={3} />
            <small>{form.nextWeekPlan.length}/2000</small>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn btn-primary" disabled={conflict || saving || (current && !dirty)}>
              {t(saving ? '⏳ Đang lưu...' : current ? '💾 Cập nhật' : '💾 Lưu review')}
            </button>
          </div>
        </fieldset></form>
      </div>

      {/* History */}
      <div className="card">
        <button type="button" className="btn btn-secondary" aria-expanded={showHistory} aria-controls="review-history" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setShowHistory(!showHistory)}>
          <span className="card-title">{t('📜 Lịch sử review ({count})', { count: history.length })}</span>
          <span>{showHistory ? '▲' : '▼'}</span>
        </button>
        <div id="review-history">{showHistory && (
          historyLoading ? <p role="status">{t('Đang tải lịch sử tổng kết…')}</p> : historyError ? <p role="status">{t('Không thể tải lịch sử review.')} <button className="btn btn-secondary" onClick={() => setHistoryAttempt(a => a + 1)}>{t('Thử lại')}</button></p> : history.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <p>{t("Chưa có review nào")}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <ReviewComparison key={user.id} reviews={history} today={today}/>
              <div className="card-grid card-grid-2" style={{ marginTop: '1rem' }}>
                <div><label htmlFor="review-history-query" className="form-label">{t('Tìm tổng kết đã lưu')}</label>
                  <input id="review-history-query" type="search" className="form-input" maxLength={255} value={historyQuery} onChange={event => { setHistoryQuery(event.target.value); setHistoryLimit(12); }} placeholder={t('Nội dung hoặc ngày bắt đầu tuần')} /></div>
                <div><label htmlFor="review-history-year" className="form-label">{t('Năm bắt đầu tuần')}</label>
                  <select id="review-history-year" className="form-select" value={historyYear} onChange={event => { setHistoryYear(event.target.value); setHistoryLimit(12); }}>
                    <option value="ALL">{t('Tất cả')}</option>{historyYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select></div>
                <div><label htmlFor="review-history-rating" className="form-label">{t('Đánh giá')}</label>
                  <select id="review-history-rating" className="form-select" value={historyRating} onChange={event => { setHistoryRating(event.target.value); setHistoryLimit(12); }}>
                    <option value="ALL">{t('Tất cả')}</option>{RATING_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.value}/5 — {t(option.label)}</option>)}
                  </select></div>
              </div>
              <p role="status">{t('Hiển thị {shown}/{total} tổng kết phù hợp.', { shown: Math.min(historyLimit, filteredHistory.length), total: filteredHistory.length })}</p>
              {!filteredHistory.length && <p>{t('Không có tổng kết phù hợp bộ lọc.')}</p>}
              {filteredHistory.slice(0, historyLimit).map(r => (
                <div key={r.id} className="card" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('📅 Tuần')} {formatCalendarDate(r.weekStart, language)}</span>
                    <span aria-label={t('Đánh giá: {rating}/5', { rating: r.rating })} style={{ fontSize: '1.2rem' }}>{RATING_OPTIONS.find(o => o.value === r.rating)?.emoji || '😐'}</span>
                  </div>
                  <DraftDownload kind="review" date={r.weekStart} form={r} label="Tải tổng kết đã lưu (.txt)" filename={'selfforge-review-' + r.weekStart + '.txt'} />
                  {r.wins && (
                    <div style={{ marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>{t("🏆 Chiến thắng:")}</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', whiteSpace: 'pre-wrap' }}>{r.wins}</p>
                    </div>
                  )}
                  {r.improvements && (
                    <div style={{ marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>{t("🔧 Cải thiện:")}</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', whiteSpace: 'pre-wrap' }}>{r.improvements}</p>
                    </div>
                  )}
                  {r.nextWeekPlan && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--info)', fontWeight: 600 }}>{t("🎯 Kế hoạch:")}</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', whiteSpace: 'pre-wrap' }}>{r.nextWeekPlan}</p>
                    </div>
                  )}
                </div>
              ))}
              {filteredHistory.length > historyLimit && <button className="btn btn-secondary" onClick={() => setHistoryLimit(value => value + 12)}>{t('Xem thêm tổng kết')}</button>}
              {historyLimit > 12 && <button className="btn btn-secondary" onClick={() => setHistoryLimit(12)}>{t('Thu gọn')}</button>}
            </div>
          )
        )}</div>
      </div>
      <DraftLibrary userId={user.id} kind="review" currentDate={week} maximumDate={today} />
    </div>
  );
}
