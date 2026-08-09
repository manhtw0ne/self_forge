import { useEffect, useState } from 'react';
import api from '../api/client';

export default function RewardsPage() {
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [penalties, setPenalties] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/rewards/progress'),
      api.get('/rewards/achievements'),
      api.get('/penalties/summary'),
    ])
      .then(([p, a, pen]) => { setProgress(p.data); setAchievements(a.data); setPenalties(pen.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const levelPercent = progress ? (progress.levelProgress * 100) : 0;
  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🏆 Thành tựu & Cấp độ</h1>
        <p>Hệ thống gamification để tăng động lực</p>
      </div>

      {/* Level Card */}
      {progress && (
        <div className="level-card">
          <span className="level-icon">
            {progress.level >= 10 ? '👑' : progress.level >= 5 ? '⚔️' : '🌱'}
          </span>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem', position: 'relative', zIndex: 1 }}>Level {progress.level}</h2>
          <p style={{ opacity: 0.85, fontSize: '0.85rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
            {progress.totalXp} XP tổng cộng
          </p>
          <div style={{ maxWidth: '400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div className="progress-bar" style={{ height: '12px', background: 'rgba(255,255,255,0.15)' }}>
              <div className="progress-fill" style={{ width: `${levelPercent}%`, background: 'rgba(255,255,255,0.9)' }} />
            </div>
            <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.4rem' }}>
              {progress.currentLevelXp} / {progress.nextLevelXp} XP đến level {progress.level + 1}
            </p>
          </div>
        </div>
      )}

      {/* Penalty Summary */}
      {penalties && penalties.totalPenalties > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--danger)' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Lịch sử phạt</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {penalties.totalPenalties} lần phạt · {penalties.totalXpDeducted} XP đã bị trừ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Huy hiệu ({earnedCount}/{achievements.length})</span>
          {earnedCount > 0 && (
            <span className="badge badge-success">{Math.round(earnedCount / achievements.length * 100)}% đã đạt</span>
          )}
        </div>
        <div className="card-grid card-grid-4">
          {achievements.map((a, i) => (
            <div key={a.id} className={`achievement-card ${a.earned ? 'earned' : 'locked'} slide-in`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="achievement-icon">{a.iconEmoji}</div>
              <div className="achievement-name">{a.name}</div>
              <div className="achievement-desc">{a.description}</div>
              <span className={`badge ${a.earned ? 'badge-success' : 'badge-info'}`}>
                {a.earned ? '✓ Đã đạt' : `${a.xpReward} XP`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
