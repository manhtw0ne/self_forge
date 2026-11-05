import ResourceScopeNotice from '../components/ResourceScopeNotice';
import {readResourceTarget,targetedResources} from '../utils/resourceTarget';
import {repeatChallengeDraft} from '../utils/repeatChallenge';
import {selectChallenges,challengePeriod,challengeListExport} from '../utils/challengeList';
import {downloadText} from '../utils/downloadText';
import {challengeDraftSchedule,challengeStartPreset} from '../utils/challengeSchedule';
import ChallengeHistory from '../components/ChallengeHistory';
import ChallengeNextStep from '../components/ChallengeNextStep';
import {useAccountDate} from '../hooks/useAccountDate';
import {challengeWindowDays} from '../utils/challengeWindow';
import ModalOverlay from '../components/ModalOverlay';
import { Link, useSearchParams } from 'react-router-dom';
import {readChallengeProposal,challengeProposalDraft} from '../utils/challengeProposal';
import { createLatestRequest } from '../utils/latestRequest';
import { useAuth } from '../context/useAuth';
import { challengePayload, createChallengeSafely, readPendingChallenge, removePendingChallenge } from '../utils/pendingChallenge';
import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate } from '../utils/dates';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { publishAccountDataChange, subscribeAccountDataChanges } from '../utils/accountDataSync';

