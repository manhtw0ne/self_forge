import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {createLatestRequest} from '../utils/latestRequest';
import {challengeAgenda} from '../utils/challengeAgenda';
import {habitPath} from '../utils/habitNavigation';
import {formatCalendarDate} from '../utils/dates';
export default function ChallengeAgenda({owner,today,habits,locked}){
 const {t,language}=useLanguage();const gate=useRef(createLatestRequest());const [agenda,setAgenda]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[limit,setLimit]=useState(3);
 useEffect(()=>{const current=gate.current;const refresh=()=>{setLoading(true);setError(false);void current.run(()=>api.get('/challenges'),response=>setAgenda(challengeAgenda(response.data,today,habits)),()=>setError(true),()=>setLoading(false));};const visible=()=>{if(document.visibilityState==='visible')refresh();};refresh();window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',visible);return()=>{current.invalidate();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',visible);};},[owner,today,habits,attempt]);
 return <section className="card" style={{margin:'1.5rem 0'}} aria-labelledby="challenge-agenda-title"><h2 id="challenge-agenda-title" className="card-title">{t('Thử thách hôm nay')}</h2>
  {loading&&<p role="status">{t('Đang tải...')}</p>}{error&&<p role="alert">{t('Chưa tải được thử thách trên Dashboard. Bạn vẫn có thể check-in ở trên.')}</p>}
  {!loading&&!error&&agenda&&<>
   {!agenda.current.length?<p>{t('Hôm nay chưa có thử thách đang chạy. Bạn có thể tạo thử thách từ một thói quen đã có.')}</p>:<ul style={{listStyle:'none',padding:0}}>{agenda.current.slice(0,limit).map(row=><li key={row.id} style={{margin:'1rem 0',overflowWrap:'anywhere'}}><h3>{row.name}</h3><p>{row.habitName} · {row.completedDays}/{row.targetDays} {t('ngày hoàn thành')}</p><progress value={Math.min(row.completedDays,row.targetDays)} max={row.targetDays} aria-label={t('Tiến độ thử thách')} style={{width:'100%'}}/><p>{t('Còn thiếu {remaining} ngày; kết thúc vào {date}.',{remaining:row.remaining,date:formatCalendarDate(row.endDate,language)})}</p>
    {row.kind==='SHORT_WINDOW'&&<p>{t('Thời gian còn lại ít hơn số ngày cần hoàn thành. Bạn có thể xem lại hoặc chuẩn bị thử thách nhẹ hơn.')}</p>}
    {!locked&&row.todayStatus==='COMPLETED'?<p>{t('Đã check-in hoàn thành thói quen này hôm nay. Không cần làm lại.')}</p>:row.canCheckIn&&!locked?<Link className="btn btn-secondary btn-sm" to={habitPath('/',row.habitId)+'#today-habits'}>{t('Mở đúng thói quen hôm nay')}</Link>:null}
    {!row.canCheckIn&&<p>{t('Thói quen chưa có trong danh sách hôm nay. Hãy kiểm tra ở trang thói quen.')}</p>}
   </li>)}</ul>}
   {agenda.current.length>limit&&<button className="btn btn-secondary btn-sm" onClick={()=>setLimit(value=>value+3)}>{t('Xem thêm thử thách')}</button>}
   {(agenda.upcoming.length>0||agenda.ended.length>0)&&<p>{t('{upcoming} thử thách sắp bắt đầu; {ended} thử thách đã hết khoảng thời gian.',{upcoming:agenda.upcoming.length,ended:agenda.ended.length})}</p>}
  </>}
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'1rem'}}><Link className="btn btn-secondary btn-sm" to="/challenges">{t('Xem và quản lý thử thách')}</Link><button className="btn btn-ghost btn-sm" disabled={loading} onClick={()=>setAttempt(value=>value+1)}>{t('Tải lại')}</button></div>
 </section>;
}
