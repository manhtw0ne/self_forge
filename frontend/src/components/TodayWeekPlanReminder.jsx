import {useEffect,useState} from 'react';
import api from '../api/client';import {useLanguage} from '../context/useLanguage';import {calendarWeekStart} from '../utils/dates';import {readServerWeekPlan,WEEK_PLAN_CHANGED} from '../utils/weekPlan';import {todayWeekPlanReminder} from '../utils/weekPlanReminder';
export default function TodayWeekPlanReminder({date,timezone,now}){
 const {t}=useLanguage();const [response,setResponse]=useState(null);const [error,setError]=useState(false);const [loading,setLoading]=useState(true);const [attempt,setAttempt]=useState(0);const week=calendarWeekStart(date);
 useEffect(()=>{const refresh=()=>setAttempt(value=>value+1);const visible=()=>{if(document.visibilityState==='visible')refresh();};window.addEventListener(WEEK_PLAN_CHANGED,refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener(WEEK_PLAN_CHANGED,refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};},[]);
 useEffect(()=>{let active=true;setLoading(true);setError(false);setResponse(null);api.get('/week-plans',{params:{week}}).then(({data})=>{const value=readServerWeekPlan(data,week);if(active)setResponse({date,value});}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[date,week,attempt]);
 if(loading)return null;
 if(error)return <div role="status" style={{margin:'1rem 0'}}><p>{t('Chưa tải được nhắc kế hoạch tuần. Lịch nhắc thói quen vẫn được hiển thị riêng.')}</p><button className="btn btn-secondary btn-sm" onClick={()=>setAttempt(value=>value+1)}>{t('Thử lại')}</button></div>;
 if(response?.date!==date)return null;const result=todayWeekPlanReminder(response.value,date,timezone,now);if(result.stale||!result.item)return null;
 return <div style={{margin:'1rem 0',padding:'1rem',border:'1px solid var(--border-color)',borderRadius:'0.75rem'}}>
  <h3>{t('Nhắc bước trong kế hoạch tuần')}</h3><strong>{result.item.time}</strong> <span className="badge badge-info">{t(result.item.due?'Đã đến giờ':'Sắp tới')}</span><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{result.item.action}</p>
  <a className="btn btn-secondary btn-sm" href="#current-week-plan">{t('Mở bước đã chọn để ghi nhận')}</a><p>{t('Chỉ nhắc đúng ngày đã chọn. Đánh dấu đã thực hiện sẽ ẩn lời nhắc này; không cộng XP.')}</p>
 </div>;
}
