import NewCheckInDialog from '../components/NewCheckInDialog';
import BatchCompleteCheckInsDialog from '../components/BatchCompleteCheckInsDialog';
import DashboardPanels from '../components/DashboardPanels';
import DashboardFocus from '../components/DashboardFocus';
import {habitPath,readHabitTarget} from '../utils/habitNavigation';
import {dailyHabitView,dailyCompletionSummary} from '../utils/dailyHabitView';
import { useAccountDate } from '../hooks/useAccountDate';
import TodaysReminders from '../components/TodaysReminders';
import { needsCheckInRefresh } from '../utils/checkInFailure';
import CheckInEditor from '../components/CheckInEditor';
import GettingStarted from '../components/GettingStarted';
import { saveAndRefresh } from '../utils/saveAndRefresh';
import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { todayInTimezone, profileTimezone, formatCalendarDate } from '../utils/dates';
import { readCompanion } from '../utils/companion';
import {readRestartHabitTarget,restartPlanPath,shouldOfferRestart} from '../utils/restartHabit';
import {publishAccountDataChange, subscribeAccountDataChanges} from '../utils/accountDataSync';

const ChallengeAgenda = lazy(() => import('../components/ChallengeAgenda'));
const GoalAgenda = lazy(() => import('../components/GoalAgenda'));
const CompanionCard = lazy(() => import('../components/CompanionCard'));
const CurrentWeekPlan = lazy(() => import('../components/CurrentWeekPlan'));
const FocusPlan = lazy(() => import('../components/FocusPlan'));
const RestartPlan = lazy(() => import('../components/RestartPlan'));
const DailyReview = lazy(() => import('../components/DailyReview'));
const WeeklyInsights = lazy(() => import('../components/WeeklyInsights'));

const quotes = [
  '"Kỷ luật là cầu nối giữa mục tiêu và thành tựu." — Jim Rohn',
  '"Thành công không phải ngẫu nhiên, mà là kỷ luật mỗi ngày."',
  '"Bạn không cần phải hoàn hảo, chỉ cần kiên trì."',
  '"Mỗi bước nhỏ đều đưa bạn gần hơn tới phiên bản tốt nhất."',
  '"Hôm nay khó khăn, ngày mai dễ hơn — nếu bạn không bỏ cuộc."',
  '"Kỷ luật bản thân là hình thức tự yêu thương cao nhất."',
  '"Không ai có thể quay ngược thời gian, nhưng ai cũng có thể bắt đầu hôm nay."',
  '"Thói quen tốt hôm nay là phần thưởng của ngày mai."',
];

const MOOD_OPTIONS = [
  { score: 1, emoji: '😢', label: 'Rất tệ' },
  { score: 2, emoji: '😟', label: 'Tệ' },
  { score: 3, emoji: '😐', label: 'Bình thường' },
  { score: 4, emoji: '😊', label: 'Tốt' },
  { score: 5, emoji: '🤩', label: 'Tuyệt vời' },
];

