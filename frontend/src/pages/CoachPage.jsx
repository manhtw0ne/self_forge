import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import api from '../api/client';
import {useAuth} from '../context/useAuth';
import {useLanguage} from '../context/useLanguage';
import HabitCoach from '../components/HabitCoach';
import WeeklyCoach from '../components/WeeklyCoach';
import {useAccountDate} from '../hooks/useAccountDate';
import {calendarWeekStart} from '../utils/dates';
import {readHabitCoachHabits} from '../utils/habitCoach';
import {readWeeklyInsight} from '../utils/weeklyInsight';

export default function CoachPage(){
 const {user}=useAuth();
 const {language}=useLanguage(),en=language==='en';
 const today=useAccountDate(user?.timezone);
 const weekStart=useMemo(()=>calendarWeekStart(today),[today]);
 const [habits,setHabits]=useState(null),[habitsError,setHabitsError]=useState(false),[habitsAttempt,setHabitsAttempt]=useState(0);
 const [weekly,setWeekly]=useState(null),[weeklyError,setWeeklyError]=useState(false),[weeklyAttempt,setWeeklyAttempt]=useState(0);

 useEffect(()=>{let active=true;setHabits(null);setHabitsError(false);api.get('/habits').then(({data})=>{const value=readHabitCoachHabits(data);if(active)setHabits(value);}).catch(()=>{if(active)setHabitsError(true);});return()=>{active=false;};},[habitsAttempt]);
 useEffect(()=>{let active=true;setWeekly(null);setWeeklyError(false);api.get('/insights/weekly',{params:{date:weekStart}}).then(({data})=>{const value=readWeeklyInsight(data,weekStart);if(active)setWeekly(value);}).catch(()=>{if(active)setWeeklyError(true);});return()=>{active=false;};},[weekStart,weeklyAttempt]);

 const pathways=[
  {to:'/#multi-focus-plan',title:en?'Plan today':'Lập kế hoạch hôm nay',description:en?'Prioritize up to three selected habits using only time and energy you enter.':'Ưu tiên tối đa ba thói quen đã chọn từ thời gian và năng lượng bạn tự nhập.'},
  {to:'/goals',title:en?'Break down a goal':'Chia nhỏ mục tiêu',description:en?'Open an active goal to review an optional habit-plan draft before creating anything.':'Mở một mục tiêu đang thực hiện để xem bản nháp thói quen trước khi tạo bất cứ thứ gì.'},
  {to:'/#restart-plan',title:en?'Restart gently':'Bắt đầu lại nhẹ nhàng',description:en?'Make an optional three-day recovery draft after losing momentum.':'Lập bản nháp phục hồi ba ngày tùy chọn khi bạn mất nhịp.'},
  {to:'/journal',title:en?'Reflect on a journal entry':'Phản hồi nhật ký',description:en?'Use it only after writing; journal text is included only when you explicitly consent there.':'Chỉ dùng sau khi viết; nội dung nhật ký chỉ được gửi khi bạn đồng ý rõ ràng tại màn hình đó.'},
 ];

 return <div className="fade-in"><header className="page-header"><h1>{en?'AI Coach':'AI Coach'}</h1><p>{en?'Choose a small, context-specific tool. SelfForge never runs an autonomous chat, changes your data, or sends context until you open a tool and consent.':'Chọn một công cụ nhỏ theo đúng ngữ cảnh. SelfForge không chạy chat tự động, không tự đổi dữ liệu và không gửi ngữ cảnh trước khi bạn mở công cụ rồi đồng ý.'}</p></header>
  <section className="card" aria-labelledby="coach-week-title"><h2 id="coach-week-title">{en?'Review this week':'Nhìn lại tuần này'}</h2><p>{en?'Use recorded weekly activity to find one small experiment for next week.':'Dùng hoạt động đã ghi nhận trong tuần để tìm một thử nghiệm nhỏ cho tuần tới.'}</p>{weeklyError?<div role="alert"><p>{en?'This week’s summary could not be loaded. No weekly data was sent to AI.':'Chưa tải được tổng kết tuần này. Không có dữ liệu tuần nào được gửi cho AI.'}</p><button type="button" className="btn btn-secondary btn-sm" onClick={()=>setWeeklyAttempt(value=>value+1)}>{en?'Retry weekly summary':'Tải lại tổng kết tuần'}</button></div>:weekly===null?<p role="status">{en?'Loading this week’s recorded summary…':'Đang tải tổng kết đã ghi của tuần này…'}</p>:<WeeklyCoach snapshot={weekly}/>}</section>
  <section className="card" aria-labelledby="coach-pathways-title"><h2 id="coach-pathways-title">{en?'Other guided moments':'Các thời điểm có hướng dẫn khác'}</h2><p>{en?'Each tool stays next to the data it needs, so you can review and approve any draft before saving it.':'Mỗi công cụ nằm cạnh dữ liệu cần thiết để bạn xem lại và tự duyệt mọi bản nháp trước khi lưu.'}</p><div className="card-grid" style={{marginTop:'1rem'}}>{pathways.map(pathway=><article key={pathway.to} className="stat-card" style={{textAlign:'left'}}><h3 style={{fontSize:'1rem'}}>{pathway.title}</h3><p>{pathway.description}</p><Link className="btn btn-secondary btn-sm" to={pathway.to}>{en?'Open the right context':'Mở đúng ngữ cảnh'}</Link></article>)}</div></section>
  {habitsError?<section className="card" role="alert"><p>{en?'Your active habits could not be loaded. No habit-coach request was sent.':'Chưa tải được thói quen đang bật. Ứng dụng chưa gửi yêu cầu Coach thói quen nào.'}</p><button className="btn btn-secondary" onClick={()=>setHabitsAttempt(value=>value+1)}>{en?'Retry':'Thử lại'}</button></section>:habits===null?<div className="loading-spinner" role="status"><div className="spinner" aria-hidden="true"/><span>{en?'Loading habit Coach…':'Đang tải Coach thói quen…'}</span></div>:<HabitCoach habits={habits}/>}</div>;
}
