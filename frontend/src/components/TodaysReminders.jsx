import {readReminderSnoozes,writeReminderSnoozes,clearReminderSnoozes,snoozeReminder,applyReminderSnoozes} from '../utils/reminderSnooze';
import TodayWeekPlanReminder from './TodayWeekPlanReminder';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLanguage } from '../context/useLanguage';
import { profileTimezone } from '../utils/dates';
import { todaysReminders } from '../utils/todaysReminders';
export default function TodaysReminders({ owner,habits, date, timezone, onRefresh }) {
  const { t } = useLanguage();
  const [initialSnoozes]=useState(()=>{try{return {items:readReminderSnoozes(sessionStorage,owner,date,timezone),error:false};}catch{return {items:[],error:true};}});
  const [snoozes,setSnoozes]=useState(initialSnoozes.items),[snoozeError,setSnoozeError]=useState(initialSnoozes.error),[snoozeMessage,setSnoozeMessage]=useState(''),[snoozeMinutes,setSnoozeMinutes]=useState(10);
  const changeSnoozes=items=>{try{const saved=writeReminderSnoozes(sessionStorage,owner,date,timezone,items);setSnoozes(saved);setSnoozeError(false);setSnoozeMessage('');}catch{setSnoozeError(true);setSnoozeMessage('Chưa lưu được hẹn nhắc lại trên tab. Lịch nhắc hiện tại được giữ nguyên.');}};
  const [reminders, setReminders] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let active = true;
    setError(false); setReminders(null);
    api.get('/reminders').then(r => { if (active) setReminders(r.data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const visible = () => { if (document.visibilityState === 'visible') tick(); };
    const timer = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, []);
  const original = todaysReminders(reminders || [], habits, timezone, date, now);
  const result={...original,items:applyReminderSnoozes(original.items,snoozes,timezone,now)};
  return <section className="card" style={{ marginBottom: '1.5rem' }} aria-label={t('Lịch nhắc hôm nay')}>
    <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}><h2 className="card-title">{t('Lịch nhắc hôm nay')}</h2><Link to="/reminders">{t('Quản lý lịch nhắc')}</Link></div>
    {result.stale ? <div role="status"><p>{t('Đã sang ngày mới. Tải lại để xem lịch hôm nay.')}</p><button className="btn btn-secondary" onClick={onRefresh}>{t('Tải lại')}</button></div>
      : error ? <div role="status"><p>{t('Không thể tải lịch nhắc.')}</p><button className="btn btn-secondary" onClick={() => setAttempt(a => a + 1)}>{t('Thử lại')}</button></div>
      : !reminders ? <p role="status">{t('Đang tải...')}</p>
      : result.items.length === 0 ? <p>{t('Không còn lịch nhắc cho thói quen chưa ghi nhận hôm nay.')}</p>
      : <><p>{t('Giờ nhắc theo múi giờ {timezone}.', { timezone: profileTimezone(timezone) })}</p><ul style={{ listStyle: 'none', padding: 0 }}>
        {result.items.slice(0, 5).map(item => <li key={item.id} style={{ marginBottom: '1rem' }}>
          <strong style={{ overflowWrap: 'anywhere' }}>{item.time} · {item.habitName}</strong> <span className="badge badge-info">{t(item.snoozed?'Đã hẹn nhắc lại':item.due ? 'Đã đến giờ' : 'Sắp tới')}</span>
          {item.snoozedUntil&&<p>{t('Giờ nhắc lại trên tab: {time}',{time:item.effectiveTime})}</p>}
          {item.due&&<button type="button" className="btn btn-secondary btn-sm" disabled={snoozeError} onClick={()=>{try{const instant=new Date();changeSnoozes(snoozeReminder(snoozes,item,snoozeMinutes,date,timezone,instant));setNow(instant);}catch(error){setSnoozeMessage(error.message);}}}>{t('Nhắc lại sau {minutes} phút',{minutes:snoozeMinutes})}</button>}
          {item.snoozed&&<button type="button" className="btn btn-secondary btn-sm" disabled={snoozeError} onClick={()=>changeSnoozes(snoozes.filter(row=>row.reminderId!==item.id))}>{t('Bỏ hẹn nhắc lại')}</button>}
          {item.message && <p style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{item.message}</p>}
        </li>)}
      </ul><a className="btn btn-secondary" href="#today-habits">{t('Đến danh sách hôm nay')}</a>
      {result.items.length > 5 && <p>{t('Còn {count} lịch nhắc khác.', { count: result.items.length - 5 })}</p>}</>}
    {!result.stale&&!error&&reminders&&result.items.some(item=>item.due)&&<label style={{display:'block',margin:'.75rem 0'}}>{t('Thời gian nhắc lại')}<select className="form-select" value={snoozeMinutes} onChange={event=>setSnoozeMinutes(Number(event.target.value))}>{[10,30,60].map(minutes=><option key={minutes} value={minutes}>{t('{count} phút',{count:minutes})}</option>)}</select></label>}
    {snoozeMessage&&<p role="alert">{t(snoozeMessage)}</p>}
    {snoozeError&&<div role="alert"><p>{t('Không đọc hoặc lưu được hẹn nhắc lại trên tab. Kiểm tra quyền lưu trữ hoặc xóa hẹn cục bộ để thử lại.')}</p><button type="button" className="btn btn-secondary btn-sm" onClick={()=>{try{clearReminderSnoozes(sessionStorage,owner,date);setSnoozes([]);setSnoozeError(false);setSnoozeMessage('');}catch{setSnoozeMessage('Chưa xóa được hẹn nhắc lại trên tab.');}}}>{t('Xóa hẹn nhắc lại trên tab hôm nay')}</button></div>}
    <p>{t('Hẹn nhắc lại chỉ được hiển thị khi mở Dashboard trong tab này. Không đổi lịch hằng tuần, không ghi check-in và không gửi thông báo khi đóng ứng dụng.')}</p>
    <TodayWeekPlanReminder date={date} timezone={timezone} now={now}/>
    <small>{t('Chỉ hiển thị khi mở ứng dụng; chưa gửi thông báo đến thiết bị.')}</small>
  </section>;
}
