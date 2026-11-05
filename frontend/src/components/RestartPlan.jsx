import RestartHistory from './RestartHistory';
import {restartHistoryDraft} from '../utils/restartHistory';
import RestartCalendarDownload from './RestartCalendarDownload';
import RestartHabitPicker from './RestartHabitPicker';
import RestartCoach from './RestartCoach';
import {restartFollowUp} from '../utils/restartFollowUp';
import api from '../api/client';
import RestartDays from './RestartDays';
import RestartReview from './RestartReview';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
import { restartReasons,restartSteps,readRestartPlan,writeRestartPlan,restartExport,restartPayload,readServerRestart,restartDay,savedRestartExport,restartSavePayload } from '../utils/restartPlan';
import { shiftDate,formatCalendarDate,validCalendarDate } from '../utils/dates';
import { downloadText } from '../utils/downloadText';
export default function RestartPlan({ owner,today,preferredHabitId=null }) {
 const {t,language}=useLanguage();const toast=useToast();const [open,setOpen]=useState(false);
 const [initial]=useState(()=>{try{return {value:readRestartPlan(sessionStorage,owner),error:false};}catch{return {value:null,error:true};}});
 const [form,setForm]=useState(initial.value||{name:'',reason:'BUSY',start:today,steps:['','','']});
 const [saved,setSaved]=useState(Boolean(initial.value));const [error,setError]=useState(initial.error);
 const [remote,setRemote]=useState(undefined);const [version,setVersion]=useState(null);
 const [syncBusy,setSyncBusy]=useState(false);const [syncError,setSyncError]=useState('');const [cloudSaved,setCloudSaved]=useState(false);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;setSyncBusy(true);setCloudSaved(false);setSyncError('');setVersion(null);setRemote(undefined);
  api.get('/restart-plan').then(({data})=>{const plan=readServerRestart(data);if(active){setRemote(plan);setVersion(plan?null:0);}})
   .catch(()=>{if(active)setSyncError('Chưa tải được kế hoạch trên tài khoản. Bản nháp vẫn được giữ.');})
   .finally(()=>{if(active)setSyncBusy(false);});return()=>{active=false;};
 },[attempt,owner]);
 const saveServer=async()=>{
  if(syncBusy||version===null)return;
  let payload;try{payload=restartSavePayload(form,version);}catch{setSyncError('Kiểm tra nội dung và ngày trước khi lưu kế hoạch.');return;}
  setSyncBusy(true);setSyncError('');
  try {const {data}=await api.put('/restart-plan',payload);
   const plan=readServerRestart(data);if(!plan)throw Error('Missing saved plan');setRemote(plan);setVersion(plan.version);setCloudSaved(true);setFollowUpDraft(false);
  }catch(failure){setCloudSaved(false);if(failure.response?.status===409){setVersion(null);setRemote(undefined);setSyncError('Kế hoạch đã thay đổi. Tải bản trên máy chủ và kiểm tra trước khi lưu tiếp.');}
   else setSyncError('Chưa xác nhận được việc lưu kế hoạch. Bản nháp được giữ; thử lại cùng nội dung hoặc kiểm tra bản trên tài khoản.');
  }finally{setSyncBusy(false);}
 };
 const [dayRecords,setDayRecords]=useState(null);const [followUpDraft,setFollowUpDraft]=useState(false);
 const currentDay=restartDay(remote,today);
 const update=value=>{setFollowUpDraft(false);setCloudSaved(false);setForm(value);try{writeRestartPlan(sessionStorage,owner,value);setSaved(true);setError(false);}catch{setSaved(false);setError(true);}};
 const nextPlan=review=>{
  let draft;try{draft=restartFollowUp(remote,review,today,t);}catch{toast.error(t('Tải lại kế hoạch và đánh giá trước khi lập bản nháp tiếp theo.'));return;}if(!draft)return;
  const hasContent=form.name.trim()||form.steps.some(step=>step.trim());
  if(hasContent&&JSON.stringify(form)!==JSON.stringify(restartPayload(remote))&&!window.confirm(t('Thay bản nháp đang nhập bằng kế hoạch tiếp theo?')))return;
  update(draft);setVersion(remote.version);setOpen(true);setFollowUpDraft(true);setSyncError('');
 };
 return <section id="restart-plan" className="card" style={{margin:'1.5rem 0'}}>
  <h2 className="card-title">{t('Bắt đầu lại trong 3 ngày')}</h2>
  <p>{t('Nếu đang mất nhịp, bạn có thể thử một kế hoạch nhẹ hơn. Bạn tự chọn và có thể dừng bất cứ lúc nào.')}</p>
  <RestartHistory refreshKey={remote?.version} disabled={syncBusy} onDraft={plan=>{if(syncBusy)return;if((form.name.trim()||form.steps.some(step=>step.trim()))&&!window.confirm(language==='en'?'Replace the current draft with this earlier plan starting today?':'Thay bản nháp hiện tại bằng kế hoạch cũ bắt đầu từ hôm nay?'))return;try{update(restartHistoryDraft(plan,today));setOpen(true);setSyncError('');}catch{toast.error(t('Kiểm tra nội dung và ngày trước khi lưu kế hoạch.'));}}}/>
  <RestartHabitPicker key={owner+':'+(preferredHabitId??'none')} today={today} preferredHabitId={preferredHabitId} disabled={syncBusy} onPrepare={draft=>{if(syncBusy)return;if((form.name.trim()||form.steps.some(step=>step.trim()))&&!window.confirm(language==='en'?'Replace the current draft with this reviewed suggestion? Your saved plan will not change until you save.':'Thay bản nháp hiện tại bằng gợi ý vừa xem? Kế hoạch trên tài khoản chỉ thay đổi khi bạn bấm lưu.'))return;update(draft);setOpen(true);setSyncError('');}}/>
  {currentDay&&<div style={{border:'1px solid var(--border-color)',borderRadius:'0.75rem',padding:'1rem',margin:'1rem 0'}}>
   <h3>{currentDay.name}</h3>
   {currentDay.state==='active'?<><p>{t('Bước hôm nay · ngày {count}/3',{count:currentDay.day})}</p>
    <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{currentDay.action}</p>
    <Link className="btn btn-secondary btn-sm" to={'/journal?date='+currentDay.date}>{language==='en'?'Reflect in today’s journal':'Suy ngẫm trong nhật ký hôm nay'}</Link>
    <p style={{color:'var(--text-muted)'}}>{t('Đây là bước trong kế hoạch đã lưu, chưa xác nhận bạn đã hoàn thành. Check-in như bình thường khi thực hiện.')}</p>
   </>:<p>{t(currentDay.state==='scheduled'?'Kế hoạch đã lưu bắt đầu ngày {date}.':'Khoảng 3 ngày đã kết thúc ngày {date}. Bạn có thể nhìn lại và chọn bước tiếp theo.',{date:currentDay.date})}</p>}
   <RestartCalendarDownload key={owner+':calendar:'+remote.version} plan={remote} owner={owner} disabled={syncBusy}/>
   <RestartDays key={owner+':days:'+remote.version} plan={remote} today={today} onRecorded={setDayRecords} onPlanChanged={()=>setAttempt(value=>value+1)}/>
   {currentDay.state==='ended'&&<RestartReview key={owner+':'+remote.version} plan={remote} recordedDays={dayRecords?.planVersion===remote.version?dayRecords:null} onNextPlan={nextPlan} onPlanChanged={()=>setAttempt(value=>value+1)}/>}
  </div>}
  <button type="button" className="btn btn-secondary" onClick={()=>setOpen(value=>!value)}>{t(open?'Ẩn kế hoạch':'Viết kế hoạch bắt đầu lại')}</button>
  {open&&<div style={{marginTop:'1rem'}}>
   {followUpDraft&&<p role="status">{t('Bản nháp tiếp theo đã được điền. Xem lại tên, ngày và ba bước trước khi lưu thay kế hoạch hiện tại.')}</p>}
   <div style={{marginBottom:'1rem'}}>
    <button type="button" className="btn btn-secondary btn-sm" disabled={syncBusy} onClick={()=>setAttempt(value=>value+1)}>{t('Tải kế hoạch trên tài khoản')}</button>
    {syncBusy&&<p role="status">{t('Đang tải...')}</p>}
    {syncError&&<p role="alert">{t(syncError)}</p>}
    {remote&&<details open style={{marginTop:'0.75rem'}}><summary>{t('Kế hoạch trên tài khoản')} · v{remote.version}</summary>
     <p>{remote.name} · {remote.start}</p><ol style={{paddingLeft:'1.25rem'}}>{remote.steps.map((step,index)=><li key={index} style={{whiteSpace:'pre-wrap'}}>{step}</li>)}</ol>
     <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}>
      <button type="button" className="btn btn-secondary btn-sm" disabled={syncBusy} onClick={()=>{update(restartPayload(remote));setVersion(remote.version);setSyncError('');}}>{t('Dùng kế hoạch trên tài khoản')}</button>
      <button type="button" className="btn btn-secondary btn-sm" disabled={syncBusy} onClick={()=>{setVersion(remote.version);setSyncError('');}}>{t('Giữ bản nháp để lưu tiếp')}</button>
      <button type="button" className="btn btn-secondary btn-sm" disabled={syncBusy} onClick={()=>{try{const file=savedRestartExport(remote,t);downloadText(file.text,file.filename);}catch{toast.error(t('Kiểm tra nội dung và ngày trước khi tải kế hoạch.'));}}}>{t('Tải kế hoạch đã lưu (.txt)')}</button>
     </div>
    </details>}
    {cloudSaved&&<p role="status">{t('Đã lưu kế hoạch trên tài khoản.')}</p>}
   </div>
   <fieldset disabled={syncBusy} style={{border:0,padding:0,margin:0}}>
   <label className="form-label" htmlFor="restart-name">{t('Thói quen hoặc việc bạn muốn quay lại')}</label>
   <input id="restart-name" className="form-input" maxLength={255} value={form.name} onChange={event=>update({...form,name:event.target.value})}/>
   <label className="form-label" htmlFor="restart-reason">{t('Lý do bạn muốn điều chỉnh')}</label>
   <select id="restart-reason" className="form-select" value={form.reason} onChange={event=>update({...form,reason:event.target.value})}>{Object.entries(restartReasons).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select>
   <RestartCoach owner={owner} form={form} disabled={syncBusy} onUseSteps={steps=>{if(form.steps.some(step=>step.trim())&&!window.confirm(language==='en'?'Replace the current three steps with this AI draft? Your account plan will not change until you save.':'Thay ba bước hiện tại bằng bản nháp AI? Kế hoạch trên tài khoản chỉ thay đổi khi bạn bấm lưu.'))return;update({...form,steps});}}/>
   <label className="form-label" htmlFor="restart-start">{t('Ngày bắt đầu')}</label>
   <input id="restart-start" className="form-input" type="date" max="9999-12-29" value={form.start} onChange={event=>update({...form,start:event.target.value})}/>
   <button type="button" className="btn btn-secondary btn-sm" style={{margin:'1rem 0'}} disabled={form.steps.some(step=>step.trim())} onClick={()=>update({...form,steps:restartSteps(form.reason,t)})}>{t('Điền gợi ý cho 3 ngày trống')}</button>
   {form.steps.map((step,index)=><div key={index} style={{marginBottom:'1rem'}}>
    <label className="form-label" htmlFor={'restart-step-'+index}>{t('Ngày {count}',{count:index+1})} · {validCalendarDate(form.start)&&form.start<='9999-12-29'?formatCalendarDate(shiftDate(form.start,index),language):t('Chọn ngày bắt đầu')}</label>
    <textarea id={'restart-step-'+index} className="form-input" rows={2} maxLength={500} value={step} onChange={event=>update({...form,steps:form.steps.map((value,i)=>i===index?event.target.value:value)})}/>
   </div>)}
   </fieldset>
   {error?<p role="alert">{t('Chưa giữ được bản nháp. Kiểm tra ngày và quyền lưu trữ; sao chép nội dung trước khi rời trang.')}</p>:saved&&!cloudSaved&&<p role="status">{t('Đã giữ kế hoạch bắt đầu lại trên tab này, chưa lưu lên máy chủ.')}</p>}
   <p>{t('Gợi ý theo quy tắc, chưa sử dụng AI.')}</p>
   <p>{t('Đây là bản nháp tự chọn, không tự thay lịch, XP hoặc streak. Check-in vẫn thực hiện như bình thường.')}</p>
   <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><button type="button" className="btn btn-primary" disabled={syncBusy||version===null||!form.name.trim()||form.steps.some(step=>!step.trim())} onClick={saveServer}>{t('Lưu kế hoạch lên tài khoản')}</button><button type="button" className="btn btn-primary" disabled={!form.name.trim()||form.steps.some(step=>!step.trim())} onClick={()=>{try{const file=restartExport(form,t);downloadText(file.text,file.filename);}catch{toast.error(t('Kiểm tra nội dung và ngày trước khi tải kế hoạch.'));}}}>{t('Tải kế hoạch bắt đầu lại (.txt)')}</button>
   <Link className="btn btn-secondary" to="/habits">{t('Xem và tự điều chỉnh thói quen')}</Link></div>
  </div>}
 </section>;
}
