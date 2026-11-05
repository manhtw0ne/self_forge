import CategoryComparison from '../components/CategoryComparison';
import CategoryActivity from '../components/CategoryActivity';
import MonthlyMood from '../components/MonthlyMood';
import {journalDateLink} from '../utils/journalNavigation';
import WeeklyActivity from '../components/WeeklyActivity';
import MonthlyActivity from '../components/MonthlyActivity';
import HabitTrend from '../components/HabitTrend';
import { useAccountDate } from '../hooks/useAccountDate';
import { useAuth } from '../context/useAuth';
import { useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate } from '../utils/dates';
import { useStatsSection } from '../hooks/useStatsSection';
import { moodTimeline, moodY } from '../utils/moodTimeline';

export default function StatsPage() {
  const [searchParams]=useSearchParams();
  const { language, t } = useLanguage();
  const [selectedDay, setSelectedDay] = useState(null);
  const [focusedDay, setFocusedDay] = useState(null);
  const { user } = useAuth();
  const today = useAccountDate(user.timezone);
  const heatmapSection = useStatsSection('/stats/heatmap');
  const moodSection = useStatsSection('/mood/history?days=30');
  const heatmap = heatmapSection.data;
  const focusDate = heatmap?.days.some(day => day.date === focusedDay) ? focusedDay : heatmap?.days[0]?.date;
  const timeline = moodTimeline(moodSection.data || []);
  const moodHistory = timeline.points;
  const number = value => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }).format(value);
  const date = value => formatCalendarDate(value, language, { year: 'numeric', month: 'numeric', day: 'numeric' });
  const sectionStatus = (section, label) => section.loading || section.error ? <div className="card" style={{ marginBottom: '1rem' }} role={section.error ? 'alert' : 'status'}>
    <h2 className="card-title">{t(label)}</h2>
    <p>{t(section.error ? 'Không thể tải dữ liệu. Vui lòng thử lại.' : 'Đang tải...')}</p>
    {section.error && <button className="btn btn-secondary" onClick={section.retry}>{t('Thử lại')}</button>}
  </div> : null;

  const heatmapLevel = (count) => {
    if (count === 0) return '';
    if (count <= 1) return 'level-1';
    if (count <= 2) return 'level-2';
    if (count <= 4) return 'level-3';
    return 'level-4';
  };

  // Mood chart helpers
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

      <CategoryActivity key={user.id} today={today} timezone={user.timezone}/>
      <CategoryComparison key={user.id} today={today} timezone={user.timezone}/>
      <HabitTrend key={user.id+':'+searchParams.toString()} today={today}/>
      {sectionStatus(moodSection, '😊 Tâm trạng 30 ngày')}
      {!moodSection.loading && !moodSection.error && moodHistory.length === 0 && <p>{t('Chưa ghi tâm trạng trong 30 ngày qua.')}</p>}
      {/* Mood Trend */}
      {moodHistory.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">{t("😊 Tâm trạng 30 ngày")}</span>
            <span className="badge badge-info">{t('TB:')} {number(moodAvg)} {moodEmojis[Math.round(moodAvg)] || '😐'}</span>
          </div>
          <div className="mood-chart">
            <div className="mood-chart-labels" aria-hidden="true" style={{ height: moodChartHeight, boxSizing: 'border-box' }}>
              <span>🤩</span>
              <span>😊</span>
              <span>😐</span>
              <span>😟</span>
              <span>😢</span>
            </div>
            <div className="mood-chart-area">
              <svg width="100%" height={moodChartHeight} role="group" aria-label={t('😊 Tâm trạng 30 ngày')} viewBox={`0 0 ${timeline.width} ${moodChartHeight}`} preserveAspectRatio="none">
                {/* Grid lines */}
                {[1, 2, 3, 4, 5].map(i => (
                  <line key={i} x1="0" x2={timeline.width} y1={moodY(i, moodChartHeight)} y2={moodY(i, moodChartHeight)}
                    stroke="var(--border-color)" strokeWidth="0.5" />
                ))}
                {/* Line */}
                <polyline fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinejoin="round"
                  points={moodHistory.map(m => `${m.x},${moodY(m.score, moodChartHeight)}`).join(' ')} />
                {/* Dots */}
                {moodHistory.map(m => (
                  <g key={m.date}>
                    <circle className="mood-chart-point" tabIndex={0} role="img" aria-label={t('{date}: tâm trạng {score}/5', { date: date(m.date), score: m.score })} cx={m.x} cy={moodY(m.score, moodChartHeight)}
                      r="4" fill="var(--accent-primary)" stroke="var(--bg-card)" strokeWidth="2"><title>{t('{date}: tâm trạng {score}/5', { date: date(m.date), score: m.score })}</title></circle>
                  </g>
                ))}
              </svg>
              <div className="mood-chart-dates" style={{ position: 'relative', height: '1.25rem' }}>
                {moodHistory.filter((_, i) => i === 0 || i === moodHistory.length - 1).map(m => (
                  <span key={m.date} style={{ position: 'absolute', left: `${m.x / timeline.width * 100}%`, transform: 'translateX(-50%)' }}>{formatCalendarDate(m.date, language, { month: 'numeric', day: 'numeric' })}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {moodHistory.length > 0 && <details className="card" style={{ marginBottom: '1.5rem' }}>
        <summary>{t('Xem từng ngày đã ghi tâm trạng')}</summary>
        <p>{t('Ngày không ghi nhận không được tính là tâm trạng thấp. Đường nối chỉ nối các lần đã ghi.')}</p>
        <table style={{ width: '100%', textAlign: 'left' }}><thead><tr><th>{t('Ngày')}</th><th>{t('Tâm trạng')}</th></tr></thead>
          <tbody>{moodHistory.map(m => <tr key={m.date}><td>{date(m.date)}</td><td>{moodEmojis[m.score]} {m.score}/5</td></tr>)}</tbody>
        </table>
      </details>}
      <MonthlyMood key={user.id} today={today} timezone={user.timezone}/>
      <WeeklyActivity key={user.id} today={today} timezone={user.timezone}/>

      <MonthlyActivity key={user.id} today={today} timezone={user.timezone}/>

      {sectionStatus(heatmapSection, 'Lịch hoạt động')}
      {/* Heatmap */}
      {heatmap && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🗓️ Heatmap {heatmap.year}</span>
          </div>
          <div className="heatmap-grid">
            {heatmap.days.map((d, i) => (
              <button type="button" key={i} disabled={d.date > today} tabIndex={d.date === focusDate ? 0 : -1} onFocus={() => setFocusedDay(d.date)} onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                const cells = [...event.currentTarget.parentElement.querySelectorAll('button:not(:disabled)')];
                const index = cells.indexOf(event.currentTarget);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? cells.length - 1 : Math.max(0, Math.min(cells.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));
                event.preventDefault(); cells[next]?.focus();
              }} aria-pressed={selectedDay?.date === d.date} aria-label={t('{date}: {count} lượt hoàn thành, {score} điểm', { date: date(d.date), count: number(d.completedCount), score: number(d.score) })} onClick={() => setSelectedDay(d)} className={`heatmap-cell ${heatmapLevel(d.completedCount)} tooltip-wrapper`}>
                <span className="tooltip-text" aria-hidden="true">{t('{date}: {count} lượt hoàn thành, {score} điểm', { date: date(d.date), count: number(d.completedCount), score: number(d.score) })}</span>
              </button>
            ))}
          </div>
          <p>{t('Chọn một ô để xem ngày và mở lịch sử check-in.')}</p>
          {selectedDay && <div role="status" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <p>{t('{date}: {count} lượt hoàn thành, {score} điểm', { date: date(selectedDay.date), count: number(selectedDay.completedCount), score: number(selectedDay.score) })}</p>
            <Link className="btn btn-secondary btn-sm" to={'/check-in-history?date=' + selectedDay.date}>{t('Xem check-in ngày này')}</Link>
            <Link className="btn btn-secondary btn-sm" style={{marginLeft:'0.5rem'}} to={journalDateLink(selectedDay.date)}>{t('Viết hoặc xem nhật ký ngày này')}</Link>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: '0.5rem' }} onClick={() => setSelectedDay(null)}>{t('Đóng')}</button>
          </div>}
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
