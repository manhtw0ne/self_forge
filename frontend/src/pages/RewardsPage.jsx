import { createLatestRequest } from '../utils/latestRequest';
import { useLanguage } from '../context/useLanguage';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import PremiumGate from '../components/PremiumGate';
import api from '../api/client';

export default function RewardsPage() {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [penalties, setPenalties] = useState(null);
  const [customError, setCustomError] = useState(false);
  const [customRewards, setCustomRewards] = useState([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState({ name: '', description: '', xpCost: 100 });
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const inFlight = useRef(false);
  const requests = useRef(createLatestRequest());
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    setCustomError(false);
    return requests.current.run(() => Promise.all([
      api.get('/rewards/progress'),
      api.get('/rewards/achievements'),
      api.get('/penalties/summary'),
      api.get('/custom-rewards').catch(error => ({ data: [], failed: error.response?.status !== 403 })),
    ]), ([p, a, pen, cr]) => { setProgress(p.data); setAchievements(a.data); setPenalties(pen.data); setCustomRewards(cr.data); setCustomError(Boolean(cr.failed)); },
      () => setLoadError(true), () => setLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [loadAll]);

  const handleCreateReward = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.post('/custom-rewards', { ...rewardForm, xpCost: parseInt(rewardForm.xpCost) });
      toast.success(t("🎁 Đã tạo phần thưởng!"));
      setShowRewardModal(false);
      setRewardForm({ name: '', description: '', xpCost: 100 });
      await loadAll();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { inFlight.current = false; setBusy(false); }
  };

  const handleClaimReward = async (id) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.post(`/custom-rewards/${id}/claim`);
      toast.success(t("🎉 Đã nhận phần thưởng!"));
      await loadAll();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || err.response?.data?.message || 'Chưa xác nhận được việc nhận thưởng. Hãy tải lại danh sách trước khi thử lại.'));
      await loadAll();
    } finally { inFlight.current = false; setBusy(false); }
  };

  const handleDeleteReward = async (id) => {
    if (inFlight.current || !window.confirm(t('Xóa phần thưởng này? XP đã dùng sẽ không được hoàn lại.'))) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.delete(`/custom-rewards/${id}`);
      toast.info(t("Đã xóa phần thưởng"));
      await loadAll();
    } catch {
      toast.error(t("Không thể xóa"));
    } finally { inFlight.current = false; setBusy(false); }
  };

  if (loadError) return <div className="empty-state" role="alert"><p>{t('Không thể tải dữ liệu.')}</p><button disabled={busy} className="btn btn-secondary" onClick={loadAll}>{t('Thử lại')}</button></div>;
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const levelPercent = progress ? (progress.levelProgress * 100) : 0;
  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{t("🏆 Thành tựu & Cấp độ")}</h1>
        <p>{t("Hệ thống gamification để tăng động lực")}</p>
      </div>

      {/* Level Card */}
      {progress && (
        <div className="level-card">
          <span className="level-icon">
            {progress.level >= 10 ? '👑' : progress.level >= 5 ? '⚔️' : '🌱'}
          </span>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem', position: 'relative', zIndex: 1 }}>Level {progress.level}</h2>
          <p style={{ opacity: 0.85, fontSize: '0.85rem', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
            {t('{count} XP tổng cộng', { count: progress.totalXp })}
          </p>
          <div style={{ maxWidth: '400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div className="progress-bar" style={{ height: '12px', background: 'rgba(255,255,255,0.15)' }}>
              <div className="progress-fill" style={{ width: `${levelPercent}%`, background: 'rgba(255,255,255,0.9)' }} />
            </div>
            <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.4rem' }}>
              {t('{current} / {next} XP đến level {level}', { current: progress.currentLevelXp, next: progress.nextLevelXp, level: progress.level + 1 })}
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
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t("Lịch sử phạt")}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {t('{count} lần phạt · {xp} XP đã bị trừ', { count: penalties.totalPenalties, xp: penalties.totalXpDeducted })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Rewards — Premium only */}
      <PremiumGate mode="section" feature={t("Phần thưởng tùy chỉnh")}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">{t("🎁 Phần thưởng của tôi")}</span>
          <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => setShowRewardModal(true)}>{t("+ Tạo mới")}</button>
        </div>
        {customError ? <div role="status"><p>{t('Không thể tải phần thưởng tùy chỉnh.')}</p><button className="btn btn-secondary" disabled={busy} onClick={loadAll}>{t('Thử lại')}</button></div> : customRewards.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <div className="empty-icon">🎁</div>
            <p>{t("Tự đặt phần thưởng để thưởng cho bản thân khi đạt đủ XP!")}</p>
            <button disabled={busy} className="btn btn-secondary" onClick={() => setShowRewardModal(true)}>{t("Tạo phần thưởng đầu tiên")}</button>
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
                    <span className="badge badge-success">{t("✓ Đã nhận")}</span>
                  ) : (
                    <>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleClaimReward(r.id)}
                        disabled={busy || !progress || progress.totalXp < r.xpCost}
                        title={progress && progress.totalXp < r.xpCost ? t('Cần {count} XP nữa', { count: r.xpCost - progress.totalXp }) : t('Nhận thưởng')}>
                        {t('🎉 Nhận')}
                      </button>
                      <button disabled={busy} className="btn btn-danger btn-sm" onClick={() => handleDeleteReward(r.id)} title={t("Xóa")}>✗</button>
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
          <span className="card-title">{t('Huy hiệu ({earned}/{total})', { earned: earnedCount, total: achievements.length })}</span>
          {earnedCount > 0 && (
            <span className="badge badge-success">{t('{percent}% đã đạt', { percent: Math.round(earnedCount / achievements.length * 100) })}</span>
          )}
        </div>
        <div className="card-grid card-grid-4">
          {achievements.map((a, i) => (
            <div key={a.id} className={`achievement-card ${a.earned ? 'earned' : 'locked'} slide-in`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="achievement-icon">{a.iconEmoji}</div>
              <div className="achievement-name">{t(a.name)}</div>
              <div className="achievement-desc">{t(a.description)}</div>
              <span className={`badge ${a.earned ? 'badge-success' : 'badge-info'}`}>
                {a.earned ? t('✓ Đã đạt') : `${a.xpReward} XP`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Reward Modal */}
      {showRewardModal && (
        <div className="modal-overlay" onClick={() => { if (!inFlight.current) setShowRewardModal(false); }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{t("🎁 Tạo phần thưởng")}</h2>
            <form onSubmit={handleCreateReward} aria-busy={busy}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label className="form-label">{t("Tên phần thưởng *")}</label>
                <input className="form-input" maxLength={255} value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} required placeholder={t("VD: Xem phim cuối tuần")} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("Mô tả")}</label>
                <input className="form-input" maxLength={255} value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder={t("Chi tiết phần thưởng")} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("Chi phí XP *")}</label>
                <input type="number" className="form-input" min="1" max="1000000" value={rewardForm.xpCost} onChange={e => setRewardForm({ ...rewardForm, xpCost: e.target.value })} required />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {t('XP hiện tại: {count}', { count: progress?.totalXp || 0 })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { if (!inFlight.current) setShowRewardModal(false); }}>{t("Hủy")}</button>
                <button type="submit" className="btn btn-primary">{t("Tạo")}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}
    </div>
  );
}
