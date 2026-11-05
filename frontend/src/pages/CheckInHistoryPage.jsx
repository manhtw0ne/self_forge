import {readCheckInTarget,checkInEntryPath,selectedCheckIn} from '../utils/checkInNavigation';
import CheckInRangeSearch from '../components/CheckInRangeSearch';
import { selectCheckInHistory } from '../utils/checkInHistory';
import { useAccountDate } from '../hooks/useAccountDate';
import { needsCheckInRefresh } from '../utils/checkInFailure';
import { useEffect, useRef, useState,useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import CheckInEditor from '../components/CheckInEditor';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { shiftDate, validCalendarDate, formatCalendarDate } from '../utils/dates';
import { saveAndRefresh } from '../utils/saveAndRefresh';

export default function CheckInHistoryPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const today = useAccountDate(user.timezone);
  const [params, setParams] = useSearchParams();
  const target=useMemo(()=>readCheckInTarget(params.toString(),today),[params,today]);
  const requestedDate=target.date;
  const acceptedTarget=useRef(target);
  const [date, setDate] = useState(requestedDate);
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(20);
  useEffect(() => { setVisibleCount(20); }, [date, query, statusFilter]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [rangeRefresh,setRangeRefresh]=useState(0);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    const previous=acceptedTarget.current;
    if(previous.date===target.date&&previous.entryId===target.entryId&&previous.invalid===target.invalid)return;
    if(busy.current||editing){
      setParams(previous.entryId===null?{date:previous.date}:{date:previous.date,entry:String(previous.entryId)},{replace:true});
      setMessage('Đóng phần sửa check-in trước khi chuyển ngày hoặc bản ghi.');return;
    }
    acceptedTarget.current=target;setMessage('');
    if(target.date!==date){setLoading(true);setDate(target.date);}
  },[target,date,editing,setParams]);
  useEffect(() => {
    if(editing||busy.current)return;
    if(target.invalid){setEntries([]);setLoading(false);setError(false);return;}
    let active = true;
    setLoading(true); setError(false);
    api.get('/check-ins', { params: { date } }).then(response => {
      if (active) { setEntries(response.data); setUncertain(false); }
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, attempt,target.entryId,target.invalid,editing]);
  const selectDate = next => {
    if (busy.current || editing || !validCalendarDate(next,today)||next<'0001-01-01'||(next === date&&!target.invalid&&target.entryId===null)) return;
    setLoading(true); setMessage(''); setDate(next); setParams({ date: next });
  };
  const reload = () => {
    if (busy.current) return;
    if (editing && !window.confirm(t('Tải lại sẽ đóng phần sửa check-in. Bạn đã giữ lại ghi chú cần thiết chưa?'))) return;
    setEditing(null); setLoading(true); setAttempt(value => value + 1);setRangeRefresh(value=>value+1);
  };
  const save = async payload => {
    if (busy.current || uncertain) return;
    busy.current = true; setSaving(true); setMessage('');
    try {
      const result = await saveAndRefresh(() => api.post('/check-ins', payload),
        () => api.get('/check-ins', { params: { date } }));
      setEditing(null);setRangeRefresh(value=>value+1);
      if (result.refreshFailed) {
        setUncertain(true);
        setMessage('Đã lưu thay đổi nhưng chưa tải lại được dữ liệu. Hãy tải lại trước khi thao tác tiếp.');
      } else { setEntries(result.data.data); setMessage('Đã cập nhật check-in.'); }
    } catch (failure) {
      setUncertain(needsCheckInRefresh(failure));
      setMessage(failure.response?.data?.detail || 'Chưa xác nhận được kết quả. Hãy kiểm tra danh sách sau khi tải lại.');
    } finally { busy.current = false; setSaving(false); }
  };
  const chosen=selectedCheckIn(entries,target);
  const filtered = target.entryId!==null?(chosen?[chosen]:[]):selectCheckInHistory(entries, { query, status: statusFilter });
  const labels = { COMPLETED: 'Hoàn thành', SKIPPED: 'Bỏ qua', FAILED: 'Thất bại' };
  return <div className="fade-in">
    <div className="page-header"><h1>{t('Lịch sử check-in')}</h1><p>{t('Xem và sửa những lần ghi nhận trước đây.')}</p><Link to="/">{t('Về hôm nay')}</Link></div>
    <CheckInRangeSearch key={user.id} today={today} timezone={user.timezone} disabled={saving||!!editing||uncertain} refreshKey={rangeRefresh} onOpen={row=>{if(busy.current||editing)return;setQuery('');setStatusFilter('ALL');if(row.date===date&&row.id===target.entryId){setLoading(true);setAttempt(value=>value+1);}setParams(new URLSearchParams(checkInEntryPath(row.date,row.id).split('?')[1]));requestAnimationFrame(()=>document.getElementById('checkin-day')?.scrollIntoView({block:'start'}));}}/>
    <div className="card" id="checkin-day" style={{ marginBottom: '1rem' }}>
      <label className="form-label" htmlFor="history-date">{t('Chọn ngày')}</label>
      <input id="history-date" className="form-input" type="date" min="0001-01-01" value={date} max={today} disabled={saving || !!editing}
        onChange={event => { if (event.target.validity.valid) selectDate(event.target.value); }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        <button className="btn btn-secondary" disabled={saving || !!editing} onClick={() => selectDate(shiftDate(date, -1))}>{t('← Trước')}</button>
        <button className="btn btn-secondary" disabled={saving || !!editing || date >= today} onClick={() => selectDate(shiftDate(date, 1))}>{t('Sau →')}</button>
        <button className="btn btn-secondary" disabled={saving || loading} onClick={reload}>{t('Tải lại')}</button>
      </div>
    </div>
    {!target.invalid&&target.entryId!==null&&<section className="card" role="status" style={{marginBottom:'1rem'}}>
      <p>{t('Đang xem riêng bản ghi đã chọn. Dữ liệu được tải lại từ tài khoản, không lấy nội dung cũ từ kết quả tìm kiếm.')}</p>
      {!loading&&!error&&!chosen&&<p>{t('Không tìm thấy bản ghi này trong ngày đã chọn của tài khoản. Nó có thể đã bị xóa hoặc liên kết không còn đúng.')}</p>}
      <button type="button" className="btn btn-secondary btn-sm" disabled={saving||!!editing} onClick={()=>{setQuery('');setStatusFilter('ALL');setParams({date});}}>{t('Xem tất cả check-in trong ngày')}</button>
    </section>}
    {!target.invalid&&target.entryId===null&&<div className="card" style={{ marginBottom: '1rem' }}>
      <label className="form-label" htmlFor="history-query">{t('Tìm tên thói quen hoặc ghi chú')}</label>
      <input id="history-query" type="search" className="form-input" maxLength={255} value={query} disabled={saving || !!editing} onChange={event => setQuery(event.target.value)} />
      <label className="form-label" htmlFor="history-status" style={{ marginTop: '0.75rem' }}>{t('Trạng thái')}</label>
      <select id="history-status" className="form-select" value={statusFilter} disabled={saving || !!editing} onChange={event => setStatusFilter(event.target.value)}>
        <option value="ALL">{t('Tất cả trạng thái')}</option>
        <option value="COMPLETED">{t('Hoàn thành')}</option>
        <option value="SKIPPED">{t('Bỏ qua')}</option>
        <option value="FAILED">{t('Thất bại')}</option>
      </select>
      {(query || statusFilter !== 'ALL') && <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} disabled={saving || !!editing} onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>{t('Xóa bộ lọc')}</button>}
    </div>}
    {message && <p role="status">{t(message)}</p>}
    {editing && <CheckInEditor habit={editing} disabled={saving || uncertain} saving={saving} onSave={save} onCancel={() => setEditing(null)} />}
    <h2>{formatCalendarDate(date, language)}</h2>
    {!target.invalid&&target.entryId===null&&!loading && !error && !uncertain && entries.length > 0 && <p role="status">{t('{completed} hoàn thành · {skipped} bỏ qua · {failed} thất bại', {
      completed: entries.filter(entry => entry.status === 'COMPLETED').length,
      skipped: entries.filter(entry => entry.status === 'SKIPPED').length,
      failed: entries.filter(entry => entry.status === 'FAILED').length,
    })}</p>}
    {target.invalid?<section className="card" role="alert"><p>{t('Liên kết check-in không hợp lệ. Chọn lại ngày hoặc tìm bản ghi trong tài khoản.')}</p><button type="button" className="btn btn-secondary" disabled={saving||!!editing} onClick={()=>setParams({date:today})}>{t('Về hôm nay')}</button></section>:loading ? <p role="status">{t('Đang tải...')}</p> : error ? <div role="alert"><p>{t('Không thể tải dữ liệu.')}</p><button className="btn btn-secondary" onClick={reload}>{t('Thử lại')}</button></div> : entries.length === 0 ? <p>{t('Chưa có check-in trong ngày này.')}</p> : filtered.length === 0 ? <p role="status">{t('Không có check-in khớp bộ lọc.')}</p> : <div style={{ display: 'grid', gap: '1rem' }}>
      <p role="status">{t('Hiển thị {shown}/{total} check-in', { shown: Math.min(visibleCount, filtered.length), total: filtered.length })}</p>
      {filtered.slice(0, visibleCount).map(entry => <article className="card" id={'checkin-entry-'+entry.id} key={entry.id}>
        <h3 style={{ overflowWrap: 'anywhere' }}>{entry.habitName}</h3>
        <p>{t(labels[entry.status] || entry.status)} · {t('{points} điểm', { points: entry.scoreImpact })}</p>
        {entry.note && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{entry.note}</p>}
        {target.entryId===null&&!saving&&!editing&&<Link className="btn btn-secondary btn-sm" style={{marginRight:'.75rem'}} to={checkInEntryPath(entry.date,entry.id)}>{t('Mở riêng bản ghi này')}</Link>}
        <button className="btn btn-secondary" disabled={saving || uncertain || !!editing} onClick={() => setEditing({ habitId: entry.habitId, name: entry.habitName, todayStatus: entry.status,expectedCheckInId:entry.id, date })}>{t('Sửa check-in')}</button>
      </article>)}
      {visibleCount < filtered.length && <button className="btn btn-secondary" disabled={saving || !!editing} onClick={() => setVisibleCount(count => count + 20)}>{t('Xem thêm')}</button>}
    </div>}
  </div>;
}