export default function ChallengesPage() {
  const { user } = useAuth();
  return <ChallengesContent key={user.id} userId={user.id} timezone={user.timezone} />;
}
function ChallengesContent({ userId,timezone }) {
  const today=useAccountDate(timezone);
  const [searchParams,setSearchParams]=useSearchParams();
  const selectedChallenge=readResourceTarget(searchParams.toString(),'challenge');
  const proposal=readChallengeProposal(searchParams);

  const { language, t } = useLanguage();
  const [pending, setPending] = useState(() => {
    try { return readPendingChallenge(window.sessionStorage, userId); } catch { return { invalid: true }; }
  });
  const [pendingError, setPendingError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [progressErrors, setProgressErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [habitFilter, setHabitFilter] = useState('ALL');
  const [periodFilter,setPeriodFilter]=useState('ALL'),[query,setQuery]=useState(''),[sort,setSort]=useState('default');
  const [challenges, setChallenges] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [repeatSource,setRepeatSource]=useState(null);
  const [form, setForm] = useState({ habitId: '', name: '', description: '', targetDays: 7,windowDays:7,startDate:'' });
  const [progress, setProgress] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const mutationInFlight = useRef(false);
  const requests = useRef(createLatestRequest());
  const progressRequests = useRef(new Map());
  const initialForm = useRef(null);
  const formDirty = showModal && initialForm.current && Object.keys(form).some(key => String(form[key]) !== String(initialForm.current[key]));
  let schedule=null;try{schedule=challengeDraftSchedule(form,today);}catch{/* Keep invalid input editable. */}
  const proposalDraft=challengeProposalDraft(proposal,habits);
  const openRepeat=(challenge,evidence,mode)=>{
    if(pending||busy||mutationInFlight.current)return;
    try{
      const draft=repeatChallengeDraft(challenge,evidence,habits,today,mode);
      if(Object.keys(form).some(key=>String(form[key])!==String(({habitId:'',name:'',description:'',targetDays:7,windowDays:7,startDate:''})[key]))&&!window.confirm(t('Thay bản nháp hiện tại bằng đề xuất này?')))return;
      initialForm.current={...form};setRepeatSource(challenge.name);setForm(draft);setShowModal(true);
    }catch(error){toast.error(t(error.message));}
  };
  const openProposal=()=>{
    if(pending||busy||!proposalDraft)return;
    if(Object.keys(form).some(key=>String(form[key])!==String(({habitId:'',name:'',description:'',targetDays:7,windowDays:7,startDate:''})[key]))&&!window.confirm(t('Thay bản nháp hiện tại bằng đề xuất này?')))return;
    initialForm.current={...form};setRepeatSource(null);setForm(proposalDraft);setShowModal(true);
  };
  const openCreate = () => { setRepeatSource(null); initialForm.current = { ...form }; setShowModal(true); };
  const closeCreate = () => {
    if (mutationInFlight.current) return;
    if (formDirty && !window.confirm(t('Đóng biểu mẫu và bỏ thay đổi chưa lưu?'))) return;
    setForm(initialForm.current || { habitId: '', name: '', description: '', targetDays: 7,windowDays:7,startDate:'' });
    setShowModal(false);setRepeatSource(null);
  };
  useEffect(() => {
    if (!formDirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formDirty]);
  const closeDelete = () => { if (!mutationInFlight.current) setConfirmDelete(null); };

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    return requests.current.run(() => Promise.all([api.get('/challenges'), api.get('/habits')]),
      ([c, h]) => { setChallenges(c.data); setHabits(h.data); },
      () => setLoadError(true), () => setLoading(false));
  }, []);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  const announceChallengeChange = () => {
    if (typeof window !== 'undefined') publishAccountDataChange(userId, 'challenges', window.localStorage);
  };

  useEffect(() => {
    load();
    const gate = requests.current;
    return () => gate.invalidate();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    return subscribeAccountDataChanges(window, userId, change => {
      if (!['challenges', 'habits', 'dashboard'].includes(change.resource)) return;
      if (showModal || confirmDelete || pending || mutationInFlight.current) {
        setNeedsRefresh(true);
        return;
      }
      loadRef.current();
    });
  }, [userId, showModal, confirmDelete, pending]);

  const loadProgress = useCallback(id => {
    let gate = progressRequests.current.get(id);
    if (!gate) { gate = createLatestRequest(); progressRequests.current.set(id, gate); }
    setProgressErrors(prev => ({ ...prev, [id]: false }));
    return gate.run(() => api.get('/challenges/' + id + '/progress'),
      res => setProgress(prev => ({ ...prev, [id]: res.data })),
      () => setProgressErrors(prev => ({ ...prev, [id]: true })), () => {});
  }, []);

  useEffect(() => {
    setProgress(Object.fromEntries(challenges.filter(c => Number.isInteger(c.completedDays)).map(c => [c.id, c])));
    setProgressErrors({});
    // Older servers remain usable during a rolling deployment.
    challenges.filter(c => !Number.isInteger(c.completedDays)).forEach(c => loadProgress(c.id));
    const gates = progressRequests.current;
    return () => { gates.forEach(gate => gate.invalidate()); gates.clear(); };
  }, [challenges, loadProgress]);

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (mutationInFlight.current) return;
    let payload;
    try { if (!pending) {const planned=challengeDraftSchedule(form,today);payload=challengePayload({...form,startDate:planned.startDate});} }
    catch (err) { toast.error(t(err.message)); return; }
    mutationInFlight.current = true;
    setBusy(true);
    try {
      await createChallengeSafely(window.sessionStorage, userId, payload, payload => api.post('/challenges', payload));
      setPending(null);
      setPendingError(false);
      setForm({ habitId: '', name: '', description: '', targetDays: 7,windowDays:7,startDate:'' });
      setShowModal(false);setRepeatSource(null);
      toast.success(t("Đã tạo thử thách mới! ⚡"));
      await load();
      announceChallengeChange();
    } catch (err) {
      let stored;
      try { stored = readPendingChallenge(window.sessionStorage, userId); } catch { stored = { invalid: true }; }
      setPending(stored);
      setPendingError(Boolean(stored));
      if (stored) { setShowModal(false);setRepeatSource(null); }
      toast.error(t(err.response?.data?.detail || 'Có lỗi xảy ra'));
    } finally { mutationInFlight.current = false; setBusy(false); }
  };

  const discardPending = () => {
    if (mutationInFlight.current || !window.confirm(t('Bỏ bản lưu yêu cầu? Thử thách có thể đã được tạo. Hãy kiểm tra danh sách trước khi tạo lại.'))) return;
    try { removePendingChallenge(window.sessionStorage, userId); setPending(null); setPendingError(false); }
    catch { toast.error(t('Không thể xóa bản lưu yêu cầu trên trình duyệt.')); }
  };

  const stopChallenge = async challenge => {
    if (mutationInFlight.current || !window.confirm(t('Dừng thử thách {name}? Lịch sử check-in vẫn được giữ.', { name: challenge.name }))) return;
    mutationInFlight.current = true; setBusy(true);
    try {
      await api.patch('/challenges/' + challenge.id + '/status', { status: 'ABANDONED' });
      toast.info(t('Đã dừng thử thách và giữ lịch sử check-in.'));
      await load();
      announceChallengeChange();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy tải lại danh sách và thử lại.'));
      await load();
    } finally { mutationInFlight.current = false; setBusy(false); }
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
      announceChallengeChange();
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Không thể xóa thử thách'));
      setConfirmDelete(null);
      await load();
    } finally { mutationInFlight.current = false; setBusy(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (loadError) return <div className="empty-state" role="alert"><p>{t('Không thể tải thử thách.')}</p><button className="btn btn-secondary" onClick={load}>{t('Thử lại')}</button></div>;

  const visibleChallenges = selectedChallenge?targetedResources(challenges,selectedChallenge):selectChallenges(challenges,{today,status:statusFilter,habit:habitFilter,period:periodFilter,query,sort});
  const challengeHabits = [...new Map(challenges.map(c => [c.habitId, c.habitName])).entries()];
  const statusLabel = (s) => s === 'ACTIVE' ? 'Đang chạy' : s === 'COMPLETED' ? 'Hoàn thành' : 'Đã dừng thử thách';

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>{t("⚡ Thử thách")}</h1>
          <p>{t("Đặt ra thử thách và chinh phục chúng")}</p>
        </div>
        <button className="btn btn-primary" disabled={!!pending || busy || habits.length === 0} onClick={openCreate}>{t("+ Thử thách mới")}</button>
      </div>

      <ResourceScopeNotice target={selectedChallenge} count={visibleChallenges.length} kind="challenge" onClear={()=>{const next=new URLSearchParams(searchParams);next.delete('challenge');setSearchParams(next);setStatusFilter('ALL');setHabitFilter('ALL');setPeriodFilter('ALL');setQuery('');}}/>
      {needsRefresh && <section className="card" role="status" style={{ marginBottom: '1rem' }}>
        <p>{t('Thử thách hoặc dữ liệu check-in liên quan vừa thay đổi ở cửa sổ khác. Bản nháp đang mở được giữ nguyên.')}</p>
        <button className="btn btn-secondary" disabled={busy || showModal || Boolean(confirmDelete)} onClick={() => { setNeedsRefresh(false); load(); }}>{t('Tải phiên bản mới')}</button>
      </section>}
      {proposal&&!loading&&!loadError&&<section className="card" style={{marginBottom:'1rem'}} aria-label={t('Thử thách từ thói quen')}>
        <h3>{t('Thử thách từ thói quen')}</h3>
        {proposalDraft?<><p>{proposalDraft.name} — {t('{target} ngày hoàn thành trong {window} ngày',{target:proposalDraft.targetDays,window:proposalDraft.windowDays})}</p><p>{t('Xem và chỉnh trước khi tạo. Check-in và tiến độ mục tiêu vẫn do bạn cập nhật.')}</p><button className="btn btn-secondary" disabled={Boolean(pending)||busy} onClick={openProposal}>{t('Xem và chỉnh thử thách đề xuất')}</button>{pending&&<p>{t('Hãy xử lý yêu cầu tạo đang chờ trước khi dùng đề xuất mới.')}</p>}</>:<p role="alert">{t('Đề xuất không hợp lệ hoặc thói quen không còn hoạt động trong tài khoản này.')}</p>}
      </section>}
      <p>{t('Thử thách tự hoàn thành khi đủ ngày check-in hoàn thành trong khoảng thời gian của thử thách. Sửa check-in có thể thay đổi trạng thái; thử thách đã dừng giữ nguyên trạng thái.')}</p>
      {habits.length === 0 && <div className="card" style={{ marginBottom: '1rem' }}><p>{t('Tạo hoặc bật lại một thói quen trước khi bắt đầu thử thách.')}</p><Link className="btn btn-secondary" to="/habits">{t('Đến trang thói quen')}</Link></div>}
      {pending && <div className="card" role="status">
        <p>{t(pending.invalid ? 'Yêu cầu chờ bị hỏng. Chưa gửi thao tác mới.' : 'Có yêu cầu tạo thử thách chưa xác nhận. Thử lại sẽ dùng đúng nội dung đã gửi.')}</p>
        {!pending.invalid && <button className="btn btn-primary" disabled={busy} onClick={() => handleCreate()}>{t('Thử lại')}</button>}
        {(pending.invalid || pendingError) && <button className="btn btn-secondary" disabled={busy} onClick={discardPending}>{t('Bỏ bản lưu yêu cầu')}</button>}
      </div>}
      {!selectedChallenge&&challenges.length > 0 && <section className="card" style={{ marginBottom: '1rem' }} aria-label={t('Lọc thử thách')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '1 1 160px' }}><label htmlFor="challenge-status-filter" className="form-label">{t('Trạng thái')}</label>
            <select id="challenge-status-filter" className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {[['ALL', 'Tất cả'], ['ACTIVE', 'Đang chạy'], ['COMPLETED', 'Hoàn thành'], ['ABANDONED', 'Đã dừng thử thách']].map(([value, label]) => <option key={value} value={value}>{t(label)} ({value === 'ALL' ? challenges.length : challenges.filter(c => c.status === value).length})</option>)}
            </select></div>
          <div style={{ flex: '1 1 200px' }}><label htmlFor="challenge-habit-filter" className="form-label">{t('Thói quen')}</label>
            <select id="challenge-habit-filter" className="form-select" value={habitFilter} onChange={e => setHabitFilter(e.target.value)}>
              <option value="ALL">{t('Tất cả')}</option>{challengeHabits.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
            </select></div>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'1rem',marginTop:'1rem'}}>
          <label className="form-label" style={{flex:'2 1 220px'}}>{t('Tìm thử thách')}<input className="form-input" type="search" maxLength="255" value={query} onChange={event=>setQuery(event.target.value)}/></label>
          <label className="form-label" style={{flex:'1 1 180px'}}>{t('Khoảng thời gian')}<select className="form-select" value={periodFilter} onChange={event=>setPeriodFilter(event.target.value)}>{[['ALL','Tất cả'],['UPCOMING','Chưa đến ngày bắt đầu'],['CURRENT','Trong khoảng thực hiện'],['ENDED','Đã hết khoảng thực hiện']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label>
          <label className="form-label" style={{flex:'1 1 180px'}}>{t('Sắp xếp')}<select className="form-select" value={sort} onChange={event=>setSort(event.target.value)}>{[['default','Thứ tự mặc định'],['start','Ngày bắt đầu gần nhất trước'],['end','Ngày kết thúc gần nhất trước'],['name','Theo tên']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label>
        </div>
        <p>{t('Khoảng thời gian chỉ phản ánh lịch theo múi giờ tài khoản; không tự đổi trạng thái hoặc coi thử thách hết hạn là thất bại.')}</p>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!visibleChallenges.length} onClick={()=>{try{const result=challengeListExport(visibleChallenges,today,t);downloadText(result.content,result.filename,'text/csv;charset=utf-8');}catch{toast.error(t('Chưa xuất được danh sách thử thách. Hãy tải lại rồi thử lại.'));}}}>{t('Tải danh sách thử thách đang xem (.csv)')}</button>
        <p>{t('Bản CSV gồm lịch và trạng thái của danh sách đang lọc, không gồm lịch sử check-in, ghi chú hoặc yêu cầu tạo đang chờ.')}</p>
        <p role="status" style={{ marginTop: '0.75rem' }}>{t('Hiển thị {count}/{total} thử thách', { count: visibleChallenges.length, total: challenges.length })}</p>
        {(statusFilter !== 'ALL' || habitFilter !== 'ALL'||periodFilter!=='ALL'||query||sort!=='default') && <button className="btn btn-secondary btn-sm" onClick={() => { setStatusFilter('ALL'); setHabitFilter('ALL');setPeriodFilter('ALL');setQuery('');setSort('default'); }}>{t('Đặt lại bộ lọc')}</button>}
        {visibleChallenges.length === 0 && <p>{t('Không có thử thách phù hợp với bộ lọc.')}</p>}
      </section>}
      {challenges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <p>{t("Chưa có thử thách nào")}</p>
          <button className="btn btn-primary" disabled={!!pending || busy || habits.length === 0} onClick={openCreate}>{t("Tạo thử thách đầu tiên")}</button>
        </div>
      ) : (
        <div className="card-grid card-grid-2">
          {visibleChallenges.map((c, i) => {
            const p = progress[c.id];
            return (
              <div key={c.id} className="card slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', overflowWrap: 'anywhere' }}>{c.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge ${c.status === 'ACTIVE' ? 'badge-info' : c.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                      {t(statusLabel(c.status))}
                    </span>
                    <button className="btn btn-ghost btn-sm" disabled={busy} aria-label={t('Xóa thử thách {name}', { name: c.name })} onClick={() => setConfirmDelete(c.id)} title={t("Xóa")} style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}>🗑</button>
                  </div>
                </div>
                <p style={{ overflowWrap: 'anywhere', marginBottom: '0.5rem' }}>{t('Thói quen: {name}', { name: c.habitName })}</p>
                {c.status === 'ACTIVE' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => stopChallenge(c)}>{t('Dừng thử thách')}</button>
                </div>}
                <ChallengeHistory challenge={c} today={today}/>
                {c.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{c.description}</p>}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {challengePeriod(c,today)!=='UNKNOWN'&&<p>{t({UPCOMING:'Chưa đến ngày bắt đầu',CURRENT:'Trong khoảng thực hiện',ENDED:'Đã hết khoảng thực hiện'}[challengePeriod(c,today)])}</p>}
                  {challengeWindowDays(c)&&<p>{t('{target} ngày hoàn thành trong {window} ngày lịch',{target:c.targetDays,window:challengeWindowDays(c)})}</p>}
                  📅 {formatCalendarDate(c.startDate, language)} → {formatCalendarDate(c.endDate, language)} · 🎯 {t('{count} ngày', { count: c.targetDays })}
                </div>
                {progressErrors[c.id] && <div role="status"><p>{t('Không thể tải tiến độ.')}</p><button className="btn btn-secondary btn-sm" onClick={() => loadProgress(c.id)}>{t('Thử lại')}</button></div>}
                {!p && !progressErrors[c.id] && <p role="status">{t('Đang tải tiến độ…')}</p>}
                {p && !progressErrors[c.id] && (
                  <>
                    <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                      <div className={`progress-fill ${p.completionRate >= 0.8 ? 'success' : p.completionRate >= 0.5 ? 'warning' : ''}`} style={{ width: `${p.completionRate * 100}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>✅ {t('{done}/{total} ngày', { done: p.completedDays, total: p.targetDays })}</span>
                      <span>{Math.round(p.completionRate * 100)}%</span>
                    </div>
                    <ChallengeNextStep challenge={c} progress={p} today={today} habitActive={habits.some(h=>h.id===c.habitId&&h.active)} disabled={busy||!!pending} onRepeat={mode=>openRepeat(c,p,mode)}/>
                    <button className="btn btn-ghost btn-sm" style={{marginTop:'0.75rem'}} onClick={load}>{t('Cập nhật tiến độ thử thách')}</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <ModalOverlay onClose={closeCreate}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="challenge-create-title" onKeyDown={event => {
            if (event.key === 'Escape') { event.stopPropagation(); closeCreate(); }
            if (event.key === 'Tab') {
              const controls = [...event.currentTarget.querySelectorAll('input, select, textarea, button')].filter(node => !node.matches(':disabled'));
              const first = controls[0], last = controls[controls.length - 1];
              if (!first) { event.preventDefault(); return; }
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
          }} onClick={e => e.stopPropagation()}>
            <h2 id="challenge-create-title" className="modal-title">{t("Tạo thử thách mới")}</h2>
            {repeatSource&&<p>{t('Dùng lại cấu hình từ “{name}”. Xem lại tên, mục tiêu và ngày bắt đầu trước khi tạo. Tiến độ cũ vẫn được giữ riêng; thử thách mới tính check-in trong khoảng ngày mới.',{name:repeatSource})}</p>}
            <form onSubmit={handleCreate} aria-busy={busy}>
              <fieldset disabled={busy || !!pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="form-group">
                <label htmlFor="challenge-habit" className="form-label">{t("Thói quen *")}</label>
                <select id="challenge-habit" autoFocus className="form-select" value={form.habitId} onChange={e => setForm({ ...form, habitId: e.target.value })} required>
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
                <label htmlFor="challenge-days" className="form-label">{t('Số ngày hoàn thành cần đạt')}</label>
                <input id="challenge-days" type="number" min="1" max="365" step="1" className="form-input" value={form.targetDays} onChange={e=>setForm({...form,targetDays:e.target.value})} required/>

              </div>
              <div className="form-group"><label htmlFor="challenge-start" className="form-label">{t('Ngày bắt đầu thử thách')}</label><input id="challenge-start" type="date" className="form-input" min={today} max="9999-12-31" value={form.startDate||''} onChange={event=>setForm({...form,startDate:event.target.value})}/><p>{t('Để trống để bắt đầu hôm nay theo múi giờ tài khoản.')}</p></div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',margin:'1rem 0'}}>{[['TODAY','Bắt đầu hôm nay'],['TOMORROW','Bắt đầu ngày mai'],['MONDAY','Thứ hai kế tiếp']].map(([value,label])=><button type="button" key={value} className="btn btn-secondary btn-sm" onClick={()=>{try{setForm({...form,startDate:challengeStartPreset(value,today)});}catch{toast.error(t('Chọn ngày bắt đầu hợp lệ và khoảng thử thách từ 1 đến 365 ngày.'));}}}>{t(label)}</button>)}</div>
              <div className="form-group"><label htmlFor="challenge-window" className="form-label">{t('Trong khoảng bao nhiêu ngày lịch?')}</label><input id="challenge-window" type="number" min={Number(form.targetDays)||1} max="365" step="1" className="form-input" value={form.windowDays} onChange={e=>setForm({...form,windowDays:e.target.value})} required/></div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',margin:'1rem 0'}}>{[[3,7],[5,14],[7,7]].map(([target,window])=><button key={target+':'+window} type="button" className="btn btn-secondary btn-sm" onClick={()=>setForm({...form,targetDays:target,windowDays:window})}>{t('{target} ngày trong {window} ngày',{target,window})}</button>)}</div>
              {schedule?<p role="status">{t('Cần {target} ngày hoàn thành trong {window} ngày lịch; có thể nghỉ xen kẽ.',{target:schedule.targetDays,window:schedule.windowDays})}<br/>{formatCalendarDate(schedule.startDate,language)} → {formatCalendarDate(schedule.endDate,language)}</p>:<p role="alert">{t('Chọn ngày bắt đầu hợp lệ và khoảng thử thách từ 1 đến 365 ngày.')}</p>}
              {schedule?.startDate>today&&<p role="status">{t('Thử thách này chưa bắt đầu. Chỉ check-in từ ngày bắt đầu đến hết ngày kết thúc mới được tính; ứng dụng không tự bắt đầu phiên hay gửi thông báo nhắc.')}</p>}
              <p>{t('Mỗi ngày chỉ tính một check-in hoàn thành của thói quen này. Không tự tạo check-in hoặc thêm XP thử thách.')}</p>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreate}>{t("Hủy")}</button>
                <button type="submit" className="btn btn-primary">{t(busy ? 'Đang xử lý…' : 'Tạo')}</button>
              </div>
              </fieldset>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <ModalOverlay onClose={closeDelete}>
          <div className="modal scale-in" role="dialog" aria-modal="true" aria-labelledby="challenge-delete-title" onKeyDown={event => {
            if (event.key === 'Escape') { event.stopPropagation(); closeDelete(); }
            if (event.key === 'Tab') {
              const buttons = [...event.currentTarget.querySelectorAll('button')].filter(node => !node.disabled);
              const first = buttons[0], last = buttons[buttons.length - 1];
              if (!first) { event.preventDefault(); return; }
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
          }} onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog">
              <div className="confirm-icon">⚠️</div>
              <div id="challenge-delete-title" className="confirm-text">{t('Xóa vĩnh viễn thử thách {name}? Không thể hoàn tác.', { name: challenges.find(c => c.id === confirmDelete)?.name || '' })}</div>
              <div className="confirm-actions">
                <button autoFocus disabled={busy} className="btn btn-secondary" onClick={closeDelete}>{t("Hủy")}</button>
                <button disabled={busy} className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>{t("Xóa")}</button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
