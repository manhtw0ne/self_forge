import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

const MODES = [
  { key: 'focus', label: 'Tập trung', minutes: 25, color: 'var(--accent-primary)' },
  { key: 'short', label: 'Nghỉ ngắn', minutes: 5, color: 'var(--success)' },
  { key: 'long', label: 'Nghỉ dài', minutes: 15, color: 'var(--info)' },
];

export default function PomodoroPage() {
  const [mode, setMode] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(MODES[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState('');
  const [todayStats, setTodayStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const intervalRef = useRef(null);
  const toast = useToast();

  const loadStats = useCallback(() => {
    api.get('/pomodoro/today').then(r => setTodayStats(r.data)).catch(() => {});
    api.get('/pomodoro/recent').then(r => setRecentSessions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/habits').then(r => setHabits(r.data)).catch(() => {});
    loadStats();
  }, [loadStats]);

  const totalSeconds = MODES[mode].minutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMinutes = Math.floor(secondsLeft / 60);
  const displaySeconds = secondsLeft % 60;

  const switchMode = (idx) => {
    if (running) return;
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

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && running) {
      setRunning(false);
      clearInterval(intervalRef.current);
      playAlarm();

      if (MODES[mode].key === 'focus' && sessionId) {
        api.post(`/pomodoro/${sessionId}/complete`, {}).then(() => {
          toast.success('🎉 Hoàn thành phiên tập trung! +5 XP');
          loadStats();
        }).catch(() => toast.error('Không thể lưu phiên'));
        setSessionId(null);
      } else {
        toast.info('⏰ Hết giờ! Sẵn sàng tiếp tục?');
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [loadStats, mode, playAlarm, running, secondsLeft, sessionId, toast]);

  const handleStart = async () => {
    if (MODES[mode].key === 'focus' && !sessionId) {
      try {
        const res = await api.post('/pomodoro/start', {
          habitId: selectedHabit ? parseInt(selectedHabit) : null,
          durationMinutes: MODES[mode].minutes,
        });
        setSessionId(res.data.id);
      } catch {
        toast.error('Không thể bắt đầu phiên');
        return;
      }
    }
    setRunning(true);
  };

  const handlePause = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const handleReset = () => {
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
        <p>Tập trung sâu — làm việc hiệu quả</p>
      </div>

      {/* Mode Selector */}
      <div className="filter-bar" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
        {MODES.map((m, i) => (
          <button key={m.key} className={`filter-chip ${mode === i ? 'active' : ''}`}
            onClick={() => switchMode(i)} disabled={running}>
            {m.label} ({m.minutes}')
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
            <div className="pomodoro-mode-label">{MODES[mode].label}</div>
          </div>
        </div>

        {/* Habit Selector */}
        {MODES[mode].key === 'focus' && !running && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <select className="form-select" value={selectedHabit} onChange={e => setSelectedHabit(e.target.value)}
              style={{ maxWidth: '280px', margin: '0 auto' }}>
              <option value="">-- Không gắn thói quen --</option>
              {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}

        {/* Controls */}
        <div className="pomodoro-controls">
          {!running ? (
            <button className="btn btn-primary" style={{ minWidth: '120px' }} onClick={handleStart}>
              ▶ {secondsLeft < totalSeconds ? 'Tiếp tục' : 'Bắt đầu'}
            </button>
          ) : (
            <button className="btn btn-warning" style={{ minWidth: '120px' }} onClick={handlePause}>
              ⏸ Tạm dừng
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleReset} disabled={secondsLeft === totalSeconds && !running}>
            ↺ Đặt lại
          </button>
        </div>
      </div>

      {/* Today Stats */}
      <div className="card-grid card-grid-3" style={{ marginTop: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Phiên hôm nay</div>
          <div className="stat-value">{todayStats?.totalSessions || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tổng phút</div>
          <div className="stat-value">{todayStats?.totalMinutes || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">XP kiếm được</div>
          <div className="stat-value">+{todayStats?.xpEarned || 0}</div>
        </div>
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">📋 Phiên gần đây</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentSessions.slice(0, 8).map(s => (
              <div key={s.id} className="habit-item" style={{ padding: '0.75rem 1rem' }}>
                <div className="habit-info">
                  <div className="habit-name" style={{ fontSize: '0.85rem' }}>
                    {s.habitName || 'Phiên tự do'} — {s.durationMinutes} phút
                  </div>
                  <div className="habit-meta">
                    <span>{new Date(s.startedAt).toLocaleString('vi-VN')}</span>
                    {s.note && <span>📝 {s.note}</span>}
                  </div>
                </div>
                <span className={`badge ${s.completed ? 'badge-success' : 'badge-warning'}`}>
                  {s.completed ? '✓ Xong' : '⏳ Đang chạy'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
