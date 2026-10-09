import { useAuth } from '../context/useAuth';
import { readHabitBatch, saveHabitBatch, clearHabitBatch } from '../utils/pendingHabitBatch';
import { localizedCategory } from '../utils/language';
import { useLanguage } from '../context/useLanguage';
import { useEffect, useState, useRef } from 'react';
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
  const { user } = useAuth();
  return <HabitsContent key={user.id} userId={user.id} isPremium={user.isPremium} />;
}
function HabitsContent({ userId, isPremium }) {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState(() => {
    try { return readHabitBatch(sessionStorage, userId); } catch { return { invalid: true }; }
  });
  const [habits, setHabits] = useState([]);
  const [inactive, setInactive] = useState([]);
  const [view, setView] = useState('active');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', difficulty: 'MEDIUM', targetPerWeek: 7, categoryId: '', tags: '' });
  const toast = useToast();
  const mutation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadVersion = useRef(0);

  const load = async () => {
    const version = ++loadVersion.current;
    setLoadError(false);
    try {
      const [h, c, archived] = await Promise.all([api.get('/habits'), api.get('/categories'), api.get('/habits/inactive')]);
      if (version === loadVersion.current) { setHabits(h.data); setCategories(c.data); setInactive(archived.data); }
    } catch {
      if (version === loadVersion.current) setLoadError(true);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };

  useEffect(() => { const version = loadVersion; load(); return () => { version.current++; }; }, []);

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
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      const payload = {
        ...form,
        targetPerWeek: parseInt(form.targetPerWeek),
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        ...(editHabit ? { clearCategory: !form.categoryId } : {}),
      };
      if (editHabit) {
        await api.patch(`/habits/${editHabit.id}`, payload);
        toast.success(t('Đã cập nhật thói quen!'));
      } else {
        await api.post('/habits', payload);
        toast.success(t('Đã tạo thói quen mới! 🎯'));
      }
      resetForm();
      setEditHabit(null);
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { mutation.current = false; setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      await api.delete(`/habits/${id}`);
      toast.info(t('Đã tắt thói quen'));
      setConfirmDelete(null);
      load();
    } catch {
      toast.error(t('Không thể tắt thói quen'));
    } finally { mutation.current = false; setBusy(false); }
  };

  const restoreHabit = async (id) => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      await api.patch('/habits/' + id, { active: true });
      toast.success(t('Đã bật lại thói quen.'));
      await load();
    } catch (error) {
      toast.error(t(error.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      await load();
    } finally { mutation.current = false; setBusy(false); }
  };

  const moveHabit = async (habitId, direction) => {
    if (mutation.current) return;
    const index = habits.findIndex(h => h.id === habitId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= habits.length) return;
    const reordered = [...habits];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    mutation.current = true; setBusy(true);
    try {
      const response = await api.patch('/habits/reorder', {
        items: reordered.map((h, sortOrder) => ({ id: h.id, sortOrder, stackGroup: h.stackGroup ?? null })),
      });
      setHabits(response.data);
    } catch {
      toast.error(t('Chưa xác nhận được thứ tự mới. Đang tải lại danh sách.'));
      await load();
    } finally { mutation.current = false; setBusy(false); }
  };

  const applyTemplate = async (template) => {
    if (mutation.current || pending?.invalid) return;
    mutation.current = true; setBusy(true);
    try {
      const payload = readHabitBatch(sessionStorage, userId) ?? {
        requestId: crypto.randomUUID(),
        habits: template.habits.map(h => ({ ...h, name: t(h.name), tags: t(h.tags) })),
      };
      saveHabitBatch(sessionStorage, userId, payload);
      setPending(payload);
      const result = await api.post('/habits/batch', payload);
      clearHabitBatch(sessionStorage, userId);
      setPending(null);
      toast.success(t('📦 Đã tạo {count} thói quen từ "{name}"!', { count: result.data.length, name: template ? t(template.name) : t('Bộ thói quen') }));
      setShowTemplates(false);
      await load();
    } catch (err) {
      if ([400, 404, 422].includes(err.response?.status)) {
        try { clearHabitBatch(sessionStorage, userId); setPending(null); } catch { /* Keep pending on storage failure. */ }
      } else {
        try { setPending(readHabitBatch(sessionStorage, userId)); } catch { setPending({ invalid: true }); }
      }
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy kiểm tra danh sách trước khi tạo lại mẫu.'));
      setShowTemplates(false);
      await load();
    } finally { mutation.current = false; setBusy(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const visibleHabits = view === 'active' ? habits : inactive;
  const filteredHabits = filter === 'all'
    ? visibleHabits
    : visibleHabits.filter(h => h.categoryId?.toString() === filter);

  const difficultyLabel = (d) => d === 'HARD' ? t('Khó') : d === 'MEDIUM' ? t('Trung bình') : t('Dễ');

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('🎯 Thói quen')}</h1>
          <p>{t('Quản lý các thói quen hàng ngày')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button disabled={busy || !!pending} className="btn btn-secondary" onClick={() => { if (!pending) setShowTemplates(true); }}>{t('📦 Templates')}</button>
          <button disabled={busy} className="btn btn-primary" onClick={openCreate}>{t('+ Tạo mới')}</button>
        </div>
      </div>

      {loadError && <div role="alert" className="card">
        <p>{t('Không thể tải dữ liệu.')}</p>
        <button disabled={busy} className="btn btn-secondary" onClick={load}>{t('Thử lại')}</button>
      </div>}
      {pending && <div className="card" role="status">
        <p>{t('Có bộ thói quen chưa xác nhận. Thử lại sẽ dùng cùng mã yêu cầu.')}</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={busy || pending.invalid} onClick={() => applyTemplate(null)}>{t('Thử lại')}</button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => {
            if (!window.confirm(t('Bộ thói quen có thể đã được tạo. Kiểm tra danh sách trước khi bỏ yêu cầu chờ.'))) return;
            try { clearHabitBatch(sessionStorage, userId); setPending(null); }
            catch { toast.error(t('Không thể lưu trên thiết bị này.')); }
          }}>{t('Bỏ yêu cầu chờ')}</button>
        </div>
      </div>}
      <div className="filter-bar" aria-label={t('Trạng thái thói quen')}>
        <button className={view === 'active' ? 'filter-chip active' : 'filter-chip'} disabled={busy} aria-pressed={view === 'active'} onClick={() => setView('active')}>{t('Đang bật')} ({habits.length})</button>
        <button className={view === 'inactive' ? 'filter-chip active' : 'filter-chip'} disabled={busy} aria-pressed={view === 'inactive'} onClick={() => setView('inactive')}>{t('Đã tắt')} ({inactive.length})</button>
      </div>
      {view === 'inactive' && <p>{t('Thói quen đã tắt vẫn giữ lịch sử. Bật lại sẽ tính vào giới hạn thói quen đang hoạt động.')}</p>}
      {/* Filter Bar */}
      {categories.length > 0 && (
        <div className="filter-bar">
          <button disabled={busy} className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>{t('Tất cả')}</button>
          {categories.map(c => (
            <button disabled={busy} key={c.id} className={`filter-chip ${filter === c.id.toString() ? 'active' : ''}`} onClick={() => setFilter(c.id.toString())}>
              {c.icon} {localizedCategory(language, c)}
            </button>
          ))}
        </div>
      )}

      {loadError && habits.length === 0 ? null : filteredHabits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>{filter !== 'all' ? t('Không có thói quen nào trong danh mục này') : t(view === 'inactive' ? 'Không có thói quen đã tắt.' : 'Chưa có thói quen nào')}</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button disabled={busy} className="btn btn-primary" onClick={openCreate}>{t('Tạo thói quen đầu tiên')}</button>
            <button disabled={busy} className="btn btn-secondary" onClick={() => setShowTemplates(true)}>{t('📦 Dùng template')}</button>
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
                  <span>{t('{points} điểm', { points: h.points })}</span>
                  <span>{t('{count}x/tuần', { count: h.targetPerWeek })}</span>
                  {h.categoryName && <span>📁 {localizedCategory(language, categories.find(category => category.id === h.categoryId)) ?? h.categoryName}</span>}
                  {h.tags && <span>🏷️ {h.tags}</span>}
                </div>
                {h.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{h.description}</div>}
              </div>
              <div className="habit-actions">
                {view === 'active' && isPremium && filter === 'all' && habits.length <= 500 && <>
                  <button className="btn btn-ghost btn-sm" disabled={busy || i === 0} onClick={() => moveHabit(h.id, -1)} aria-label={t('Đưa lên: {name}', { name: h.name })}>↑</button>
                  <button className="btn btn-ghost btn-sm" disabled={busy || i === habits.length - 1} onClick={() => moveHabit(h.id, 1)} aria-label={t('Đưa xuống: {name}', { name: h.name })}>↓</button>
                </>}
                <button disabled={busy} className="btn btn-ghost btn-sm" onClick={() => openEdit(h)} title={t('Chỉnh sửa')}>✏️</button>
                {h.active ? <button disabled={busy} className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(h.id)}>{t('Tắt')}</button> : <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => restoreHabit(h.id)}>{t('Bật lại')}</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => { if (!mutation.current) setShowTemplates(false); }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="modal-title">{t('📦 Chọn Template')}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {t('Tạo nhanh nhiều thói quen cùng lúc từ bộ template có sẵn')}
            </p>
            {busy && <p role="status">{t('Đang tải…')}</p>}
            <div className="template-grid">
              {HABIT_TEMPLATES.map((template, i) => (
                <div key={i} className="template-card" role="button" tabIndex={busy ? -1 : 0} aria-disabled={busy} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyTemplate(template); } }} onClick={() => applyTemplate(template)}>
                  <div className="template-card-icon">{template.icon}</div>
                  <div className="template-card-name">{t(template.name)}</div>
                  <div className="template-card-desc">{t(template.desc)}</div>
                  <div className="template-card-habits">
                    {template.habits.map((h, j) => (
                      <span key={j} className={`badge badge-${h.difficulty === 'HARD' ? 'danger' : h.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                        {t(h.name)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button disabled={busy} className="btn btn-secondary" onClick={() => setShowTemplates(false)}>{t('Đóng')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { if (!mutation.current) { setShowModal(false); setEditHabit(null); } }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editHabit ? t('Chỉnh sửa thói quen') : t('Tạo thói quen mới')}</h2>
            <form onSubmit={handleSubmit}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label className="form-label">{t('Tên thói quen *')}</label>
                <input className="form-input" maxLength={255} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder={t('VD: Đọc sách 20 phút')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Mô tả')}</label>
                <textarea className="form-textarea" maxLength={255} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('Mô tả chi tiết')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('Độ khó')}</label>
                  <select className="form-select" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="EASY">{t('Dễ (5 điểm)')}</option>
                    <option value="MEDIUM">{t('Trung bình (10 điểm)')}</option>
                    <option value="HARD">{t('Khó (20 điểm)')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Mục tiêu / tuần')}</label>
                  <input type="number" className="form-input" min="1" max="7" value={form.targetPerWeek} onChange={e => setForm({ ...form, targetPerWeek: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Danh mục')}</label>
                <select className="form-select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">{t('-- Không chọn --')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {localizedCategory(language, c)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Tags (cách bởi dấu phẩy)')}</label>
                <input className="form-input" maxLength={255} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder={t('VD: sức khỏe, buổi sáng')} />
              </div>
              <div className="modal-actions">
                <button disabled={busy} type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditHabit(null); }}>{t('Hủy')}</button>
                <button disabled={busy} type="submit" className="btn btn-primary">{editHabit ? t('Cập nhật') : t('Tạo')}</button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => { if (!mutation.current) setConfirmDelete(null); }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">⚠️</div>
              <div className="confirm-text">{t('Bạn có chắc muốn tắt thói quen này?')}<br />{t('Thói quen sẽ không hiển thị nữa nhưng dữ liệu vẫn được giữ lại.')}</div>
              <div className="confirm-actions">
                <button disabled={busy} className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>{t('Hủy')}</button>
                <button disabled={busy} className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>{t('Tắt thói quen')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
