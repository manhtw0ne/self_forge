import { goalPayload } from '../utils/goalForm';
import { createLatestRequest } from '../utils/latestRequest';
import { useLanguage } from '../context/useLanguage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { useAuth } from '../context/useAuth';
import { readPendingProgress, savePendingProgress, removePendingProgress, isDefinitiveProgressRejection } from '../utils/pendingProgress';

export default function GoalsPage() {
  const { t } = useLanguage();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const initialForm = useRef(null);
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

  const openProgress = (id, operation = null) => {
    const entries = refreshPending();
    if (!entries) return;
    const pending = operation ?? entries.find(entry => entry.goalId === id);
    selectedOperation.current = pending ?? null;
    setProgressAmount(pending?.amount ?? 1);
    setRetryProgress(Boolean(pending));
    setShowProgress(id);
  };

  const load = useCallback(() => {
    setLoadError(false);
    return requests.current.run(() => api.get('/goals'), r => setGoals(r.data),
      () => setLoadError(true), () => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [load]);

  const formDirty = showModal && initialForm.current && Object.keys(form).some(key => String(form[key]) !== String(initialForm.current[key]));
  const closeForm = () => {
    if (mutationBusy.current) return;
    if (formDirty && !window.confirm(t('Đóng biểu mẫu và bỏ thay đổi chưa lưu?'))) return;
    setShowModal(false);
  };
  useEffect(() => {
    if (!formDirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formDirty]);

  const openCreate = () => {
    if (mutationBusy.current || progressBusy.current) return;
    setEditing(null);
    const next = { name: '', description: '', targetValue: 10, unit: '', deadline: '' };
    initialForm.current = next; setForm(next);
    setShowModal(true);
  };
  const openEdit = goal => {
    if (mutationBusy.current || progressBusy.current) return;
    const pending = refreshPending();
    if (!pending) return;
    if (pending.some(entry => entry.goalId === goal.id)) {
      toast.info(t('Hãy xác nhận tiến độ đang chờ trước khi sửa mục tiêu.'));
      return;
    }
    setEditing(goal);
    const next = { name: goal.name, description: goal.description || '', targetValue: goal.targetValue,
      unit: goal.unit || '', deadline: goal.deadline || '' };
    initialForm.current = next; setForm(next);
    setShowModal(true);
  };
  const handleRestore = async id => {
    if (mutationBusy.current || progressBusy.current) return;
    mutationBusy.current = true; setMutating(true); requests.current.invalidate();
    try {
      await api.post('/goals/' + id + '/restore');
      toast.success(t('Đã khôi phục mục tiêu và giữ nguyên tiến độ.'));
      await load();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      await load();
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (mutationBusy.current || progressBusy.current) return;
    let payload;
    try { payload = goalPayload(form, Boolean(editing)); }
    catch (err) { toast.error(t(err.message)); return; }
    if (editing?.status === 'ACTIVE' && payload.targetValue <= editing.currentValue &&
        !window.confirm(t('Chỉ tiêu mới không lớn hơn tiến độ hiện tại. Mục tiêu sẽ hoàn thành. Tiếp tục?'))) return;
    mutationBusy.current = true; setMutating(true);
    requests.current.invalidate();
    try {
      if (editing) await api.patch('/goals/' + editing.id, payload);
      else await api.post('/goals', payload);
      toast.success(t(editing ? 'Đã cập nhật mục tiêu.' : '🎯 Đã tạo mục tiêu!'));
      setEditing(null);
      setShowModal(false);
      setForm({ name: '', description: '', targetValue: 10, unit: '', deadline: '' });
      await load();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { mutationBusy.current = false; setMutating(false); }
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
      const response = await api.post(`/goals/${id}/progress`, operation);
      removePendingProgress(localStorage, user.id, operation.requestId);
      refreshPending();
      setGoals(current => current.map(goal => goal.id === id ? response.data : goal));
      toast.success(t('Đã lưu tiến độ.'));
      setShowProgress(null);
      setProgressAmount(1);
      setRetryProgress(false);
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
      await api.post(`/goals/${id}/abandon`);
      toast.info(t('Đã hủy mục tiêu'));
      await load();
    } catch {
      toast.error(t('Không thể hủy'));
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  const handleDelete = async (id) => {
    if (mutationBusy.current || progressBusy.current || !window.confirm(t('Xóa vĩnh viễn mục tiêu này? Không thể hoàn tác.'))) return;
    mutationBusy.current = true; setMutating(true);
    requests.current.invalidate();
    try {
      await api.delete(`/goals/${id}`);
      toast.info(t('Đã xóa mục tiêu'));
      await load();
    } catch {
      toast.error(t('Không thể xóa'));
    } finally { mutationBusy.current = false; setMutating(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  const abandonedGoals = goals.filter(g => g.status === 'ABANDONED');

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
        <button className="btn btn-primary" disabled={mutating || savingProgress} onClick={openCreate}>{t('+ Tạo mục tiêu')}</button>
      </div>

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
      {/* Stats */}
      <div className="card-grid card-grid-3" style={{ marginBottom: '1.5rem' }}>
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

      {/* Active Goals */}
      {!loadError && goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>{t('Chưa có mục tiêu nào. Hãy đặt mục tiêu đầu tiên!')}</p>
          <button className="btn btn-primary" disabled={mutating || savingProgress} onClick={openCreate}>{t('Tạo mục tiêu')}</button>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <span className="card-title">{t('🔥 Đang thực hiện ({count})', { count: activeGoals.length })}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeGoals.map((g, i) => (
                  <div key={g.id} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s`, flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="habit-name">{g.name}</div>
                        <div className="habit-meta">
                          <span>{g.currentValue}/{g.targetValue} {g.unit}</span>
                          {g.deadline && <span>{t('📅 Hạn: {date}', { date: g.deadline })}</span>}
                          {statusBadge(g.status)}
                        </div>
                        {g.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{g.description}</div>}
                      </div>
                      <div className="habit-actions" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" disabled={mutating || savingProgress} onClick={() => openEdit(g)}>{t('Sửa')}</button>
                        <button className="btn btn-primary btn-sm" disabled={mutating || savingProgress} onClick={() => openProgress(g.id)}>+</button>
                        <button className="btn btn-danger btn-sm" disabled={mutating || savingProgress} onClick={() => handleAbandon(g.id)} title={t('Hủy')}>✗</button>
                      </div>
                    </div>
                    <div className="progress-bar" style={{ height: '8px' }}>
                      <div className={`progress-fill ${g.progress >= 0.8 ? 'success' : g.progress >= 0.5 ? '' : 'warning'}`}
                        style={{ width: `${Math.min(g.progress * 100, 100)}%` }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {t('{percent}% hoàn thành', { percent: Math.round(g.progress * 100) })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <span className="card-title">{t('✅ Đã hoàn thành ({count})', { count: completedGoals.length })}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {completedGoals.map(g => (
                  <div key={g.id} className="habit-item" style={{ opacity: 0.8, padding: '0.75rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="habit-info">
                      <div className="habit-name" style={{ textDecoration: 'line-through' }}>{g.name}</div>
                      <div className="habit-meta">
                        <span>{g.currentValue}/{g.targetValue} {g.unit}</span>
                        {statusBadge(g.status)}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" disabled={mutating || savingProgress} onClick={() => openEdit(g)}>{t('Sửa')}</button>
                    <button className="btn btn-danger btn-sm" disabled={mutating || savingProgress} onClick={() => handleDelete(g.id)} title={t('Xóa')}>🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {abandonedGoals.length > 0 && <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">{t('Mục tiêu đã hủy')}</h2>
        {abandonedGoals.map(goal => <div key={goal.id} className="habit-item" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="habit-info"><div className="habit-name">{goal.name}</div>
            <div className="habit-meta">{goal.currentValue}/{goal.targetValue} {goal.unit} {statusBadge(goal.status)}</div>
          </div>
          <button className="btn btn-secondary btn-sm" disabled={mutating || savingProgress} onClick={() => openEdit(goal)}>{t('Sửa')}</button>
          <button className="btn btn-primary btn-sm" disabled={mutating || savingProgress} onClick={() => handleRestore(goal.id)}>{t('Khôi phục')}</button>
          <button className="btn btn-danger btn-sm" disabled={mutating || savingProgress}
            onClick={() => handleDelete(goal.id)}>{t('Xóa')}</button>
        </div>)}
      </section>}

      {/* Progress Modal */}
      {showProgress && (
        <div className="modal-overlay" onClick={() => { if (!progressBusy.current) setShowProgress(null); }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <h2 className="modal-title">{t('➕ Thêm tiến độ')}</h2>
            <div className="form-group">
              <label className="form-label">{t('Số lượng')}</label>
              <input type="number" className="form-input" min="1" max="2147483647" step="1" disabled={savingProgress || retryProgress} value={progressAmount} onChange={e => setProgressAmount(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { if (!progressBusy.current) setShowProgress(null); }}>{t('Hủy')}</button>
              <button className="btn btn-primary" disabled={savingProgress} onClick={() => handleProgress(showProgress)}>{savingProgress ? t('Đang lưu…') : retryProgress ? t('Thử lại') : t('Thêm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeForm}>
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
            <form onSubmit={handleCreate} aria-busy={mutating}>
              {editing && editing.status !== 'ACTIVE' && <p>{t('Chỉ tiêu của mục tiêu đã kết thúc được giữ nguyên. Bạn vẫn có thể sửa tên, mô tả và hạn chót.')}</p>}
              <fieldset disabled={mutating} style={{ border: 0, padding: 0, minWidth: 0 }}>
              <div className="form-group">
                <label htmlFor="goal-name" className="form-label">{t('Tên mục tiêu *')}</label>
                <input id="goal-name" autoFocus maxLength={255} className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder={t('VD: Đọc 24 cuốn sách trong năm')} />
              </div>
              <div className="form-group">
                <label htmlFor="goal-description" className="form-label">{t('Mô tả')}</label>
                <textarea id="goal-description" maxLength={255} className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('Chi tiết về mục tiêu')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="goal-target" className="form-label">{t('Số lượng mục tiêu *')}</label>
                  <input id="goal-target" type="number" className="form-input" min="1" max="2147483647" step="1" disabled={Boolean(editing && editing.status !== 'ACTIVE')} value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="goal-unit" className="form-label">{t('Đơn vị')}</label>
                  <input id="goal-unit" maxLength={255} className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder={t('VD: cuốn, km, buổi')} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="goal-deadline" className="form-label">{t('Hạn chót')}</label>
                <input id="goal-deadline" type="date" className="form-input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeForm}>{t('Hủy')}</button>
                <button type="submit" className="btn btn-primary">{t(mutating ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo')}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}
    </div>
  );
}
