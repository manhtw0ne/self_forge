import {removeGoalPlanPreference} from '../utils/goalPlanPreference';
import {repeatGoalForm} from '../utils/repeatGoal';
import GoalRecovery from '../components/GoalRecovery';
import GoalMilestones from '../components/GoalMilestones';
import GoalTemplatePicker from '../components/GoalTemplatePicker';
import GoalDraftPreview from '../components/GoalDraftPreview';
import {goalTemplateForm} from '../utils/goalTemplates';
import {progressPrefill} from '../utils/goalPlanActions';
import GoalCorrectionHistory from '../components/GoalCorrectionHistory';
import GoalCorrectionDialog from '../components/GoalCorrectionDialog';
import { useSearchParams } from 'react-router-dom';
import { focusedGoal } from '../utils/habitGoalLinks';
import GoalHabitPending from '../components/GoalHabitPending';
import { goalsExport } from '../utils/goalsExport';
import { downloadText } from '../utils/downloadText';
import GoalPlan from '../components/GoalPlan';
import GoalDraftDownload from '../components/GoalDraftDownload';
import { readGoalDraft, writeGoalDraft, removeGoalDraft, readGoalEditDraft, writeGoalEditDraft, removeGoalEditDraft } from '../utils/goalDraft';
import { readGoalCreation, clearGoalCreation, createGoalSafely, retryGoalCreation, matchingGoalCreations } from '../utils/pendingGoalCreate';
import ModalOverlay from '../components/ModalOverlay';
import GoalProgressDialog from '../components/GoalProgressDialog';
import { isOverdueGoal, selectGoals } from '../utils/goalList';
import { todayInTimezone } from '../utils/dates';
import { goalPayload, goalSnapshot, goalFormFrom, reviewedGoalForm } from '../utils/goalForm';
import { createLatestRequest } from '../utils/latestRequest';
import { useLanguage } from '../context/useLanguage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { useAuth } from '../context/useAuth';
import { readPendingProgress, savePendingProgress, removePendingProgress, isDefinitiveProgressRejection, confirmGoalProgress } from '../utils/pendingProgress';
import {publishAccountDataChange,subscribeAccountDataChanges} from '../utils/accountDataSync';

