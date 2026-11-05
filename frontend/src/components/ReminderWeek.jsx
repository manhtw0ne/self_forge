import {useState} from 'react';
import {useAccountDate} from '../hooks/useAccountDate';
import {useLanguage} from '../context/useLanguage';
import {reminderWeek} from '../utils/reminderWeek';
import {formatCalendarDate,profileTimezone} from '../utils/dates';
export default function ReminderWeek({reminders,timezone,disabled,onEdit}){
 const {t,language}=useLanguage();const today=useAccountDate(timezone);const [limits,setLimits]=useState({});let week;try{week=reminderWeek(reminders,today);}catch{return <p role="alert">{t('Chưa xem được lịch tuần. Kiểm tra lại các lịch nhắc đã lưu.')}</p>;}
 return <details className="card" style={{marginBottom:'1rem'}}><summary>{t('Xem lịch nhắc trong 7 ngày')}</summary>
 <p>{t('Lịch cấu hình từ hôm nay, theo múi giờ {zone}. Bao gồm cả giờ đã qua trong hôm nay; không phải lịch sử thông báo đã gửi.',{zone:profileTimezone(timezone)})}</p>
 <p>{t('{total} lượt theo lịch · {overlapMinutes} khung phút có nhiều lịch nhắc.',week)}</p>
 <p>{language==='en'?'Only weekdays shared by the reminder and habit schedule are shown. Disabled and paused habits are excluded. Overlapping times are only a prompt to review; nothing changes automatically.':'Chỉ hiển thị ngày trùng giữa lịch nhắc và lịch thực hiện. Không gồm lịch đã tắt hoặc thói quen đang tạm dừng. Các khung giờ trùng chỉ là gợi ý xem lại, không tự đổi lịch.'}</p>
 {week.days.map(day=><details key={day.date} style={{margin:'0.75rem 0',padding:'0.75rem',border:'1px solid var(--border-color)',borderRadius:'0.5rem'}}><summary>{formatCalendarDate(day.date,language)} · {t('{count} lịch nhắc',{count:day.rows.length})}</summary>{!day.rows.length?<p>{t('Ngày này chưa có lịch nhắc đang bật.')}</p>:<ul style={{listStyle:'none',padding:0}}>{day.rows.slice(0,limits[day.date]||8).map(row=><li key={row.id} style={{margin:'0.75rem 0',overflowWrap:'anywhere'}}><p><strong>{row.time}</strong> · {row.name}</p>{row.overlap&&<p>{t('Có lịch nhắc khác trong cùng phút. Bạn có muốn giãn giờ nhắc?')}</p>}<button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onEdit(row.id)}>{t('Xem và sửa lịch này')}</button></li>)}</ul>}{day.rows.length>(limits[day.date]||8)&&<button type="button" className="btn btn-secondary btn-sm" onClick={()=>setLimits(previous=>({...previous,[day.date]:(previous[day.date]||8)+8}))}>{t('Xem thêm lịch nhắc')}</button>}</details>)}
 <p>{t('Đây là bản xem theo thứ và giờ đã đặt. Vào ngày đổi giờ mùa hè, thời điểm thông báo thực tế còn phụ thuộc ứng dụng lịch mà bạn nhập file vào.')}</p>
 </details>;
}
