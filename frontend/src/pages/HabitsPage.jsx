import { useEffect, useState } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

const HABIT_TEMPLATES = [
  {
    icon: '🌅', name: 'Thói quen buổi sáng', desc: 'Bắt đầu ngày mới với năng lượng',
    habits: [
      { name: 'Dậy sớm 6h', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'buổi sáng' },
      { name: 'Thiền 10 phút', difficulty: 'EASY', targetPerWeek: 7, tags: 'thiền, buổi sáng' },
      { name: 'Tập thể dục 30 phút', difficulty: 'HARD', targetPerWeek: 5, tags: 'sức khỏe' },
      { name: 'Uống 1 ly nước ấm', difficulty: 'EASY', targetPerWeek: 7, tags: 'sức khỏe' },
    ],
  },
  {
    icon: '📚', name: 'Đọc sách mỗi ngày', desc: 'Nâng cao kiến thức liên tục',
    habits: [
      { name: 'Đọc sách 20 phút', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'đọc sách' },
      { name: 'Ghi chú sách', difficulty: 'EASY', targetPerWeek: 5, tags: 'đọc sách, học tập' },
    ],
  },
  {
    icon: '💪', name: 'Gym & Sức khỏe', desc: 'Tập luyện khoa học',
    habits: [
      { name: 'Tập gym', difficulty: 'HARD', targetPerWeek: 4, tags: 'gym, sức khỏe' },
      { name: 'Ăn đủ protein', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'dinh dưỡng' },
      { name: 'Ngủ đủ 7 tiếng', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'sức khỏe' },
      { name: 'Uống 2L nước', difficulty: 'EASY', targetPerWeek: 7, tags: 'sức khỏe' },
    ],
  },
  {
    icon: '🇬🇧', name: 'Học tiếng Anh', desc: 'Cải thiện ngoại ngữ hàng ngày',
    habits: [
      { name: 'Học từ vựng mới', difficulty: 'MEDIUM', targetPerWeek: 6, tags: 'tiếng Anh' },
      { name: 'Nghe podcast tiếng Anh', difficulty: 'EASY', targetPerWeek: 5, tags: 'tiếng Anh, listening' },
      { name: 'Viết nhật ký bằng tiếng Anh', difficulty: 'HARD', targetPerWeek: 3, tags: 'tiếng Anh, writing' },
    ],
  },
  {
    icon: '💻', name: 'Lập trình viên', desc: 'Xây dựng kỹ năng coding',
    habits: [
      { name: 'Code ít nhất 1 tiếng', difficulty: 'MEDIUM', targetPerWeek: 6, tags: 'lập trình' },
      { name: 'Đọc docs/blog tech', difficulty: 'EASY', targetPerWeek: 5, tags: 'lập trình, học tập' },
      { name: 'Giải 1 bài LeetCode', difficulty: 'HARD', targetPerWeek: 4, tags: 'lập trình, thuật toán' },
    ],
  },
  {
    icon: '🧘', name: 'Cân bằng tâm trí', desc: 'Chăm sóc sức khỏe tinh thần',
    habits: [
      { name: 'Thiền 15 phút', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'thiền' },
      { name: 'Viết nhật ký biết ơn', difficulty: 'EASY', targetPerWeek: 7, tags: 'tinh thần' },
      { name: 'Không mạng xã hội 1 tiếng trước ngủ', difficulty: 'HARD', targetPerWeek: 7, tags: 'digital detox' },
    ],
  },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', difficulty: 'MEDIUM', targetPerWeek: 7, categoryId: '', tags: '' });
  const toast = useToast();

  const load = () => {
    Promise.all([api.get('/habits'), api.get('/categories')])
      .then(([h, c]) => { setHabits(h.data); setCategories(c.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: '', description: '', difficulty: 'MEDIUM', targetPerWeek: 7, categoryId: '', tags: '' });

  const openCreate = () => {
    setEditHabit(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (h) => {
    setEditHabit(h);
    setForm({
      name: h.name,
      description: h.description || '',
      difficulty: h.difficulty,
      targetPerWeek: h.targetPerWeek,
      categoryId: h.categoryId || '',
      tags: h.tags || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        targetPerWeek: parseInt(form.targetPerWeek),
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      };
      if (editHabit) {
        await api.patch(`/habits/${editHabit.id}`, payload);
        toast.success('Đã cập nhật thói quen!');
      } else {
        await api.post('/habits', payload);
        toast.success('Đã tạo thói quen mới! 🎯');
      }
      resetForm();
      setEditHabit(null);
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/habits/${id}`);
      toast.info('Đã tắt thói quen');
      setConfirmDelete(null);
      load();
    } catch {
      toast.error('Không thể tắt thói quen');
    }
  };

  const applyTemplate = async (template) => {
    try {
      let count = 0;
      for (const h of template.habits) {
        await api.post('/habits', h);
        count++;
      }
      toast.success(`📦 Đã tạo ${count} thói quen từ "${template.name}"!`);
      setShowTemplates(false);
      load();
    } catch (err) {
      toast.error('Có lỗi khi tạo thói quen từ template');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const filteredHabits = filter === 'all'
    ? habits
    : habits.filter(h => h.categoryId?.toString() === filter);

  const difficultyLabel = (d) => d === 'HARD' ? 'Khó' : d === 'MEDIUM' ? 'Trung bình' : 'Dễ';

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🎯 Thói quen</h1>
          <p>Quản lý các thói quen hàng ngày</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowTemplates(true)}>📦 Templates</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Tạo mới</button>
        </div>
      </div>

      {/* Filter Bar */}
      {categories.length > 0 && (
        <div className="filter-bar">
          <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
          {categories.map(c => (
            <button key={c.id} className={`filter-chip ${filter === c.id.toString() ? 'active' : ''}`} onClick={() => setFilter(c.id.toString())}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      )}

      {filteredHabits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>{filter !== 'all' ? 'Không có thói quen nào trong danh mục này' : 'Chưa có thói quen nào'}</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={openCreate}>Tạo thói quen đầu tiên</button>
            <button className="btn btn-secondary" onClick={() => setShowTemplates(true)}>📦 Dùng template</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredHabits.map((h, i) => (
            <div key={h.id} className="habit-item slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="habit-category-dot" style={{ background: h.categoryColor || 'var(--accent-primary)' }} />
              <div className="habit-info">
                <div className="habit-name">{h.name}</div>
                <div className="habit-meta">
                  <span className={`badge badge-${h.difficulty === 'HARD' ? 'danger' : h.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                    {difficultyLabel(h.difficulty)}
                  </span>
                  <span>{h.points} điểm</span>
                  <span>{h.targetPerWeek}x/tuần</span>
                  {h.categoryName && <span>📁 {h.categoryName}</span>}
                  {h.tags && <span>🏷️ {h.tags}</span>}
                </div>
                {h.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{h.description}</div>}
              </div>
              <div className="habit-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(h)} title="Chỉnh sửa">✏️</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(h.id)} title="Tắt">Tắt</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="modal-title">📦 Chọn Template</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Tạo nhanh nhiều thói quen cùng lúc từ bộ template có sẵn
            </p>
            <div className="template-grid">
              {HABIT_TEMPLATES.map((t, i) => (
                <div key={i} className="template-card" onClick={() => applyTemplate(t)}>
                  <div className="template-card-icon">{t.icon}</div>
                  <div className="template-card-name">{t.name}</div>
                  <div className="template-card-desc">{t.desc}</div>
                  <div className="template-card-habits">
                    {t.habits.map((h, j) => (
                      <span key={j} className={`badge badge-${h.difficulty === 'HARD' ? 'danger' : h.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                        {h.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowTemplates(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditHabit(null); }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editHabit ? 'Chỉnh sửa thói quen' : 'Tạo thói quen mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tên thói quen *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="VD: Đọc sách 20 phút" />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả chi tiết" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Độ khó</label>
                  <select className="form-select" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="EASY">Dễ (5 điểm)</option>
                    <option value="MEDIUM">Trung bình (10 điểm)</option>
                    <option value="HARD">Khó (20 điểm)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mục tiêu / tuần</label>
                  <input type="number" className="form-input" min="1" max="7" value={form.targetPerWeek} onChange={e => setForm({ ...form, targetPerWeek: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Danh mục</label>
                <select className="form-select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">-- Không chọn --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (cách bởi dấu phẩy)</label>
                <input className="form-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="VD: sức khỏe, buổi sáng" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditHabit(null); }}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editHabit ? 'Cập nhật' : 'Tạo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">⚠️</div>
              <div className="confirm-text">Bạn có chắc muốn tắt thói quen này?<br />Thói quen sẽ không hiển thị nữa nhưng dữ liệu vẫn được giữ lại.</div>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Hủy</button>
                <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Tắt thói quen</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
