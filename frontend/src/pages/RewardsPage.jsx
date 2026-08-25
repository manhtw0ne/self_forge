import { useEffect, useState } from 'react';
import { useToast } from '../context/useToast';
import PremiumGate from '../components/PremiumGate';
import api from '../api/client';

export default function RewardsPage() {
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [penalties, setPenalties] = useState(null);
  const [customRewards, setCustomRewards] = useState([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState({ name: '', description: '', xpCost: 100 });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadAll = () => {
    Promise.all([
      api.get('/rewards/progress'),
      api.get('/rewards/achievements'),
      api.get('/penalties/summary'),
      api.get('/custom-rewards').catch(() => ({ data: [] })),
    ])
      .then(([p, a, pen, cr]) => { setProgress(p.data); setAchievements(a.data); setPenalties(pen.data); setCustomRewards(cr.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreateReward = async (e) => {
    e.preventDefault();
    try {
      await api.post('/custom-rewards', { ...rewardForm, xpCost: parseInt(rewardForm.xpCost) });
      toast.success('🎁 Đã tạo phần thưởng!');
      setShowRewardModal(false);
      setRewardForm({ name: '', description: '', xpCost: 100 });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleClaimReward = async (id) => {
    try {
      await api.post(`/custom-rewards/${id}/claim`);
      toast.success('🎉 Đã nhận phần thưởng!');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.detail || 'Không đủ XP');
    }
  };

  const handleDeleteReward = async (id) => {
    try {
      await api.delete(`/custom-rewards/${id}`);
      toast.info('Đã xóa phần thưởng');
      loadAll();
    } catch {
      toast.error('Không thể xóa');
    }
  };

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

      {/* Custom Rewards — Premium only */}
      <PremiumGate mode="section" feature="Phần thưởng tùy chỉnh">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">🎁 Phần thưởng của tôi</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRewardModal(true)}>+ Tạo mới</button>
        </div>
        {customRewards.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <div className="empty-icon">🎁</div>
            <p>Tự đặt phần thưởng để thưởng cho bản thân khi đạt đủ XP!</p>
            <button className="btn btn-secondary" onClick={() => setShowRewardModal(true)}>Tạo phần thưởng đầu tiên</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {customRewards.map(r => (
              <div key={r.id} className="habit-item" style={{ padding: '0.75rem 1rem' }}>
                <div className="habit-info">
                  <div className="habit-name">{r.name}</div>
                  <div className="habit-meta">
                    <span className="badge badge-info">{r.xpCost} XP</span>
                    {r.description && <span>{r.description}</span>}
                  </div>
                </div>
                <div className="habit-actions">
                  {r.claimed ? (
                    <span className="badge badge-success">✓ Đã nhận</span>
                  ) : (
                    <>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleClaimReward(r.id)}
                        disabled={!progress || progress.totalXp < r.xpCost}
                        title={progress && progress.totalXp < r.xpCost ? `Cần ${r.xpCost - progress.totalXp} XP nữa` : 'Nhận thưởng'}>
                        🎉 Nhận
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReward(r.id)} title="Xóa">✗</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </PremiumGate>

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

      {/* Create Reward Modal */}
      {showRewardModal && (
        <div className="modal-overlay" onClick={() => setShowRewardModal(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🎁 Tạo phần thưởng</h2>
            <form onSubmit={handleCreateReward}>
              <div className="form-group">
                <label className="form-label">Tên phần thưởng *</label>
                <input className="form-input" value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} required placeholder="VD: Xem phim cuối tuần" />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <input className="form-input" value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Chi tiết phần thưởng" />
              </div>
              <div className="form-group">
                <label className="form-label">Chi phí XP *</label>
                <input type="number" className="form-input" min="10" value={rewardForm.xpCost} onChange={e => setRewardForm({ ...rewardForm, xpCost: e.target.value })} required />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  XP hiện tại: {progress?.totalXp || 0}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRewardModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
