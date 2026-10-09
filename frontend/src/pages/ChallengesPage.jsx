import { createLatestRequest } from '../utils/latestRequest';
import { useAuth } from '../context/useAuth';
import { createChallengeSafely, readPendingChallenge, removePendingChallenge } from '../utils/pendingChallenge';
import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate } from '../utils/dates';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

export default function ChallengesPage() {
  const { user } = useAuth();
  return <ChallengesContent key={user.id} userId={user.id} />;
}
function ChallengesContent({ userId }) {
  const { language, t } = useLanguage();
  const [pending, setPending] = useState(() => {
    try { return readPendingChallenge(window.sessionStorage, userId); } catch { return { invalid: true }; }
  });
  const [pendingError, setPendingError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [progressErrors, setProgressErrors] = useState({});
  const [challenges, setChallenges] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ habitId: '', name: '', description: '', targetDays: 7 });
  const [progress, setProgress] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const mutationInFlight = useRef(false);
  const requests = useRef(createLatestRequest());
  const progressRequests = useRef(new Map());
  const closeCreate = () => { if (!mutationInFlight.current) setShowModal(false); };
  const closeDelete = () => { if (!mutationInFlight.current) setConfirmDelete(null); };

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    return requests.current.run(() => Promise.all([api.get('/challenges'), api.get('/habits')]),
      ([c, h]) => { setChallenges(c.data); setHabits(h.data); },
      () => setLoadError(true), () => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [load]);

  const loadProgress = useCallback(id => {
    let gate = progressRequests.current.get(id);
    if (!gate) { gate = createLatestRequest(); progressRequests.current.set(id, gate); }
    setProgressErrors(prev => ({ ...prev, [id]: false }));
    return gate.run(() => api.get('/challenges/' + id + '/progress'),
      res => setProgress(prev => ({ ...prev, [id]: res.data })),
      () => setProgressErrors(prev => ({ ...prev, [id]: true })), () => {});
  }, []);

  useEffect(() => {
    setProgress({});
    setProgressErrors({});
    challenges.forEach(c => loadProgress(c.id));
    const gates = progressRequests.current;
    return () => { gates.forEach(gate => gate.invalidate()); gates.clear(); };
  }, [challenges, loadProgress]);

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    try {
      await createChallengeSafely(window.sessionStorage, userId, {
        ...form,
        name: form.name.trim(),
        habitId: parseInt(form.habitId),
        targetDays: parseInt(form.targetDays),
      }, payload => api.post('/challenges', payload));
      setPending(null);
      setPendingError(false);
      setForm({ habitId: '', name: '', description: '', targetDays: 7 });
      setShowModal(false);
      toast.success(t("Đã tạo thử thách mới! ⚡"));
      await load();
    } catch (err) {
      try { setPending(readPendingChallenge(window.sessionStorage, userId)); } catch { setPending({ invalid: true }); }
      setPendingError(true);
      setShowModal(false);
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { mutationInFlight.current = false; setBusy(false); }
  };

  const discardPending = () => {
    if (mutationInFlight.current || !window.confirm(t('Bỏ bản lưu yêu cầu? Thử thách có thể đã được tạo. Hãy kiểm tra danh sách trước khi tạo lại.'))) return;
    try { removePendingChallenge(window.sessionStorage, userId); setPending(null); setPendingError(false); }
    catch { toast.error(t('Không thể xóa bản lưu yêu cầu trên trình duyệt.')); }
  };

  const handleDelete = async (id) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    try {
      await api.delete(`/challenges/${id}`);
      progressRequests.current.get(id)?.invalidate();
      toast.info(t("Đã xóa thử thách"));
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Không thể xóa thử thách'));
    } finally { mutationInFlight.current = false; setBusy(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (loadError) return <div className="empty-state" role="alert"><p>{t('Không thể tải thử thách.')}</p><button className="btn btn-secondary" onClick={load}>{t('Thử lại')}</button></div>;

  const statusLabel = (s) => s === 'ACTIVE' ? 'Đang chạy' : s === 'COMPLETED' ? 'Hoàn thành' : 'Thất bại';

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t("⚡ Thử thách")}</h1>
          <p>{t("Đặt ra thử thách và chinh phục chúng")}</p>
        </div>
        <button className="btn btn-primary" disabled={!!pending || busy} onClick={() => setShowModal(true)}>{t("+ Thử thách mới")}</button>
      </div>

      {pending && <div className="card" role="status">
        <p>{t(pending.invalid ? 'Yêu cầu chờ bị hỏng. Chưa gửi thao tác mới.' : 'Có yêu cầu tạo thử thách chưa xác nhận. Thử lại sẽ dùng đúng nội dung đã gửi.')}</p>
        {!pending.invalid && <button className="btn btn-primary" disabled={busy} onClick={() => handleCreate()}>{t('Thử lại')}</button>}
        {(pending.invalid || pendingError) && <button className="btn btn-secondary" disabled={busy} onClick={discardPending}>{t('Bỏ bản lưu yêu cầu')}</button>}
      </div>}
      {challenges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <p>{t("Chưa có thử thách nào")}</p>
          <button className="btn btn-primary" disabled={!!pending || busy} onClick={() => setShowModal(true)}>{t("Tạo thử thách đầu tiên")}</button>
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
                      {t(statusLabel(c.status))}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(c.id)} title={t("Xóa")} style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}>🗑</button>
                  </div>
                </div>
                {c.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{c.description}</p>}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  📅 {formatCalendarDate(c.startDate, language)} → {formatCalendarDate(c.endDate, language)} · 🎯 {t('{count} ngày', { count: c.targetDays })}
                </div>
                {progressErrors[c.id] && <div role="status"><p>{t('Không thể tải tiến độ.')}</p><button className="btn btn-secondary btn-sm" onClick={() => loadProgress(c.id)}>{t('Thử lại')}</button></div>}
                {p && !progressErrors[c.id] && (
                  <>
                    <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                      <div className={`progress-fill ${p.completionRate >= 0.8 ? 'success' : p.completionRate >= 0.5 ? 'warning' : ''}`} style={{ width: `${p.completionRate * 100}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>✅ {t('{done}/{total} ngày', { done: p.completedDays, total: p.targetDays })}</span>
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
        <div className="modal-overlay" onClick={closeCreate}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="challenge-create-title" onClick={e => e.stopPropagation()}>
            <h2 id="challenge-create-title" className="modal-title">{t("Tạo thử thách mới")}</h2>
            <form onSubmit={handleCreate} aria-busy={busy}>
              <fieldset disabled={busy || !!pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label htmlFor="challenge-habit" className="form-label">{t("Thói quen *")}</label>
                <select id="challenge-habit" className="form-select" value={form.habitId} onChange={e => setForm({ ...form, habitId: e.target.value })} required>
                  <option value="">{t("-- Chọn thói quen --")}</option>
                  {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="challenge-name" className="form-label">{t("Tên thử thách *")}</label>
                <input id="challenge-name" maxLength={255} className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder={t("VD: 7 ngày đọc sách")} />
              </div>
              <div className="form-group">
                <label htmlFor="challenge-description" className="form-label">{t("Mô tả")}</label>
                <textarea id="challenge-description" maxLength={255} className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="challenge-days" className="form-label">{t("Số ngày mục tiêu")}</label>
                <select id="challenge-days" className="form-select" value={form.targetDays} onChange={e => setForm({ ...form, targetDays: e.target.value })}>
                  <option value="7">{t('{count} ngày', { count: 7 })}</option>
                  <option value="14">{t('{count} ngày', { count: 14 })}</option>
                  <option value="21">{t('{count} ngày', { count: 21 })}</option>
                  <option value="30">{t('{count} ngày', { count: 30 })}</option>
                  <option value="60">{t('{count} ngày', { count: 60 })}</option>
                  <option value="90">{t('{count} ngày', { count: 90 })}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreate}>{t("Hủy")}</button>
                <button type="submit" className="btn btn-primary">{t(busy ? 'Đang xử lý…' : 'Tạo')}</button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={closeDelete}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">⚠️</div>
              <div id="challenge-delete-title" className="confirm-text">{t("Bạn có chắc muốn xóa thử thách này?")}</div>
              <div className="confirm-actions">
                <button disabled={busy} className="btn btn-secondary" onClick={closeDelete}>{t("Hủy")}</button>
                <button disabled={busy} className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>{t("Xóa")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
