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
  const [mode, setMode] = useState(restored.timer?.mode ?? 0);
  const [secondsLeft, setSecondsLeft] = useState(restored.timer?.secondsLeft ?? MODES[0].minutes * 60);
  const [running, setRunning] = useState(restored.timer?.running ?? false);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(restored.timer?.sessionId ?? null);
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState(restored.timer?.selectedHabit ?? '');
  const [todayStats, setTodayStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const intervalRef = useRef(null);
  const deadlineRef = useRef(restored.timer?.deadline ?? null);
  const requestInFlight = useRef(false);
  const toast = useToast();

  useEffect(() => {
    if (restored.error) return; // Preserve unreadable state for recovery, do not overwrite it.
    try {
      writeTimer(window.sessionStorage, user.id, { mode, secondsLeft, running, sessionId, selectedHabit, deadline: deadlineRef.current });
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [mode, secondsLeft, running, sessionId, selectedHabit, user.id, restored.error]);

  const loadStats = useCallback(async () => {
    setDataLoading(true);
    const [stats, recent] = await Promise.allSettled([
      api.get('/pomodoro/today'), api.get('/pomodoro/recent'),
    ]);
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

  const totalSeconds = MODES[mode].minutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMinutes = Math.floor(secondsLeft / 60);
  const displaySeconds = secondsLeft % 60;

  const switchMode = (idx) => {
    if (running || sessionId || pendingStart || requestInFlight.current) return;
    setMode(idx);
    setSecondsLeft(MODES[idx].minutes * 60);
    setSessionId(null);
  };

  const playAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.3;
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + 0.15);
      };
      playBeep(880, 0);
      playBeep(880, 0.25);
      playBeep(1100, 0.5);
    } catch { /* ignore */ }
  }, []);

  const saveSession = useCallback(async (id) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    try {
      await api.post(`/pomodoro/${id}/complete`, {});
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
          payload => api.post('/pomodoro/start', payload));
        const payload = readPendingStart(window.sessionStorage, user.id);
        const restoredSeconds = Math.max(0, Math.min(totalSeconds, Math.ceil((Date.parse(res.data.startedAt) + payload.durationMinutes * 60000 - Date.now()) / 1000)));
        const restoredDeadline = Date.now() + restoredSeconds * 1000;
        writeTimer(window.sessionStorage, user.id, { mode: 0, secondsLeft: restoredSeconds, running: !res.data.completed && restoredSeconds > 0, sessionId: res.data.completed ? null : res.data.id, selectedHabit: String(payload.habitId ?? ''), deadline: restoredDeadline });
        removePendingStart(window.sessionStorage, user.id);
        setPendingIssue(false);
        setPendingStart(false);
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
    setSecondsLeft(MODES[mode].minutes * 60);
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
      {sessionId && !running && <p role="status">{t('Phiên tập trung đang được giữ. Tiếp tục hoặc thử lưu khi hết giờ; đặt lại sẽ bỏ phiên.')}</p>}
      {pendingStart && <p role="status">{t('Yêu cầu bắt đầu chưa được xác nhận. Thử lại để khôi phục đúng phiên; không tạo phiên mới.')}</p>}
      {pendingIssue && <div role="alert"><p>{t('Yêu cầu chờ không thể tiếp tục. Bạn có thể bỏ bản lưu cục bộ sau khi kiểm tra lịch sử phiên.')}</p><button className="btn btn-secondary" disabled={busy} onClick={discardPending}>{t('Bỏ yêu cầu cục bộ')}</button></div>}
      {/* Mode Selector */}
      <div className="filter-bar" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
        {MODES.map((m, i) => (
          <button key={m.key} className={`filter-chip ${mode === i ? 'active' : ''}`}
            onClick={() => switchMode(i)} disabled={running || busy || !!sessionId || pendingStart}>
            {t(m.label)} ({m.minutes}')
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="pomodoro-timer-wrapper">
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

      {/* Recent Sessions */}
      {!dataLoading && !recentError && recentSessions.length === 0 && <p>{t('Chưa có phiên nào.')}</p>}
      {!recentError && recentSessions.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">{t("📋 Phiên gần đây")}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentSessions.slice(0, 8).map(s => (
              <div key={s.id} className="habit-item" style={{ padding: '0.75rem 1rem' }}>
                <div className="habit-info">
                  <div className="habit-name" style={{ fontSize: '0.85rem' }}>
                    {s.habitName || t('Phiên tự do')} — {t('{count} phút', { count: s.durationMinutes })}
                  </div>
                  <div className="habit-meta">
                    <span>{new Date(s.startedAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN', { timeZone: profileTimezone(user?.timezone) })}</span>
                    {s.note && <span>📝 {s.note}</span>}
                  </div>
                </div>
                <span className={`badge ${s.completed ? 'badge-success' : 'badge-warning'}`}>
                  {t(s.completed ? '✓ Xong' : 'Chưa hoàn thành')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
