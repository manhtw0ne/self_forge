import {goalPlanPreference,readGoalPlanPreference,writeGoalPlanPreference,removeGoalPlanPreference} from '../utils/goalPlanPreference';
import {plannedGoalProgress,plannedGoalDeadline} from '../utils/goalPlanActions';
import GoalHabitDialog from './GoalHabitDialog';
import { useState } from 'react';
import { useLanguage } from '../context/useLanguage';
import { goalPlan, goalPlanExport, goalCapacity, goalHabitSuggestion } from '../utils/goalPlan';
import { formatCalendarDate } from '../utils/dates';
import { downloadText } from '../utils/downloadText';
import { useToast } from '../context/useToast';
import GoalCoach from './GoalCoach';

const labels = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
export default function GoalPlan({ goal, owner,today,onRecord,onProposeDeadline,busy=false,blockedProgress=false }) {
  const { t, language } = useLanguage();
  const toast = useToast();
  const [creatingHabit,setCreatingHabit]=useState(false);
  const [aiHabit,setAiHabit]=useState(null);
  const unit=goal.unit||'';
  const [initial]=useState(()=>{try{return {value:readGoalPlanPreference(localStorage,owner,goal.id),error:false};}catch{return {value:null,error:true};}});
  const [stored,setStored]=useState(initial.value),[preferenceError,setPreferenceError]=useState(initial.error);
  const [days,setDays]=useState(initial.value?.unit===unit?initial.value.days:[0,1,2,3,4,5,6]);
  const [capacity,setCapacity]=useState(initial.value?.unit===unit?initial.value.capacity:'');
  let preference=null;try{preference=goalPlanPreference({days,capacity,unit});}catch{/* Empty or incomplete fields remain editable. */}
  const preferenceSaved=stored&&preference&&JSON.stringify(stored)===JSON.stringify(preference);

  const plan = goalPlan(goal, today, days);
  let pace=null;try{if(capacity!=='')pace=goalCapacity(goal,today,days,capacity);}catch{pace={state:'invalid'};}
  let todayAmount=null;try{if(capacity===''||pace?.state==='ready')todayAmount=plannedGoalProgress(goal,today,days,capacity===''?null:capacity);}catch{/* Invalid capacity is shown in the form. */}
  const suggestion=pace?.state==='ready'?goalHabitSuggestion(goal,plan,pace,t):null;
  return <details style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('Lập kế hoạch theo hạn chót')}</summary>
    <p style={{ margin: '0.75rem 0', color: 'var(--text-muted)' }}>{t('Chọn ngày bạn có thể thực hiện. Tính từ hôm nay đến hết hạn chót theo múi giờ tài khoản.')}</p>
    <fieldset style={{ border: 0, padding: 0, margin: '0.75rem 0' }}>
      <legend className="form-label">{t('Ngày có thể thực hiện')}</legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1rem' }}>{[1, 2, 3, 4, 5, 6, 0].map(day =>
        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input type="checkbox" checked={days.includes(day)} onChange={event => setDays(previous => event.target.checked ? [...previous, day] : previous.filter(value => value !== day))} />{t(labels[day])}
        </label>)}</div>
    </fieldset>
    <label className="form-label">{t('Mỗi buổi bạn thực hiện được bao nhiêu?')}<input className="form-input" type="number" min="1" max="2147483647" step="1" value={capacity} onChange={event=>setCapacity(event.target.value)} placeholder={t('Số lượng theo đơn vị của mục tiêu')}/></label>
    <p>{goal.unit||t('Đơn vị chưa được đặt')} · {t('Nhập mức bạn thấy khả thi, không phải số XP hoặc số phút.')}</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',margin:'1rem 0'}}><button type="button" className="btn btn-secondary btn-sm" disabled={!preference||busy} onClick={()=>{try{writeGoalPlanPreference(localStorage,owner,goal.id,preference);setStored(preference);setPreferenceError(false);}catch{setPreferenceError(true);}}}>{t('Lưu lịch tính kế hoạch trên trình duyệt')}</button>{(stored||preferenceError)&&<button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>{try{removeGoalPlanPreference(localStorage,owner,goal.id);setStored(null);setPreferenceError(false);setDays([0,1,2,3,4,5,6]);setCapacity('');}catch{setPreferenceError(true);}}}>{t('Xóa lịch tính kế hoạch đã lưu')}</button>}</div>
    {stored&&stored.unit!==unit&&<p role="status">{t('Đơn vị mục tiêu đã đổi. Lịch tính cũ chưa được áp dụng; chọn lại ngày và mức làm rồi lưu nếu phù hợp.')}</p>}
    {preferenceSaved&&<p role="status">{t('Đã lưu ngày và mức làm cho mục tiêu này trên trình duyệt.')}</p>}
    {preferenceError&&<p role="alert">{t('Chưa đọc hoặc lưu được lịch tính kế hoạch. Lựa chọn hiện tại vẫn dùng để xem thử; kiểm tra quyền lưu trữ trước khi rời trang.')}</p>}
    <p>{t('Cấu hình chỉ giúp tính kế hoạch theo hạn chót hiện tại, không tạo lịch nhắc, đổi lịch thói quen hoặc tự ghi tiến độ. Đổi tên không làm mất cấu hình; đổi đơn vị cần chọn lại.')}</p>
    {pace&&<div role="status" style={{margin:'1rem 0'}}>{pace.state==='ready'?<>
     <p>{t('Cần {needed} buổi; có {available} ngày phù hợp đến hạn chót.',{needed:pace.needed,available:pace.available})}</p>
     <p>{t(pace.fits?'Mức này phù hợp với số ngày đã chọn.':'Thiếu {count} buổi theo mức bạn nhập. Cân nhắc chọn thêm ngày, giảm mục tiêu hoặc đổi hạn chót.',{count:pace.shortfall})}</p>
     {pace.recommendedDeadline?<p>{t('Theo nhịp này, ngày hoàn thành dự kiến là {date}.',{date:formatCalendarDate(pace.recommendedDeadline,language)})}</p>:<p>{t('Ngày hoàn thành nằm ngoài khoảng gợi ý 10 năm. Hãy chia mục tiêu thành bước nhỏ hơn.')}</p>}
     <p>{t('Đây là phép tính theo số lượng và lịch đã chọn; không tự đổi hạn chót hoặc ghi tiến độ.')}</p>
    </>:<p>{t(pace.state==='invalid'?'Nhập số nguyên dương cho khả năng mỗi buổi.':'Chọn ngày thực hiện và đặt hạn chót hợp lệ để so sánh nhịp làm.')}</p>}</div>}
    {pace?.state==='ready'&&pace.recommendedDeadline&&pace.recommendedDeadline!==goal.deadline&&onProposeDeadline&&<button type="button" className="btn btn-secondary btn-sm" disabled={busy||blockedProgress} onClick={()=>onProposeDeadline(plannedGoalDeadline(goal,today,days,capacity))}>{t('Xem đề xuất đổi hạn chót trong hộp sửa mục tiêu')}</button>}
    {plan.state === 'ready' ? <>
      <p>{t('Còn {remaining} {unit}, chia cho {sessions} ngày thực hiện.', { remaining: plan.remaining, unit: goal.unit || '', sessions: plan.sessions })}</p>
      <p>{t('Mỗi ngày đã chọn cần tối đa {amount} {unit} theo cách chia đều.', { amount: plan.perSession, unit: goal.unit || '' })}</p>
      <h3 style={{ fontSize: '1rem', margin: '0.75rem 0' }}>{t('Lịch 7 ngày tới')}</h3>
      {plan.preview.length ? <ul style={{ paddingLeft: '1.25rem' }}>{plan.preview.map(row => <li key={row.date} style={{ marginBottom: '0.4rem' }}>
        {formatCalendarDate(row.date, language, { weekday: 'short', month: 'numeric', day: 'numeric' })}: {row.amount} {goal.unit || ''}
        {row.amount === 0 && ` · ${t('Không cần thêm tiến độ theo cách chia đều')}`}
      </li>)}</ul> : <p>{t('Không có ngày đã chọn trong 7 ngày tới.')}</p>}
      {todayAmount!==null&&onRecord&&<div style={{margin:'1rem 0'}}><p>{t('Bước hôm nay gợi ý {amount} {unit}. Chỉ ghi nhận phần bạn đã thực sự làm.',{amount:todayAmount,unit:goal.unit||''})}</p><button type="button" className="btn btn-primary btn-sm" disabled={busy||blockedProgress} onClick={()=>onRecord(todayAmount)}>{t('Điền lượng hôm nay vào hộp ghi tiến độ')}</button></div>}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
        try { const result = goalPlanExport(goal, plan, today, t); downloadText(result.content, result.filename); }
        catch { toast.error(t('Không thể tải kế hoạch. Hãy thử lại.')); }
      }}>{t('Tải kế hoạch (.txt)')}</button>
    </> : <p role="status">{t({ undated: 'Thêm hạn chót cho mục tiêu để tính kế hoạch.', overdue: 'Mục tiêu đã quá hạn. Điều chỉnh hạn chót trước khi lập kế hoạch mới.', 'no-days': 'Không có ngày thực hiện phù hợp trước hạn chót. Chọn thêm ngày hoặc điều chỉnh hạn.', ended: 'Mục tiêu đã kết thúc hoặc đã đủ tiến độ.', invalid: 'Chưa đủ dữ liệu hợp lệ để lập kế hoạch.' }[plan.state])}</p>}
    <GoalCoach goal={goal} disabled={busy} onUseHabit={habit=>{setAiHabit(habit);setCreatingHabit(true);}}/>
    <div style={{margin:'1rem 0'}}><button type="button" className="btn btn-primary btn-sm" onClick={()=>{setAiHabit(null);setCreatingHabit(true);}}>{t('Thói quen cho mục tiêu')}</button></div>
    {creatingHabit&&<GoalHabitDialog goal={goal} count={days.length} suggestion={aiHabit||suggestion} onClose={()=>{setCreatingHabit(false);setAiHabit(null);}}/>}
    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>{t('Kế hoạch chia đều số lượng, chưa ước tính thời gian hay độ khó. Không tự ghi tiến độ hoặc đổi mục tiêu.')}</p>
  </details>;
}
