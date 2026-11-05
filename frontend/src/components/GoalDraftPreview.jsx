import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {useToast} from '../context/useToast';
import {goalDraftPreview} from '../utils/goalTemplates';
import {goalCapacity,goalPlanExport} from '../utils/goalPlan';
import {goalPayload} from '../utils/goalForm';
import {downloadText} from '../utils/downloadText';
import {formatCalendarDate} from '../utils/dates';
const labels=['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];
export default function GoalDraftPreview({form,today}){
 const {t,language}=useLanguage();const toast=useToast();
 const [days,setDays]=useState([0,1,2,3,4,5,6]);const [capacity,setCapacity]=useState('');
 let plan=null,pace=null;
 try{plan=goalDraftPreview(form,today,days);if(capacity!=='')pace=goalCapacity({...goalPayload(form),currentValue:0,status:'ACTIVE'},today,days,capacity);}catch{/* The editable form may be incomplete. */}
 return <details style={{margin:'1rem 0'}}><summary>{t('Xem trước nhịp thực hiện mục tiêu')}</summary>
  <p>{t('Chọn ngày bạn có thể thực hiện. Tính từ hôm nay đến hết hạn chót theo múi giờ tài khoản.')}</p>
  <fieldset style={{border:0,padding:0,margin:'1rem 0'}}><legend className="form-label">{t('Ngày có thể thực hiện')}</legend>
   <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem 1rem'}}>{[1,2,3,4,5,6,0].map(day=><label key={day} style={{display:'flex',alignItems:'center',gap:'0.4rem'}}><input type="checkbox" checked={days.includes(day)} onChange={event=>setDays(previous=>event.target.checked?[...previous,day]:previous.filter(value=>value!==day))}/>{t(labels[day])}</label>)}</div>
  </fieldset>
  <label className="form-label">{t('Mỗi buổi bạn thực hiện được bao nhiêu?')}<input className="form-input" type="number" min="1" max="2147483647" step="1" value={capacity} onChange={event=>setCapacity(event.target.value)} placeholder={t('Số lượng theo đơn vị của mục tiêu')}/></label>
  <p>{t('Nhập mức bạn thấy khả thi, không phải số XP hoặc số phút.')}</p>
  {capacity!==''&&<div role="status">{pace?.state==='ready'?<><p>{t('Cần {needed} buổi; có {available} ngày phù hợp đến hạn chót.',{needed:pace.needed,available:pace.available})}</p><p>{t(pace.fits?'Mức này phù hợp với số ngày đã chọn.':'Thiếu {count} buổi theo mức bạn nhập. Cân nhắc chọn thêm ngày, giảm mục tiêu hoặc đổi hạn chót.',{count:pace.shortfall})}</p>{pace.recommendedDeadline&&<p>{t('Theo nhịp này, ngày hoàn thành dự kiến là {date}.',{date:formatCalendarDate(pace.recommendedDeadline,language)})}</p>}</>:<p>{t('Chọn ngày thực hiện và nhập số nguyên dương để kiểm tra nhịp làm.')}</p>}</div>}
  {plan?.state==='ready'?<><p>{t('Còn {remaining} {unit}, chia cho {sessions} ngày thực hiện.',{remaining:plan.remaining,unit:form.unit,sessions:plan.sessions})}</p><p>{t('Mỗi ngày đã chọn cần tối đa {amount} {unit} theo cách chia đều.',{amount:plan.perSession,unit:form.unit})}</p><h3>{t('Lịch 7 ngày tới')}</h3>{plan.preview.length?<ul style={{paddingLeft:'1.25rem'}}>{plan.preview.map(row=><li key={row.date}>{formatCalendarDate(row.date,language,{weekday:'short',day:'numeric',month:'numeric'})}: {row.amount} {form.unit}</li>)}</ul>:<p>{t('Không có ngày đã chọn trong 7 ngày tới.')}</p>}
   <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{try{const result=goalPlanExport(goalPayload(form),plan,today,t);downloadText(result.content,result.filename);}catch{toast.error(t('Không thể tải kế hoạch. Hãy thử lại.'));}}}>{t('Tải kế hoạch (.txt)')}</button>
  </>:<p>{t(plan?.state==='no-days'?'Không có ngày thực hiện phù hợp trước hạn chót. Chọn thêm ngày hoặc điều chỉnh hạn.':'Điền tên, số lượng và hạn chót từ hôm nay trở đi để xem phép chia theo ngày.')}</p>}
  <p>{t('Lựa chọn ngày và nhịp làm ở đây chỉ dùng để xem thử và tải kế hoạch; chưa được lưu cùng mục tiêu.')}</p>
  <p>{t('Kế hoạch chia đều số lượng, chưa ước tính thời gian hay độ khó. Không tự ghi tiến độ hoặc đổi mục tiêu.')}</p>
 </details>;
}
