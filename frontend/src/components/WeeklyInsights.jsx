import WeeklyComparison from './WeeklyComparison';
import {weeklyHabitInsights} from '../utils/weeklyHabitInsights';
import {habitPath} from '../utils/habitNavigation';
import WeekPlan from './WeekPlan';
import { weeklySuggestions as actions, weeklyInsightExport } from '../utils/weekPlan';
import { downloadText } from '../utils/downloadText';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { readWeeklyInsight } from '../utils/weeklyInsight';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { calendarWeekStart, shiftDate, formatCalendarDate } from '../utils/dates';
import WeeklyCoach from './WeeklyCoach';
export default function WeeklyInsights({ today }) {
 const {t,language}=useLanguage();
 const {user}=useAuth(); const toast=useToast();
 const [open,setOpen]=useState(false); const [offset,setOffset]=useState(0);
 const [data,setData]=useState(null); const [error,setError]=useState(false); const [loading,setLoading]=useState(false);
 const [attempt,setAttempt]=useState(0);const [coachExperiment,setCoachExperiment]=useState('');
 const week=shiftDate(calendarWeekStart(today),offset*7);
 useEffect(()=>{
  if(!open)return;
  let active=true;setLoading(true);setData(null);setError(false);setCoachExperiment('');
  api.get('/insights/weekly',{params:{date:week}}).then(({data:result})=>{
   readWeeklyInsight(result,week);
   if(active)setData(result);
  }).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[open,week,attempt]);
 let habitSteps=[];let habitError=false;try{if(data)habitSteps=weeklyHabitInsights(data,t);}catch{habitError=true;}
 return <section id="weekly-insights" className="card" style={{margin:'1.5rem 0'}}>
  <h2 className="card-title">{t('Nhìn lại tuần và chọn bước tiếp theo')}</h2>
  <p>{t('Tổng hợp từ dữ liệu đã ghi nhận. Gợi ý theo quy tắc, chưa sử dụng AI; không gửi nhật ký ra ngoài.')}</p>
  <button className="btn btn-secondary" onClick={()=>setOpen(value=>!value)}>{t(open?'Ẩn tổng kết':'Xem tổng kết tuần')}</button>
  {open&&<div style={{marginTop:'1rem'}}>
   <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginBottom:'1rem'}}>
    <button className="btn btn-secondary btn-sm" disabled={loading||offset<=-51} onClick={()=>setOffset(value=>value-1)}>{t('Tuần trước')}</button>
    <button className="btn btn-secondary btn-sm" disabled={loading||offset===0} onClick={()=>setOffset(value=>value+1)}>{t('Tuần sau')}</button>
    <button className="btn btn-secondary btn-sm" disabled={loading} onClick={()=>setAttempt(value=>value+1)}>{t('Tải lại')}</button>
   </div>
   {loading?<p role="status">{t('Đang tải...')}</p>:error?<p role="alert">{t('Chưa tải được tổng kết. Hãy thử tải lại.')}</p>:data&&<>
    <h3>{formatCalendarDate(data.weekStart,language)} – {formatCalendarDate(data.weekEnd,language)}</h3>
    <p>{t('Dữ liệu đến ngày {date}',{date:data.observedThrough})} · {data.timezone}</p>
    <ul style={{paddingLeft:'1.25rem'}}>
     <li>{t('{count} lượt hoàn thành đã ghi nhận',{count:data.completed})}</li>
     <li>{t('{count} lượt thất bại · {skipped} lượt bỏ qua',{count:data.failed,skipped:data.skipped})}</li>
     <li>{t('{count} phiên tập trung hoàn thành · {minutes} phút theo thời lượng phiên',{count:data.focusSessions,minutes:data.focusMinutes})}</li>
    </ul>
    <p style={{color:'var(--text-muted)'}}>{t('Chưa có đủ lịch sử lịch thực hiện để tính lượt bỏ lỡ hoặc tỷ lệ hoàn thành. Không check-in không được tính là thất bại.')}</p>
    <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{try{const file=weeklyInsightExport(data,t);downloadText(file.text,file.filename);}catch{toast.error(t('Chưa tải được tổng kết. Hãy thử tải lại.'));}}}>{t('Tải tổng kết tuần (.txt)')}</button>
    <WeeklyComparison key={data.weekStart} current={data} canCompare={offset>-51}/>
    <h3>{t('Gợi ý theo từng thói quen')}</h3>
    {habitError?<p role="alert">{t('Chưa đủ dữ liệu để lập gợi ý riêng từng thói quen.')}</p>:habitSteps.length===0?<p>{t('Chưa có check-in trong tuần để gợi ý theo thói quen.')}</p>:<><p>{t('Hiển thị tối đa ba thói quen có dữ liệu. Gợi ý không kết luận nguyên nhân hoặc tự đổi độ khó.')}</p><ul style={{paddingLeft:'1.25rem'}}>{habitSteps.slice(0,3).map(row=><li key={row.id} style={{margin:'1rem 0',overflowWrap:'anywhere'}}><strong>{row.name}</strong><p>{t('{completed} hoàn thành · {failed} thất bại · {skipped} bỏ qua',{completed:row.completed,failed:row.failed,skipped:row.skipped})}</p><p>{t(actions[row.suggestion])}</p><small>{t('Mã check-in làm căn cứ')}: {row.sourceIds.join(', ')}</small><p><Link className="btn btn-secondary btn-sm" to={habitPath('/stats',row.id)}>{t('Xem tiến độ thói quen')}</Link></p></li>)}</ul></>}
    <h3>{t('Một bước cho tuần tới')}</h3><p>{t(actions[data.suggestion])}</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'1rem'}}>
     <Link className="btn btn-secondary btn-sm" to="/check-in-history">{t('Xem check-in làm căn cứ')}</Link>
     <Link className="btn btn-secondary btn-sm" to="/pomodoro">{t('Xem phiên tập trung')}</Link>
     <Link className="btn btn-primary btn-sm" to="/habits">{t('Xem và tự điều chỉnh thói quen')}</Link>
    </div>
    <WeeklyCoach key={data.weekStart} snapshot={data} onUseExperiment={experiment=>{setCoachExperiment(experiment);document.getElementById('weekly-plan-editor')?.scrollIntoView({block:'start'});}}/>
    <section id="weekly-plan-editor" tabIndex="-1"><WeekPlan key={user.id+':'+data.weekStart} owner={user.id} week={shiftDate(data.weekStart,7)} suggestion={coachExperiment||t(actions[data.suggestion])} options={habitSteps} title={coachExperiment?t('Xem lại thử nghiệm AI trước khi viết kế hoạch tuần tới'):undefined}/>{coachExperiment&&<p role="status">{t('Một thử nghiệm AI đã được chọn làm đề xuất. Đọc lại, chỉnh nội dung và tự bấm lưu nếu phù hợp.')}</p>}</section>
    <details style={{marginTop:'1rem'}}><summary>{t('Các lượt ghi nhận trong tổng kết')}</summary>
     <ul style={{paddingLeft:'1.25rem'}}>{data.evidence.map(row=><li key={row.id}>{row.date} · #{row.id} · {t({COMPLETED:'Đã hoàn thành',FAILED:'Thất bại',SKIPPED:'Bỏ qua'}[row.status])}</li>)}</ul>
    </details>
   </>}
  </div>}
 </section>;
}
