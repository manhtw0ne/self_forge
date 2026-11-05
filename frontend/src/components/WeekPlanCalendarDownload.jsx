import {useState} from 'react';import {useAuth} from '../context/useAuth';import {useLanguage} from '../context/useLanguage';import {useToast} from '../context/useToast';import {weekPlanCalendar} from '../utils/weekPlanCalendar';import {downloadText} from '../utils/downloadText';import {profileTimezone} from '../utils/dates';
export default function WeekPlanCalendarDownload({plan,disabled}){
 const {user}=useAuth(),{t}=useLanguage(),toast=useToast();const [minutes,setMinutes]=useState(30);
 return <details style={{margin:'1rem 0'}}><summary>{t('Đưa kế hoạch đã lưu vào ứng dụng lịch')}</summary>
 <p>{t('Chỉ xuất kế hoạch đã lưu trên tài khoản, không gồm bản nháp đang sửa. File chứa nội dung bước bạn đã viết.')}</p>
 {plan.time?<label className="form-label">{t('Khoảng giữ chỗ trong lịch')}<select className="form-select" value={minutes} disabled={disabled} onChange={event=>setMinutes(Number(event.target.value))}>{[15,30,45,60,90,120].map(value=><option key={value} value={value}>{t('{count} phút',{count:value})}</option>)}</select></label>:<p>{t('Kế hoạch chưa chọn giờ sẽ được xuất thành sự kiện cả ngày.')}</p>}
 <p>{t('Múi giờ xuất lịch: {zone}',{zone:profileTimezone(user.timezone)})}</p><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>{try{const file=weekPlanCalendar(plan,user.id,profileTimezone(user.timezone),minutes,t);downloadText(file.content,file.filename,'text/calendar;charset=utf-8',false);}catch{toast.error(t('Chưa xuất được lịch. Kiểm tra ngày và giờ; giờ không tồn tại khi đổi giờ mùa hè cần được sửa trước.'));}}}>{t('Tải kế hoạch đã lưu (.ics)')}</button>
 <p>{t('Nhập file vào ứng dụng lịch của bạn. Thời lượng chỉ là khoảng giữ chỗ do bạn chọn; file không tự tạo Pomodoro, cộng XP hoặc đồng bộ thay đổi về SelfForge. Việc nhập lại có thể tạo trùng tùy ứng dụng lịch.')}</p>
 </details>;
}
