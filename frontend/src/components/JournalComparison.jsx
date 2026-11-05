import {useEffect,useRef,useState} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {createLatestRequest} from '../utils/latestRequest';
import {formatCalendarDate,validCalendarDate} from '../utils/dates';
import {journalFields} from '../utils/journalLimits';
import {journalComparisonDates,readJournalComparison,journalComparisonQuestion} from '../utils/journalComparison';
export default function JournalComparison({today,dates,datesLoading=false,datesError=false,onRetryDates,disabled,onOpen,onInsert}){
 const {t,language}=useLanguage();const [open,setOpen]=useState(false),[first,setFirst]=useState(''),[second,setSecond]=useState(''),[rows,setRows]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');const gate=useRef(createLatestRequest());
 useEffect(()=>{const current=gate.current;return()=>current.invalidate();},[]);
 const reset=()=>{gate.current.invalidate();setRows(null);setLoading(false);setError('');};
 const compare=event=>{event.preventDefault();let scope;try{scope=journalComparisonDates(first,second,today);}catch(error){setError(error.message);return;}
  setRows(null);setLoading(true);setError('');void gate.current.run(()=>Promise.all(scope.map(date=>api.get('/journal',{params:{date}}))).then(values=>readJournalComparison(values.map(value=>value.data),scope,today)),setRows,()=>setError('Chưa tải đủ hai bài nhật ký đã lưu. Hãy kiểm tra ngày và thử lại.'),()=>setLoading(false));
 };
 const available=[...new Set(dates)].filter(date=>validCalendarDate(date,today)&&date>='0001-01-01').sort().reverse();
 return <section className="card" style={{margin:'1rem 0'}}>
  <h2 className="card-title">{t('So sánh hai ngày nhật ký')}</h2>
  <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} onClick={()=>{reset();setOpen(value=>!value);}}>{t(open?'Ẩn so sánh nhật ký':'Mở so sánh nhật ký')}</button>
  {open&&<><p>{t('Chọn hai bài đã lưu để tự nhìn lại điều thay đổi. Bản nháp đang viết chưa có trong so sánh; nội dung chỉ được tải khi bạn chọn xem.')}</p>
   <form onSubmit={compare} style={{display:'flex',gap:'.75rem',flexWrap:'wrap',alignItems:'end',margin:'1rem 0'}}>
    {[[first,setFirst,'Ngày thứ nhất'],[second,setSecond,'Ngày thứ hai']].map(([value,setValue,label])=><label key={label}>{t(label)}<select className="form-select" required value={value} onChange={event=>{reset();setValue(event.target.value);}}><option value="">{t('Chọn ngày đã lưu')}</option>{available.map(date=><option key={date} value={date}>{formatCalendarDate(date,language)}</option>)}</select></label>)}
    <button type="submit" className="btn btn-primary btn-sm" disabled={loading||available.length<2}>{t('Xem hai bài đã lưu')}</button>
   </form>
   {datesLoading&&<p role="status">{t('Đang tải...')}</p>}
   {datesError&&<div role="alert"><p>{t('Không thể tải danh sách ngày nhật ký để so sánh.')}</p><button type="button" className="btn btn-secondary btn-sm" onClick={onRetryDates}>{t('Thử lại')}</button></div>}
   {!datesLoading&&!datesError&&available.length<2&&<p>{t('Cần ít nhất hai ngày nhật ký đã lưu để so sánh.')}</p>}
   {loading&&<p role="status">{t('Đang tải...')}</p>}{error&&<p role="alert">{t(error)}</p>}
   {rows&&<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))',gap:'1rem'}}>{rows.map(row=><article key={row.id} style={{minWidth:0}}><h3>{formatCalendarDate(row.date,language)}</h3>{Object.entries(journalFields).map(([field,label])=><section key={field}><h4>{t(label)}</h4><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row[field]||t('Chưa ghi nội dung')}</p></section>)}<button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onOpen(row.date)}>{t('Mở bài nhật ký này')}</button></article>)}</div>
    <p>{t('Hai ghi chép có thể cách nhau nhiều ngày. Nội dung giống nhau chưa chứng minh một vấn đề lặp lại hoặc nguyên nhân của nó.')}</p>
    <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onInsert('lesson',journalComparisonQuestion(rows,t))}>{t('Thêm câu hỏi so sánh vào bài học đang viết')}</button>
   </>}
  </>}
 </section>;
}
