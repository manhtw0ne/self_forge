import { Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
export default function HabitGoalLinks({links}){
 const {t}=useLanguage();if(!links?.length)return null;
 return <div style={{marginTop:'0.75rem'}}>
  <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{t('Mục tiêu liên quan')}</span>
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem',marginTop:'0.25rem'}}>{links.map(goal=><Link key={goal.goalId} to={`/goals?goal=${goal.goalId}`} className="btn btn-secondary btn-sm" style={{whiteSpace:'normal',textAlign:'left',overflowWrap:'anywhere'}} aria-label={t('Mở mục tiêu {name}',{name:goal.name})}>
   {goal.name} · {goal.currentValue}/{goal.targetValue} {goal.unit}
   {goal.status!=='ACTIVE'&&` · ${t(goal.status==='COMPLETED'?'Đã hoàn thành':'Đã hủy')}`}
  </Link>)}</div>
 </div>;
}
