import { useState,useEffect } from 'react';
import GoalHabitDialog from './GoalHabitDialog';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { readGoalHabit,GOAL_HABIT_PENDING } from '../utils/goalHabit';
export default function GoalHabitPending({goals}){
 const {user}=useAuth();const {t}=useLanguage();const [pending,setPending]=useState(null);const [opened,setOpened]=useState(null);
 useEffect(()=>{
  const refresh=()=>{try{setPending(readGoalHabit(localStorage,user.id));}catch{setPending({invalid:true});}};
  refresh();window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);window.addEventListener(GOAL_HABIT_PENDING,refresh);
  return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('focus',refresh);window.removeEventListener(GOAL_HABIT_PENDING,refresh);};
 },[user.id]);
 return <>
  {pending&&<section className="card" style={{margin:'1rem 0'}} role="status">
   <h2 className="card-title">{t('Yêu cầu tạo thói quen từ mục tiêu cần xác nhận')}</h2>
   <p>{t(pending.invalid?'Chưa đọc được yêu cầu đang chờ. Kiểm tra quyền lưu trữ trước khi tạo.':'Yêu cầu này đang chờ xác nhận. Thử lại sẽ dùng đúng nội dung và mã trước đó.')}</p>
   {!pending.invalid&&<><p>{pending.expected.name} · {pending.action==='LINK'?`#${pending.habitId}`:pending.habit.name}</p><button className="btn btn-secondary" onClick={()=>setOpened(goals.find(g=>g.id===pending.goalId)||{...pending.expected})}>{t('Kiểm tra yêu cầu đang chờ')}</button></>}
  </section>}
  {opened&&<GoalHabitDialog goal={opened} count={pending?.habit?.targetPerWeek||1} onClose={()=>setOpened(null)}/>}
 </>;
}
