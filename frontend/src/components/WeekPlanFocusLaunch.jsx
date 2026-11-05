import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useLanguage} from '../context/useLanguage';
import {weekPlanFocusLink} from '../utils/weekPlanFocus';
export default function WeekPlanFocusLaunch({plan,disabled}){
 const {language}=useLanguage(),en=language==='en';const [minutes,setMinutes]=useState(25);let path;try{path=weekPlanFocusLink(plan,minutes);}catch{return null;}
 return <details style={{margin:'1rem 0'}}><summary>{en?'Work on this step with Pomodoro':'Thực hiện bước này bằng Pomodoro'}</summary><p>{en?'Choose a focus duration and review the saved step on the Pomodoro page before starting. Shorter tasks can be done without a timer. Completing Pomodoro does not mark this plan complete.':'Chọn thời lượng rồi xem lại bước đã lưu trên trang Pomodoro trước khi bắt đầu. Việc ngắn hơn có thể làm không cần bộ đếm. Hoàn thành Pomodoro không tự đánh dấu kế hoạch đã thực hiện.'}</p><label className="form-label">{en?'Focus minutes':'Số phút tập trung'}<select className="form-select" value={minutes} disabled={disabled} onChange={e=>setMinutes(Number(e.target.value))}>{[25,30,45,60,90,120].map(n=><option key={n} value={n}>{n}</option>)}</select></label>{!disabled&&<Link className="btn btn-secondary btn-sm" to={path}>{en?'Review and prepare Pomodoro':'Xem và chuẩn bị Pomodoro'}</Link>}</details>;
}
