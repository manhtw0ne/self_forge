import FocusHistoryView from './FocusHistoryView';
import {focusHistorySummaryExport} from '../utils/focusHistorySummaryExport';
import {downloadText} from '../utils/downloadText';
import {useToast} from '../context/useToast';
import {readFocusHistorySummary} from '../utils/focusHistorySummary';
import {useAccountDate} from '../hooks/useAccountDate';
import {focusHistoryRange,focusHistoryPreset} from '../utils/focusHistoryRange';
import FocusSessionAction from './FocusSessionAction';
import { pomodoroPageSummary } from '../utils/pomodoroPageSummary';
import { readPomodoroHistory } from '../utils/pomodoroHistory';
import PomodoroExport from './PomodoroExport';
import ModalOverlay from './ModalOverlay';
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/client';
import PomodoroNote from './PomodoroNote';
import { useLanguage } from '../context/useLanguage';
import { formatCalendarDate, profileTimezone } from '../utils/dates';

export default function PomodoroHistory({ user, onClose, onSelectSession, recoveryBlocked=false }) {
  const { t, language } = useLanguage();
  const toast=useToast();
  const today=useAccountDate(user.timezone);
  const [fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState(''),[range,setRange]=useState({}),[rangeError,setRangeError]=useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [query,setQuery]=useState(''),[searchTerm,setSearchTerm]=useState('');
  const [cursors, setCursors] = useState([null]);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [totals,setTotals]=useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const notes = useRef(new Map());
  const [noteSaving, setNoteSaving] = useState(false);
  const onNoteState = useCallback((id, state) => {
    if (state) notes.current.set(id, state); else notes.current.delete(id);
    setNoteSaving([...notes.current.values()].some(note => note.saving));
  }, []);
  const summary = pomodoroPageSummary(rows, user.timezone);
  const beforeId = cursors[page];
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    api.get('/pomodoro/history', { params: { beforeId: beforeId ?? undefined, completed: filter === 'ALL' ? undefined : filter === 'COMPLETED',q:searchTerm||undefined,...range } })
      .then(({ data }) => { const result = readPomodoroHistory(data); if (active) { setRows(result.items); setNextCursor(result.nextCursor);try{setTotals(readFocusHistorySummary(data.summary));}catch{setTotals(null);} } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [beforeId, filter, attempt,searchTerm,range,user.timezone]);
  const change = action => {
    if (loading || [...notes.current.values()].some(note => note.saving)) return;
    if ([...notes.current.values()].some(note => note.dirty)) { setPendingAction(() => action); return; }
    setLoading(true);
    action();
  };
  return <section className="card" aria-labelledby="pomodoro-history-title" style={{ marginTop: '1.5rem' }}>
    <h2 id="pomodoro-history-title">{t('Toàn bộ lịch sử Pomodoro')}</h2>
    <p>{t('Mỗi trang gồm tối đa 20 phiên, từ mới đến cũ. Thời gian hiển thị theo múi giờ tài khoản.')}</p>
    <FocusHistoryView owner={user.id} status={filter} range={range} today={today} disabled={loading||noteSaving} onUse={value=>change(()=>{setFilter(value.status);const next={...(value.fromDate?{fromDate:value.fromDate}:{}),...(value.toDate?{toDate:value.toDate}:{})};setRange(next);setFromDate(next.fromDate||'');setToDate(next.toDate||'');setQuery('');setSearchTerm('');setRangeError(false);setCursors([null]);setPage(0);setAttempt(previous=>previous+1);})}/>
    <form onSubmit={event=>{event.preventDefault();const value=query.trim();let next;try{next=focusHistoryRange(fromDate,toDate,today);setRangeError(false);}catch{setRangeError(true);return;}change(()=>{setRange(next);setSearchTerm(value);setCursors([null]);setPage(0);setAttempt(previous=>previous+1);});}} style={{margin:'1rem 0'}}><label className="form-label" htmlFor="pomodoro-note-search">{t('Tìm trong ghi chú Pomodoro đã lưu')}</label><input id="pomodoro-note-search" className="form-input" type="search" maxLength="100" value={query} disabled={loading||noteSaving} onChange={event=>setQuery(event.target.value)}/><div style={{display:'flex',flexWrap:'wrap',gap:'1rem',margin:'1rem 0'}}><label className="form-label">{t('Từ ngày')}<input className="form-input" type="date" min="0001-01-01" max={toDate||today} disabled={loading||noteSaving} value={fromDate} onChange={event=>setFromDate(event.target.value)}/></label><label className="form-label">{t('Đến ngày')}<input className="form-input" type="date" min={fromDate||'0001-01-01'} max={today} disabled={loading||noteSaving} value={toDate} onChange={event=>setToDate(event.target.value)}/></label></div><div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}>{[['7','7 ngày gần nhất'],['30','30 ngày gần nhất'],['MONTH','Tháng hiện tại'],['ALL','Mọi ngày']].map(([value,label])=><button type="button" className="btn btn-secondary btn-sm" key={value} disabled={loading||noteSaving} onClick={()=>{const next=focusHistoryPreset(value,today);setFromDate(next.fromDate);setToDate(next.toDate);}}>{t(label)}</button>)}</div><div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'0.75rem'}}><button type="submit" className="btn btn-secondary btn-sm" disabled={loading||noteSaving}>{t('Áp dụng tìm kiếm và khoảng ngày')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={loading||noteSaving||(!searchTerm&&!range.fromDate&&!range.toDate)} onClick={()=>change(()=>{setQuery('');setSearchTerm('');setFromDate('');setToDate('');setRange({});setRangeError(false);setCursors([null]);setPage(0);})}>{t('Xóa bộ lọc tìm kiếm và ngày')}</button></div></form>
    <p>{t('Tìm cụm từ trong ghi chú đã lưu, không phân biệt hoa thường. Bản nháp chưa lưu không có trong kết quả; không gửi ghi chú tới AI.')}</p>
    {rangeError&&<p role="alert">{t('Chọn khoảng ngày hợp lệ, không chọn ngày tương lai.')}</p>}
    {(range.fromDate||range.toDate)&&<p role="status">{t('Phạm vi phiên đang xem: {from} → {to}',{from:range.fromDate||t('Mọi ngày trước đó'),to:range.toDate||t('Không giới hạn')})}</p>}
    <p>{t('Khoảng ngày dựa trên lúc bắt đầu phiên trong múi giờ tài khoản. Chọn bộ lọc rồi bấm áp dụng; tổng kết vẫn chỉ tính trang đang xem.')}</p>
    {searchTerm&&<p role="status">{t('Đang tìm ghi chú chứa: {query}',{query:searchTerm})}</p>}
    <label htmlFor="full-pomodoro-filter" className="form-label">{t('Lọc phiên tập trung')}</label>
    <select id="full-pomodoro-filter" className="form-select" value={filter} disabled={loading || noteSaving} onChange={event => {
      const value = event.target.value;
      if (value === filter) return;
      change(() => { setFilter(value); setCursors([null]); setPage(0); });
    }}>
      <option value="ALL">{t('Tất cả')}</option><option value="COMPLETED">{t('Đã hoàn thành')}</option><option value="INCOMPLETE">{t('Chưa hoàn thành')}</option>
    </select>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '1rem 0' }}>
      <button className="btn btn-secondary btn-sm" disabled={loading || noteSaving} onClick={() => change(() => { setPage(0); setCursors([null]); setAttempt(a => a + 1); })}>{t('Tải lại từ đầu')}</button>
      <button className="btn btn-secondary btn-sm" disabled={loading || noteSaving} onClick={() => change(onClose)}>{t('Về phiên gần đây')}</button>
    </div>
    {loading ? <p role="status">{t('Đang tải...')}</p> : error ? <div role="alert"><p>{t('Không thể tải dữ liệu.')}</p><button className="btn btn-secondary" onClick={() => setAttempt(a => a + 1)}>{t('Thử lại')}</button></div> : <>
      <section className="card" style={{margin:'1rem 0'}}><h3>{t('Tổng kết toàn bộ kết quả đang lọc')}</h3>{totals?<><p>{t('{total} phiên · {completed} hoàn thành · {incomplete} chưa hoàn thành',totals)}</p><p>{t('{minutes} phút từ {timedSessions} phiên hoàn thành có thời lượng 25–120 phút.',totals)}</p><p>{t('Tính toàn bộ phiên phù hợp tìm kiếm, khoảng ngày và trạng thái, không chỉ trang này. Mỗi phiên chỉ được tính một lần; thời lượng phiên chưa hoàn thành không được cộng.')}</p><button type="button" className="btn btn-secondary btn-sm" disabled={noteSaving} onClick={()=>{try{const file=focusHistorySummaryExport(totals,{query:searchTerm,status:filter,fromDate:range.fromDate||'',toDate:range.toDate||'',today,timezone:user.timezone},t);downloadText(file.text,file.filename);}catch{toast.error(t('Chưa tải được tổng kết Pomodoro. Tải lại dữ liệu rồi thử lại.'));}}}>{t('Tải tổng kết kết quả đang lọc (.txt)')}</button><p>{t('File chỉ gồm số liệu tổng và phạm vi lọc; không gồm ghi chú, cụm từ tìm kiếm hoặc mã phiên.')}</p></>:<p role="status">{t('Chưa có tổng kết toàn bộ kết quả. Bạn vẫn có thể xem từng trang lịch sử.')}</p>}</section>
      <p role="status">{t('Trang {page} · {count} phiên', { page: page + 1, count: rows.length })}</p>
      <div className="card" style={{ margin: '1rem 0' }}>
        <h3>{t('Tổng kết trang đang xem')}</h3>
        <p>{t('{count} phiên hoàn thành · {minutes} phút theo thời lượng phiên', { count: summary.completed, minutes: summary.minutes })}</p>
        <p>{t('{count} phiên chưa hoàn thành, không tính vào thời gian tập trung.', { count: summary.incomplete })}</p>
        <p style={{ color: 'var(--text-muted)' }}>{t('Chỉ tính các phiên trên trang này. Ngày được xác định theo lúc bắt đầu phiên và múi giờ tài khoản.')}</p>
      </div>
      {rows.length === 0 && <p>{t('Không có phiên phù hợp với bộ lọc.')}</p>}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {summary.groups.map(group => <section key={group.date} aria-label={formatCalendarDate(group.date, language)}>
          <h3 style={{ margin: '1rem 0' }}>{formatCalendarDate(group.date, language)}</h3>
          <p>{t('{count} phiên hoàn thành · {minutes} phút theo thời lượng phiên', { count: group.completed, minutes: group.minutes })}</p>
          {group.rows.map(session => <article key={session.id} className="card">
          <h3 style={{ overflowWrap: 'anywhere' }}>{session.habitName || t('Phiên tự do')} — {t('{count} phút', { count: session.durationMinutes })}</h3>
          <p>{new Date(session.startedAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN', { timeZone: profileTimezone(user.timezone) })}</p>
          <span className={'badge ' + (session.completed ? 'badge-success' : 'badge-warning')}>{t(session.completed ? '✓ Xong' : 'Chưa hoàn thành')}</span>
          <div style={{marginTop:'0.75rem'}}><FocusSessionAction session={session} onSelect={onSelectSession} disabled={recoveryBlocked||noteSaving}/></div>
          <div style={{ marginTop: '0.75rem' }}><PomodoroExport session={session} timezone={user.timezone} disabled={noteSaving} /></div>
          {session.completed && <PomodoroNote userId={user.id} session={session} onStateChange={onNoteState} onSaved={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))} />}
        </article>)}
        </section>)}
      </div>
    </>}
    {!loading && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        <button className="btn btn-secondary" disabled={page === 0 || noteSaving} onClick={() => change(() => setPage(p => p - 1))}>{t('Phiên mới hơn')}</button>
        <button className="btn btn-secondary" disabled={error || !nextCursor || noteSaving} onClick={() => change(() => { setCursors(current => [...current.slice(0, page + 1), nextCursor]); setPage(p => p + 1); })}>{t('Phiên cũ hơn')}</button>
      </div>}
    {pendingAction && <ModalOverlay onClose={() => setPendingAction(null)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="history-leave-title" onClick={event => event.stopPropagation()}>
        <h2 id="history-leave-title">{t('Ghi chú chưa lưu')}</h2>
        <p>{t('Đổi danh sách có thể đóng ghi chú chưa lưu. Tiếp tục?')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          <button autoFocus className="btn btn-secondary" onClick={() => setPendingAction(null)}>{t('Tiếp tục sửa ghi chú')}</button>
          <button className="btn btn-primary" onClick={() => { const action = pendingAction; setPendingAction(null); setLoading(true); action(); }}>{t('Chuyển danh sách')}</button>
        </div>
      </div>
    </ModalOverlay>}
  </section>;
}
