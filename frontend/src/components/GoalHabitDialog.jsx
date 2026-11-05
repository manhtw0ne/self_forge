import {habitPath} from '../utils/habitNavigation';
import GoalFocus from './GoalFocus';
import { useState,useEffect,useRef } from 'react';
import { Link } from 'react-router-dom';
import ModalOverlay from './ModalOverlay';
import { useLanguage } from '../context/useLanguage';
import { useAuth } from '../context/useAuth';
import { usePremium } from '../context/usePremium';
import { useToast } from '../context/useToast';
import api from '../api/client';
import { goalSnapshot } from '../utils/goalForm';
import { readGoalHabit,applyGoalHabit,goalHabitPayload } from '../utils/goalHabit';
export default function GoalHabitDialog({goal,count,suggestion,onClose}){
 const {user}=useAuth();const {isPremium}=usePremium();const {t}=useLanguage();const toast=useToast();
 const [initialPending]=useState(()=>{try{return readGoalHabit(localStorage,user.id);}catch{return {invalid:true};}});
 const [form,setForm]=useState(initialPending?.goalId===goal.id&&initialPending.action==='CREATE'?initialPending.habit:suggestion||{name:goal.name,description:'',difficulty:'EASY',targetPerWeek:count||1});
 const [action,setAction]=useState(initialPending?.action||'CREATE');
 const [habitId,setHabitId]=useState(initialPending?.habitId||'');
 const [base,setBase]=useState(()=>goalSnapshot(goal));const [latest,setLatest]=useState(null);
 const [pending,setPending]=useState(initialPending);
 const [existing,setExisting]=useState([]);const [activeHabits,setActiveHabits]=useState([]);
 const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState(false);
 const [busy,setBusy]=useState(false);const lock=useRef(false);const [conflict,setConflict]=useState(false);
 const [created,setCreated]=useState(null);const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  Promise.all([api.get(`/goals/${goal.id}/habits`),api.get('/habits')]).then(([links,habits])=>{
   if(!Array.isArray(links.data)||!Array.isArray(habits.data))throw Error('Invalid habits');
   if(active){setExisting(links.data);setActiveHabits(habits.data);}
  }).catch(()=>{if(active)setLoadError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[goal.id]);
 const duplicates=activeHabits.filter(h=>h.name.trim().toLowerCase()===form.name.trim().toLowerCase());
 const capacity=!isPremium&&activeHabits.length>=10;
 const submit=async event=>{
  event.preventDefault();if(lock.current||conflict||loading||(loadError&&!pending)||pending?.invalid||(pending&&pending.goalId!==goal.id))return;
  if(!pending){try{if(action==='CREATE')goalHabitPayload(form);else if(!Number.isSafeInteger(Number(habitId))||Number(habitId)<=0)throw Error('Missing habit');}catch{setError(t(action==='LINK'?'Chọn thói quen đang hoạt động':'Kiểm tra tên thói quen và chỉ tiêu từ 1 đến 7 lượt mỗi tuần.'));return;}}
  lock.current=true;setBusy(true);setError('');
  try{
   const result=await applyGoalHabit(localStorage,user.id,goal.id,action==='LINK'?{action,habitId:Number(habitId)}:{action,habit:form},base,payload=>api.post(`/goals/${payload.goalId}/habits${payload.action==='LINK'?'/link':''}`,{...(payload.action==='LINK'?{habitId:payload.habitId}:{habit:payload.habit}),expected:payload.expected,requestId:payload.requestId}));
   if(!Number.isSafeInteger(result.response.data?.id)||result.response.data.id<=0)throw Error('Invalid creation response');
   setCreated(result.response.data);setPending(result.pending);toast.success(t(action==='LINK'?'Đã gắn thói quen với mục tiêu.':'Đã tạo thói quen từ mục tiêu.'));
  }catch(failure){
   try{setPending(readGoalHabit(localStorage,user.id));}catch{setPending({invalid:true});}
   if(failure.response?.status===409&&(/Mục tiêu đã thay đổi|Chỉ tạo thói quen|Chỉ gắn thói quen cho mục tiêu/.test(failure.response?.data?.detail||''))){setConflict(true);setLatest(null);}
   setError(failure.response?.data?.detail||(failure.message==='Goal habit request not sent'?t('Chưa lưu được yêu cầu trên thiết bị. Thói quen chưa được gửi.'):t('Chưa xác nhận được kết quả. Giữ yêu cầu để thử lại cùng mã, không tạo lại bằng mã mới.')));
  }finally{lock.current=false;setBusy(false);}
 };
 const inspect=async()=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const {data}=await api.get('/goals');const value=data.find(item=>item.id===goal.id);if(!value||value.status!=='ACTIVE')throw Error('Ended goal');setLatest(value);}
  catch{setError(t('Không còn mục tiêu đang thực hiện hoặc chưa tải được bản mới. Nội dung nhập vẫn được giữ.'));}
  finally{lock.current=false;setBusy(false);}
 };
 return <ModalOverlay onClose={()=>{if(!lock.current)onClose();}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="goal-habit-title" onClick={event=>event.stopPropagation()}>
  <h2 id="goal-habit-title">{t('Thói quen cho mục tiêu')}</h2><p>{goal.name}</p>
  <p>{t('Xem và chỉnh trước khi tạo. Thói quen có chỉ tiêu tuần, chưa tự đặt lịch theo từng ngày hoặc cộng tiến độ mục tiêu.')}</p>
  {loading?<p role="status">{t('Đang tải...')}</p>:loadError?<p role="alert">{t('Chưa tải được thói quen hiện có. Đóng và mở lại để kiểm tra trước khi tạo.')}</p>:existing.length>0&&<div><h3>{t('Thói quen liên kết với mục tiêu này')}</h3><ul style={{paddingLeft:'1.25rem'}}>{existing.map(h=><li key={h.id}>{h.name} · {t(h.active?'Đang hoạt động':'Đã tắt')} · <Link to={habitPath('/habits',h.id)}>{t('Mở thói quen')}</Link></li>)}</ul></div>}
  {!loading&&!loadError&&<GoalFocus goal={goal} links={existing} owned={activeHabits} created={created}/>}
  {pending&&<p role="alert">{t(pending.invalid?'Chưa đọc được yêu cầu đang chờ. Kiểm tra quyền lưu trữ trước khi tạo.':pending.goalId!==goal.id?'Có yêu cầu tạo thói quen đang chờ cho mục tiêu khác. Xử lý yêu cầu đó trước.':'Yêu cầu này đang chờ xác nhận. Thử lại sẽ dùng đúng nội dung và mã trước đó.')}</p>}
  {error&&<p role="alert" style={{overflowWrap:'anywhere'}}>{t(error)}</p>}
  {created?<div role="status"><h3>{t(action==='LINK'?'Đã gắn thói quen với mục tiêu.':'Đã tạo thói quen từ mục tiêu.')}</h3><p>{created.name}</p><Link className="btn btn-primary" to={habitPath('/habits',created.id)}>{t('Mở thói quen')}</Link></div>:<form onSubmit={submit}>
   <fieldset disabled={busy||Boolean(pending)||conflict} style={{border:0,padding:0}}>
    <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'1rem'}}>
     <label><input type="radio" name="goal-habit-action" checked={action==='CREATE'} onChange={()=>setAction('CREATE')}/> {t('Tạo thói quen mới')}</label>
     <label><input type="radio" name="goal-habit-action" checked={action==='LINK'} onChange={()=>setAction('LINK')}/> {t('Dùng thói quen có sẵn')}</label>
    </div>
    {action==='LINK'?<><label className="form-label" htmlFor="goal-habit-existing">{t('Chọn thói quen đang hoạt động')}</label>
     <select id="goal-habit-existing" className="form-select" value={habitId} required onChange={event=>setHabitId(event.target.value)}>
      <option value="">{t('Chọn thói quen')}</option>
      {pending?.habitId&&!activeHabits.some(h=>h.id===pending.habitId)&&<option value={pending.habitId}>#{pending.habitId}</option>}
      {activeHabits.filter(h=>h.active).map(h=><option key={h.id} value={h.id}>{h.name} · {h.targetPerWeek} {t('lượt/tuần')}</option>)}
     </select><p>{t('Giữ nguyên độ khó, XP và chỉ tiêu tuần. Không tạo bản sao của thói quen.')}</p>
    </>:<><label className="form-label" htmlFor="goal-habit-name">{t('Tên thói quen')}</label><input id="goal-habit-name" className="form-input" value={form.name} maxLength={255} required onChange={event=>setForm({...form,name:event.target.value})}/>
    <label className="form-label" htmlFor="goal-habit-description">{t('Bước nhỏ cần thực hiện')}</label><textarea id="goal-habit-description" className="form-input" rows={2} maxLength={255} value={form.description} onChange={event=>setForm({...form,description:event.target.value})}/>
    <label className="form-label" htmlFor="goal-habit-difficulty">{t('Độ khó')}</label><select id="goal-habit-difficulty" className="form-select" value={form.difficulty} onChange={event=>setForm({...form,difficulty:event.target.value})}>{[['EASY','Dễ'],['MEDIUM','Vừa'],['HARD','Khó']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select>
    <label className="form-label" htmlFor="goal-habit-target">{t('Số lượt mỗi tuần')}</label><input id="goal-habit-target" className="form-input" type="number" min={1} max={7} step={1} required value={form.targetPerWeek} onChange={event=>setForm({...form,targetPerWeek:event.target.value})}/></>}
   </fieldset>
   {action==='CREATE'&&duplicates.length>0&&!pending&&<p>{t('Đã có thói quen cùng tên. Kiểm tra xem có cần tạo thêm không.')}</p>}
   {capacity&&action==='CREATE'&&!pending&&<p role="alert">{t('Tài khoản miễn phí đã có 10 thói quen hoạt động. Tắt một thói quen trước khi tạo thêm.')}</p>}
   {!conflict&&<button className="btn btn-primary" style={{marginTop:'1rem'}} disabled={busy||loading||(loadError&&!pending)||pending?.invalid||(pending&&pending.goalId!==goal.id)||(capacity&&action==='CREATE'&&!pending)}>{t(pending?'Thử lại yêu cầu đang chờ':action==='LINK'?'Xác nhận gắn thói quen':'Xác nhận tạo thói quen')}</button>}
  </form>}
  {created&&pending&&<p>{t('Thói quen đã tạo, nhưng chưa dọn được yêu cầu trên thiết bị. Không tạo lại; kiểm tra danh sách thói quen.')}</p>}
  {conflict&&<div style={{marginTop:'1rem'}}><button className="btn btn-secondary" disabled={busy} onClick={inspect}>{t('Xem mục tiêu mới')}</button>
   {latest&&<><p>{latest.name} · {latest.currentValue}/{latest.targetValue} {latest.unit}</p><button className="btn btn-primary" disabled={busy||Boolean(pending)} onClick={()=>{setBase(goalSnapshot(latest));setConflict(false);setError('');}}>{t('Giữ nội dung và dùng bản mục tiêu mới')}</button></>}
  </div>}
  <button type="button" className="btn btn-secondary" style={{marginTop:'1rem'}} disabled={busy} onClick={onClose}>{t('Đóng')}</button>
 </section></ModalOverlay>;
}