export default function GoalsPage() {
  const { user } = useAuth();
  return <GoalsContent key={user.id} />;
}
function GoalsContent() {
  const [searchParams,setSearchParams]=useSearchParams();
  const focusId=focusedGoal(searchParams.toString());
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sort, setSort] = useState('default');
  const [now, setNow] = useState(() => new Date());
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [repeatSource,setRepeatSource]=useState(null);
  const [editConflict, setEditConflict] = useState(false);
  const [latestEditing, setLatestEditing] = useState(null);
  const initialForm = useRef(null);
  const [historyGoal,setHistoryGoal]=useState(null);
  const [correcting,setCorrecting]=useState(null);
  const [showProgress, setShowProgress] = useState(null);
  const [progressAmount, setProgressAmount] = useState(1);
  const [form, setForm] = useState({ name: '', description: '', targetValue: 10, unit: '', deadline: '' });
  const toast = useToast();
  const requests = useRef(createLatestRequest());
  const [loadError, setLoadError] = useState(false);
  const mutationBusy = useRef(false);
  const [mutating, setMutating] = useState(false);
  const progressBusy = useRef(false);
  const { user } = useAuth();
  const [pendingCreation, setPendingCreation] = useState(() => {
    try { return readGoalCreation(sessionStorage, user.id); } catch { return { invalid: true }; }
  });
  const [goalDraft, setGoalDraft] = useState(null);
  const [editDraftBase, setEditDraftBase] = useState(null);
  const [goalDraftSaved, setGoalDraftSaved] = useState(false);
  const [goalDraftError, setGoalDraftError] = useState(false);
  const changeGoalField = (field, value) => {
    const next = { ...form, [field]: value }; setForm(next);
    try { if (editing) writeGoalEditDraft(sessionStorage, user.id, editing, next); else writeGoalDraft(sessionStorage, user.id, next); setGoalDraftSaved(true); setGoalDraftError(false); }
    catch { setGoalDraftSaved(false); setGoalDraftError(true); }
  };
  const [creationReviewed, setCreationReviewed] = useState(false);
  useEffect(() => { setCreationReviewed(false); }, [loading]);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 60000);
    window.addEventListener('focus', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
  }, []);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [storageError, setStorageError] = useState('');
  const selectedOperation = useRef(null);

  const refreshPending = useCallback(() => {
    try {
      const entries = readPendingProgress(localStorage, user.id);
      setPendingEntries(entries);
      setStorageError('');
      return entries;
    } catch {
      setStorageError('Không thể đọc dữ liệu tiến độ chờ xác nhận. Vui lòng kiểm tra quyền lưu trữ của trình duyệt trước khi thêm tiến độ.');
      return null;
    }
  }, [user.id]);

  useEffect(() => {
    refreshPending();
    const onStorage = () => refreshPending();
    window.addEventListener('storage', onStorage);

    selectedOperation.current = null;
    setShowProgress(null);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshPending]);
  const [savingProgress, setSavingProgress] = useState(false);
  const [retryProgress, setRetryProgress] = useState(false);

  const openProgress = (id, operation = null,suggestedAmount=1) => {
    const entries = refreshPending();
    if (!entries) return;
    const pending = operation ?? entries.find(entry => entry.goalId === id);
    selectedOperation.current = pending ?? null;
    setProgressAmount(progressPrefill(pending,suggestedAmount));
    setRetryProgress(Boolean(pending));
    setShowProgress(id);
  };

  const load = useCallback(() => {
    setLoadError(false);
    return requests.current.run(() => api.get('/goals'), r => setGoals(r.data),
      () => setLoadError(true), () => setLoading(false));
  }, []);
  const announceGoalsChange = () => {
    try { publishAccountDataChange(user.id, 'goals', window.localStorage); } catch { /* Cross-tab refresh is optional. */ }
  };

  useEffect(() => {
    load();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [load]);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    return subscribeAccountDataChanges(window, user.id, change => {
      if (change.resource !== 'goals') return;
      // Preserve reviewed forms and pending idempotent operations; their server snapshots
      // will still reject a stale save safely.
      if (mutationBusy.current || progressBusy.current || showModal || showProgress || correcting) return;
      void load();
    });
  }, [user.id, load, showModal, showProgress, correcting]);

  const formDirty = showModal && initialForm.current && Object.keys(form).some(key => String(form[key]) !== String(initialForm.current[key]));
  const closeForm = () => {
    if (mutationBusy.current) return;
    if (formDirty && !goalDraftSaved && !window.confirm(t('Đóng biểu mẫu và bỏ thay đổi chưa lưu?'))) return;
    setShowModal(false);
  };
  useEffect(() => {
    if (!formDirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formDirty]);

  const openCreate = () => {
    if (pendingCreation || mutationBusy.current || progressBusy.current) return;
    setRepeatSource(null);setEditing(null); setEditDraftBase(null); setEditConflict(false); setLatestEditing(null); setGoalDraftSaved(false); setGoalDraftError(false);
    try { setGoalDraft(readGoalDraft(sessionStorage, user.id)); }
    catch { setGoalDraft(null); setGoalDraftError(true); }
    const next = { name: '', description: '', targetValue: 10, unit: '', deadline: '' };
    initialForm.current = next; setForm(next);
    setShowModal(true);
  };
  const openRepeatGoal=source=>{
    if(pendingCreation||mutationBusy.current||progressBusy.current)return;
    let next,existing;
    try{next=repeatGoalForm(source);existing=readGoalDraft(sessionStorage,user.id);}catch{toast.error(t('Chưa chuẩn bị được mục tiêu tương tự. Kiểm tra bản nháp đang có trước khi thử lại.'));return;}
    if(existing&&!window.confirm(t('Có bản nháp mục tiêu trên tab này. Thay bằng bản nháp từ mục tiêu đã kết thúc?')))return;
    setEditing(null);setEditDraftBase(null);setEditConflict(false);setLatestEditing(null);setGoalDraft(null);setRepeatSource(source.name);setGoalDraftSaved(false);setGoalDraftError(false);
    initialForm.current={name:'',description:'',targetValue:10,unit:'',deadline:''};setForm(next);setShowModal(true);
    try{writeGoalDraft(sessionStorage,user.id,next);setGoalDraftSaved(true);}catch{setGoalDraftError(true);}
  };
  const applyGoalTemplate=id=>{
    if(editing||goalDraft||pendingCreation||mutationBusy.current||progressBusy.current)return;
    if(formDirty&&!window.confirm(t('Thay bản nháp mục tiêu đang nhập bằng mẫu đã chọn?')))return;
    try{const next=goalTemplateForm(id,todayInTimezone(user.timezone),t);setRepeatSource(null);setForm(next);try{writeGoalDraft(sessionStorage,user.id,next);setGoalDraftSaved(true);setGoalDraftError(false);}catch{setGoalDraftSaved(false);setGoalDraftError(true);}}catch{toast.error(t('Chưa điền được mẫu mục tiêu. Kiểm tra ngày tài khoản rồi thử lại.'));}
  };
  const openEdit = (goal,proposedDeadline=null) => {
    if (mutationBusy.current || progressBusy.current) return;
    const pending = refreshPending();
    if (!pending) return;
    if (pending.some(entry => entry.goalId === goal.id)) {
      toast.info(t('Hãy xác nhận tiến độ đang chờ trước khi sửa mục tiêu.'));
      return;
    }
    setRepeatSource(null);setEditing(goal); setEditConflict(false); setLatestEditing(null); setGoalDraftSaved(false); setGoalDraftError(false);
    try { const draft = readGoalEditDraft(sessionStorage, user.id, goal.id); setGoalDraft(draft?.form || null); setEditDraftBase(draft?.expected || null); }
    catch { setGoalDraft(null); setEditDraftBase(null); setGoalDraftError(true); }
    const next = { name: goal.name, description: goal.description || '', targetValue: goal.targetValue,
      unit: goal.unit || '', deadline: goal.deadline || '' };
    initialForm.current = next; setForm(proposedDeadline?{...next,deadline:proposedDeadline}:next);
    setShowModal(true);
  };
  const handleRestore = async id => {
    if (mutationBusy.current || progressBusy.current) return;
    mutationBusy.current = true; setMutating(true); requests.current.invalidate();
    try {
      const goal = goals.find(item => item.id === id);
      if (!goal) { await load(); return; }
      await api.post('/goals/' + id + '/restore', goalSnapshot(goal));
      toast.success(t('Đã khôi phục mục tiêu và giữ nguyên tiến độ.'));
      await load();
      announceGoalsChange();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      await load();
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (editConflict || goalDraft || (!editing && pendingCreation) || mutationBusy.current || progressBusy.current) return;
    let payload;
    try { payload = goalPayload(form, Boolean(editing)); }
    catch (err) { toast.error(t(err.message)); return; }
    if (editing?.status === 'ACTIVE' && payload.targetValue <= editing.currentValue &&
        !window.confirm(t('Chỉ tiêu mới không lớn hơn tiến độ hiện tại. Mục tiêu sẽ hoàn thành. Tiếp tục?'))) return;
    mutationBusy.current = true; setMutating(true);
    requests.current.invalidate();
    try {
      if (editing) {
        await api.patch('/goals/' + editing.id, { ...payload, expected: goalSnapshot(editing) });
        try { removeGoalEditDraft(sessionStorage, user.id, editing.id); setGoalDraftSaved(false); setGoalDraftError(false); }
        catch { toast.info(t('Mục tiêu đã lưu; kiểm tra danh sách trước khi dùng lại bản nháp chưa dọn được.')); }
      }
      else {
        const result = await createGoalSafely(sessionStorage, user.id, payload, body => api.post('/goals', body));
        setPendingCreation(result.pending);
        try { removeGoalDraft(sessionStorage, user.id); setGoalDraft(null); setGoalDraftSaved(false); setGoalDraftError(false); }
        catch { toast.info(t('Mục tiêu đã lưu; kiểm tra danh sách trước khi dùng lại bản nháp chưa dọn được.')); }
      }
      toast.success(t(editing ? 'Đã cập nhật mục tiêu.' : '🎯 Đã tạo mục tiêu!'));
      setEditing(null);
      setShowModal(false);
      setForm({ name: '', description: '', targetValue: 10, unit: '', deadline: '' });
      await load();
      announceGoalsChange();
    } catch (err) {
      if (editing && err.response?.status === 409) { setEditConflict(true); setLatestEditing(null); }
      if (!editing) {
        let pending;
        try { pending = readGoalCreation(sessionStorage, user.id); } catch { pending = { invalid: true }; }
        setPendingCreation(pending);
        if (pending) { setShowModal(false); await load(); }
      }
      toast.error(t(err.response?.data?.detail || (editing ? 'Có lỗi xảy ra' : err.message === 'Chưa lưu được yêu cầu trên tab. Mục tiêu chưa được gửi.' ? err.message : 'Chưa xác nhận được việc tạo mục tiêu. Kiểm tra danh sách trước khi tạo lại.')));
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  const retryPendingCreation = async () => {
    if (!pendingCreation?.payload?.requestId || pendingCreation.confirmed || mutationBusy.current || progressBusy.current) return;
    mutationBusy.current = true; setMutating(true); requests.current.invalidate();
    try {
      const result = await retryGoalCreation(sessionStorage, user.id, body => api.post('/goals', body));
      setPendingCreation(result.pending);
      toast.success(t('Đã xác nhận mục tiêu tạo trước đó.'));
      await load();
      announceGoalsChange();
    } catch (err) {
      let pending;
      try { pending = readGoalCreation(sessionStorage, user.id); } catch { pending = { invalid: true }; }
      setPendingCreation(pending);
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được việc tạo mục tiêu. Bạn có thể thử lại đúng yêu cầu này hoặc kiểm tra danh sách.'));
      await load();
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  const inspectLatestGoal = async () => {
    if (!editing || mutationBusy.current || progressBusy.current) return;
    mutationBusy.current = true; setMutating(true); setLatestEditing(null);
    try {
      const { data } = await api.get('/goals');
      const latest = data.find(goal => goal.id === editing.id);
      if (!latest) { toast.error(t('Mục tiêu không còn trong danh sách. Nội dung đang sửa vẫn được giữ.')); return; }
      setLatestEditing(latest);
    } catch { toast.error(t('Chưa tải được mục tiêu mới. Nội dung đang sửa vẫn được giữ.')); }
    finally { mutationBusy.current = false; setMutating(false); }
  };
  const acceptLatestGoal = keepInput => {
    if (!latestEditing || mutationBusy.current) return;
    const next = reviewedGoalForm(form, latestEditing, keepInput);
    setForm(next);
    try { writeGoalEditDraft(sessionStorage, user.id, latestEditing, next); setGoalDraftSaved(true); setGoalDraftError(false); }
    catch { setGoalDraftSaved(false); setGoalDraftError(true); }
    initialForm.current = goalFormFrom(latestEditing);
    setEditing(latestEditing); setGoals(current => current.map(goal => goal.id === latestEditing.id ? latestEditing : goal));
    setEditConflict(false); setLatestEditing(null);
  };

  const handleProgress = async (id) => {
    if (progressBusy.current || mutationBusy.current) return;
    const amount = Number(progressAmount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 2147483647) {
      toast.error(t('Số lượng phải là số nguyên từ 1 đến 2147483647.'));
      return;
    }
    let operation;
    try {
      const entries = readPendingProgress(localStorage, user.id);
      operation = selectedOperation.current ?? entries.find(entry => entry.goalId === id)
        ?? { goalId: id, amount, requestId: crypto.randomUUID() };
      savePendingProgress(localStorage, user.id, operation);
      selectedOperation.current = operation;
      setProgressAmount(operation.amount);
      refreshPending();
    } catch {
      toast.error(t('Không thể lưu thao tác an toàn trên thiết bị. Chưa gửi tiến độ; hãy kiểm tra quyền lưu trữ của trình duyệt.'));
      return;
    }
    requests.current.invalidate();
    progressBusy.current = true;
    setSavingProgress(true);
    setRetryProgress(true);
    try {
      const result = await confirmGoalProgress(() => api.post(`/goals/${id}/progress`, operation),
        () => removePendingProgress(localStorage, user.id, operation.requestId));
      refreshPending();
      setGoals(current => current.map(goal => goal.id === id ? result.response.data : goal));
      announceGoalsChange();
      if (result.cleanupFailed) toast.info(t('Tiến độ đã lưu trên máy chủ, nhưng chưa dọn được yêu cầu trên thiết bị. Thử lại cùng mã sẽ không cộng trùng.'));
      else { selectedOperation.current = null; toast.success(t('Đã lưu tiến độ.')); }
      setShowProgress(null);
      setProgressAmount(1);
      setRetryProgress(result.cleanupFailed);
    } catch (err) {
      const status = err.response?.status;
      if (isDefinitiveProgressRejection(status)) {
        try {
          removePendingProgress(localStorage, user.id, operation.requestId);
          selectedOperation.current = null;
          refreshPending();
        } catch {
          toast.error(t('Không thể cập nhật dữ liệu chờ trên thiết bị.'));
        }
        setRetryProgress(false);
      }
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Nhấn Thử lại để kiểm tra và lưu an toàn.'));
    } finally {
      progressBusy.current = false;
      setSavingProgress(false);
    }
  };
  const handleAbandon = async (id) => {
    if (mutationBusy.current || progressBusy.current || !window.confirm(t('Hủy mục tiêu này? Tiến độ đã ghi vẫn được giữ.'))) return;
    mutationBusy.current = true; setMutating(true);
    requests.current.invalidate();
    try {
      const goal = goals.find(item => item.id === id);
      if (!goal) { await load(); return; }
      await api.post(`/goals/${id}/abandon`, goalSnapshot(goal));
      toast.info(t('Đã hủy mục tiêu'));
      await load();
      announceGoalsChange();
    } catch (error) {
      toast.error(t(error.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      await load();
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  const handleDelete = async (id) => {
    if (mutationBusy.current || progressBusy.current || !window.confirm(t('Xóa vĩnh viễn mục tiêu này? Không thể hoàn tác.'))) return;
    mutationBusy.current = true; setMutating(true);
    requests.current.invalidate();
    try {
      const goal = goals.find(item => item.id === id);
      if (!goal) { await load(); return; }
      await api.delete(`/goals/${id}`, { data: goalSnapshot(goal) });
      try{removeGoalPlanPreference(localStorage,user.id,id);}catch{/* A local preference must not change confirmed server deletion. */}
      toast.info(t('Đã xóa mục tiêu'));
      await load();
      announceGoalsChange();
    } catch (error) {
      toast.error(t(error.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      await load();
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const today = todayInTimezone(user.timezone, now);
  const visibleGoals = selectGoals(goals, { query, status: statusFilter, sort, today, goalId:focusId });
  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  const abandonedGoals = goals.filter(g => g.status === 'ABANDONED');

  const visibleActive = visibleGoals.filter(g => g.status === 'ACTIVE');
  const visibleCompleted = visibleGoals.filter(g => g.status === 'COMPLETED');
  const visibleAbandoned = visibleGoals.filter(g => g.status === 'ABANDONED');

  const creationMatches = matchingGoalCreations(goals, pendingCreation);
  const statusBadge = (status) => {
    if (status === 'COMPLETED') return <span className="badge badge-success">{t('✓ Hoàn thành')}</span>;
    if (status === 'ABANDONED') return <span className="badge badge-danger">{t('✗ Đã hủy')}</span>;
    return <span className="badge badge-info">{t('Đang thực hiện')}</span>;
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('🎯 Mục tiêu dài hạn')}</h1>
          <p>{t('Đặt và theo dõi các mục tiêu lớn')}</p>
        </div>
        <button className="btn btn-primary" disabled={mutating || savingProgress || !!pendingCreation} onClick={openCreate}>{t('+ Tạo mục tiêu')}</button>
      </div>

      {focusId!==null&&<section className="card" style={{marginBottom:'1rem'}} role="status"><p>{t(goals.some(g=>g.id===focusId)?'Đang xem mục tiêu được mở từ thói quen.':'Mục tiêu liên quan không còn trong danh sách của tài khoản.')}</p>
       <button className="btn btn-secondary btn-sm" onClick={()=>{setQuery('');setStatusFilter('ALL');setSort('default');setSearchParams(previous=>{const next=new URLSearchParams(previous);next.delete('goal');return next;},{replace:true});}}>{t('Xem tất cả mục tiêu')}</button>
      </section>}
      {loadError && <div className="card" role="alert" style={{ marginBottom: '1rem' }}>
        <p>{t('Không thể tải mục tiêu.')}</p>
        <button className="btn btn-secondary" disabled={mutating || savingProgress} onClick={load}>{t('Thử lại')}</button>
      </div>}
      {storageError && <div className="card" role="alert" style={{ marginBottom: '1rem' }}>{t(storageError)}</div>}
      {pendingEntries.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }} aria-live="polite">
          <h2 className="card-title">{t('Tiến độ chờ xác nhận')}</h2>
          <p>{t('Thao tác trước có thể đã được lưu. Chọn Thử lại để xác nhận mà không cộng trùng.')}</p>
          {pendingEntries.map(entry => (
            <div key={entry.requestId} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.75rem' }}>
              <span>{goals.find(goal => goal.id === entry.goalId)?.name ?? t('Mục tiêu chưa tải được')}: +{entry.amount}</span>
              <button className="btn btn-secondary btn-sm" disabled={savingProgress}
                onClick={() => openProgress(entry.goalId, entry)}>{t('Thử lại')}</button>
            </div>
          ))}
        </div>
      )}
      {pendingCreation && <section className="card" role="status" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title">{t('Yêu cầu tạo mục tiêu cần kiểm tra')}</h2>
        <p>{t(pendingCreation.confirmed ? 'Mục tiêu đã được tạo, nhưng tab chưa dọn được yêu cầu. Kiểm tra danh sách trước khi tạo mới.' : pendingCreation.payload?.requestId ? 'Yêu cầu trước có thể đã được lưu. Bạn có thể gửi lại đúng yêu cầu này an toàn; hệ thống sẽ không tạo trùng.' : 'Yêu cầu trước có thể đã được lưu. Không gửi lại tự động để tránh tạo trùng.')}</p>
        {pendingCreation.invalid && <p>{t('Không đọc được yêu cầu đang chờ. Kiểm tra danh sách trước khi cho phép tạo mới.')}</p>}
        {pendingCreation.payload && <div>
          <p style={{ overflowWrap: 'anywhere' }}>{pendingCreation.payload.name} · {pendingCreation.payload.targetValue} {pendingCreation.payload.unit || ''}</p>
          {pendingCreation.payload.deadline && <p>{t('Hạn chót')}: {pendingCreation.payload.deadline}</p>}
          {pendingCreation.payload.description && <details><summary>{t('Xem mô tả yêu cầu đang chờ')}</summary><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{pendingCreation.payload.description}</p></details>}
          {!loading && !loadError && <div style={{ marginTop: '0.75rem' }}>
            <p>{t('Mục tiêu trùng thông tin chỉ là gợi ý đối chiếu, chưa chứng minh yêu cầu trước đã được lưu.')}</p>
            {creationMatches.length ? <ul style={{ paddingLeft: '1.25rem' }}>{creationMatches.map(goal => <li key={goal.id} style={{ marginBottom: '0.5rem', overflowWrap: 'anywhere' }}>
              {goal.name} · {goal.currentValue}/{goal.targetValue} {goal.unit || ''} · {statusBadge(goal.status)}
            </li>)}</ul> : <p>{t('Chưa thấy mục tiêu trùng toàn bộ thông tin. Yêu cầu trước vẫn có thể đã được lưu rồi chỉnh sửa.')}</p>}
          </div>}
        </div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" disabled={loading || mutating || savingProgress} onClick={load}>{t('Tải lại')}</button>
          {pendingCreation.payload?.requestId && !pendingCreation.confirmed && !pendingCreation.invalid && <button className="btn btn-primary btn-sm" disabled={loading || mutating || savingProgress} onClick={retryPendingCreation}>{t('Gửi lại đúng yêu cầu')}</button>}
        </div>
        <label style={{ display: 'block', margin: '0.75rem 0' }}><input type="checkbox" checked={creationReviewed} disabled={loading || loadError || mutating || savingProgress} onChange={event => setCreationReviewed(event.target.checked)} /> {t('Tôi đã kiểm tra danh sách và muốn cho phép tạo mục tiêu mới.')}</label>
        <button className="btn btn-secondary" disabled={!creationReviewed || loading || loadError || mutating || savingProgress} onClick={() => {
          try { clearGoalCreation(sessionStorage, user.id); setPendingCreation(null); setCreationReviewed(false); }
          catch { toast.error(t('Không thể dọn yêu cầu tạo mục tiêu trên tab này.')); }
        }}>{t('Cho phép tạo mục tiêu mới')}</button>
      </section>}
      <GoalHabitPending key={user.id} goals={goals}/>
      {/* Stats */}
      <div className="card-grid card-grid-3 goal-summary" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card slide-in">
          <div className="stat-label">{t('Đang thực hiện')}</div>
          <div className="stat-value">{activeGoals.length}</div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-label">{t('Đã hoàn thành')}</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{completedGoals.length}</div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-label">{t('Tỷ lệ thành công')}</div>
          <div className="stat-value">
            {goals.length > 0 ? Math.round(completedGoals.length / (completedGoals.length + abandonedGoals.length || 1) * 100) : 0}%
          </div>
        </div>
      </div>

      {!loadError && goals.length > 0 && <section className="card" style={{ marginBottom: '1.5rem' }} aria-label={t('Tìm và lọc mục tiêu')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '2 1 220px' }}><label className="form-label" htmlFor="goal-search">{t('Tìm mục tiêu')}</label>
            <input id="goal-search" type="search" className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Tên, mô tả hoặc đơn vị…')} /></div>
          <div style={{ flex: '1 1 160px' }}><label className="form-label" htmlFor="goal-status">{t('Trạng thái')}</label>
            <select id="goal-status" className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {[['ALL', 'Tất cả'], ['ACTIVE', 'Đang thực hiện'], ['OVERDUE', 'Quá hạn'], ['DUE_SOON', 'Đến hạn trong 7 ngày'], ['COMPLETED', 'Đã hoàn thành'], ['ABANDONED', 'Mục tiêu đã hủy']].map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select></div>
          <div style={{ flex: '1 1 160px' }}><label className="form-label" htmlFor="goal-sort">{t('Sắp xếp mục tiêu')}</label>
            <select id="goal-sort" className="form-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="default">{t('Thứ tự mặc định')}</option><option value="deadline">{t('Hạn gần nhất trước')}</option><option value="progress">{t('Tiến độ cao nhất trước')}</option>
            </select></div>
        </div>
        <p role="status" style={{ marginTop: '0.75rem' }}>{t('Hiển thị {count}/{total} mục tiêu', { count: visibleGoals.length, total: goals.length })}</p>
        {(query || statusFilter !== 'ALL' || sort !== 'default') && <button className="btn btn-secondary btn-sm" onClick={() => { setQuery(''); setStatusFilter('ALL'); setSort('default'); }}>{t('Đặt lại bộ lọc')}</button>}
        <div style={{ marginTop: '0.75rem' }}><button type="button" className="btn btn-secondary btn-sm" disabled={loading || loadError || mutating || savingProgress || !visibleGoals.length} onClick={() => {
          try { const result = goalsExport(visibleGoals, today, t); downloadText(result.text, result.filename); }
          catch { toast.error(t('Không thể tải danh sách mục tiêu. Hãy tải lại dữ liệu rồi thử lại.')); }
        }}>{t('Tải danh sách đang xem (.txt)')}</button>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>{t('Chỉ gồm mục tiêu đã tải và phù hợp bộ lọc, không gồm bản nháp.')}</p></div>
        {visibleGoals.length === 0 && <p>{t('Không có mục tiêu phù hợp. Thử thay đổi bộ lọc hoặc từ khóa.')}</p>}
      </section>}

      {/* Active Goals */}
      {!loadError && goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>{t('Chưa có mục tiêu nào. Hãy đặt mục tiêu đầu tiên!')}</p>
          <button className="btn btn-primary" disabled={mutating || savingProgress} onClick={openCreate}>{t('Tạo mục tiêu')}</button>
        </div>
      ) : (
        <>
          {visibleActive.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <span className="card-title">{t('🔥 Đang thực hiện ({count})', { count: visibleActive.length })}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {visibleActive.map((g, i) => (
                  <div key={g.id} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s`, flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="habit-name">{g.name}</div>
                        <div className="habit-meta">
                          <span>{g.currentValue}/{g.targetValue} {g.unit}</span>
                          {g.deadline && <span>{t('📅 Hạn: {date}', { date: g.deadline })}</span>}
                          {statusBadge(g.status)}
                          {isOverdueGoal(g, today) && <span className="badge badge-danger">{t('Quá hạn')}</span>}
                        </div>
                        {g.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{g.description}</div>}
                      </div>
                      <div className="habit-actions" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" disabled={mutating || savingProgress} onClick={() => openEdit(g)}>{t('Sửa')}</button>
                        <button className="btn btn-secondary btn-sm" disabled={mutating||savingProgress||!!storageError||pendingEntries.some(entry=>entry.goalId===g.id)} onClick={()=>{const pending=refreshPending();if(pending&&!pending.some(entry=>entry.goalId===g.id))setCorrecting(g);}}>{t('Điều chỉnh số lượng')}</button>
                        <button className="btn btn-secondary btn-sm" disabled={mutating||savingProgress} onClick={()=>setHistoryGoal(g)}>{t('Lịch sử tiến độ')}</button>
                        <button className="btn btn-primary btn-sm" disabled={mutating || savingProgress} onClick={() => openProgress(g.id)}>{t('Thêm tiến độ')}</button>
                        <button className="btn btn-danger btn-sm" disabled={mutating || savingProgress} onClick={() => handleAbandon(g.id)} aria-label={t('Hủy mục tiêu {name}', { name: g.name })} title={t('Hủy')}>✗</button>
                      </div>
                    </div>
                    <div className="progress-bar" style={{ height: '8px' }}>
                      <div className={`progress-fill ${g.progress >= 0.8 ? 'success' : g.progress >= 0.5 ? '' : 'warning'}`}
                        style={{ width: `${Math.min(g.progress * 100, 100)}%` }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {t('{percent}% hoàn thành', { percent: Math.round(g.progress * 100) })}
                    </div>
                    <GoalRecovery goal={g} today={today} disabled={mutating||savingProgress||!!storageError||pendingEntries.some(entry=>entry.goalId===g.id)} onEdit={deadline=>openEdit(g,deadline)} onAbandon={()=>handleAbandon(g.id)}/>
                    <GoalMilestones goal={g} disabled={mutating||savingProgress||!!storageError||pendingEntries.some(entry=>entry.goalId===g.id)} onRecord={amount=>openProgress(g.id,null,amount)}/>
                    <GoalPlan key={g.id+':'+(g.unit||'')} goal={g} owner={user.id} today={today} busy={mutating||savingProgress} blockedProgress={!!storageError||pendingEntries.some(entry=>entry.goalId===g.id)} onRecord={amount=>openProgress(g.id,null,amount)} onProposeDeadline={deadline=>openEdit(g,deadline)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {visibleCompleted.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <span className="card-title">{t('✅ Đã hoàn thành ({count})', { count: visibleCompleted.length })}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {visibleCompleted.map(g => (
                  <div key={g.id} className="habit-item" style={{ opacity: 0.8, padding: '0.75rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="habit-info">
                      <div className="habit-name" style={{ textDecoration: 'line-through' }}>{g.name}</div>
                      <div className="habit-meta">
                        <span>{g.currentValue}/{g.targetValue} {g.unit}</span>
                        {statusBadge(g.status)}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" disabled={mutating||savingProgress||!!storageError||pendingEntries.some(entry=>entry.goalId===g.id)} onClick={()=>{const pending=refreshPending();if(pending&&!pending.some(entry=>entry.goalId===g.id))setCorrecting(g);}}>{t('Điều chỉnh số lượng')}</button>
                        <button className="btn btn-secondary btn-sm" disabled={mutating||savingProgress} onClick={()=>setHistoryGoal(g)}>{t('Lịch sử tiến độ')}</button>
                    <button className="btn btn-secondary btn-sm" disabled={mutating || savingProgress} onClick={() => openEdit(g)}>{t('Sửa')}</button>
                    <button className="btn btn-secondary btn-sm" disabled={mutating||savingProgress||!!pendingCreation} onClick={()=>openRepeatGoal(g)}>{t('Tạo mục tiêu tương tự')}</button>
                    <button className="btn btn-danger btn-sm" disabled={mutating || savingProgress} onClick={() => handleDelete(g.id)} aria-label={t('Xóa mục tiêu {name}', { name: g.name })} title={t('Xóa')}>🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {visibleAbandoned.length > 0 && <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">{t('Mục tiêu đã hủy')}</h2>
        {visibleAbandoned.map(goal => <div key={goal.id} className="habit-item" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="habit-info"><div className="habit-name">{goal.name}</div>
            <div className="habit-meta">{goal.currentValue}/{goal.targetValue} {goal.unit} {statusBadge(goal.status)}</div>
          </div>
          <button className="btn btn-secondary btn-sm" disabled={mutating || savingProgress} onClick={() => openEdit(goal)}>{t('Sửa')}</button>
          <button className="btn btn-secondary btn-sm" disabled={mutating||savingProgress} onClick={()=>setHistoryGoal(goal)}>{t('Lịch sử tiến độ')}</button>
          <button className="btn btn-secondary btn-sm" disabled={mutating||savingProgress||!!pendingCreation} onClick={()=>openRepeatGoal(goal)}>{t('Tạo mục tiêu tương tự')}</button>
          <button className="btn btn-primary btn-sm" disabled={mutating || savingProgress} onClick={() => handleRestore(goal.id)}>{t('Khôi phục')}</button>
          <button className="btn btn-danger btn-sm" disabled={mutating || savingProgress}
            onClick={() => handleDelete(goal.id)}>{t('Xóa')}</button>
        </div>)}
      </section>}

      {historyGoal&&<GoalCorrectionHistory goal={historyGoal} onClose={()=>setHistoryGoal(null)}/>}
      {correcting&&<GoalCorrectionDialog goal={correcting} onClose={()=>setCorrecting(null)} onSaved={saved=>{setGoals(current=>current.map(goal=>goal.id===saved.id?saved:goal));setCorrecting(null);announceGoalsChange();toast.success(t('Đã điều chỉnh số lượng mục tiêu.'));}}/>}
      {showProgress && <GoalProgressDialog goal={goals.find(goal => goal.id === showProgress)}
        amount={progressAmount} onAmount={setProgressAmount} saving={savingProgress} retry={retryProgress}
        onClose={() => { if (!progressBusy.current) setShowProgress(null); }} onSubmit={() => handleProgress(showProgress)} />}

      {/* Create Modal */}
      {showModal && (
        <ModalOverlay onClose={closeForm}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="goal-form-title" onKeyDown={e => {
            if (e.key === 'Escape') { e.stopPropagation(); closeForm(); }
            if (e.key === 'Tab') {
              const inputs = [...e.currentTarget.querySelectorAll('button, input, textarea, select')].filter(node => !node.matches(':disabled'));
              const first = inputs[0], last = inputs[inputs.length - 1];
              if (!first) { e.preventDefault(); return; }
              if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
              else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
          }} onClick={e => e.stopPropagation()}>
            <h2 id="goal-form-title" className="modal-title">{t(editing ? 'Sửa mục tiêu' : '🎯 Tạo mục tiêu mới')}</h2>
            {!editing&&repeatSource&&<section className="card" role="status"><p>{t('Bản nháp mới từ mục tiêu: {name}',{name:repeatSource})}</p><p>{t('Chỉ sao chép tên, mô tả, chỉ tiêu và đơn vị. Tiến độ mục tiêu mới bắt đầu từ 0; chọn lại hạn chót rồi xác nhận tạo. Mục tiêu cũ và lịch sử được giữ nguyên.')}</p></section>}
            <form onSubmit={handleCreate} aria-busy={mutating}>
              {editing && editing.status !== 'ACTIVE' && <p>{t('Chỉ tiêu của mục tiêu đã kết thúc được giữ nguyên. Bạn vẫn có thể sửa tên, mô tả và hạn chót.')}</p>}
              {editing && editConflict && <section className="card" role="alert" style={{ marginBottom: '1rem' }}>
                <p>{t('Mục tiêu trên máy chủ đã thay đổi. Nội dung đang sửa được giữ; xem bản mới trước khi lưu tiếp.')}</p>
                <button type="button" className="btn btn-secondary" disabled={mutating} onClick={inspectLatestGoal}>{t('Xem mục tiêu mới')}</button>
                {latestEditing && <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ overflowWrap: 'anywhere' }}>{latestEditing.name} · {latestEditing.currentValue}/{latestEditing.targetValue} {latestEditing.unit || ''} · {statusBadge(latestEditing.status)}</p>
                  <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{latestEditing.description}</p>
                  {latestEditing.deadline && <p>{t('Hạn chót')}: {latestEditing.deadline}</p>}
                  {latestEditing.status !== 'ACTIVE' && <p>{t('Mục tiêu đã kết thúc. Khi giữ nội dung đang sửa, chỉ tiêu sẽ dùng giá trị mới trên máy chủ.')}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary" disabled={mutating} onClick={() => acceptLatestGoal(false)}>{t('Dùng mục tiêu mới')}</button>
                    <button type="button" className="btn btn-primary" disabled={mutating} onClick={() => acceptLatestGoal(true)}>{t('Giữ nội dung đang sửa để lưu tiếp')}</button>
                  </div>
                </div>}
              </section>}
              {goalDraft && <section className="card" role="status" style={{ marginBottom: '1rem' }}>
                <p>{t(editing ? 'Có bản nháp sửa mục tiêu trên tab này. Khôi phục sẽ kiểm tra lại bản gốc trước khi lưu.' : 'Có bản nháp tạo mục tiêu trên tab này. Khôi phục chỉ điền biểu mẫu, chưa tạo mục tiêu.')}</p>
                <p style={{ overflowWrap: 'anywhere' }}>{goalDraft.name}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" disabled={mutating} onClick={() => { setForm(goalDraft); if (editing && editDraftBase) { setEditing(current => ({ ...current, ...editDraftBase })); initialForm.current = goalFormFrom(editDraftBase); } setGoalDraft(null); setEditDraftBase(null); setGoalDraftSaved(true); }}>{t('Khôi phục bản nháp')}</button>
                  <button type="button" className="btn btn-secondary" disabled={mutating} onClick={() => {
                    if (!window.confirm(t('Xóa bản nháp mục tiêu trên tab này? Mục tiêu trên máy chủ không thay đổi.'))) return;
                    try { if (editing) removeGoalEditDraft(sessionStorage, user.id, editing.id); else removeGoalDraft(sessionStorage, user.id); setGoalDraft(null); setEditDraftBase(null); setGoalDraftError(false); }
                    catch { setGoalDraftError(true); }
                  }}>{t('Xóa bản nháp')}</button>
                </div>
              </section>}
              {goalDraftSaved && <p role="status">{t(editing ? 'Đã giữ bản nháp chỉnh sửa trên tab này — chưa lưu lên máy chủ.' : 'Đã giữ bản nháp trên tab này — chưa tạo mục tiêu.')}</p>}
              {goalDraftError && <p role="alert">{t('Không thể giữ bản nháp mục tiêu. Sao chép nội dung trước khi rời trang.')}</p>}
              <fieldset disabled={mutating || !!goalDraft} style={{ border: 0, padding: 0, minWidth: 0 }}>
              {!editing&&<GoalTemplatePicker onApply={applyGoalTemplate} disabled={mutating||Boolean(goalDraft)||Boolean(pendingCreation)}/>}
              <div className="form-group">
                <label htmlFor="goal-name" className="form-label">{t('Tên mục tiêu *')}</label>
                <input readOnly={editConflict} id="goal-name" autoFocus maxLength={255} className="form-input" value={form.name} onChange={e => changeGoalField('name', e.target.value)} required placeholder={t('VD: Đọc 24 cuốn sách trong năm')} />
              </div>
              <div className="form-group">
                <label htmlFor="goal-description" className="form-label">{t('Mô tả')}</label>
                <textarea readOnly={editConflict} id="goal-description" maxLength={255} className="form-textarea" value={form.description} onChange={e => changeGoalField('description', e.target.value)} placeholder={t('Chi tiết về mục tiêu')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="goal-target" className="form-label">{t('Số lượng mục tiêu *')}</label>
                  <input readOnly={editConflict} id="goal-target" type="number" className="form-input" min="1" max="2147483647" step="1" disabled={Boolean(editing && editing.status !== 'ACTIVE')} value={form.targetValue} onChange={e => changeGoalField('targetValue', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="goal-unit" className="form-label">{t('Đơn vị')}</label>
                  <input readOnly={editConflict} id="goal-unit" maxLength={255} className="form-input" value={form.unit} onChange={e => changeGoalField('unit', e.target.value)} placeholder={t('VD: cuốn, km, buổi')} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="goal-deadline" className="form-label">{t('Hạn chót')}</label>
                <input readOnly={editConflict} id="goal-deadline" type="date" className="form-input" value={form.deadline} onChange={e => changeGoalField('deadline', e.target.value)} />
              </div>
              </fieldset>
              {!editing&&<GoalDraftPreview form={form} today={todayInTimezone(user.timezone)}/>}
              <GoalDraftDownload form={goalDraft || form} timezone={user.timezone} disabled={mutating} editing={Boolean(editing)} />
              <div className="modal-actions">
                <button type="button" disabled={mutating} className="btn btn-secondary" onClick={closeForm}>{t('Hủy')}</button>
                <button type="submit" disabled={mutating || !!goalDraft || editConflict} className="btn btn-primary">{t(mutating ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo')}</button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
