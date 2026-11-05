import HabitRestoreBatch from '../components/HabitRestoreBatch';
import HabitPauseBatch from '../components/HabitPauseBatch';
import HabitCopyDialog from '../components/HabitCopyDialog';
import {readCategoryTarget,categoryScopeHabits} from '../utils/categoryNavigation';
import HabitCategoryBatch from '../components/HabitCategoryBatch';
import CategoryManager from '../components/CategoryManager';
import {useHabitCapacity} from '../hooks/useHabitCapacity';
import HabitCapacityNotice from '../components/HabitCapacityNotice';
import {fitsHabitCapacity} from '../utils/habitCapacity';
import HabitTemplateCatalog from '../components/HabitTemplateCatalog';
import HabitTemplateReview from '../components/HabitTemplateReview';
import {challengeLink} from '../utils/challengeProposal';
import {habitPath,readHabitTarget,targetedHabits} from '../utils/habitNavigation';
import HabitReminderDialog from '../components/HabitReminderDialog';
import HabitStateHistory from '../components/HabitStateHistory';
import HabitGoalLinks from '../components/HabitGoalLinks';
import { useHabitGoalLinks } from '../hooks/useHabitGoalLinks';
import ModalOverlay from '../components/ModalOverlay';
import { selectHabits } from '../utils/habitList';
import { Link,useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { usePremium } from '../context/usePremium';
import { readHabitBatch, submitHabitBatch, clearHabitBatch, habitCreationError } from '../utils/pendingHabitBatch';
import { publishAccountDataChange, subscribeAccountDataChanges } from '../utils/accountDataSync';
import { localizedCategory } from '../utils/language';
import { useLanguage } from '../context/useLanguage';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';

const WEEK_DAYS = [
  ['MON', 'T2', 'Mon'], ['TUE', 'T3', 'Tue'], ['WED', 'T4', 'Wed'], ['THU', 'T5', 'Thu'],
  ['FRI', 'T6', 'Fri'], ['SAT', 'T7', 'Sat'], ['SUN', 'CN', 'Sun'],
];
const defaultSchedule = target => WEEK_DAYS.slice(0, Math.max(1, Math.min(7, Number(target) || 7))).map(([code]) => code).join(',');
const scheduleDays = schedule => new Set(String(schedule || '').split(',').filter(code => WEEK_DAYS.some(([day]) => day === code)));
const fitSchedule = (schedule, target) => {
  const wanted = Math.max(1, Math.min(7, Number(target) || 7));
  const selected = WEEK_DAYS.map(([code]) => code).filter(code => scheduleDays(schedule).has(code));
  const next = [...selected.slice(0, wanted)];
  for (const [code] of WEEK_DAYS) if (next.length < wanted && !next.includes(code)) next.push(code);
  return next.join(',');
};
const scheduleLabel = (schedule, language) => {
  const selected = scheduleDays(schedule);
  return WEEK_DAYS.filter(([code]) => selected.has(code)).map(([, vi, en]) => language === 'en' ? en : vi).join(', ');
};



export default function HabitsPage() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  return <HabitsContent key={user.id} userId={user.id} isPremium={isPremium} />;
}
function HabitsContent({ userId, isPremium }) {
  const [searchParams,setSearchParams]=useSearchParams();const categoryTarget=readCategoryTarget(searchParams.toString());const target=categoryTarget?null:readHabitTarget(searchParams.toString());
  const clearTarget=()=>{const next=new URLSearchParams(searchParams);next.delete('habit');next.delete('category');next.delete('state');setSearchParams(next);};
  const [copySource,setCopySource]=useState(null);
  const [copiedFrom,setCopiedFrom]=useState(null);
  const [reminderHabit,setReminderHabit]=useState(null);
  const goalLinks=useHabitGoalLinks(userId);
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
  const [selectedTemplate,setSelectedTemplate]=useState(null);
  const closeTemplates=()=>{if(mutation.current)return;if(selectedTemplate&&!window.confirm(t('Bỏ lựa chọn và thay đổi chưa tạo từ bộ mẫu?')))return;setSelectedTemplate(null);setShowTemplates(false);};
  const chooseTemplate=template=>{if(mutation.current||pending)return;setSelectedTemplate(template);};
  useEffect(()=>{if(!showTemplates||!selectedTemplate)return;const warn=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[showTemplates,selectedTemplate]);
  const [editHabit, setEditHabit] = useState(null);
  const [editConflict, setEditConflict] = useState('');
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', difficulty: 'MEDIUM', targetPerWeek: 7, scheduledDays: defaultSchedule(7), categoryId: '', tags: '' });
  const initialForm = useRef(form);
  const dirty = showModal && JSON.stringify(form) !== JSON.stringify(initialForm.current);
  const toast = useToast();
  const mutation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadVersion = useRef(0);
  const loadRef = useRef(null);
  const capacityState=useHabitCapacity(showTemplates||(showModal&&!editHabit),userId+':'+isPremium+':'+habits.length);
  const capacity=capacityState.capacity;

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
  loadRef.current = load;
  const announceHabitChange = () => {
    if (typeof window === 'undefined') return;
    try { publishAccountDataChange(userId, 'habits', window.localStorage); } catch { /* Cross-tab refresh is optional. */ }
  };

  useEffect(() => { const version = loadVersion; load(); return () => { version.current++; }; }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    return subscribeAccountDataChanges(window, userId, change => {
      if (change.resource === 'habits') void loadRef.current?.();
    });
  }, [userId]);

  const resetForm = () => {
    setCopiedFrom(null);
    const next = { name: '', description: '', difficulty: 'MEDIUM', targetPerWeek: 7, scheduledDays: defaultSchedule(7), categoryId: '', tags: '' };
    initialForm.current = next; setForm(next);
  };

  const openCreate = () => {
    if (mutation.current || pending) return;
    setEditConflict('');
    setEditHabit(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (h) => {
    setCopiedFrom(null);
    setEditConflict('');
    setEditHabit({
      ...h,
      expected: {
        name: h.name,
        description: h.description ?? null,
        difficulty: h.difficulty,
        targetPerWeek: h.targetPerWeek,
        scheduledDays: h.scheduledDays ?? defaultSchedule(h.targetPerWeek),
        points: h.points,
        active: h.active,
        categoryId: h.categoryId ?? null,
        tags: h.tags ?? null,
      },
    });
    const next = {
      name: h.name,
      description: h.description || '',
      difficulty: h.difficulty,
      targetPerWeek: h.targetPerWeek,
      scheduledDays: h.scheduledDays ?? defaultSchedule(h.targetPerWeek),
      categoryId: h.categoryId || '',
      tags: h.tags || '',
    };
    initialForm.current = next; setForm(next);
    setShowModal(true);
  };

  const closeForm = () => {
    if (mutation.current) return;
    if (dirty && !window.confirm(t('Đóng biểu mẫu và bỏ thay đổi chưa lưu?'))) return;
    setShowModal(false); setEditHabit(null); setEditConflict('');
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mutation.current) return;
    if(!editHabit&&!pending&&!fitsHabitCapacity(capacity,1)){toast.error(t('Chưa còn chỗ để thêm thói quen. Tắt một thói quen đang bật rồi kiểm tra lại.'));return;}
    mutation.current = true; setBusy(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        targetPerWeek: Number(form.targetPerWeek),
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        ...(editHabit ? { clearCategory: !form.categoryId } : {}),
      };
      if (!payload.name || !Number.isInteger(payload.targetPerWeek) || payload.targetPerWeek < 1 || payload.targetPerWeek > 7) {
        toast.error(t('Nhập tên thói quen và mục tiêu từ 1 đến 7 lần mỗi tuần.')); return;
      }
      if (scheduleDays(payload.scheduledDays).size !== payload.targetPerWeek) {
        toast.error(t('Chọn đúng số ngày tương ứng với mục tiêu mỗi tuần.')); return;
      }
      if (editHabit) {
        await api.patch(`/habits/${editHabit.id}`, { ...payload, expected: editHabit.expected });
        toast.success(t('Đã cập nhật thói quen!'));
      } else {
        if (pending) return;
        const outcome = await submitHabitBatch(sessionStorage, userId, [payload], request => api.post('/habits/batch', request));
        setPending(outcome.pending ? { ...outcome.pending, confirmed: true } : null);
        toast.success(t('Đã tạo thói quen mới! 🎯'));
        if (outcome.pending) toast.info(t('Đã tạo trên máy chủ nhưng chưa dọn được yêu cầu trên thiết bị. Thử lại cùng mã sẽ không tạo trùng.'));
      }
      resetForm();
      setEditHabit(null);
      setShowModal(false);
      await load();
      announceHabitChange();
    } catch (err) {
      if (!editHabit) {
        try { const waiting = readHabitBatch(sessionStorage, userId); setPending(waiting); if (waiting) setShowModal(false); }
        catch { setPending({ invalid: true }); setShowModal(false); }
        await load();
      }
      if (editHabit && err.response?.status === 409) {
        setEditConflict(err.response?.data?.detail || t('Thói quen đã thay đổi trên máy chủ. Tải bản mới trước khi sửa tiếp.'));
        await load();
      }
      toast.error(t(editHabit ? err.response?.data?.detail || 'Có lỗi xảy ra' : habitCreationError(err)));
    } finally { mutation.current = false; setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      await api.delete(`/habits/${id}`);
      toast.info(t('Đã tắt thói quen'));
      setConfirmDelete(null);
      await load();
      announceHabitChange();
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
      announceHabitChange();
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
      announceHabitChange();
    } catch {
      toast.error(t('Chưa xác nhận được thứ tự mới. Đang tải lại danh sách.'));
      await load();
    } finally { mutation.current = false; setBusy(false); }
  };

  const applyTemplate = async (habitsToCreate) => {
    if (mutation.current || pending?.invalid) return;
    if(!pending&&habitsToCreate&&!fitsHabitCapacity(capacity,habitsToCreate.length)){toast.error(t('Bộ mẫu đang chọn vượt số chỗ còn lại. Bỏ bớt lựa chọn trước khi tạo.'));return;}
    mutation.current = true; setBusy(true);
    try {
      const outcome = await submitHabitBatch(sessionStorage, userId, habitsToCreate, payload => api.post('/habits/batch', payload));
      setPending(outcome.pending ? { ...outcome.pending, confirmed: true } : null);
      toast.success(t('Đã xác nhận tạo {count} thói quen.', { count: outcome.response.data.length }));
      if (outcome.pending) toast.info(t('Đã tạo trên máy chủ nhưng chưa dọn được yêu cầu trên thiết bị. Thử lại cùng mã sẽ không tạo trùng.'));
      setShowTemplates(false);
      await load();
      announceHabitChange();
    } catch (err) {
      if ([400, 404, 422].includes(err.response?.status)) {
        try { clearHabitBatch(sessionStorage, userId); setPending(null); } catch { /* Keep pending on storage failure. */ }
      } else {
        try { setPending(readHabitBatch(sessionStorage, userId)); } catch { setPending({ invalid: true }); }
      }
      toast.error(t(habitCreationError(err)));
      if (![400,404,422].includes(err.response?.status)) setShowTemplates(false);
      await load();
    } finally { mutation.current = false; setBusy(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const effectiveView=categoryTarget?.view??view,effectiveFilter=categoryTarget?.category??filter;
  const changeView=nextView=>{if(categoryTarget&&!categoryTarget.invalid){const next=new URLSearchParams(searchParams);next.set('state',nextView);setSearchParams(next);return;}clearTarget();setView(nextView);};
  const changeCategory=value=>{if(value==='all'){setFilter('all');setView(effectiveView);clearTarget();return;}const next=new URLSearchParams(searchParams);next.delete('habit');next.set('category',value);next.set('state',effectiveView);setSearchParams(next);};
  const visibleHabits = targetedHabits(habits,inactive,target)??categoryScopeHabits(habits,inactive,categoryTarget)??(view === 'all'?[...habits,...inactive]:view === 'active' ? habits : inactive);
  const filteredHabits = target?visibleHabits:selectHabits(visibleHabits, { query, category: effectiveFilter, difficulty });
  const filtering = !!target || !!categoryTarget || Boolean(query.trim()) || effectiveFilter !== 'all' || difficulty !== 'all';
  const resetFilters = () => { if(target||categoryTarget)clearTarget();setQuery(''); setFilter('all'); setDifficulty('all'); };

  const difficultyLabel = (d) => d === 'HARD' ? t('Khó') : d === 'MEDIUM' ? t('Trung bình') : t('Dễ');

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{t('🎯 Thói quen')}</h1>
          <p>{t('Quản lý các thói quen hàng ngày')}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link className="btn btn-secondary" to="/">{t('Về hôm nay để check-in')}</Link>
          <button disabled={busy || !!pending} className="btn btn-secondary" onClick={() => { if (!pending) setShowTemplates(true); }}>{t('📦 Templates')}</button>
          <button disabled={busy || !!pending} className="btn btn-primary" onClick={openCreate}>{t('+ Tạo mới')}</button>
        </div>
      </div>

      {loadError && <div role="alert" className="card">
        <p>{t('Không thể tải dữ liệu.')}</p>
        <button disabled={busy} className="btn btn-secondary" onClick={load}>{t('Thử lại')}</button>
      </div>}
      {goalLinks.error&&<div className="card" role="alert"><p>{t('Chưa tải được mục tiêu liên quan. Bạn vẫn có thể dùng thói quen.')}</p><button className="btn btn-secondary btn-sm" onClick={goalLinks.retry}>{t('Tải lại liên kết mục tiêu')}</button></div>}
      {pending && <div className="card" role="status">
        <p>{t(pending.invalid ? 'Không thể đọc yêu cầu tạo thói quen trên thiết bị.' : pending.confirmed ? 'Đã tạo trên máy chủ nhưng chưa dọn được yêu cầu trên thiết bị. Thử lại cùng mã sẽ không tạo trùng.' : 'Có yêu cầu tạo thói quen chưa xác nhận. Thử lại dùng cùng mã để tránh tạo trùng.')}</p>
        {!pending.invalid && <ul>{pending.habits.map((habit, index) => <li key={index} style={{ overflowWrap: 'anywhere' }}>{habit.name}</li>)}</ul>}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={busy || pending.invalid} onClick={() => applyTemplate(null)}>{t('Thử lại')}</button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => {
            if (!window.confirm(t('Bộ thói quen có thể đã được tạo. Kiểm tra danh sách trước khi bỏ yêu cầu chờ.'))) return;
            try { clearHabitBatch(sessionStorage, userId); setPending(null); }
            catch { toast.error(t('Không thể lưu trên thiết bị này.')); }
          }}>{t('Bỏ yêu cầu chờ')}</button>
        </div>
      </div>}
      {target&&!loadError&&<section className="card" style={{marginBottom:'1rem'}} role="status"><p>{t(visibleHabits.length?'Đang xem đúng thói quen được chọn từ trang khác. Bạn tự chọn sửa, nhắc lịch hoặc bật/tắt.':'Không tìm thấy thói quen được chọn trong dữ liệu tài khoản đã tải.')}</p><button className="btn btn-secondary" disabled={busy} onClick={clearTarget}>{t('Xem tất cả thói quen')}</button></section>}
      {categoryTarget&&!loadError&&<section className="card" role="status" style={{marginBottom:'1rem'}}>
        <p>{t(categoryTarget.invalid?'Liên kết danh mục không hợp lệ. Chọn lại danh mục để tiếp tục.':'Đang xem thói quen theo danh mục hiện tại. Danh sách có thể gồm thói quen chưa có check-in trong tháng thống kê.')}</p>
        {!categoryTarget.invalid&&<strong>{categoryTarget.category==='none'?t('Không có danh mục'):localizedCategory(language,categories.find(row=>String(row.id)===categoryTarget.category))||t('Danh mục không còn trong danh sách')}</strong>}
        <div style={{marginTop:'.75rem'}}><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={resetFilters}>{t('Đặt lại bộ lọc')}</button></div>
      </section>}
      <div className="filter-bar" aria-label={t('Trạng thái thói quen')}>
        <button className={effectiveView === 'all' ? 'filter-chip active' : 'filter-chip'} disabled={busy} aria-pressed={!target&&effectiveView === 'all'} onClick={()=>changeView('all')}>{t('Tất cả trạng thái')} ({habits.length+inactive.length})</button>
        <button className={effectiveView === 'active' ? 'filter-chip active' : 'filter-chip'} disabled={busy} aria-pressed={!target&&effectiveView === 'active'} onClick={()=>changeView('active')}>{t('Đang bật')} ({habits.length})</button>
        <button className={effectiveView === 'inactive' ? 'filter-chip active' : 'filter-chip'} disabled={busy} aria-pressed={!target&&effectiveView === 'inactive'} onClick={()=>changeView('inactive')}>{t('Đã tắt')} ({inactive.length})</button>
      </div>
      {(target||categoryTarget?visibleHabits.some(h=>!h.active):effectiveView === 'inactive') && <p>{t('Thói quen đã tắt vẫn giữ lịch sử. Bật lại sẽ tính vào giới hạn thói quen đang hoạt động.')}</p>}
      {!target && !loadError && (habits.length > 0 || inactive.length > 0) && <section className="card" style={{ marginBottom: '1rem' }} aria-label={t('Tìm và lọc thói quen')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '2 1 200px' }}><label htmlFor="habit-search" className="form-label">{t('Tìm thói quen')}</label>
            <input id="habit-search" type="search" className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Tên, mô tả hoặc nhãn…')} /></div>
          <div style={{ flex: '1 1 150px' }}><label htmlFor="habit-difficulty-filter" className="form-label">{t('Độ khó')}</label>
            <select id="habit-difficulty-filter" className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="all">{t('Tất cả')}</option><option value="EASY">{t('Dễ')}</option><option value="MEDIUM">{t('Trung bình')}</option><option value="HARD">{t('Khó')}</option>
            </select></div>
        </div>
        <p role="status" style={{ marginTop: '0.75rem' }}>{t('Hiển thị {count}/{total} thói quen', { count: filteredHabits.length, total: visibleHabits.length })}</p>
        {filtering && <button className="btn btn-secondary btn-sm" onClick={resetFilters}>{t('Đặt lại bộ lọc')}</button>}
      </section>}
      {!loadError&&<HabitRestoreBatch habits={inactive} owner={userId} activeCount={habits.length} disabled={busy||Boolean(pending)} onBusy={value=>{mutation.current=value;setBusy(value);}} onChanged={async()=>{await load();announceHabitChange();}}/>}
      {!loadError&&<HabitPauseBatch habits={habits} disabled={busy||Boolean(pending)} onBusy={value=>{mutation.current=value;setBusy(value);}} onChanged={async()=>{await load();announceHabitChange();}}/>}
      {!loadError&&<CategoryManager categories={categories} habits={[...habits,...inactive]} disabled={busy||Boolean(pending)} onBusy={value=>{mutation.current=value;setBusy(value);}} onCategories={setCategories} onChanged={async()=>{setFilter('all');await load();announceHabitChange();}}/>}
      {!loadError&&<HabitCategoryBatch owner={userId} habits={[...habits,...inactive]} categories={categories} disabled={busy||Boolean(pending)} onBusy={value=>{mutation.current=value;setBusy(value);}} onChanged={async()=>{setFilter('all');await load();announceHabitChange();}}/>}
      {/* Filter Bar */}
      {!target && (categories.length > 0||habits.length>0||inactive.length>0) && (
        <div className="filter-bar">
          <button disabled={busy} aria-pressed={effectiveFilter === 'all'} className={`filter-chip ${effectiveFilter === 'all' ? 'active' : ''}`} onClick={() => changeCategory('all')}>{t('Tất cả')}</button>
          <button disabled={busy} aria-pressed={effectiveFilter==='none'} className={effectiveFilter==='none'?'filter-chip active':'filter-chip'} onClick={()=>changeCategory('none')}>{t('Không có danh mục')}</button>
          {categories.map(c => (
            <button disabled={busy} key={c.id} aria-pressed={effectiveFilter === c.id.toString()} className={`filter-chip ${effectiveFilter === c.id.toString() ? 'active' : ''}`} onClick={() => changeCategory(c.id.toString())}>
              {c.icon} {localizedCategory(language, c)}
            </button>
          ))}
        </div>
      )}

      {loadError && habits.length === 0 ? null : filteredHabits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>{filtering ? t('Không có thói quen phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.') : t(view === 'inactive' ? 'Không có thói quen đã tắt.' : 'Chưa có thói quen nào')}</p>
          {filtering ? <button className="btn btn-secondary" onClick={resetFilters}>{t('Đặt lại bộ lọc')}</button> : view === 'active' && <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button disabled={busy} className="btn btn-primary" onClick={openCreate}>{t('Tạo thói quen đầu tiên')}</button>
            <button disabled={busy} className="btn btn-secondary" onClick={() => {setSelectedTemplate(null);setShowTemplates(true);}}>{t('📦 Dùng template')}</button>
          </div>}
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
                  {h.scheduledDays && <span>{t('Lịch: {days}', { days: scheduleLabel(h.scheduledDays, language) })}</span>}
                  {h.categoryName && <span>📁 {localizedCategory(language, categories.find(category => category.id === h.categoryId)) ?? h.categoryName}</span>}
                  {h.tags && <span>🏷️ {h.tags}</span>}
                </div>
                {h.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{h.description}</div>}
                <HabitGoalLinks links={goalLinks.links.get(h.id)}/>
                {h.active&&<Link className="btn btn-secondary btn-sm" style={{marginTop:'0.5rem',marginRight:'0.5rem'}} to={challengeLink(h.id)}>{t('Lập thử thách 3 ngày trong 7 ngày')}</Link>}
                <Link className="btn btn-secondary btn-sm" style={{marginTop:'0.5rem',marginRight:'0.5rem'}} to={habitPath('/stats',h.id)}>{t('Xem tiến độ thói quen')}</Link>
                <HabitStateHistory habitId={h.id} stateVersion={`${h.targetPerWeek}:${h.scheduledDays}:${h.active}`} />
                <button className="btn btn-secondary btn-sm" style={{marginTop:'0.5rem'}} disabled={busy||Boolean(pending)} onClick={()=>setCopySource(h)}>{language==='en'?'Create a similar habit':'Tạo thói quen tương tự'}</button>
                {h.active&&<button className="btn btn-secondary btn-sm" style={{marginTop:'0.5rem'}} disabled={busy} onClick={()=>setReminderHabit(h)}>{t('Đặt lịch nhắc')}</button>}
              </div>
              <div className="habit-actions">
                {view === 'active' && isPremium && !filtering && habits.length <= 500 && <>
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
      {copySource&&<HabitCopyDialog source={copySource} categories={categories} disabled={busy||Boolean(pending)} onClose={()=>setCopySource(null)} onPrepare={draft=>{if(mutation.current||pending)return;resetForm();setForm(draft);setEditHabit(null);setCopiedFrom(copySource.name);setCopySource(null);setShowModal(true);}}/>}
      {reminderHabit&&<HabitReminderDialog owner={userId} habit={reminderHabit} onClose={()=>setReminderHabit(null)}/>}
      {showTemplates && (
        <ModalOverlay onClose={closeTemplates}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="habit-template-title" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();closeTemplates();}if(event.key==='Tab'){const controls=[...event.currentTarget.querySelectorAll('input:not(:disabled),select:not(:disabled),button:not(:disabled),[tabindex="0"]')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 id="habit-template-title" className="modal-title">{t('📦 Chọn Template')}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {t('Tạo nhanh nhiều thói quen cùng lúc từ bộ template có sẵn')}
            </p>
            {busy && <p role="status">{t('Đang tải…')}</p>}
            <HabitCapacityNotice state={capacityState}/>
            {selectedTemplate?<HabitTemplateReview template={selectedTemplate} categories={categories} existing={[...habits,...inactive]} capacity={capacity} busy={busy||Boolean(pending)} onCreate={applyTemplate} onBack={()=>{if(window.confirm(t('Bỏ lựa chọn và thay đổi chưa tạo từ bộ mẫu?')))setSelectedTemplate(null);}}/>:<HabitTemplateCatalog disabled={busy||Boolean(pending)} onChoose={chooseTemplate}/>}
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button disabled={busy} className="btn btn-secondary" onClick={closeTemplates}>{t('Đóng')}</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ModalOverlay onClose={closeForm}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="habit-form-title" onClick={e => e.stopPropagation()} onKeyDown={e => {
            if (e.key === 'Escape') { e.preventDefault(); closeForm(); }
            if (e.key === 'Tab') {
              const controls = [...e.currentTarget.querySelectorAll('input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)')];
              const first = controls[0], last = controls[controls.length - 1];
              if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
              if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
          }}>
            <h2 id="habit-form-title" className="modal-title">{editHabit ? t('Chỉnh sửa thói quen') : t('Tạo thói quen mới')}</h2>
            {editConflict && <div className="card" role="alert" style={{ marginBottom: '1rem' }}>
              <p>{editConflict}</p>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditHabit(null); setEditConflict(''); resetForm(); }}>{t('Đóng bản nháp và xem bản mới')}</button>
            </div>}
            {!editHabit&&copiedFrom&&<p>{language==='en'?'New draft based on: ':'Bản nháp mới dựa trên: '}{copiedFrom}. {language==='en'?'Review the name to distinguish it from the original.':'Xem lại tên để phân biệt với thói quen gốc.'}</p>}
            {!editHabit&&<HabitCapacityNotice state={capacityState}/>}
            <form onSubmit={handleSubmit}><fieldset disabled={busy || Boolean(editConflict)} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="habit-name">{t('Tên thói quen *')}</label>
                <input className="form-input" maxLength={255} id="habit-name" autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder={t('VD: Đọc sách 20 phút')} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="habit-description">{t('Mô tả')}</label>
                <textarea className="form-textarea" maxLength={255} id="habit-description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('Mô tả chi tiết')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="habit-difficulty">{t('Độ khó')}</label>
                  <select className="form-select" id="habit-difficulty" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="EASY">{t('Dễ (5 điểm)')}</option>
                    <option value="MEDIUM">{t('Trung bình (10 điểm)')}</option>
                    <option value="HARD">{t('Khó (20 điểm)')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="habit-targetPerWeek">{t('Mục tiêu / tuần')}</label>
                  <input type="number" className="form-input" min="1" max="7" step="1" required id="habit-targetPerWeek" value={form.targetPerWeek} onChange={e => {
                    const target = e.target.value;
                    setForm({ ...form, targetPerWeek: target, scheduledDays: fitSchedule(form.scheduledDays, target) });
                  }} />
                </div>
              </div>
              <fieldset className="weekday-schedule">
                <legend className="form-label">{t('Ngày thực hiện')}</legend>
                <p className="form-hint">{t('Chọn đúng {count} ngày. Lịch này quyết định ngày nào được tính là ngày cần duy trì streak.', { count: form.targetPerWeek })}</p>
                <div className="weekday-schedule-options">
                  {WEEK_DAYS.map(([code, vi, en]) => {
                    const checked = scheduleDays(form.scheduledDays).has(code);
                    return <label key={code} className={`weekday-option${checked ? ' selected' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const selected = scheduleDays(form.scheduledDays);
                        if (selected.has(code)) selected.delete(code); else selected.add(code);
                        setForm({ ...form, scheduledDays: WEEK_DAYS.filter(([day]) => selected.has(day)).map(([day]) => day).join(',') });
                      }} />
                      <span>{language === 'en' ? en : vi}</span>
                    </label>;
                  })}
                </div>
              </fieldset>
              <div className="form-group">
                <label className="form-label" htmlFor="habit-categoryId">{t('Danh mục')}</label>
                <select className="form-select" id="habit-categoryId" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">{t('-- Không chọn --')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {localizedCategory(language, c)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="habit-tags">{t('Tags (cách bởi dấu phẩy)')}</label>
                <input className="form-input" maxLength={255} id="habit-tags" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder={t('VD: sức khỏe, buổi sáng')} />
              </div>
              <div className="modal-actions">
                <button disabled={busy} type="button" className="btn btn-secondary" onClick={closeForm}>{t('Hủy')}</button>
                <button disabled={busy||(!editHabit&&!fitsHabitCapacity(capacity,1))} type="submit" className="btn btn-primary">{editHabit ? t('Cập nhật') : t('Tạo')}</button>
              </div>
            </fieldset></form>
          </div>
        </ModalOverlay>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <ModalOverlay onClose={() => { if (!mutation.current) setConfirmDelete(null); }}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="habit-disable-title" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">⚠️</div>
              <div id="habit-disable-title" className="confirm-text">{t('Bạn có chắc muốn tắt thói quen này?')}<br />{t('Thói quen sẽ không hiển thị nữa nhưng dữ liệu vẫn được giữ lại.')}</div>
              <div className="confirm-actions">
                <button disabled={busy} className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>{t('Hủy')}</button>
                <button disabled={busy} className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>{t('Tắt thói quen')}</button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
