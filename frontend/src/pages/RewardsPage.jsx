import RewardHistory from '../components/RewardHistory';
import RewardClaimDialog from '../components/RewardClaimDialog';
import {useSearchParams} from 'react-router-dom';
import ResourceScopeNotice from '../components/ResourceScopeNotice';
import {readResourceTarget,targetedResources} from '../utils/resourceTarget';
import {repeatRewardForm} from '../utils/rewardList';
import RewardList from '../components/RewardList';
import {useAuth} from '../context/useAuth';
import {readPendingReward,clearPendingReward,createRewardSafely} from '../utils/pendingReward';
import {rewardEditPayload} from '../utils/rewardEdit';
import RewardBudget from '../components/RewardBudget';
import ModalOverlay from '../components/ModalOverlay';
import { rewardPayload } from '../utils/rewardForm';
import { createLatestRequest } from '../utils/latestRequest';
import { useLanguage } from '../context/useLanguage';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import PremiumGate from '../components/PremiumGate';
import api from '../api/client';
import { publishAccountDataChange, subscribeAccountDataChanges } from '../utils/accountDataSync';

export default function RewardsPage() {
  const { t } = useLanguage();
  const [searchParams,setSearchParams]=useSearchParams();
  const selectedReward=readResourceTarget(searchParams.toString(),'reward');
  const {user}=useAuth();
  const [pendingReward,setPendingReward]=useState(null),[pendingError,setPendingError]=useState(false);
  const readPending=useCallback(()=>{try{setPendingReward(readPendingReward(sessionStorage,user.id));setPendingError(false);}catch{setPendingError(true);}},[user.id]);
  useEffect(()=>{readPending();},[readPending]);
  const [claimingReward,setClaimingReward]=useState(null);
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [penalties, setPenalties] = useState(null);
  const [customError, setCustomError] = useState(false);
  const [customRewards, setCustomRewards] = useState([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [repeatingReward,setRepeatingReward]=useState(null);
  const [editingReward,setEditingReward]=useState(null),[rewardConflict,setRewardConflict]=useState(false),[latestReward,setLatestReward]=useState(null);
  const [rewardForm, setRewardForm] = useState({ name: '', description: '', xpCost: 100 });
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const inFlight = useRef(false);
  const requests = useRef(createLatestRequest());
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

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
  const loadAllRef = useRef(loadAll);
  useEffect(() => { loadAllRef.current = loadAll; }, [loadAll]);

  const announceRewardChange = () => {
    if (typeof window !== 'undefined' && user?.id) publishAccountDataChange(user.id, 'rewards', window.localStorage);
  };

  useEffect(() => {
    loadAll();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [loadAll]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return undefined;
    return subscribeAccountDataChanges(window, user.id, change => {
      if (change.resource !== 'rewards' && change.resource !== 'dashboard') return;
      if (showRewardModal || claimingReward !== null || pendingReward || inFlight.current) {
        setNeedsRefresh(true);
        return;
      }
      loadAllRef.current();
    });
  }, [user?.id, showRewardModal, claimingReward, pendingReward]);

  const dirty = showRewardModal && (rewardForm.name !== (editingReward?.name||'') || rewardForm.description !== (editingReward?.description||'') || String(rewardForm.xpCost) !== String(editingReward?.xpCost??100));
  const closeRewardForm = () => {
    if (inFlight.current) return;
    if (dirty && !window.confirm(t('Đóng biểu mẫu và bỏ thay đổi chưa lưu?'))) return;
    setShowRewardModal(false);setRepeatingReward(null);setEditingReward(null);setRewardConflict(false);setLatestReward(null);
    setRewardForm({ name: '', description: '', xpCost: 100 });
  };
  useEffect(() => {
    if (!dirty) return;
    const guard = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  const handleCreateReward = async (e) => {
    e.preventDefault();
    if (inFlight.current||rewardConflict||(!editingReward&&(pendingReward||pendingError))) return;
    let payload;
    try { payload = editingReward?rewardEditPayload(rewardForm,editingReward):rewardPayload(rewardForm); }
    catch (error) { toast.error(t(error.message)); return; }
    inFlight.current = true; setBusy(true);
    try {
      if(editingReward)await api.patch('/custom-rewards/'+editingReward.id,payload);else {const result=await createRewardSafely(sessionStorage,user.id,payload,p=>api.post('/custom-rewards',p));setPendingReward(result.pending);}
      toast.success(t(editingReward?"Đã sửa phần thưởng.":"🎁 Đã tạo phần thưởng!"));
      setShowRewardModal(false);setRepeatingReward(null);setEditingReward(null);setRewardConflict(false);setLatestReward(null);
      setRewardForm({ name: '', description: '', xpCost: 100 });
      await loadAll();
      announceRewardChange();
    } catch (err) {
      if(!editingReward)readPending();
      if(editingReward&&err.response?.status===409){setRewardConflict(true);setLatestReward(null);}
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { inFlight.current = false; setBusy(false); }
  };

  const handleClaimReward = reward => {if(inFlight.current)return;setClaimingReward(reward.id);};

  const handleDeleteReward = async (id) => {
    if (inFlight.current || !window.confirm(t('Xóa phần thưởng này? XP đã dùng sẽ không được hoàn lại.'))) return;
    inFlight.current = true; setBusy(true);
    try {
      await api.delete(`/custom-rewards/${id}`);
      toast.info(t("Đã xóa phần thưởng"));
      await loadAll();
      announceRewardChange();
    } catch {
      toast.error(t('Chưa xác nhận được kết quả. Hãy kiểm tra danh sách sau khi tải lại.'));
      await loadAll();
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
      {needsRefresh && <section className="card" role="status" style={{ marginBottom: '1rem' }}>
        <p>{t('Phần thưởng hoặc số dư XP vừa thay đổi ở cửa sổ khác. Nội dung đang nhập được giữ nguyên.')}</p>
        <button className="btn btn-secondary" disabled={busy || showRewardModal || claimingReward !== null} onClick={() => { setNeedsRefresh(false); loadAll(); }}>{t('Tải phiên bản mới')}</button>
      </section>}

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

      {(pendingReward||pendingError)&&<div className="card" role="status" style={{marginBottom:'1rem'}}>
        <p>{t('Có yêu cầu tạo phần thưởng chưa xác nhận. Kiểm tra danh sách trước khi tạo mới.')}</p>
        {pendingReward&&<p>{pendingReward.name} · {pendingReward.xpCost} XP</p>}
        <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
          {pendingReward&&<button className="btn btn-primary" disabled={busy} onClick={async()=>{
            if(inFlight.current)return;inFlight.current=true;setBusy(true);
            try{const result=await createRewardSafely(sessionStorage,user.id,pendingReward,p=>api.post('/custom-rewards',p));setPendingReward(result.pending);setShowRewardModal(false);setRepeatingReward(null);setRewardForm({name:'',description:'',xpCost:100});await loadAll();announceRewardChange();toast.success(t('Đã xác nhận phần thưởng.'));}
            catch(error){readPending();toast.error(t(error.response?.data?.detail||'Có lỗi xảy ra'));}
            finally{inFlight.current=false;setBusy(false);}
          }}>{t('Gửi lại yêu cầu đã lưu')}</button>}
          <button className="btn btn-secondary" disabled={busy} onClick={loadAll}>{t('Tải lại danh sách')}</button>
          <button className="btn btn-secondary" disabled={busy} onClick={()=>{
            if(!window.confirm(t('Đã kiểm tra danh sách? Bỏ yêu cầu chờ không xóa phần thưởng đã tạo trên server.')))return;
            try{clearPendingReward(sessionStorage,user.id);setPendingReward(null);setPendingError(false);}catch{toast.error(t('Chưa xóa được yêu cầu đã lưu.'));}
          }}>{t('Bỏ yêu cầu chờ')}</button>
        </div>
      </div>}
      {/* Custom Rewards — Premium only */}
      <PremiumGate mode="section" feature={t("Phần thưởng tùy chỉnh")}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">{t("🎁 Phần thưởng của tôi")}</span>
          <button disabled={busy||!!pendingReward||pendingError} className="btn btn-primary btn-sm" onClick={() => setShowRewardModal(true)}>{t("+ Tạo mới")}</button>
        </div>
        <ResourceScopeNotice target={selectedReward} count={targetedResources(customRewards,selectedReward).length} kind="reward" onClear={()=>{const next=new URLSearchParams(searchParams);next.delete('reward');setSearchParams(next);}}/>
        {!selectedReward&&!customError&&<RewardHistory rewards={customRewards} timezone={user.timezone} disabled={busy}/>}
        {!customError&&progress&&customRewards.some(row=>!row.claimed)&&<RewardBudget rewards={customRewards} xp={progress.totalXp} disabled={busy}/>}
        {customError ? <div role="status"><p>{t('Không thể tải phần thưởng tùy chỉnh.')}</p><button className="btn btn-secondary" disabled={busy} onClick={loadAll}>{t('Thử lại')}</button></div> : customRewards.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <div className="empty-icon">🎁</div>
            <p>{t("Tự đặt phần thưởng để thưởng cho bản thân khi đạt đủ XP!")}</p>
            <button disabled={busy||!!pendingReward||pendingError} className="btn btn-secondary" onClick={() => setShowRewardModal(true)}>{t("Tạo phần thưởng đầu tiên")}</button>
          </div>
        ) : (
          <RewardList scoped={Boolean(selectedReward)} key={selectedReward?.id??(selectedReward?'invalid':'all')} rewards={targetedResources(customRewards,selectedReward)} xp={progress?.totalXp??0}>{visibleRewards=>(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {visibleRewards.map(r => (
              <div key={r.id} className="habit-item" style={{ padding: '0.75rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div className="habit-info">
                  <div className="habit-name">{r.name}</div>
                  <div className="habit-meta">
                    <span className="badge badge-info">{r.xpCost} XP</span>
                    {r.description && <span>{r.description}</span>}
                  </div>
                </div>
                <div className="habit-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  {r.claimed ? (
                    <>
                    <span className="badge badge-success">{t("✓ Đã nhận")}</span>
                    <button className="btn btn-secondary btn-sm" disabled={busy||!!pendingReward||pendingError} onClick={()=>{
                      try{setRewardForm(repeatRewardForm(r));setEditingReward(null);setRewardConflict(false);setLatestReward(null);setRepeatingReward(r.name);setShowRewardModal(true);}catch{toast.error(t('Không thể dùng lại phần thưởng này. Tải lại danh sách rồi thử lại.'));}
                    }}>{t('Tạo lượt thưởng mới')}</button>
                    </>
                  ) : (
                    <>
                      {progress && progress.totalXp < r.xpCost && <span>{t('Cần {count} XP nữa', { count: r.xpCost - progress.totalXp })}</span>}
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleClaimReward(r)}
                        disabled={busy || !progress || progress.totalXp < r.xpCost}
                        title={progress && progress.totalXp < r.xpCost ? t('Cần {count} XP nữa', { count: r.xpCost - progress.totalXp }) : t('Nhận thưởng')}>
                        {t('🎉 Nhận')}
                      </button>
                      <button disabled={busy} className="btn btn-secondary btn-sm" onClick={()=>{setRepeatingReward(null);setEditingReward(r);setRewardForm({name:r.name,description:r.description||'',xpCost:r.xpCost});setRewardConflict(false);setLatestReward(null);setShowRewardModal(true);}}>{t('Sửa')}</button>
                      <button disabled={busy} className="btn btn-danger btn-sm" onClick={() => handleDeleteReward(r.id)} title={t("Xóa")}>✗</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}</RewardList>
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
        <ModalOverlay onClose={closeRewardForm}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="reward-title" onClick={e => e.stopPropagation()} onKeyDown={event => {
            if (event.key === 'Escape') { event.stopPropagation(); closeRewardForm(); }
            if (event.key === 'Tab') {
              const controls = [...event.currentTarget.querySelectorAll('button, input')].filter(node => !node.matches(':disabled'));
              const first = controls[0], last = controls[controls.length - 1];
              if (!first) { event.preventDefault(); return; }
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
          }}>
            <h2 id="reward-title" className="modal-title">{t(editingReward?"Sửa phần thưởng chưa nhận":"🎁 Tạo phần thưởng")}</h2>
            {rewardConflict&&<section className="card" role="alert"><p>{t('Phần thưởng đã thay đổi. Nội dung đang sửa được giữ; xem bản mới trước khi lưu.')}</p><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={async()=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);try{const response=await api.get('/custom-rewards/'+editingReward.id);setLatestReward(response.data);}catch{toast.error(t('Không thể tải phần thưởng mới.'));}finally{inFlight.current=false;setBusy(false);}}}>{t('Xem bản phần thưởng mới')}</button>{latestReward&&<><p>{latestReward.name} · {latestReward.xpCost} XP · {t(latestReward.claimed?'✓ Đã nhận':'Chưa nhận')}</p><p style={{whiteSpace:'pre-wrap'}}>{latestReward.description}</p>{!latestReward.claimed&&<button type="button" className="btn btn-secondary btn-sm" onClick={()=>{setEditingReward(latestReward);setRewardConflict(false);setLatestReward(null);}}>{t('Giữ nội dung đang sửa và dùng bản mới làm căn cứ')}</button>}</>}</section>}
            {repeatingReward&&!editingReward&&<p>{t('Đang dùng lại nội dung “{name}”. Kiểm tra giá XP trước khi tạo. Phần thưởng đã nhận được giữ nguyên; tạo mới chưa trừ XP.',{name:repeatingReward})}</p>}
            {!editingReward&&(pendingReward||pendingError)&&<p role="alert">{t('Đóng biểu mẫu để kiểm tra và gửi lại yêu cầu đang chờ ở đầu trang.')}</p>}
            <form onSubmit={handleCreateReward} aria-busy={busy}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label htmlFor="reward-name" className="form-label">{t("Tên phần thưởng *")}</label>
                <input id="reward-name" autoFocus className="form-input" maxLength={255} value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} required placeholder={t("VD: Xem phim cuối tuần")} />
              </div>
              <div className="form-group">
                <label htmlFor="reward-description" className="form-label">{t("Mô tả")}</label>
                <input id="reward-description" className="form-input" maxLength={255} value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder={t("Chi tiết phần thưởng")} />
              </div>
              <div className="form-group">
                <label htmlFor="reward-cost" className="form-label">{t("Chi phí XP *")}</label>
                <input id="reward-cost" step="1" type="number" className="form-input" min="1" max="1000000" value={rewardForm.xpCost} onChange={e => setRewardForm({ ...rewardForm, xpCost: e.target.value })} required />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {t('XP hiện tại: {count}', { count: progress?.totalXp || 0 })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeRewardForm}>{t("Hủy")}</button>
                <button type="submit" disabled={rewardConflict||(!editingReward&&(!!pendingReward||pendingError))} className="btn btn-primary">{t(editingReward?"Lưu thay đổi":"Tạo")}</button>
              </div>
            </fieldset></form>
          </div>
        </ModalOverlay>
      )}
      {claimingReward!==null&&<RewardClaimDialog key={claimingReward} id={claimingReward} onClose={()=>setClaimingReward(null)} onBusy={value=>{inFlight.current=value;setBusy(value);}} onClaimed={async()=>{setClaimingReward(null);toast.success(t('Đã xác nhận phần thưởng.'));await loadAll();announceRewardChange();}}/>}
    </div>
  );
}
