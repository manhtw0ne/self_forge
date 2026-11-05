import {useEffect,useRef,useState} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {createLatestRequest} from '../utils/latestRequest';
import {previousJournalDate,readPreviousJournal,previousFocusQuestion} from '../utils/previousJournal';
import {formatCalendarDate} from '../utils/dates';
export default function PreviousJournal({date,disabled,onInsert,onOpen}){
 const {t,language}=useLanguage();const [open,setOpen]=useState(false),[source,setSource]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);const gate=useRef(createLatestRequest());const previous=previousJournalDate(date);
 useEffect(()=>{const request=gate.current;if(!open||!previous)return;setLoading(true);setError(false);setSource(null);void request.run(()=>api.get('/journal',{params:{date:previous}}).then(response=>readPreviousJournal(response.data,date)).catch(error=>{if(error.response?.status===404)return null;throw error;}),value=>setSource(value),()=>setError(true),()=>setLoading(false));return()=>request.invalidate();},[open,previous,date,attempt]);
 if(!previous)return null;
 return <section className="card" style={{margin:'1rem 0'}}><h2 className="card-title">{t('Nhìn lại dự định từ hôm trước')}</h2><p>{t('Chỉ đọc mục “Tập trung ngày mai” trong bài đã lưu của {date}. Dự định chưa được xem là việc đã hoàn thành.',{date:formatCalendarDate(previous,language)})}</p><button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t(open?'Ẩn dự định hôm trước':'Xem dự định hôm trước')}</button>
 {open&&<>{loading?<p role="status">{t('Đang tải...')}</p>:error?<div role="alert"><p>{t('Chưa tải được dự định hôm trước. Nội dung đang viết được giữ nguyên.')}</p><button type="button" className="btn btn-secondary btn-sm" onClick={()=>setAttempt(value=>value+1)}>{t('Thử lại')}</button></div>:source?.focus.trim()?<><blockquote style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'1rem 0'}}>{source.focus}</blockquote><p>{t('Bạn tự đánh giá phần đã làm, chưa làm hoặc không còn phù hợp. Ứng dụng không tự suy ra kết quả từ dự định.')}</p><div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onInsert('lesson',previousFocusQuestion(source,date,t))}>{t('Thêm câu hỏi nhìn lại vào bài học')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onOpen(previous)}>{t('Mở bài nhật ký hôm trước')}</button></div></>:<p>{t('Hôm trước chưa có dự định được lưu. Bạn vẫn có thể viết nhật ký ngày này như bình thường.')}</p>}
 <p>{t('Chỉ thêm câu hỏi khi bạn chọn, chưa lưu lên máy chủ và không gửi nội dung tới AI.')}</p></>}
 </section>;
}
