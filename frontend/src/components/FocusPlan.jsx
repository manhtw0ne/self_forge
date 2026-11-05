import SmallStepTimer from './SmallStepTimer';
import DailyFocusPlan from './DailyFocusPlan';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useLanguage} from '../context/useLanguage';
import {focusPlan,focusLink,focusHabits} from '../utils/focusPlan';
export default function FocusPlan({habits,owner,today,timezone}){
 const {t}=useLanguage();const [open,setOpen]=useState(false);const [budget,setBudget]=useState('30');const [energy,setEnergy]=useState('LOW');const [habitId,setHabitId]=useState('');
 let plan;try{plan=focusPlan(budget,energy);}catch{/* Let the user correct input. */}
 const available=focusHabits(habits);
 const selected=habitId===''?null:available.find(h=>h.id===Number(habitId));
 return <section className="card" style={{margin:'1.5rem 0'}}>
  <h2 className="card-title">{t('Chọn phiên tập trung hôm nay')}</h2>
  <p>{t('Dùng thời gian rảnh và mức năng lượng bạn chọn để đề xuất một phiên. Đây là quy tắc đơn giản, chưa dùng AI.')}</p>
  <button className="btn btn-secondary" onClick={()=>setOpen(value=>!value)}>{t(open?'Ẩn lựa chọn tập trung':'Lập phiên tập trung')}</button>
  {open&&<div style={{marginTop:'1rem'}}>
   <label className="form-label" htmlFor="focus-plan-budget">{t('Bạn có bao nhiêu phút rảnh?')}</label><input id="focus-plan-budget" type="number" min="5" max="240" step="1" className="form-input" value={budget} onChange={e=>setBudget(e.target.value)}/>
   <label className="form-label" htmlFor="focus-plan-energy">{t('Năng lượng hiện tại')}</label><select id="focus-plan-energy" className="form-select" value={energy} onChange={e=>setEnergy(e.target.value)}>{[['LOW','Thấp'],['MEDIUM','Vừa'],['HIGH','Cao']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select>
   <label className="form-label" htmlFor="focus-plan-habit">{t('Việc bạn muốn ưu tiên')}</label><select id="focus-plan-habit" className="form-select" value={habitId} onChange={e=>setHabitId(e.target.value)}><option value="">{t('Phiên tự do')}</option>{available.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}{habitId!==''&&!selected&&<option value={habitId}>{t('Thói quen không còn phù hợp')}</option>}</select>
   {!plan?<p role="alert">{t('Nhập từ 5 đến 240 phút, dùng số nguyên.')}</p>:plan.focusMinutes?<><p>{t('Đề xuất tập trung {minutes} phút, còn {remaining} phút để nghỉ hoặc làm việc khác.',{minutes:plan.focusMinutes,remaining:plan.remaining})}</p>
    {habitId!==''&&!selected?<p role="alert">{t('Chọn lại việc ưu tiên trước khi mở Pomodoro.')}</p>:<Link className="btn btn-primary" to={focusLink(plan.focusMinutes,selected?.id??null)}>{t('Xem phiên đề xuất trong Pomodoro')}</Link>}
   </>:<p>{t('Thử một bước nhỏ trong {minutes} phút. Phiên Pomodoro nhận XP cần ít nhất 25 phút; không cần kéo dài để lấy điểm.',{minutes:plan.smallStepMinutes})}</p>}
   <p style={{color:'var(--text-muted)'}}>{t('Bạn tự chọn ưu tiên; thời lượng không phải ước tính để hoàn thành thói quen. Thực hiện rồi check-in như bình thường.')}</p>
  </div>}
  <SmallStepTimer key={owner+':small-step'} habits={habits} owner={owner}/>
  <DailyFocusPlan key={owner+':'+today} habits={habits} owner={owner} today={today} timezone={timezone}/>
 </section>;
}
