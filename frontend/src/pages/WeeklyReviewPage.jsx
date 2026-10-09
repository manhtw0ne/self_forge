import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate } from '../utils/dates';
import { useEffect, useState } from 'react';
import { useToast } from '../context/useToast';
import PremiumGate from '../components/PremiumGate';
import api from '../api/client';
const RATING_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Rất tệ' },
  { value: 2, emoji: '😟', label: 'Tệ' },
  { value: 3, emoji: '😐', label: 'Ổn' },
  { value: 4, emoji: '😊', label: 'Tốt' },
  { value: 5, emoji: '🤩', label: 'Tuyệt' },
];

export default function WeeklyReviewPage() {
  const { language, t } = useLanguage();
  const [error, setError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ wins: '', improvements: '', nextWeekPlan: '', rating: 3 });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    setError(false);
    setHistoryError(false);
    setStatsError(false);
    Promise.all([
      api.get('/weekly-review/current'),
      api.get('/weekly-review/history').catch(() => { setHistoryError(true); return { data: [] }; }),
      api.get('/stats/weekly').catch(() => { setStatsError(true); return { data: null }; }),
    ]).then(([c, h, s]) => {
      if (c.data) {
        setCurrent(c.data);
        setForm({ wins: c.data.wins || '', improvements: c.data.improvements || '', nextWeekPlan: c.data.nextWeekPlan || '', rating: c.data.rating || 3 });
      }
      setHistory(h.data || []);
      setWeeklyStats(s.data);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [attempt]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || error) return;
    setSaving(true);
    try {
      const res = await api.post('/weekly-review', form);
      setCurrent(res.data);
      toast.success(t("📋 Đã lưu review tuần!"));
      // Refresh history
      api.get('/weekly-review/history').then(r => { setHistory(r.data || []); setHistoryError(false); }).catch(() => setHistoryError(true));
    } catch {
      toast.error(t("Không thể lưu review"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (error) return <PremiumGate feature={t('Review Tuần')}><div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu. Vui lòng thử lại.')}</p><button className="btn btn-secondary" onClick={() => setAttempt(a => a + 1)}>{t('Thử lại')}</button></div></PremiumGate>;

  return (
    <PremiumGate feature={t("Review Tuần")}>
    <div className="fade-in">
      <div className="page-header">
        <h1>{t("📋 Review Tuần")}</h1>
        <p>{t("Nhìn lại và lên kế hoạch cho tuần tiếp theo")}</p>
      </div>

      {statsError && <p role="status">{t('Không thể tải thống kê tuần.')}</p>}
      {/* Weekly Stats Summary */}
      {weeklyStats && (
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

      {/* Review Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">{t("✍️ Review tuần này")}</span>
          {current && <span className="badge badge-success">{t("Đã lưu")}</span>}
        </div>
        <form onSubmit={handleSave}>
          {/* Rating */}
          <div className="form-group">
            <label className="form-label">{t("Tuần này thế nào?")}</label>
            <div className="mood-options" style={{ justifyContent: 'flex-start' }}>
              {RATING_OPTIONS.map(r => (
                <button key={r.value} type="button"
                  className={`mood-btn ${form.rating === r.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, rating: r.value })}>
                  <span className="mood-emoji">{r.emoji}</span>
                  <span className="mood-label">{t(r.label)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t("🏆 Chiến thắng tuần này")}</label>
            <textarea className="form-textarea" value={form.wins} onChange={e => setForm({ ...form, wins: e.target.value })}
              placeholder={t("Điều gì bạn đã làm tốt tuần này?")} rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">{t("🔧 Cần cải thiện")}</label>
            <textarea className="form-textarea" value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })}
              placeholder={t("Điều gì có thể làm tốt hơn?")} rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">{t("🎯 Kế hoạch tuần sau")}</label>
            <textarea className="form-textarea" value={form.nextWeekPlan} onChange={e => setForm({ ...form, nextWeekPlan: e.target.value })}
              placeholder={t("Bạn muốn tập trung vào điều gì tuần tới?")} rows={3} />
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {t(saving ? '⏳ Đang lưu...' : current ? '💾 Cập nhật' : '💾 Lưu review')}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowHistory(!showHistory)}>
          <span className="card-title">{t('📜 Lịch sử review ({count})', { count: history.length })}</span>
          <span>{showHistory ? '▲' : '▼'}</span>
        </div>
        {showHistory && (
          historyError ? <p role="status">{t('Không thể tải lịch sử review.')}</p> : history.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <p>{t("Chưa có review nào")}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map(r => (
                <div key={r.id} className="card" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('📅 Tuần')} {formatCalendarDate(r.weekStart, language)}</span>
                    <span style={{ fontSize: '1.2rem' }}>{RATING_OPTIONS.find(o => o.value === r.rating)?.emoji || '😐'}</span>
                  </div>
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
            </div>
          )
        )}
      </div>
    </div>
    </PremiumGate>
  );
}
