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
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ wins: '', improvements: '', nextWeekPlan: '', rating: 3 });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/weekly-review/current').catch(() => ({ data: null })),
      api.get('/weekly-review/history').catch(() => ({ data: [] })),
      api.get('/stats/weekly').catch(() => ({ data: null })),
    ]).then(([c, h, s]) => {
      if (c.data) {
        setCurrent(c.data);
        setForm({ wins: c.data.wins || '', improvements: c.data.improvements || '', nextWeekPlan: c.data.nextWeekPlan || '', rating: c.data.rating || 3 });
      }
      setHistory(h.data || []);
      setWeeklyStats(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/weekly-review', form);
      setCurrent(res.data);
      toast.success('📋 Đã lưu review tuần!');
      // Refresh history
      api.get('/weekly-review/history').then(r => setHistory(r.data || []));
    } catch {
      toast.error('Không thể lưu review');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <PremiumGate feature="Review Tuần">
    <div className="fade-in">
      <div className="page-header">
        <h1>📋 Review Tuần</h1>
        <p>Nhìn lại và lên kế hoạch cho tuần tiếp theo</p>
      </div>

      {/* Weekly Stats Summary */}
      {weeklyStats && (
        <div className="card-grid card-grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card slide-in">
            <div className="stat-label">Tổng điểm tuần</div>
            <div className="stat-value">{weeklyStats.totalScore}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-label">Hoàn thành</div>
            <div className="stat-value">{weeklyStats.completedCount}</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-label">Tỷ lệ</div>
            <div className="stat-value">{Math.round(weeklyStats.completionRate * 100)}%</div>
          </div>
          <div className="stat-card slide-in" style={{ animationDelay: '0.3s' }}>
            <div className="stat-label">Streak tốt nhất</div>
            <div className="stat-value">🔥 {weeklyStats.bestStreak}</div>
          </div>
        </div>
      )}

      {/* Review Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">✍️ Review tuần này</span>
          {current && <span className="badge badge-success">Đã lưu</span>}
        </div>
        <form onSubmit={handleSave}>
          {/* Rating */}
          <div className="form-group">
            <label className="form-label">Tuần này thế nào?</label>
            <div className="mood-options" style={{ justifyContent: 'flex-start' }}>
              {RATING_OPTIONS.map(r => (
                <button key={r.value} type="button"
                  className={`mood-btn ${form.rating === r.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, rating: r.value })}>
                  <span className="mood-emoji">{r.emoji}</span>
                  <span className="mood-label">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🏆 Chiến thắng tuần này</label>
            <textarea className="form-textarea" value={form.wins} onChange={e => setForm({ ...form, wins: e.target.value })}
              placeholder="Điều gì bạn đã làm tốt tuần này?" rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">🔧 Cần cải thiện</label>
            <textarea className="form-textarea" value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })}
              placeholder="Điều gì có thể làm tốt hơn?" rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">🎯 Kế hoạch tuần sau</label>
            <textarea className="form-textarea" value={form.nextWeekPlan} onChange={e => setForm({ ...form, nextWeekPlan: e.target.value })}
              placeholder="Bạn muốn tập trung vào điều gì tuần tới?" rows={3} />
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Đang lưu...' : current ? '💾 Cập nhật' : '💾 Lưu review'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowHistory(!showHistory)}>
          <span className="card-title">📜 Lịch sử review ({history.length})</span>
          <span>{showHistory ? '▲' : '▼'}</span>
        </div>
        {showHistory && (
          history.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <p>Chưa có review nào</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map(r => (
                <div key={r.id} className="card" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>📅 Tuần {r.weekStart}</span>
                    <span style={{ fontSize: '1.2rem' }}>{RATING_OPTIONS.find(o => o.value === r.rating)?.emoji || '😐'}</span>
                  </div>
                  {r.wins && (
                    <div style={{ marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>🏆 Chiến thắng:</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', whiteSpace: 'pre-wrap' }}>{r.wins}</p>
                    </div>
                  )}
                  {r.improvements && (
                    <div style={{ marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>🔧 Cải thiện:</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0', whiteSpace: 'pre-wrap' }}>{r.improvements}</p>
                    </div>
                  )}
                  {r.nextWeekPlan && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--info)', fontWeight: 600 }}>🎯 Kế hoạch:</span>
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
