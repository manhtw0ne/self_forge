import { saveAndRefresh } from '../utils/saveAndRefresh';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate } from '../utils/dates';

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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function computeCombo(habits) {
  return { allDone: habits?.length > 0 && habits.every(h => h.todayStatus === 'COMPLETED') };
}

export default function DashboardPage() {
  const { language, t } = useLanguage();
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
  const { user } = useAuth();
  const toast = useToast();
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    let active = true;
    setLoading(true);
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

  const retry = () => { if (!actionBusy.current && !moodBusy.current) setAttempt(a => a + 1); };
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu')}</p><button className="btn btn-secondary" onClick={retry}>{t('Thử lại')}</button></div>;

  const combo = computeCombo(data.habits);

  const runAction = async (save, message) => {
    if (actionBusy.current || needsRefresh) return;
    actionBusy.current = true; setSavingAction(true);
    try {
      const result = await saveAndRefresh(save, () => Promise.all([
        api.get('/dashboard/today'), api.get('/streak-freeze/remaining'),
      ]));
      if (result.refreshFailed) {
        setNeedsRefresh(true);
        toast.info(t('Đã lưu thay đổi nhưng chưa tải lại được dữ liệu. Hãy tải lại trước khi thao tác tiếp.'));
        return;
      }
      const [d, f] = result.data;
      setData(d.data); setFreezeInfo(f.data); setFreezeError(false);
      toast.success(t(message));
      if (computeCombo(d.data.habits).allDone && !combo.allDone) toast.success(t('🎉 Hoàn thành tất cả thói quen hôm nay!'));
    } catch (err) {
      setNeedsRefresh(true);
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại dữ liệu trước khi thử tiếp.'));
    } finally { actionBusy.current = false; setSavingAction(false); }
  };

  const checkIn = (habitId, status) => runAction(
    () => api.post('/check-ins', { habitId, status }),
    { COMPLETED: '✅ Hoàn thành! Tuyệt vời!', FAILED: '😔 Thất bại — nhưng đừng bỏ cuộc!', SKIPPED: '⏭️ Đã bỏ qua' }[status],
  );

  const handleMood = async (score, emoji) => {
    if (moodBusy.current) return;
    moodBusy.current = true; setSavingMood(true);
    try {
      const res = await api.post('/mood', { score, emoji });
      setMood(res.data);
      setMoodError(false);
      toast.success(t('Tâm trạng: {emoji} — đã ghi nhận!', { emoji }));
    } catch {
      toast.error(t("Không thể lưu tâm trạng"));
    } finally { moodBusy.current = false; setSavingMood(false); }
  };

  const handleFreeze = habitId => runAction(
    () => api.post('/streak-freeze', { habitId }), '❄️ Đã freeze streak!',
  );

  return (
    <div className="fade-in">
      {needsRefresh && <div className="card" role="status"><p>{t('Hãy tải lại dữ liệu trước khi thao tác tiếp.')}</p><button className="btn btn-secondary" disabled={savingAction || savingMood} onClick={retry}>{t('Thử lại')}</button></div>}
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-title">
          {t(getGreeting())}, {user?.displayName || t('bạn')}! 👋
        </div>
        <div className="greeting-quote">{t(quote)}</div>
        <div className="greeting-date">📅 {formatCalendarDate(data.date, language)}</div>
      </div>

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
              disabled={savingMood || moodError}
              aria-pressed={mood?.score === m.score}
              onClick={() => handleMood(m.score, m.emoji)}
              title={t(m.label)}>
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{t(m.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Combo Info */}
      {combo.allDone && (
        <div className={combo.allDone ? 'combo-info' : 'combo-info'} style={combo.allDone ? { background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' } : {}}>
          <span>{t('🎉 Hoàn thành tất cả thói quen hôm nay!')}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/habits" className="quick-action-btn">{t("🎯 Quản lý thói quen")}</Link>
        <Link to="/journal" className="quick-action-btn">{t("📝 Viết nhật ký")}</Link>
        <Link to="/pomodoro" className="quick-action-btn">{t("⏱ Pomodoro")}</Link>
        <Link to="/stats" className="quick-action-btn">{t("📈 Xem thống kê")}</Link>
        <Link to="/challenges" className="quick-action-btn">{t("⚡ Thử thách")}</Link>
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

      {/* Today's Habits */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">{t("📋 Tiến độ thói quen hôm nay")}</span>
          {data.habits.length > 0 && (
            <span className="badge badge-info">
              {t('{done}/{total} xong', { done: data.habits.filter(h => h.todayStatus === 'COMPLETED').length, total: data.habits.length })}
            </span>
          )}
        </div>
        {data.habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>{t("Chưa có thói quen nào. Hãy tạo thói quen đầu tiên!")}</p>
            <Link to="/habits" className="btn btn-primary">{t("+ Tạo thói quen")}</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.habits.map((h, i) => (
              <div key={h.habitId} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="habit-info">
                  <div className="habit-name">{h.name}</div>
                  <div className="habit-meta">
                    <span className={`badge badge-${h.difficulty === 'HARD' ? 'danger' : h.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                      {t(h.difficulty === 'HARD' ? 'Khó' : h.difficulty === 'MEDIUM' ? 'Trung bình' : 'Dễ')}
                    </span>
                    <span>{h.completedThisWeek}/{h.targetPerWeek} {t('tuần này')}</span>
                    {h.currentStreak > 0 && (
                      <span className="streak-indicator">🔥 {t('{count} ngày', { count: h.currentStreak })}</span>
                    )}
                  </div>
                </div>
                <div className="habit-actions">
                  {h.todayStatus === 'COMPLETED' ? (
                    <span className="badge badge-success">{t("✓ Đã xong")}</span>
                  ) : h.todayStatus === 'FAILED' ? (
                    <span className="badge badge-danger">{t("✗ Thất bại")}</span>
                  ) : h.todayStatus === 'SKIPPED' ? (
                    <span className="badge badge-warning">{t("⏭ Bỏ qua")}</span>
                  ) : (
                    <>
                      <button className="btn btn-success btn-sm" disabled={savingAction || needsRefresh} onClick={() => checkIn(h.habitId, 'COMPLETED')} title={t("Hoàn thành")}>✓</button>
                      <button className="btn btn-warning btn-sm" onClick={() => checkIn(h.habitId, 'SKIPPED')} title={t("Bỏ qua")}>⏭</button>
                      <button className="btn btn-danger btn-sm" onClick={() => checkIn(h.habitId, 'FAILED')} title={t("Thất bại")}>✗</button>
                      {freezeInfo?.remaining > 0 && (
                        <button className="btn btn-ghost btn-sm" disabled={savingAction || needsRefresh} onClick={() => handleFreeze(h.habitId)} title={t("Freeze streak")}>❄️</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
