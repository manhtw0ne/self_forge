import {useState,useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import api from '../api/client';
import ModalOverlay from './ModalOverlay';
import {useLanguage} from '../context/useLanguage';
import {readPendingReminder} from '../utils/pendingReminder';
import {reminderDays,reminderDayLabels,defaultHabitReminderDays,scheduledHabitReminderDays,reminderDaysFitHabit,habitReminderPayload,matchingReminder,createHabitReminder} from '../utils/habitReminder';
export default function HabitReminderDialog({owner,habit,onClose}){
 const {t}=useLanguage();const lock=useRef(false);
 const [initial]=useState(()=>{try{return readPendingReminder(sessionStorage,owner);}catch{return {invalid:true};}});
 const [pending,setPending]=useState(initial);
 const [form,setForm]=useState(initial?.habitId===habit.id?{time:initial.reminderTime,days:initial.daysOfWeek.split(','),message:initial.message}:{time:'07:00',days:defaultHabitReminderDays(habit.scheduledDays),message:''});
 const [rows,setRows]=useState([]);const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState(false);const [attempt,setAttempt]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [created,setCreated]=useState(null);
 useEffect(()=>{let active=true;setLoading(true);setLoadError(false);
  api.get('/reminders').then(({data})=>{if(!Array.isArray(data)||data.some(row=>!Number.isSafeInteger(row.id)||!Number.isSafeInteger(row.habitId)||typeof row.enabled!=='boolean'||typeof row.reminderTime!=='string'||typeof row.daysOfWeek!=='string'))throw Error('Invalid reminders');if(active)setRows(data.filter(row=>row.habitId===habit.id));})
   .catch(()=>{if(active)setLoadError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[habit.id,attempt]);
 const allowedDays=scheduledHabitReminderDays(habit.scheduledDays);
 const scheduleMatches=reminderDaysFitHabit(form.days,habit.scheduledDays);
 let payload;try{payload=habitReminderPayload(habit.id,form);if(!scheduleMatches)throw Error('Reminder must match habit schedule');}catch{/* Correct invalid fields before saving. */}
 const duplicate=payload&&matchingReminder(rows,payload);
 const blocked=pending?.invalid||pending&&pending.habitId!==habit.id;
 const submit=async event=>{event.preventDefault();if(lock.current||blocked||loading||(!pending&&(loadError||duplicate||!payload)))return;
  lock.current=true;setBusy(true);setError('');
  try{const response=await createHabitReminder(sessionStorage,owner,habit.id,form,body=>api.post('/reminders',body));setCreated(response.data);setPending(null);}
  catch(failure){try{setPending(readPendingReminder(sessionStorage,owner));}catch{setPending({invalid:true});}setError(failure.response?.data?.detail||t('Chưa xác nhận được lịch nhắc đã lưu. Giữ yêu cầu để thử lại cùng mã.'));}
  finally{lock.current=false;setBusy(false);}
 };
 return <ModalOverlay onClose={()=>{if(!lock.current)onClose();}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="habit-reminder-title" onClick={event=>event.stopPropagation()}>
  <h2 id="habit-reminder-title">{t('Đặt lịch nhắc cho thói quen')}</h2><p style={{overflowWrap:'anywhere'}}>{habit.name}</p>
  <p>{t('Lịch dùng múi giờ tài khoản. Nhắc trong ứng dụng khi đang mở; chưa gửi thông báo khi ứng dụng đóng.')}</p>
  {!initial&&habit.scheduledDays&&<p className="form-hint">{t('Các ngày nhắc được điền sẵn theo lịch thực hiện của thói quen.')}</p>}
  {loading?<p role="status">{t('Đang tải...')}</p>:loadError?<div role="alert"><p>{t('Chưa tải được lịch nhắc hiện có. Tải lại để kiểm tra trước khi tạo.')}</p><button className="btn btn-secondary" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{t('Tải lại')}</button></div>:rows.length>0&&<><h3>{t('Lịch nhắc đã có cho thói quen này')}</h3><ul style={{paddingLeft:'1.25rem'}}>{rows.map(row=><li key={row.id}>{row.reminderTime.slice(0,5)} · {row.daysOfWeek.split(',').map(day=>t(reminderDayLabels[day]||day)).join(', ')} · {t(row.enabled?'Đang bật':'Đang tắt')}</li>)}</ul></>}
  {blocked&&<p role="alert">{t('Có yêu cầu lịch nhắc khác cần xử lý. Mở trang nhắc nhở để kiểm tra trước.')}</p>}
  {pending&&!blocked&&<p role="status">{t('Yêu cầu đang chờ xác nhận. Thử lại giữ nguyên giờ, ngày và mã trước đó.')}</p>}
  {error&&<p role="alert">{t(error)}</p>}
  {created?<div role="status"><h3>{t('Đã lưu lịch nhắc cho thói quen.')}</h3><p>{created.reminderTime?.slice(0,5)} · {created.daysOfWeek?.split(',').map(day=>t(reminderDayLabels[day]||day)).join(', ')}</p></div>:<form onSubmit={submit}><fieldset disabled={busy||Boolean(pending)} style={{border:0,padding:0}}>
   <label className="form-label" htmlFor="habit-reminder-time">{t('Giờ nhắc')}</label><input id="habit-reminder-time" type="time" className="form-input" value={form.time} required onChange={e=>setForm({...form,time:e.target.value})}/>
   <fieldset style={{border:0,padding:0,margin:'1rem 0'}}><legend>{t('Ngày trong tuần')}</legend><div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>{reminderDays.map(day=>{const selected=form.days.includes(day),unavailable=!allowedDays||!allowedDays.includes(day);return <label key={day} style={{opacity:unavailable&&!selected ? .6 : 1}}><input type="checkbox" disabled={unavailable&&!selected} checked={selected} onChange={event=>setForm({...form,days:event.target.checked?[...form.days,day]:form.days.filter(value=>value!==day)})}/> {t(reminderDayLabels[day])}</label>;})}</div></fieldset>
   {!allowedDays?<p role="alert">{t('Không đọc được lịch thực hiện của thói quen. Hãy cập nhật thói quen trước khi lưu lịch nhắc.')}</p>:!scheduleMatches&&<p role="alert">{t('Chỉ chọn ngày thực hiện của thói quen. Bỏ các ngày nghỉ trước khi lưu.')}</p>}
   <label className="form-label" htmlFor="habit-reminder-message">{t('Lời nhắn (tùy chọn)')}</label><input id="habit-reminder-message" className="form-input" maxLength={255} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
  </fieldset>
  {duplicate&&!pending&&<p role="alert">{t('Đã có lịch đang bật với cùng giờ và các ngày này. Sửa lịch hiện có hoặc chọn lịch khác.')}</p>}
  {!payload&&!pending&&<p>{t('Chọn giờ hợp lệ và ít nhất một ngày.')}</p>}
  <button className="btn btn-primary" style={{marginTop:'1rem'}} disabled={busy||loading||Boolean(blocked)||!pending&&(loadError||!payload||duplicate)}>{t(pending?'Thử lại yêu cầu lịch nhắc':'Lưu lịch nhắc')}</button>
  </form>}
  <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',marginTop:'1rem'}}><Link className="btn btn-secondary" to="/reminders" aria-disabled={busy} onClick={event=>{if(lock.current)event.preventDefault();}}>{t('Quản lý lịch nhắc')}</Link><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>{t('Đóng')}</button></div>
 </section></ModalOverlay>;
}
