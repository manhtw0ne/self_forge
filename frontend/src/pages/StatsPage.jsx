import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate } from '../utils/dates';
import { useEffect, useState } from 'react';
import api from '../api/client';

export default function StatsPage() {
  const { language, t } = useLanguage();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [moodError, setMoodError] = useState(false);
  const number = value => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }).format(value);
  const date = value => formatCalendarDate(value, language, { year: 'numeric', month: 'numeric', day: 'numeric' });
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setMoodError(false);
    Promise.all([
      api.get('/stats/weekly'),
      api.get('/stats/monthly'),
      api.get('/stats/heatmap'),
      api.get('/mood/history?days=30').catch(() => { setMoodError(true); return { data: [] }; }),
    ])
      .then(([w, m, h, mood]) => { setWeekly(w.data); setMonthly(m.data); setHeatmap(h.data); setMoodHistory(mood.data || []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [attempt]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (error) return <div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu. Vui lòng thử lại.')}</p><button className="btn btn-secondary" onClick={() => setAttempt(a => a + 1)}>{t('Thử lại')}</button></div>;

  const heatmapLevel = (count) => {
    if (count === 0) return '';
    if (count <= 1) return 'level-1';
    if (count <= 2) return 'level-2';
    if (count <= 4) return 'level-3';
    return 'level-4';
  };

  // Mood chart helpers
  const moodMax = 5;
  const moodChartHeight = 120;
  const moodEmojis = { 1: '😢', 2: '😟', 3: '😐', 4: '😊', 5: '🤩' };
  const moodAvg = moodHistory.length > 0
    ? (moodHistory.reduce((s, m) => s + m.score, 0) / moodHistory.length).toFixed(1)
    : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{t("📈 Thống kê")}</h1>
        <p>{t("Nhìn lại hành trình kỷ luật của bạn")}</p>
      </div>

      {moodError && <p role="status">{t('Không thể tải tâm trạng.')}</p>}
      {/* Mood Trend */}
      {moodHistory.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">{t("😊 Tâm trạng 30 ngày")}</span>
            <span className="badge badge-info">{t('TB:')} {number(moodAvg)} {moodEmojis[Math.round(moodAvg)] || '😐'}</span>
          </div>
          <div className="mood-chart">
            <div className="mood-chart-labels">
              <span>🤩</span>
              <span>😊</span>
              <span>😐</span>
              <span>😟</span>
              <span>😢</span>
            </div>
            <div className="mood-chart-area">
              <svg width="100%" height={moodChartHeight} viewBox={`0 0 ${moodHistory.length * 20} ${moodChartHeight}`} preserveAspectRatio="none">
                {/* Grid lines */}
                {[1, 2, 3, 4, 5].map(i => (
                  <line key={i} x1="0" x2={moodHistory.length * 20} y1={moodChartHeight - (i / moodMax) * moodChartHeight} y2={moodChartHeight - (i / moodMax) * moodChartHeight}
                    stroke="var(--border-color)" strokeWidth="0.5" />
                ))}
                {/* Line */}
                <polyline fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinejoin="round"
                  points={moodHistory.map((m, i) => `${i * 20 + 10},${moodChartHeight - (m.score / moodMax) * moodChartHeight}`).join(' ')} />
                {/* Dots */}
                {moodHistory.map((m, i) => (
                  <g key={i}>
                    <circle cx={i * 20 + 10} cy={moodChartHeight - (m.score / moodMax) * moodChartHeight}
                      r="4" fill="var(--accent-primary)" stroke="var(--bg-card)" strokeWidth="2" />
                  </g>
                ))}
              </svg>
              <div className="mood-chart-dates">
                {moodHistory.filter((_, i) => i % 7 === 0 || i === moodHistory.length - 1).map(m => (
                  <span key={m.date}>{formatCalendarDate(m.date, language, { month: 'numeric', day: 'numeric' })}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Stats */}
      {weekly && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">{t('📅 Tuần này')} ({date(weekly.weekStart)} → {date(weekly.weekEnd)})</span>
          </div>
          <div className="card-grid card-grid-4" style={{ marginBottom: '1rem' }}>
            <div className="stat-card slide-in">
              <div className="stat-label">{t("Tổng điểm")}</div>
              <div className="stat-value">{number(weekly.totalScore)}</div>
            </div>
            <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
              <div className="stat-label">{t("Hoàn thành")}</div>
              <div className="stat-value">{number(weekly.completedCount)}</div>
              <div className="stat-sub">{t('{failed} thất bại · {skipped} bỏ qua', { failed: number(weekly.failedCount), skipped: number(weekly.skippedCount) })}</div>
            </div>
            <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
              <div className="stat-label">{t("Tỷ lệ")}</div>
              <div className="stat-value">{Math.round(weekly.completionRate * 100)}%</div>
              <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
                <div className={`progress-fill ${weekly.completionRate >= 0.8 ? 'success' : weekly.completionRate >= 0.5 ? 'warning' : 'danger'}`} style={{ width: `${weekly.completionRate * 100}%` }} />
              </div>
            </div>
            <div className="stat-card slide-in" style={{ animationDelay: '0.3s' }}>
              <div className="stat-label">{t("Streak tốt nhất")}</div>
              <div className="stat-value">🔥 {number(weekly.bestStreak)}</div>
            </div>
          </div>
          {weekly.mostConsistentHabit && (
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--success)' }}>{t("🏅 Kiên định nhất:")} {weekly.mostConsistentHabit.habitName} ({Math.round(weekly.mostConsistentHabit.completionRate * 100)}%)</span>
              {weekly.leastConsistentHabit && weekly.leastConsistentHabit.habitId !== weekly.mostConsistentHabit.habitId && (
                <span style={{ color: 'var(--danger)' }}>{t("⚠️ Cần cải thiện:")} {weekly.leastConsistentHabit.habitName} ({Math.round(weekly.leastConsistentHabit.completionRate * 100)}%)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monthly Stats */}
      {monthly && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">{t("📊 Tháng")} {monthly.month}</span>
            {monthly.trend !== 0 && (
              <span className={`badge ${monthly.trend > 0 ? 'badge-success' : 'badge-danger'}`}>
                {monthly.trend > 0 ? '↑' : '↓'} {t('{count} điểm phần trăm so với tháng trước', { count: number(Math.abs(monthly.trend * 100)) })}
              </span>
            )}
          </div>
          <div className="card-grid card-grid-3">
            <div className="stat-card">
              <div className="stat-label">{t("Tổng điểm tháng")}</div>
              <div className="stat-value">{number(monthly.totalScore)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("Ngày hoạt động")}</div>
              <div className="stat-value">{monthly.activeDays}/{monthly.totalDays}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("Tỷ lệ hoàn thành")}</div>
              <div className="stat-value">{Math.round(monthly.completionRate * 100)}%</div>
            </div>
          </div>
          {monthly.habitStats && monthly.habitStats.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t("Chi tiết theo thói quen")}</h4>
              {monthly.habitStats.map(h => (
                <div key={h.habitId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ flex: '0 0 150px', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.habitName}</span>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${h.completionRate * 100}%` }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: '0 0 60px', textAlign: 'right' }}>
                    {h.completedCount}/{h.totalExpected}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Heatmap */}
      {heatmap && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🗓️ Heatmap {heatmap.year}</span>
          </div>
          <div className="heatmap-grid">
            {heatmap.days.map((d, i) => (
              <div key={i} className={`heatmap-cell ${heatmapLevel(d.completedCount)} tooltip-wrapper`}>
                <span className="tooltip-text">{t('{date}: {count} lượt hoàn thành, {score} điểm', { date: date(d.date), count: number(d.completedCount), score: number(d.score) })}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>{t("Ít")}</span>
            <div className="heatmap-cell" style={{ width: '12px', height: '12px' }} />
            <div className="heatmap-cell level-1" style={{ width: '12px', height: '12px' }} />
            <div className="heatmap-cell level-2" style={{ width: '12px', height: '12px' }} />
            <div className="heatmap-cell level-3" style={{ width: '12px', height: '12px' }} />
            <div className="heatmap-cell level-4" style={{ width: '12px', height: '12px' }} />
            <span>{t("Nhiều")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
