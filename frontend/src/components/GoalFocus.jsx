import {challengeLink} from '../utils/challengeProposal';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useLanguage} from '../context/useLanguage';
import {goalFocusHabits} from '../utils/goalFocus';
import {focusPlan,focusLink} from '../utils/focusPlan';
export default function GoalFocus({goal,links,owned,created}){
 const {t}=useLanguage();const [habitId,setHabitId]=useState('');const [budget,setBudget]=useState('25');const [energy,setEnergy]=useState('MEDIUM');
 let choices;try{choices=goalFocusHabits(links,owned,created);}catch{return <p role="alert">{t('Chưa xác minh được thói quen liên kết để mở phiên tập trung.')}</p>;}
 if(goal.status!=='ACTIVE'||!choices.length)return null;
 const selected=choices.find(row=>String(row.id)===(habitId||String(created?.id||choices[0].id)));
 let plan=null;try{plan=focusPlan(budget,energy);}catch{/* Keep invalid input editable. */}
 return <section style={{margin:'1.25rem 0',borderTop:'1px solid var(--border-color)',paddingTop:'1rem'}}>
  <h3>{t('Tập trung cho mục tiêu')}</h3>
  <label className="form-label" htmlFor="goal-focus-habit">{t('Chọn thói quen')}</label><select id="goal-focus-habit" className="form-select" value={selected?.id||''} onChange={event=>setHabitId(event.target.value)}><option value="" disabled>{t('Chọn thói quen')}</option>{choices.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select>
  <label className="form-label" htmlFor="goal-focus-time">{t('Bạn có bao nhiêu phút rảnh?')}</label><input id="goal-focus-time" className="form-input" type="number" min="5" max="240" step="1" value={budget} onChange={event=>setBudget(event.target.value)}/>
  <label className="form-label" htmlFor="goal-focus-energy">{t('Năng lượng hiện tại')}</label><select id="goal-focus-energy" className="form-select" value={energy} onChange={event=>setEnergy(event.target.value)}>{[['LOW','Thấp'],['MEDIUM','Vừa'],['HIGH','Cao']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select>
  {!plan?<p role="alert">{t('Nhập từ 5 đến 240 phút, dùng số nguyên.')}</p>:plan.focusMinutes?<><p>{t('Đề xuất tập trung {minutes} phút, còn {remaining} phút để nghỉ hoặc làm việc khác.',{minutes:plan.focusMinutes,remaining:plan.remaining})}</p>{selected&&<Link className="btn btn-primary" to={focusLink(plan.focusMinutes,selected.id)}>{t('Mở Pomodoro cho thói quen liên kết')}</Link>}</>:<p>{t('Thử một bước nhỏ trong {minutes} phút. Phiên Pomodoro nhận XP cần ít nhất 25 phút; không cần kéo dài để lấy điểm.',{minutes:plan.smallStepMinutes})}</p>}
  {selected&&<Link className="btn btn-secondary" style={{marginTop:'0.75rem'}} to={challengeLink(selected.id)}>{t('Lập thử thách 3 ngày trong 7 ngày')}</Link>}
  <p>{t('Mở Pomodoro chỉ chuẩn bị cấu hình. Bạn xác nhận bắt đầu ở đó; check-in và tiến độ mục tiêu vẫn do bạn cập nhật riêng.')}</p>
 </section>;
}
