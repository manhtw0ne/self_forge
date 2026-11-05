import WeekPlanFocusLaunch from './WeekPlanFocusLaunch';
import WeekPlanCalendarDownload from './WeekPlanCalendarDownload';
import {useState,useEffect,useRef} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {readServerWeekPlan,WEEK_PLAN_CHANGED,notifyWeekPlan} from '../utils/weekPlan';
import {calendarWeekStart,shiftDate,formatCalendarDate} from '../utils/dates';
export default function CurrentWeekPlan({owner,today}){
 const {t,language}=useLanguage();const [offset,setOffset]=useState(0);const [plan,setPlan]=useState(undefined);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);const lock=useRef(false);
 const week=shiftDate(calendarWeekStart(today),offset*7);const activeWeek=useRef(week);activeWeek.current=week;
 useEffect(()=>{const refresh=()=>{if(!lock.current)setAttempt(value=>value+1);};const visible=()=>{if(document.visibilityState==='visible')refresh();};window.addEventListener(WEEK_PLAN_CHANGED,refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener(WEEK_PLAN_CHANGED,refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};},[]);
 useEffect(()=>{let active=true;setBusy(true);setError('');setPlan(undefined);
  api.get('/week-plans',{params:{week}}).then(({data})=>{const saved=readServerWeekPlan(data,week);if(active)setPlan(saved);})
   .catch(()=>{if(active)setError('Chưa tải được bước trong kế hoạch tuần.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};
 },[owner,week,attempt]);
 const complete=async()=>{if(lock.current||busy||!plan)return;lock.current=true;setBusy(true);setError('');
  try{const {data}=await api.patch('/week-plans/'+week+'/completion',{completed:!plan.completed,expectedVersion:plan.version});const saved=readServerWeekPlan(data,week);if(activeWeek.current!==week)return;if(!saved)throw Error('Missing plan');setPlan(saved);notifyWeekPlan();}
  catch(failure){if(activeWeek.current!==week)return;setError(failure.response?.status===409?'Kế hoạch tuần đã thay đổi. Tải lại trước khi ghi nhận.':'Chưa xác nhận được việc ghi nhận. Tải lại kế hoạch trước khi thử tiếp.');setPlan(undefined);}
  finally{lock.current=false;if(activeWeek.current===week)setBusy(false);}
 };
 return <section id="current-week-plan" className="card" style={{margin:'1.5rem 0'}} aria-labelledby="current-week-plan-title">
  <h2 className="card-title" id="current-week-plan-title">{t('Bước đã chọn trong kế hoạch tuần')}</h2>
  <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>{[0,1].map(value=><button key={value} className="btn btn-secondary btn-sm" aria-pressed={offset===value} disabled={busy} onClick={()=>setOffset(value)}>{t(value===0?'Tuần này':'Tuần tới')}</button>)}<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{t('Tải lại')}</button></div>
  {busy&&<p role="status">{t('Đang tải...')}</p>}{error&&<p role="alert">{t(error)}</p>}
  {plan?<><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',marginTop:'1rem'}}>{plan.action}</p><p>{formatCalendarDate(plan.date,language)} · {plan.time||t('Chưa chọn')}</p>
   <p role="status">{t(plan.completed?'Đã thực hiện':'Chưa thực hiện')}</p>
   {plan.date>today?<p>{t('Bước này được lên kế hoạch cho ngày sắp tới.')}</p>:<button className="btn btn-primary" disabled={busy} onClick={complete}>{t(plan.completed?'Đánh dấu chưa thực hiện':'Tôi đã thực hiện bước này')}</button>}
   <WeekPlanFocusLaunch key={plan.week+':'+plan.version} plan={plan} disabled={busy}/>
   <WeekPlanCalendarDownload plan={plan} disabled={busy}/>
   <p>{t('Đây là tự ghi nhận kế hoạch, không cộng XP hoặc thay thế check-in thói quen.')}</p>
  </>:plan===null&&<p>{t('Chưa có kế hoạch đã lưu cho tuần này. Chọn một bước trong phần tổng kết tuần.')}</p>}
  <a href="#weekly-insights">{t('Mở phần tổng kết để viết hoặc sửa kế hoạch')}</a>
 </section>;
}