function getGreeting(timezone) {
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: profileTimezone(timezone), hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function DashboardPage() {
  const { language, t } = useLanguage();
  const [newCheckInHabit,setNewCheckInHabit]=useState(null);
  const [batchCheckInOpen,setBatchCheckInOpen]=useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(null);
  const actionBusy = useRef(false);
  const [savingAction, setSavingAction] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const moodBusy = useRef(false);
  const [savingMood, setSavingMood] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [moodError, setMoodError] = useState(false);
  const [freezeError, setFreezeError] = useState(false);
  const [freezeInfo, setFreezeInfo] = useState(null);
  const [companion, setCompanion] = useState(null);
  const [searchParams,setSearchParams]=useSearchParams();const target=readHabitTarget(searchParams.toString());const restartHabitId=readRestartHabitTarget(searchParams.toString());
  const clearTarget=()=>{const next=new URLSearchParams(searchParams);next.delete('habit');setSearchParams(next);setHabitFilter('ALL');};
  const [habitFilter,setHabitFilter]=useState('ALL');
  const { user } = useAuth();
  const today = useAccountDate(user?.timezone);
  const staleDay = Boolean(data && data.date !== today);
  const locked = needsRefresh || staleDay;
  const toast = useToast();
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const announceDashboardChange = () => {
    try { publishAccountDataChange(user.id, 'dashboard', window.localStorage); } catch { /* Cross-tab refresh is optional. */ }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Companion copy is supplemental. Do not let an optional request delay the
    // check-in dashboard when the companion feature is disabled or unavailable.
    api.get('/companion').then(({data: value}) => {
      if (!active) return;
      try { setCompanion(readCompanion(value)); }
      catch { setCompanion(null); }
    }).catch(() => { if (active) setCompanion(null); });
    Promise.allSettled([
      api.get('/dashboard/today'), api.get('/mood'), api.get('/streak-freeze/remaining'),
    ]).then(([d, m, f]) => {
      if (!active) return;
      setData(d.status === 'fulfilled' ? d.value.data : null);
      setNeedsRefresh(d.status === 'rejected' || f.status === 'rejected');
      setMood(m.status === 'fulfilled' ? m.value.data : null);
      setMoodError(m.status === 'rejected');
      setFreezeInfo(f.status === 'fulfilled' ? f.value.data : null);
      setFreezeError(f.status === 'rejected');
      setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return undefined;
    return subscribeAccountDataChanges(window, user.id, change => {
      if (change.resource !== 'habits' && change.resource !== 'dashboard') return;
      // Never discard a check-in note or reviewed batch solely because another tab changed habits.
      if (editingHabit || newCheckInHabit || batchCheckInOpen || actionBusy.current) {
        setNeedsRefresh(true);
        return;
      }
      setAttempt(value => value + 1);
    });
  }, [user?.id, editingHabit, newCheckInHabit, batchCheckInOpen]);

  const retry = () => {
    if (actionBusy.current || moodBusy.current) return;
    if (editingHabit && !window.confirm(t('Tải lại sẽ đóng phần sửa check-in. Bạn đã giữ lại ghi chú cần thiết chưa?'))) return;
    setEditingHabit(null);
    setAttempt(a => a + 1);
  };
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu')}</p><button className="btn btn-secondary" onClick={retry}>{t('Thử lại')}</button></div>;

  const combo = dailyCompletionSummary(data.habits);

  const announceCompanionCredit = entry => {
    if (!companion?.available || !companion.visible || entry?.status !== 'COMPLETED' || !Number.isSafeInteger(entry.scoreImpact) || entry.scoreImpact < 1) return;
    toast.success(language === 'en' ? `Your companion gained +${entry.scoreImpact} XP.` : `Bạn đồng hành nhận +${entry.scoreImpact} XP.`);
  };

  const runAction = async (save, message, onSaved) => {
    if (actionBusy.current || needsRefresh) return;
    if (data.date !== todayInTimezone(user?.timezone)) { setNeedsRefresh(true); return; }
    actionBusy.current = true; setSavingAction(true);
    try {
      let savedEntry;
      const notifySaved = () => { try { onSaved?.(savedEntry); } catch { /* Optional confirmation must not affect a saved check-in. */ } };
      const result = await saveAndRefresh(async () => {
        const response = await save();
        savedEntry = response?.data;
        return response;
      }, () => Promise.all([
        api.get('/dashboard/today'), api.get('/streak-freeze/remaining'),
      ]));
      if (result.refreshFailed) {
        setNeedsRefresh(true);
        toast.info(t('Đã lưu thay đổi nhưng chưa tải lại được dữ liệu. Hãy tải lại trước khi thao tác tiếp.'));
        notifySaved();
        announceDashboardChange();
        return true;
      }
      const [d, f] = result.data;
      setData(d.data); setFreezeInfo(f.data); setFreezeError(false);
      const successMessage=typeof message==='function'?message(savedEntry):message;
      toast.success(t(successMessage));
      notifySaved();
      announceDashboardChange();
      if (dailyCompletionSummary(d.data.habits).allDone && !combo.allDone) toast.success(t('🎉 Hoàn thành tất cả thói quen hôm nay!'));
      return true;
    } catch (err) {
      setNeedsRefresh(needsCheckInRefresh(err));
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại dữ liệu trước khi thử tiếp.'));
    } finally { actionBusy.current = false; setSavingAction(false); }
  };

  const checkIn = (habitId, status) => runAction(
    () => api.post('/check-ins', { habitId, status, date: data.date }),
    { COMPLETED: '✅ Hoàn thành! Tuyệt vời!', FAILED: '😔 Thất bại — nhưng đừng bỏ cuộc!', SKIPPED: '⏭️ Đã bỏ qua' }[status],
    announceCompanionCredit,
  );

  const completeBatch = payload => runAction(
    () => api.post('/check-ins/batch-complete', payload),
    result => result?.createdCount === 0
      ? (language === 'en' ? 'The selected check-ins were already confirmed.' : 'Các check-in đã chọn đã được xác nhận trước đó.')
      : (language === 'en' ? `${result.createdCount} habits recorded as completed.` : `Đã ghi nhận hoàn thành ${result.createdCount} thói quen.`),
  );

  const handleMood = async (score, emoji) => {
    if (moodBusy.current || moodError || locked) return;
    if (data.date !== todayInTimezone(user?.timezone)) { setNeedsRefresh(true); return; }
    moodBusy.current = true; setSavingMood(true);
    try {
      const res = await api.post('/mood', { score, emoji });
      setMood(res.data);
      setMoodError(false);
      announceDashboardChange();
      toast.success(t('Tâm trạng: {emoji} — đã ghi nhận!', { emoji }));
    } catch {
      toast.error(t("Không thể lưu tâm trạng"));
    } finally { moodBusy.current = false; setSavingMood(false); }
  };

  const handleFreeze = habitId => runAction(
    () => api.post('/streak-freeze', { habitId }), '❄️ Đã freeze streak!',
  );

  const habitView=dailyHabitView(data.habits,habitFilter,target,data.date);
  const deferredPanel = content => <Suspense fallback={<section className="card" role="status" style={{margin:'1.5rem 0'}}><p>{t('Đang mở phần này...')}</p></section>}>{content}</Suspense>;

  return (
    <div className="fade-in">
      {locked && <div className="card" role="status"><p>{t(staleDay ? 'Đã sang ngày mới theo múi giờ tài khoản. Tải lại trước khi check-in hoặc ghi tâm trạng.' : 'Hãy tải lại dữ liệu trước khi thao tác tiếp.')}</p><button className="btn btn-secondary" disabled={savingAction || savingMood} onClick={retry}>{t('Thử lại')}</button></div>}
      {newCheckInHabit&&<NewCheckInDialog habit={newCheckInHabit} date={newCheckInHabit.date} timezone={user.timezone} disabled={savingAction||locked} saving={savingAction} onClose={()=>setNewCheckInHabit(null)} onSave={payload=>runAction(()=>api.post('/check-ins/new',payload),'Đã ghi nhận check-in.',announceCompanionCredit)}/>}
      {batchCheckInOpen&&<BatchCompleteCheckInsDialog habits={habitView.pendingRows} date={data.date} disabled={savingAction||locked} saving={savingAction} onClose={()=>setBatchCheckInOpen(false)} onSave={completeBatch}/>}
      {editingHabit && <CheckInEditor saving={savingAction} habit={editingHabit} disabled={savingAction || locked} onCancel={() => setEditingHabit(null)} onSave={async payload => {
        const saved = await runAction(() => api.post('/check-ins', payload), 'Đã cập nhật check-in.');
        if (saved) setEditingHabit(null);
      }} />}
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-title">
          {t(getGreeting(user?.timezone))}, {user?.displayName || t('bạn')}! 👋
        </div>
        <div className="greeting-quote">{t(quote)}</div>
        <div className="greeting-date">📅 {formatCalendarDate(data.date, language)}</div>
      </div>

      <GettingStarted key={'guide:'+user.id} userId={user.id} habits={data.habits} timezone={user.timezone} />
      {/* Today's Habits */}
      <div className="card">
        <div id="today-habits" style={{ scrollMarginTop: '5rem' }} className="card-header">
          <span className="card-title">{t("📋 Tiến độ thói quen hôm nay")}</span>
          {habitView.allRows.length > 0 && <div style={{display:'flex',alignItems:'center',gap:'.75rem',flexWrap:'wrap'}}>
            <span className="badge badge-info">
              {t('{done}/{total} xong', { done: habitView.allRows.filter(h => h.todayStatus === 'COMPLETED').length, total: habitView.allRows.length })}
            </span>
            {habitView.pendingRows.length > 1 && <button className="btn btn-secondary btn-sm" disabled={savingAction||locked||!!editingHabit} onClick={()=>setBatchCheckInOpen(true)}>{t('Ghi nhận nhiều')}</button>}
          </div>}
        </div>
        {target&&<div role="status" style={{margin:'1rem 0'}}><p>{t(habitView.allRows.length?'Đang xem thói quen được chọn. Trạng thái hôm nay vẫn được giữ nguyên.':'Thói quen được chọn không có trong danh sách hôm nay đã tải.')}</p><div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><button className="btn btn-secondary btn-sm" onClick={clearTarget}>{t('Xem tất cả thói quen')}</button>{target.id&&<Link className="btn btn-secondary btn-sm" to={habitPath('/habits',target.id)}>{t('Mở thói quen')}</Link>}</div></div>}
        {data.habits.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',margin:'1rem 0'}}>{[['ALL','Tất cả'],['PENDING','Chưa ghi nhận'],['RECORDED','Đã ghi nhận'],...(habitView.counts.REST>0?[['REST','Nghỉ theo lịch']]:[])].map(([value,label])=><button key={value} className="btn btn-secondary btn-sm" aria-pressed={habitFilter===value} onClick={()=>setHabitFilter(value)}>{t(label)} ({habitView.counts[value]})</button>)}</div>}
        {data.habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>{t("Chưa có thói quen nào. Hãy tạo thói quen đầu tiên!")}</p>
            <Link to="/habits" className="btn btn-primary">{t("+ Tạo thói quen")}</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {habitView.rows.length===0&&<div role="status"><p>{t(habitFilter==='ALL'&&habitView.counts.REST>0?'Hôm nay không có thói quen nào theo lịch. {count} thói quen đang nghỉ.':'Không có thói quen trong nhóm đã chọn.',{count:habitView.counts.REST})}</p><button className="btn btn-secondary" onClick={()=>habitFilter==='ALL'&&habitView.counts.REST>0?setHabitFilter('REST'):clearTarget()}>{t(habitFilter==='ALL'&&habitView.counts.REST>0?'Xem thói quen nghỉ':'Xem tất cả thói quen')}</button></div>}
            {habitView.rows.map((h, i) => (
              <div key={h.habitId} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="habit-info">
                  <div className="habit-name">{h.name}</div>
                  <div className="habit-meta">
                    <span className={`badge badge-${h.difficulty === 'HARD' ? 'danger' : h.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                      {t(h.difficulty === 'HARD' ? 'Khó' : h.difficulty === 'MEDIUM' ? 'Trung bình' : 'Dễ')}
                    </span>
                    <span>{h.completedThisWeek}/{h.targetPerWeek} {t('tuần này')}</span>
                    {!h.scheduledToday&&!h.todayStatus&&<span>{t('Nghỉ theo lịch hôm nay')}</span>}
                    {companion?.available && companion.visible && h.scheduledToday && !h.todayStatus && <span>{language === 'en' ? `Complete for +${h.points} companion XP` : `Hoàn thành: +${h.points} XP bạn đồng hành`}</span>}
                    {h.currentStreak > 0 && (
                      <span className="streak-indicator">🔥 {t('{count} ngày', { count: h.currentStreak })}</span>
                    )}
                  </div>
                </div>
                <div className="habit-actions daily-checkin-controls" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  {h.todayStatus === 'COMPLETED' ? (
                    <span className="badge badge-success">{t("✓ Đã xong")}</span>
                  ) : h.todayStatus === 'FAILED' ? (
                    <span className="badge badge-danger">{t("✗ Thất bại")}</span>
                  ) : h.todayStatus === 'SKIPPED' ? (
                    <span className="badge badge-warning">{t("⏭ Bỏ qua")}</span>
                  ) : !h.scheduledToday ? (
                    <span className="badge badge-info">{t('Nghỉ theo lịch hôm nay')}</span>
                  ) : (
                    <>
                      <button className="btn btn-success btn-sm" disabled={savingAction || locked || !!editingHabit} onClick={() => checkIn(h.habitId, 'COMPLETED')} aria-label={t('Hoàn thành thói quen: {name}',{name:h.name})} title={t("Hoàn thành")}>✓</button>
                      <button className="btn btn-warning btn-sm" disabled={savingAction || locked || !!editingHabit} onClick={() => checkIn(h.habitId, 'SKIPPED')} aria-label={t('Bỏ qua thói quen: {name}',{name:h.name})} title={t("Bỏ qua")}>⏭</button>
                      <button className="btn btn-danger btn-sm" disabled={savingAction || locked || !!editingHabit} onClick={() => checkIn(h.habitId, 'FAILED')} aria-label={t('Ghi nhận thất bại: {name}',{name:h.name})} title={t("Thất bại")}>✗</button>
                      <button className="btn btn-secondary btn-sm" disabled={savingAction||locked||!!editingHabit} onClick={()=>setNewCheckInHabit({...h,date:data.date})}>{language==='en'?'Check in with a note':'Ghi nhận kèm ghi chú'}</button>
                      {shouldOfferRestart(h)&&<Link className="btn btn-ghost btn-sm" to={restartPlanPath(h.habitId)}>{language==='en'?'Plan a gentler restart':'Lập kế hoạch nhẹ hơn'}</Link>}
                      {freezeInfo?.remaining > 0 && (
                        <button className="btn btn-ghost btn-sm" disabled={savingAction || locked || !!editingHabit} onClick={() => handleFreeze(h.habitId)} title={t("Freeze streak")}>❄️</button>
                      )}
                    </>
                  )}
                  {h.todayStatus && <button className="btn btn-secondary btn-sm" disabled={savingAction || locked || !!editingHabit} onClick={() => setEditingHabit({ ...h, date: data.date })}>{t('Sửa check-in')}</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Combo Info */}
      {combo.allDone && (
        <div className={combo.allDone ? 'combo-info' : 'combo-info'} style={combo.allDone ? { background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' } : {}}>
          <span>{t('🎉 Hoàn thành tất cả thói quen hôm nay!')}</span>
        </div>
      )}

      <DashboardFocus key={'held-focus:'+user.id} owner={user.id}/>
      <TodaysReminders key={'reminders:'+user.id+':'+data.date+':'+user.timezone} owner={user.id} habits={data.habits} date={data.date} timezone={user.timezone} onRefresh={retry} />
      {/* Mood Selector */}
      <div className="mood-widget glass-card">
        {moodError && <div role="alert"><p>{t('Không thể tải tâm trạng đã ghi. Hãy thử lại trước khi cập nhật.')}</p><button className="btn btn-secondary" onClick={retry}>{t('Thử lại')}</button></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t("Hôm nay bạn cảm thấy thế nào?")}</span>
          {mood && <span className="badge badge-info">{MOOD_OPTIONS.find(m => m.score === mood.score)?.emoji} {t('Đã ghi')}</span>}
        </div>
        <div className="mood-options">
          {MOOD_OPTIONS.map(m => (
            <button key={m.score}
              className={`mood-btn ${mood?.score === m.score ? 'active' : ''}`}
              disabled={savingMood || moodError || locked}
              aria-pressed={mood?.score === m.score}
              onClick={() => handleMood(m.score, m.emoji)}
              title={t(m.label)}>
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{t(m.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/habits" className="quick-action-btn">{t("🎯 Quản lý thói quen")}</Link>
        <Link to="/journal" className="quick-action-btn">{t("📝 Viết nhật ký")}</Link>
        <Link to="/pomodoro" className="quick-action-btn">{t("⏱ Pomodoro")}</Link>
        <Link to="/check-in-history" className="quick-action-btn">{t('Lịch sử check-in')}</Link>
        <Link to="/stats" className="quick-action-btn">{t("📈 Xem thống kê")}</Link>
        <Link to="/challenges" className="quick-action-btn">{t("⚡ Thử thách")}</Link>
        <Link to="/help#beta-feedback" className="quick-action-btn">{t('Gửi phản hồi beta')}</Link>
      </div>

      {/* Stats Overview */}
      <div className="card-grid card-grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card slide-in">
          <div className="stat-label">{t("Điểm hôm nay")}</div>
          <div className="stat-value">
            {data.todayScore}
          </div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-label">{t("Điểm tuần này")}</div>
          <div className="stat-value">{data.weekScore}</div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-label">{t("Tỷ lệ hoàn thành")}</div>
          <div className="stat-value">{Math.round(data.weekCompletionRate * 100)}%</div>
          <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
            <div className="progress-fill" style={{ width: `${data.weekCompletionRate * 100}%` }} />
          </div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.3s' }}>
          <div className="stat-label">{t("Freeze còn lại")}</div>
          <div className="stat-value">❄️ {freezeInfo?.remaining ?? '?'}/{freezeInfo?.max ?? '?'}</div>
          {freezeError && <div role="alert"><p>{t('Không thể tải lượt bảo vệ streak.')}</p><button className="btn btn-secondary" onClick={retry}>{t('Thử lại')}</button></div>}
          <div className="stat-sub">{t("tháng này")}</div>
        </div>
      </div>

      <DashboardPanels key={'dashboard-panels:'+user.id} owner={user.id} panels={[
        {id:'challenges',content:deferredPanel(<ChallengeAgenda key={'challenge-agenda:'+user.id} owner={user.id} today={today} habits={data.habits} locked={locked}/>)},
        {id:'goals',content:deferredPanel(<GoalAgenda key={'goal-agenda:'+user.id} owner={user.id} timezone={user.timezone}/>)},
        {id:'week',content:deferredPanel(<CurrentWeekPlan key={'week-action:'+user.id} owner={user.id} today={todayInTimezone(user.timezone)}/>)},
        {id:'companion',content:deferredPanel(<CompanionCard key={'companion:'+user.id} owner={user.id} timezone={user.timezone}/>)},
        {id:'focus',content:deferredPanel(<FocusPlan key={'focus-plan:'+user.id} habits={data.habits} owner={user.id} today={today} timezone={user.timezone}/>)},
        {id:'restart',content:deferredPanel(<RestartPlan key={'restart:'+user.id} owner={user.id} today={todayInTimezone(user.timezone)} preferredHabitId={restartHabitId} />)},
        {id:'dailyReview',content:deferredPanel(<DailyReview key={'daily-review:'+user.id} today={today} timezone={user.timezone}/>)},
        {id:'insights',content:deferredPanel(<WeeklyInsights key={'insights:'+user.id} today={todayInTimezone(user.timezone)} />)},
      ]}/>
    </div>
  );
}
