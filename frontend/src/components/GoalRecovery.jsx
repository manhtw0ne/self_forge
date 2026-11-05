import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {formatCalendarDate} from '../utils/dates';
import {goalRecovery} from '../utils/goalRecovery';
export default function GoalRecovery({goal,today,disabled,onEdit,onAbandon}){
 const {t,language}=useLanguage();const [days,setDays]=useState(14);let proposal;try{proposal=goalRecovery(goal,today,days);}catch{return null;}if(!proposal)return null;
 return <details style={{border:'1px solid var(--border-color)',borderRadius:'0.75rem',padding:'0.75rem',margin:'1rem 0'}}><summary>{t('Lập lại nhịp cho mục tiêu quá hạn')}</summary>
  <p>{t('Hạn cũ đã qua {count} ngày. Phần đã làm vẫn được giữ; bạn có thể chọn một khoảng thời gian mới để cân nhắc.',{count:proposal.overdueDays})}</p>
  <label className="form-label">{t('Khoảng thời gian làm phần còn lại')}<select className="form-select" value={days} disabled={disabled} onChange={event=>setDays(Number(event.target.value))}>{[7,14,30].map(value=><option key={value} value={value}>{t('{count} ngày kể từ hôm nay',{count:value})}</option>)}</select></label>
  <p>{t('Còn {remaining} {unit}. Nếu làm mỗi ngày lịch, cần tối đa {amount} {unit}/ngày.',{remaining:proposal.remaining,unit:goal.unit||'',amount:proposal.perDay})}</p>
  <p>{t('Hạn mới để xem xét: {date}.',{date:formatCalendarDate(proposal.deadline,language)})}</p>
  <p>{t('Đây là phép chia số lượng, chưa tính ngày nghỉ hoặc thời gian cần làm. Xem và sửa trong biểu mẫu trước khi lưu.')}</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={()=>onEdit(proposal.deadline)}>{t('Xem hạn mới trong biểu mẫu sửa')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onEdit()}>{t('Tự điều chỉnh mục tiêu')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={onAbandon}>{t('Không tiếp tục mục tiêu này')}</button></div>
  <p>{t('Bạn có thể giữ mục tiêu hiện tại bằng cách đóng phần này. Quá hạn không tự xóa tiến độ hoặc hủy mục tiêu.')}</p>
 </details>;
}
