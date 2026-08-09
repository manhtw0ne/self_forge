import { useEffect, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ habitId: '', name: '', description: '', targetDays: 7 });
  const [progress, setProgress] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const load = () => {
    Promise.all([api.get('/challenges'), api.get('/habits')])
      .then(([c, h]) => { setChallenges(c.data); setHabits(h.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const loadProgress = async (id) => {
    try {
      const res = await api.get(`/challenges/${id}/progress`);
      setProgress(prev => ({ ...prev, [id]: res.data }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    challenges.forEach(c => loadProgress(c.id));
  }, [challenges]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/challenges', {
        ...form,
        habitId: parseInt(form.habitId),
        targetDays: parseInt(form.targetDays),
      });
      setForm({ habitId: '', name: '', description: '', targetDays: 7 });
      setShowModal(false);
      toast.success('Đã tạo thử thách mới! ⚡');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/challenges/${id}`);
      toast.info('Đã xóa thử thách');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Không thể xóa thử thách');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const statusLabel = (s) => s === 'ACTIVE' ? 'Đang chạy' : s === 'COMPLETED' ? 'Hoàn thành' : 'Thất bại';

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>⚡ Thử thách</h1>
          <p>Đặt ra thử thách và chinh phục chúng</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thử thách mới</button>
      </div>

      {challenges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <p>Chưa có thử thách nào</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Tạo thử thách đầu tiên</button>
        </div>
      ) : (
        <div className="card-grid card-grid-2">
          {challenges.map((c, i) => {
            const p = progress[c.id];
            return (
              <div key={c.id} className="card slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem' }}>{c.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge ${c.status === 'ACTIVE' ? 'badge-info' : c.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                      {statusLabel(c.status)}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(c.id)} title="Xóa" style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}>🗑</button>
                  </div>
                </div>
                {c.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{c.description}</p>}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  📅 {c.startDate} → {c.endDate} · 🎯 {c.targetDays} ngày
                </div>
                {p && (
                  <>
                    <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                      <div className={`progress-fill ${p.completionRate >= 0.8 ? 'success' : p.completionRate >= 0.5 ? 'warning' : ''}`} style={{ width: `${p.completionRate * 100}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>✅ {p.completedDays}/{p.targetDays} ngày</span>
                      <span>{Math.round(p.completionRate * 100)}%</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Tạo thử thách mới</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Thói quen *</label>
                <select className="form-select" value={form.habitId} onChange={e => setForm({ ...form, habitId: e.target.value })} required>
                  <option value="">-- Chọn thói quen --</option>
                  {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tên thử thách *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="VD: 7 ngày đọc sách" />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Số ngày mục tiêu</label>
                <select className="form-select" value={form.targetDays} onChange={e => setForm({ ...form, targetDays: e.target.value })}>
                  <option value="7">7 ngày</option>
                  <option value="14">14 ngày</option>
                  <option value="21">21 ngày</option>
                  <option value="30">30 ngày</option>
                  <option value="60">60 ngày</option>
                  <option value="90">90 ngày</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">⚠️</div>
              <div className="confirm-text">Bạn có chắc muốn xóa thử thách này?</div>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Hủy</button>
                <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Xóa</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
