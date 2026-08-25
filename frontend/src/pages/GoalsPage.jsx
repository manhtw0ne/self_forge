import { useEffect, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProgress, setShowProgress] = useState(null);
  const [progressAmount, setProgressAmount] = useState(1);
  const [form, setForm] = useState({ name: '', description: '', targetValue: 10, unit: '', deadline: '' });
  const toast = useToast();

  const load = () => {
    api.get('/goals').then(r => setGoals(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', { ...form, targetValue: parseInt(form.targetValue) });
      toast.success('🎯 Đã tạo mục tiêu!');
      setShowModal(false);
      setForm({ name: '', description: '', targetValue: 10, unit: '', deadline: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleProgress = async (id) => {
    try {
      await api.post(`/goals/${id}/progress`, { amount: parseInt(progressAmount) });
      toast.success(`+${progressAmount} tiến độ!`);
      setShowProgress(null);
      setProgressAmount(1);
      load();
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  const handleAbandon = async (id) => {
    try {
      await api.post(`/goals/${id}/abandon`);
      toast.info('Đã hủy mục tiêu');
      load();
    } catch {
      toast.error('Không thể hủy');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      toast.info('Đã xóa mục tiêu');
      load();
    } catch {
      toast.error('Không thể xóa');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  const abandonedGoals = goals.filter(g => g.status === 'ABANDONED');

  const statusBadge = (status) => {
    if (status === 'COMPLETED') return <span className="badge badge-success">✓ Hoàn thành</span>;
    if (status === 'ABANDONED') return <span className="badge badge-danger">✗ Đã hủy</span>;
    return <span className="badge badge-info">Đang thực hiện</span>;
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🎯 Mục tiêu dài hạn</h1>
          <p>Đặt và theo dõi các mục tiêu lớn</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo mục tiêu</button>
      </div>

      {/* Stats */}
      <div className="card-grid card-grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card slide-in">
          <div className="stat-label">Đang thực hiện</div>
          <div className="stat-value">{activeGoals.length}</div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-label">Đã hoàn thành</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{completedGoals.length}</div>
        </div>
        <div className="stat-card slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-label">Tỷ lệ thành công</div>
          <div className="stat-value">
            {goals.length > 0 ? Math.round(completedGoals.length / (completedGoals.length + abandonedGoals.length || 1) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>Chưa có mục tiêu nào. Hãy đặt mục tiêu đầu tiên!</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Tạo mục tiêu</button>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <span className="card-title">🔥 Đang thực hiện ({activeGoals.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeGoals.map((g, i) => (
                  <div key={g.id} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s`, flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="habit-name">{g.name}</div>
                        <div className="habit-meta">
                          <span>{g.currentValue}/{g.targetValue} {g.unit}</span>
                          {g.deadline && <span>📅 Hạn: {g.deadline}</span>}
                          {statusBadge(g.status)}
                        </div>
                        {g.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{g.description}</div>}
                      </div>
                      <div className="habit-actions" style={{ flexShrink: 0 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => { setShowProgress(g.id); setProgressAmount(1); }}>+</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleAbandon(g.id)} title="Hủy">✗</button>
                      </div>
                    </div>
                    <div className="progress-bar" style={{ height: '8px' }}>
                      <div className={`progress-fill ${g.progress >= 0.8 ? 'success' : g.progress >= 0.5 ? '' : 'warning'}`}
                        style={{ width: `${Math.min(g.progress * 100, 100)}%` }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {Math.round(g.progress * 100)}% hoàn thành
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
                <span className="card-title">✅ Đã hoàn thành ({completedGoals.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {completedGoals.map(g => (
                  <div key={g.id} className="habit-item" style={{ opacity: 0.8, padding: '0.75rem 1rem' }}>
                    <div className="habit-info">
                      <div className="habit-name" style={{ textDecoration: 'line-through' }}>{g.name}</div>
                      <div className="habit-meta">
                        <span>{g.targetValue} {g.unit}</span>
                        {statusBadge(g.status)}
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g.id)} title="Xóa">🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Progress Modal */}
      {showProgress && (
        <div className="modal-overlay" onClick={() => setShowProgress(null)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <h2 className="modal-title">➕ Thêm tiến độ</h2>
            <div className="form-group">
              <label className="form-label">Số lượng</label>
              <input type="number" className="form-input" min="1" value={progressAmount} onChange={e => setProgressAmount(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowProgress(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => handleProgress(showProgress)}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🎯 Tạo mục tiêu mới</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Tên mục tiêu *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="VD: Đọc 24 cuốn sách trong năm" />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Chi tiết về mục tiêu" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Số lượng mục tiêu *</label>
                  <input type="number" className="form-input" min="1" value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn vị</label>
                  <input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="VD: cuốn, km, buổi" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Hạn chót</label>
                <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
