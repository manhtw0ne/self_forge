import WeekPlanFocusContext from '../components/WeekPlanFocusContext';
import {readWeekPlanFocus} from '../utils/weekPlanFocus';
import {changeBreakDuration} from '../utils/pomodoroBreak';
import PomodoroAlarmSettings from '../components/PomodoroAlarmSettings';
import {usePomodoroAlarm} from '../hooks/usePomodoroAlarm';
import DailyFocusContinuation from '../components/DailyFocusContinuation';
import FocusHabitFollowUp from '../components/FocusHabitFollowUp';
import {useSearchParams} from 'react-router-dom';
import {readFocusLink} from '../utils/focusPlan';
import FocusSessionAction from '../components/FocusSessionAction';
import {focusRecovery,readFocusSession,confirmFocusStart} from '../utils/focusRecovery';
import PomodoroExport from '../components/PomodoroExport';
import PomodoroHistory from '../components/PomodoroHistory';
import PomodoroNote from '../components/PomodoroNote';
import { requestPomodoroStart, readPendingStart, removePendingStart, InvalidPendingStart } from '../utils/pomodoroStart';
import { readTimer, writeTimer } from '../utils/pomodoroTimer';
import { useLanguage } from '../context/useLanguage';
import { useAuth } from '../context/useAuth';
import { profileTimezone } from '../utils/dates';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

const MODES = [
  { key: 'focus', label: 'Tập trung', minutes: 25, color: 'var(--accent-primary)' },
  { key: 'short', label: 'Nghỉ ngắn', minutes: 5, color: 'var(--success)' },
  { key: 'long', label: 'Nghỉ dài', minutes: 15, color: 'var(--info)' },
];

export default function PomodoroPage() {
  const { user } = useAuth();
  return <PomodoroTimer key={user.id} />;
}

