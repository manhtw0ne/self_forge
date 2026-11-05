import {useEffect,useRef,useState} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {todayInTimezone,formatCalendarDate} from '../utils/dates';
import {readCompanionRhythm} from '../utils/companionRhythm';
import {createLatestRequest} from '../utils/latestRequest';
import {PROGRESS_CHANGED} from '../utils/progressSync';

export default function CompanionRhythm({owner,timezone}){
 const {language}=useLanguage(),en=language==='en',today=todayInTimezone(timezone);const [open,setOpen]=useState(false),[data,setData]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);const gate=useRef(createLatestRequest());
 useEffect(()=>{if(!open)return;const request=gate.current;const refresh=()=>{setLoading(true);setError(false);void request.run(()=>api.get('/companion/rhythm'),response=>setData(readCompanionRhythm(response.data,today,timezone)),()=>setError(true),()=>setLoading(false));};refresh();window.addEventListener(PROGRESS_CHANGED,refresh);return()=>{request.invalidate();window.removeEventListener(PROGRESS_CHANGED,refresh);};},[owner,open,today,timezone,attempt]);
 return <details style={{margin:'1rem 0'}} open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary>{en?'Recent rhythm and next form':'Nhịp gần đây và hình thái tiếp theo'}</summary>
  <p>{en?'This is an estimate from saved companion credit in the last 28 calendar days. It is not a deadline, a task, or a promise.':'Đây là ước tính từ điểm đồng hành đã ghi nhận trong 28 ngày lịch gần đây. Không phải hạn chót, nhiệm vụ hay cam kết.'}</p>
  {loading?<p role="status">{en?'Reading your recent rhythm…':'Đang đọc nhịp gần đây...'}</p>:error?<div role="alert"><p>{en?'Your recent rhythm could not be loaded.':'Chưa tải được nhịp gần đây.'}</p><button type="button" className="btn btn-secondary btn-sm" onClick={()=>setAttempt(value=>value+1)}>{en?'Try again':'Thử lại'}</button></div>:data&&<>
   <p>{en?`Last ${data.periodDays} days: ${data.periodXp} companion XP across ${data.contributingDays} day${data.contributingDays===1?'':'s'} with recorded progress.`:`${data.periodDays} ngày gần đây: ${data.periodXp} XP đồng hành từ ${data.contributingDays} ngày có tiến độ đã ghi nhận.`}</p>
   {data.nextThreshold===null?<p>{en?'Your companion has reached its final form. Recent activity is still recorded, with no new form required.':'Bạn đồng hành đã đạt hình thái cuối. Hoạt động gần đây vẫn được ghi nhận, không cần mở thêm hình thái mới.'}</p>:data.estimatedReachDate?<p>{en?`At this recent rhythm, the next form around ${formatCalendarDate(data.estimatedReachDate,language)} is an estimate. ${data.remainingXp} XP remain.`:`Nếu giữ nhịp gần đây, hình thái tiếp theo vào khoảng ${formatCalendarDate(data.estimatedReachDate,language)} là một ước tính. Còn ${data.remainingXp} XP.`}</p>:data.periodXp===0?<p>{en?'There is not yet any saved companion credit in this window to estimate from. That does not count as a setback.':'Chưa có điểm đồng hành đã lưu trong giai đoạn này để tạo ước tính. Điều đó không được coi là thụt lùi.'}</p>:<p>{en?'At this recent rhythm the next form falls beyond a one-year estimate, so no date is shown.':'Theo nhịp gần đây, hình thái tiếp theo nằm ngoài ước tính một năm nên không hiển thị ngày.'}</p>}
  </>}
 </details>;
}
