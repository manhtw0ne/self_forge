import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {journalMonth,shiftJournalMonth} from '../utils/journalCalendar';
import {formatCalendarDate} from '../utils/dates';
const labels=['Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy','Chủ nhật'];
export default function JournalCalendar({dates,today,selectedDate,loading,error,disabled,onOpen,onRetry}){
 const {t,language}=useLanguage();const [month,setMonth]=useState(selectedDate.slice(0,7));let calendar=null;try{if(!loading&&!error)calendar=journalMonth(month,dates,today);}catch{/* Invalid or stale dates must not look like an empty month. */}
 const previous=shiftJournalMonth(month,-1,today),next=shiftJournalMonth(month,1,today);
 return <details className="card" style={{margin:'1rem 0'}}><summary>{t('Lịch nhật ký theo tháng')}</summary>
 <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',alignItems:'center',margin:'1rem 0'}}><button type="button" className="btn btn-secondary btn-sm" disabled={!previous||disabled} onClick={()=>setMonth(previous)}>{t('← Trước')}</button><label className="form-label">{t('Chọn tháng nhật ký')}<input className="form-input" type="month" min="0001-01" max={today.slice(0,7)} value={month} disabled={disabled} onChange={event=>{if(event.target.validity.valid&&event.target.value)setMonth(event.target.value);}}/></label><button type="button" className="btn btn-secondary btn-sm" disabled={!next||disabled} onClick={()=>setMonth(next)}>{t('Sau →')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>setMonth(today.slice(0,7))}>{t('Tháng hiện tại')}</button></div>
 {loading?<p role="status">{t('Đang tải...')}</p>:!calendar?<div role="alert"><p>{t('Không thể tải danh sách ngày nhật ký.')}</p><button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>{t('Thử lại')}</button></div>:<>
 <p>{t('{count} ngày đã viết nhật ký',{count:calendar.count})} · {formatCalendarDate(month+'-01',language,{month:'long',year:'numeric'})}</p>
 <p>{t('Dấu chấm chỉ ngày có bài đã lưu. Ngày chưa có bài không có nghĩa là thất bại; bản nháp chưa lưu không nằm trong lịch.')}</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:'0.35rem'}}>{labels.map((label,index)=><div key={label} style={{textAlign:'center',fontSize:'0.7rem'}} title={t(label)}>{language==='en'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index]:['T2','T3','T4','T5','T6','T7','CN'][index]}</div>)}{Array.from({length:calendar.offset},(_,index)=><span key={'blank'+index}/>)}{calendar.days.map(row=><button type="button" key={row.date} className="btn btn-secondary btn-sm" style={{padding:'0.6rem 0.1rem',minWidth:0,border:row.date===selectedDate?'2px solid var(--accent-primary)':undefined,fontWeight:row.saved?700:400}} aria-pressed={row.date===selectedDate} aria-label={formatCalendarDate(row.date,language)+' · '+t(row.future?'Ngày trong tương lai':row.saved?'Có nhật ký đã lưu':'Chưa có nhật ký đã lưu')} disabled={disabled||row.future} onClick={()=>onOpen(row.date)}>{row.day}<span aria-hidden="true" style={{display:'block',height:'0.7rem',lineHeight:'0.7rem'}}>{row.saved?'•':''}</span></button>)}</div>
 </>}
 </details>;
}