function PomodoroTimer() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [restored] = useState(() => {
    try { return { timer: readTimer(window.sessionStorage, user.id), error: false }; }
    catch { return { timer: null, error: true }; }
  });
  const [pendingStart, setPendingStart] = useState(() => {
    try { return !!window.sessionStorage.getItem(`sf_pomodoro_start:${user.id}`); } catch { return false; }
  });
  const [pendingIssue, setPendingIssue] = useState(false);
  const [storageError, setStorageError] = useState(restored.error);
  const [dataLoading, setDataLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [recentError, setRecentError] = useState(false);
  const [habitsError, setHabitsError] = useState(false);
  const [searchParams]=useSearchParams();
  const weekFocus=readWeekPlanFocus(searchParams.toString());
  const focusLink=readFocusLink(searchParams.toString());
  const [focusMinutes,setFocusMinutes]=useState(()=>{
    try{return readPendingStart(window.sessionStorage,user.id)?.durationMinutes??restored.timer?.focusMinutes??25;}catch{return restored.timer?.focusMinutes??25;}
  });
  const [shortMinutes,setShortMinutes]=useState(restored.timer?.shortMinutes??5);
  const [longMinutes,setLongMinutes]=useState(restored.timer?.longMinutes??15);
  const [mode, setMode] = useState(restored.timer?.mode ?? 0);
  const [secondsLeft, setSecondsLeft] = useState(restored.timer?.secondsLeft ?? MODES[0].minutes * 60);
  const [running, setRunning] = useState(restored.timer?.running ?? false);
  const [busy, setBusy] = useState(false);
  const [lastCompleted,setLastCompleted]=useState(null);
  const [sessionId, setSessionId] = useState(restored.timer?.sessionId ?? null);
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState(restored.timer?.selectedHabit ?? '');
  const [todayStats, setTodayStats] = useState(null);
  const [allHistory, setAllHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [historyLimit, setHistoryLimit] = useState(8);
  const noteStates = useRef(new Map());
  const onNoteState = useCallback((id, state) => { if (state) noteStates.current.set(id, state); else noteStates.current.delete(id); }, []);
  const changeHistory = action => {
    const states = [...noteStates.current.values()];
    if (states.some(state => state.saving)) return;
    if (states.some(state => state.dirty) && !window.confirm(t('Đổi danh sách có thể đóng ghi chú chưa lưu. Tiếp tục?'))) return;
    action();
  };
  const [recentSessions, setRecentSessions] = useState([]);
  const intervalRef = useRef(null);
  const deadlineRef = useRef(restored.timer?.deadline ?? null);
  const requestInFlight = useRef(false);
  const toast = useToast();
  const statsRequest = useRef(0);
  useEffect(() => () => { statsRequest.current++; }, []);

  useEffect(() => {
    if (restored.error) return; // Preserve unreadable state for recovery, do not overwrite it.
    try {
      writeTimer(window.sessionStorage, user.id, { mode, secondsLeft, running, sessionId, selectedHabit, focusMinutes, shortMinutes,longMinutes, deadline: deadlineRef.current });
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [mode, secondsLeft, running, sessionId, selectedHabit, focusMinutes,shortMinutes,longMinutes, user.id, restored.error]);

  const loadStats = useCallback(async () => {
    const request = ++statsRequest.current;
    setDataLoading(true);
    const [stats, recent] = await Promise.allSettled([
      api.get('/pomodoro/today'), api.get('/pomodoro/recent'),
    ]);
    if (request !== statsRequest.current) return;
    setStatsError(stats.status === 'rejected');
    setRecentError(recent.status === 'rejected');
    if (stats.status === 'fulfilled') setTodayStats(stats.value.data);
    if (recent.status === 'fulfilled') setRecentSessions(recent.value.data || []);
    setDataLoading(false);
  }, []);

  const loadHabits = useCallback(() => {
    setHabitsError(false);
    api.get('/habits').then(r => setHabits(r.data)).catch(() => setHabitsError(true));
  }, []);

  useEffect(() => {
    loadHabits();
    void loadStats();
  }, [loadStats, loadHabits]);

  const totalSeconds = ([focusMinutes,shortMinutes,longMinutes][mode]) * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMinutes = Math.floor(secondsLeft / 60);
  const displaySeconds = secondsLeft % 60;

  const switchMode = (idx) => {
    if (running || sessionId || pendingStart || requestInFlight.current) return;
    setMode(idx);
    setSecondsLeft(([focusMinutes,shortMinutes,longMinutes][idx]) * 60);
    setSessionId(null);
  };

  const alarm=usePomodoroAlarm(user.id);
  const playAlarm=alarm.play;

  const saveSession = useCallback(async (id) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    try {
      const {data}=await api.post(`/pomodoro/${id}/complete`, {});const saved=readFocusSession(data,id);if(!saved.completed)throw Error('Incomplete session response');setLastCompleted(saved);
      setSessionId(null);
      toast.success(t("Đã ghi nhận phiên tập trung và 5 XP."));
      loadStats();
    } catch (err) {
      // Keep the session so a timeout/retry cannot lose a completed focus session.
      toast.error(t(err.response?.data?.detail || 'Chưa lưu được phiên. Bạn có thể thử lưu lại.'));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }, [loadStats, toast, t]);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
      }, 1000);
    } else if (secondsLeft === 0 && running) {
      setRunning(false);
      clearInterval(intervalRef.current);
      playAlarm();

      if (MODES[mode].key === 'focus' && sessionId) {
        void saveSession(sessionId);
      } else {
        toast.info(t("⏰ Hết giờ! Sẵn sàng tiếp tục?"));
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [mode, playAlarm, running, secondsLeft, sessionId, toast, saveSession, t]);

  const handleStart = async () => {
    if (requestInFlight.current) return;
    if (secondsLeft === 0 && sessionId) {
      await saveSession(sessionId);
      return;
    }
    requestInFlight.current = true;
    setBusy(true);
    const remaining = secondsLeft === 0 ? totalSeconds : secondsLeft;
    try {
      if (MODES[mode].key === 'focus' && !sessionId) {
        setPendingStart(true);
        const res = await requestPomodoroStart(window.sessionStorage, user.id, selectedHabit ? parseInt(selectedHabit) : null,
          payload => api.post('/pomodoro/start', payload),undefined,focusMinutes);
        const payload = readPendingStart(window.sessionStorage, user.id);
        confirmFocusStart(res.data,payload);
        const restoredSeconds = Math.max(0, Math.min(payload.durationMinutes*60, Math.ceil((Date.parse(res.data.startedAt) + payload.durationMinutes * 60000 - Date.now()) / 1000)));
        const restoredDeadline = Date.now() + restoredSeconds * 1000;
        writeTimer(window.sessionStorage, user.id, { mode: 0, secondsLeft: restoredSeconds, running: !res.data.completed && restoredSeconds > 0, focusMinutes: payload.durationMinutes,shortMinutes,longMinutes, sessionId: res.data.completed ? null : res.data.id, selectedHabit: String(payload.habitId ?? ''), deadline: restoredDeadline });
        removePendingStart(window.sessionStorage, user.id);
        setPendingIssue(false);
        setPendingStart(false);
        setFocusMinutes(payload.durationMinutes);
        setSelectedHabit(String(payload.habitId ?? ''));
        setSessionId(res.data.completed ? null : res.data.id);
        setSecondsLeft(restoredSeconds);
        deadlineRef.current = restoredDeadline;
        setRunning(!res.data.completed && restoredSeconds > 0);
        return;
      }
      setSecondsLeft(remaining);
      deadlineRef.current = Date.now() + remaining * 1000;
      setRunning(true);
    } catch (err) {
      setPendingIssue(err instanceof InvalidPendingStart || err.response?.status === 409);
      try { setPendingStart(window.sessionStorage.getItem(`sf_pomodoro_start:${user.id}`) !== null); } catch { setStorageError(true); }
      toast.error(t(err instanceof InvalidPendingStart ? 'Dữ liệu yêu cầu chờ bị hỏng. Hãy bỏ yêu cầu cục bộ để tiếp tục.' : err.response?.data?.detail || 'Không thể bắt đầu phiên'));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  };

  const selectSavedSession=async(id,kind)=>{
    if(requestInFlight.current||running||sessionId||pendingStart||restored.error)return;
    requestInFlight.current=true;setBusy(true);
    try{
      const {data}=await api.get('/pomodoro/'+id);const session=readFocusSession(data,id);
      const state=focusRecovery(session,kind);
      if(kind==='REPEAT'&&session.habitId!==null&&!habits.some(h=>h.id===session.habitId)){
        toast.error(t('Thói quen của phiên cũ không còn hoạt động. Chọn thói quen khác hoặc phiên tự do trước khi bắt đầu.'));return;
      }
      writeTimer(window.sessionStorage,user.id,{...state,shortMinutes,longMinutes});
      setMode(0);setFocusMinutes(state.focusMinutes);setSecondsLeft(state.secondsLeft);setSessionId(state.sessionId);setSelectedHabit(state.selectedHabit);setRunning(false);deadlineRef.current=null;
      toast.success(t(kind==='RESUME'?'Đã khôi phục đúng phiên. Tiếp tục bộ đếm hoặc thử lưu nếu đã hết giờ.':'Đã điền cấu hình phiên cũ. Bấm Bắt đầu để tạo phiên mới khi sẵn sàng.'));
    }catch(failure){toast.error(t(failure.message==='Session status changed'?'Trạng thái phiên đã đổi. Tải lại lịch sử trước khi chọn.':'Chưa khôi phục được phiên. Bộ đếm hiện tại được giữ.'));void loadStats();}
    finally{requestInFlight.current=false;setBusy(false);}
  };
  const recoveryBlocked=busy||running||Boolean(sessionId)||pendingStart||restored.error;

  const discardPending = () => {
    if (requestInFlight.current || !window.confirm(t('Bỏ yêu cầu cục bộ? Phiên có thể đã tồn tại trên server và sẽ không bị xóa. Kiểm tra lịch sử trước khi bắt đầu phiên mới.'))) return;
    try {
      removePendingStart(window.sessionStorage, user.id);
      setPendingStart(false);
      setPendingIssue(false);
      void loadStats();
    } catch { setStorageError(true); }
  };

  const handlePause = () => {
    setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const handleReset = () => {
    if (pendingStart || requestInFlight.current) return;
    if (sessionId && !window.confirm(t('Bỏ phiên đang giữ? Phiên này sẽ không được ghi nhận hoàn thành từ bộ đếm này.'))) return;
    setRunning(false);
    clearInterval(intervalRef.current);
    setSecondsLeft(totalSeconds);
    setSessionId(null);
  };

  const circumference = 2 * Math.PI * 140;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>⏱ Pomodoro Timer</h1>
        <p>{t("Tập trung sâu — làm việc hiệu quả")}</p>
      </div>

      {storageError && <p role="alert">{t('Không thể lưu hoặc khôi phục bộ đếm trên trình duyệt. Đừng tải lại trang khi đang tập trung.')}</p>}
      {lastCompleted&&<><FocusHabitFollowUp session={lastCompleted}/><DailyFocusContinuation key={lastCompleted.id} owner={user.id} timezone={user.timezone} session={lastCompleted} habits={habits} locked={running||busy||Boolean(sessionId)||pendingStart||restored.error||habitsError} onRest={()=>switchMode(1)} onPrepare={row=>{if(requestInFlight.current||running||sessionId||pendingStart||restored.error||habitsError)return;setMode(0);setFocusMinutes(row.minutes);setSecondsLeft(row.minutes*60);setSelectedHabit(String(row.id));deadlineRef.current=null;}}/></>}
      {sessionId && !running && <p role="status">{t('Phiên tập trung đang được giữ. Tiếp tục hoặc thử lưu khi hết giờ; đặt lại sẽ bỏ phiên.')}</p>}
      {sessionId&&<p><a href="#focus-timer">{t('Mở bộ đếm của phiên đang giữ')}</a></p>}
      {pendingStart && <p role="status">{t('Yêu cầu bắt đầu chưa được xác nhận. Thử lại để khôi phục đúng phiên; không tạo phiên mới.')}</p>}
      {pendingIssue && <div role="alert"><p>{t('Yêu cầu chờ không thể tiếp tục. Bạn có thể bỏ bản lưu cục bộ sau khi kiểm tra lịch sử phiên.')}</p><button className="btn btn-secondary" disabled={busy} onClick={discardPending}>{t('Bỏ yêu cầu cục bộ')}</button></div>}
      <PomodoroAlarmSettings alarm={alarm}/>
      {/* Mode Selector */}
      <div className="filter-bar" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
        {MODES.map((m, i) => (
          <button key={m.key} className={`filter-chip ${mode === i ? 'active' : ''}`}
            onClick={() => switchMode(i)} disabled={running || busy || !!sessionId || pendingStart}>
            {t(m.label)} ({[focusMinutes,shortMinutes,longMinutes][i]}')
          </button>
        ))}
      </div>

      <WeekPlanFocusContext key={searchParams.toString()} target={weekFocus} blocked={recoveryBlocked} onPrepare={minutes=>{if(requestInFlight.current||running||busy||sessionId||pendingStart||restored.error)return false;if(secondsLeft<totalSeconds&&secondsLeft>0&&!window.confirm(language==='en'?'Reset the paused timer to prepare this weekly step?':'Đặt lại bộ đếm đang tạm dừng để chuẩn bị bước tuần này?'))return false;setMode(0);setFocusMinutes(minutes);setSecondsLeft(minutes*60);setSelectedHabit('');deadlineRef.current=null;return true;}}/>
      {mode===0&&<div style={{maxWidth:'360px',margin:'0 auto 1rem'}}>
        <label className="form-label" htmlFor="focus-duration">{t('Thời lượng tập trung (phút)')}</label>
        <select id="focus-duration" className="form-select" value={focusMinutes} disabled={running||busy||Boolean(sessionId)||pendingStart||restored.error} onChange={event=>{const minutes=Number(event.target.value);setFocusMinutes(minutes);setSecondsLeft(minutes*60);}}>
          {[...new Set([25,45,60,90,120,focusMinutes])].sort((a,b)=>a-b).map(minutes=><option key={minutes} value={minutes}>{minutes}</option>)}
        </select>
        {focusLink&&!weekFocus&&<div style={{marginTop:'1rem'}}><p>{t('Phiên tập trung được đề xuất: {minutes} phút',{minutes:focusLink.minutes})}</p>
          <button className="btn btn-secondary" disabled={running||busy||Boolean(sessionId)||pendingStart||restored.error||Boolean(focusLink.habitId)&&(habitsError||!habits.some(h=>h.id===focusLink.habitId))} onClick={()=>{setFocusMinutes(focusLink.minutes);setSecondsLeft(focusLink.minutes*60);setSelectedHabit(String(focusLink.habitId??''));}}>{t('Dùng đề xuất cho phiên này')}</button>
          <p>{t('Chỉ điền lựa chọn. Bấm Bắt đầu khi bạn sẵn sàng.')}</p>
        </div>}
      </div>}
      {mode!==0&&<section style={{maxWidth:'420px',margin:'0 auto 1rem'}}>
        <label className="form-label" htmlFor="break-duration">{t('Thời lượng nghỉ (phút)')}</label>
        <select id="break-duration" className="form-select" value={mode===1?shortMinutes:longMinutes} disabled={running||busy||Boolean(sessionId)||pendingStart||restored.error} onChange={event=>{
          if(requestInFlight.current||running||sessionId||pendingStart||restored.error)return;
          if(secondsLeft<totalSeconds&&secondsLeft>0&&!window.confirm(t('Đổi thời lượng sẽ đặt lại lượt nghỉ đang tạm dừng. Tiếp tục?')))return;
          const next=changeBreakDuration(mode,Number(event.target.value),{shortMinutes,longMinutes});
          setShortMinutes(next.shortMinutes);setLongMinutes(next.longMinutes);setSecondsLeft(next.secondsLeft);deadlineRef.current=null;
        }}>
          {[...new Set([...(mode===1?[1,3,5,10,15,20,30]:[5,10,15,20,30,45,60]),mode===1?shortMinutes:longMinutes])].sort((a,b)=>a-b).map(minutes=><option key={minutes} value={minutes}>{minutes}</option>)}
        </select>
        <p>{t('Lượt nghỉ chỉ chạy trên bộ đếm của tab này, không tạo phiên tập trung hoặc cộng XP. Thời lượng được giữ khi tải lại tab; báo âm phụ thuộc trình duyệt.')}</p>
      </section>}
      {/* Timer Circle */}
      <div className="pomodoro-timer-wrapper" id="focus-timer">
        <div className="pomodoro-circle">
          <svg width="300" height="300" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="var(--bg-input)" strokeWidth="6" />
            <circle cx="150" cy="150" r="140" fill="none"
              stroke={MODES[mode].color} strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 150 150)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          <div className="pomodoro-time">
            <div className="pomodoro-digits">
              {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
            </div>
            <div className="pomodoro-mode-label">{t(MODES[mode].label)}</div>
          </div>
        </div>

        {/* Habit Selector */}
        {MODES[mode].key === 'focus' && !running && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <select aria-label={t('Thói quen cho phiên tập trung')} className="form-select" value={selectedHabit} onChange={e => setSelectedHabit(e.target.value)} disabled={busy || !!sessionId || pendingStart}
              style={{ maxWidth: '280px', margin: '0 auto' }}>
              <option value="">{t("-- Không gắn thói quen --")}</option>
              {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}

        {/* Controls */}
        <div className="pomodoro-controls">
          {!running ? (
            <button className="btn btn-primary" style={{ minWidth: '120px' }} onClick={handleStart} disabled={busy}>
              {t(busy ? 'Đang xử lý…' : pendingStart ? 'Thử lại' : secondsLeft === 0 && sessionId ? 'Thử lưu lại' : secondsLeft === 0 ? 'Phiên mới' : secondsLeft < totalSeconds ? 'Tiếp tục' : 'Bắt đầu')}
            </button>
          ) : (
            <button className="btn btn-warning" style={{ minWidth: '120px' }} onClick={handlePause}>
              {t("⏸ Tạm dừng")}
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleReset} disabled={pendingStart || busy || (secondsLeft === totalSeconds && !running)}>
            {t("↺ Đặt lại")}
          </button>
        </div>
      </div>

      {dataLoading && <p role="status">{t('Đang tải dữ liệu Pomodoro…')}</p>}
      {(statsError || recentError) && <div role="status">
        {statsError && <p>{t('Không thể tải thống kê Pomodoro.')}</p>}
        {recentError && <p>{t('Không thể tải lịch sử phiên.')}</p>}
        <button className="btn btn-secondary btn-sm" disabled={dataLoading} onClick={loadStats}>{t('Thử lại')}</button>
      </div>}
      {habitsError && <div role="status"><p>{t('Không thể tải danh sách thói quen.')}</p><button className="btn btn-secondary btn-sm" onClick={loadHabits}>{t('Thử lại')}</button></div>}
      {/* Today Stats */}
      <div className="card-grid card-grid-3" style={{ marginTop: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">{t("Phiên hôm nay")}</div>
          <div className="stat-value">{statsError || dataLoading ? '—' : todayStats?.totalSessions ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("Tổng phút")}</div>
          <div className="stat-value">{statsError || dataLoading ? '—' : todayStats?.totalMinutes ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("XP kiếm được")}</div>
          <div className="stat-value">{statsError || dataLoading ? '—' : todayStats?.xpEarned ?? '—'}</div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {!allHistory && <button className="btn btn-secondary" onClick={() => changeHistory(() => setAllHistory(true))}>{t('Xem toàn bộ lịch sử Pomodoro')}</button>}
        {allHistory && <PomodoroHistory user={user} onSelectSession={selectSavedSession} recoveryBlocked={recoveryBlocked} onClose={() => { setAllHistory(false); void loadStats(); }} />}
      </div>
      {/* Recent Sessions */}
      {!allHistory && !dataLoading && !recentError && recentSessions.length === 0 && <p>{t('Chưa có phiên nào.')}</p>}
      {!allHistory && !recentError && recentSessions.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">{t("📋 Phiên gần đây")}</span>
          </div>
          <p>{t('Danh sách gồm tối đa 20 phiên gần nhất theo múi giờ tài khoản.')}</p>
          <label className="form-label" htmlFor="pomodoro-history-filter">{t('Lọc phiên tập trung')}</label>
          <select id="pomodoro-history-filter" className="form-select" style={{ marginBottom: '1rem' }} value={historyFilter} onChange={event => {
            const value = event.target.value;
            changeHistory(() => { setHistoryFilter(value); setHistoryLimit(8); });
          }}><option value="ALL">{t('Tất cả')}</option><option value="COMPLETED">{t('Đã hoàn thành')}</option><option value="INCOMPLETE">{t('Chưa hoàn thành')}</option></select>
          {recentSessions.filter(s => historyFilter === 'ALL' || (historyFilter === 'COMPLETED' ? s.completed : !s.completed)).length === 0 && <p role="status">{t('Không có phiên phù hợp với bộ lọc.')}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentSessions.filter(s => historyFilter === 'ALL' || (historyFilter === 'COMPLETED' ? s.completed : !s.completed)).slice(0, historyLimit).map(s => (
              <div key={s.id} className="habit-item" style={{ padding: '0.75rem 1rem', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div className="habit-info">
                  <div className="habit-name" style={{ fontSize: '0.85rem' }}>
                    {s.habitName || t('Phiên tự do')} — {t('{count} phút', { count: s.durationMinutes })}
                  </div>
                  <div className="habit-meta">
                    <span>{new Date(s.startedAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN', { timeZone: profileTimezone(user?.timezone) })}</span>

                  </div>
                </div>
                <FocusSessionAction session={s} onSelect={selectSavedSession} disabled={recoveryBlocked||habitsError}/>
                <PomodoroExport session={s} timezone={user.timezone} disabled={busy || dataLoading} />
                {s.completed && <PomodoroNote userId={user.id} onStateChange={onNoteState} session={s} onSaved={updated => { setRecentSessions(rows => rows.map(row => row.id === updated.id ? updated : row)); void loadStats(); }} />}
                <span className={`badge ${s.completed ? 'badge-success' : 'badge-warning'}`}>
                  {t(s.completed ? '✓ Xong' : 'Chưa hoàn thành')}
                </span>
              </div>
            ))}
          </div>
          {recentSessions.filter(s => historyFilter === 'ALL' || (historyFilter === 'COMPLETED' ? s.completed : !s.completed)).length > historyLimit && <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setHistoryLimit(limit => limit + 8)}>{t('Xem thêm phiên')}</button>}
          {historyLimit > 8 && <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem', marginLeft: '0.5rem' }} onClick={() => changeHistory(() => setHistoryLimit(8))}>{t('Thu gọn')}</button>}
        </div>
      )}
    </div>
  );
}
