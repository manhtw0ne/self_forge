import WeekPlanFocusLaunch from './WeekPlanFocusLaunch';
import WeekPlanCalendarDownload from './WeekPlanCalendarDownload';
import api from '../api/client';
import { useState,useEffect,useRef } from 'react';
import { useLanguage } from '../context/useLanguage';
import { useToast } from '../context/useToast';
import { readWeekPlan, writeWeekPlan, weekPlanExport,weekSavePayload,readServerWeekPlan,notifyWeekPlan } from '../utils/weekPlan';
import { shiftDate } from '../utils/dates';
import { downloadText } from '../utils/downloadText';
export default function WeekPlan({ owner, week, suggestion,options=[],title }) {
 const {t}=useLanguage();const toast=useToast();
 const [initial]=useState(()=>{try {return {form:readWeekPlan(sessionStorage,owner,week),error:false};}catch{return {form:null,error:true};}});
 const [choice,setChoice]=useState('');const selectedSuggestion=options.find(row=>String(row.id)===choice)?.action||suggestion;
 const [form,setForm]=useState(initial.form||{action:'',date:week,time:''});
 const [saved,setSaved]=useState(Boolean(initial.form));const [error,setError]=useState(initial.error);
 const [remote,setRemote]=useState(undefined);const [version,setVersion]=useState(null);const [busy,setBusy]=useState(false);const [syncError,setSyncError]=useState('');const [attempt,setAttempt]=useState(0);const [cloudSaved,setCloudSaved]=useState(false);const lock=useRef(false);
 useEffect(()=>{let active=true;setBusy(true);setVersion(null);setRemote(undefined);setSyncError('');setCloudSaved(false);
  api.get('/week-plans',{params:{week}}).then(({data})=>{const plan=readServerWeekPlan(data,week);if(active){setRemote(plan);if(!plan)setVersion(0);}})
   .catch(()=>{if(active)setSyncError('Chưa tải được kế hoạch tuần đã lưu. Bản nháp vẫn được giữ.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};
 },[owner,week,attempt]);
 const save=async()=>{if(lock.current||busy||version===null)return;let body;try{body=weekSavePayload(form,week,version);}catch{setSyncError('Kiểm tra nội dung, ngày và giờ trước khi lưu kế hoạch tuần.');return;}
  lock.current=true;setBusy(true);setSyncError('');
  try{const {data}=await api.put('/week-plans/'+week,body);const plan=readServerWeekPlan(data,week);if(!plan)throw Error('Missing plan');setRemote(plan);setVersion(plan.version);setCloudSaved(true);notifyWeekPlan();}
  catch(failure){setCloudSaved(false);if(failure.response?.status===409){setVersion(null);setRemote(undefined);setSyncError('Kế hoạch tuần đã thay đổi. Tải bản đã lưu và xem trước khi gửi tiếp.');}else setSyncError('Chưa xác nhận được kế hoạch tuần đã lưu. Giữ bản nháp và thử lại hoặc tải bản đã lưu.');}
  finally{lock.current=false;setBusy(false);}
 };
 const update=next=>{setCloudSaved(false);updateDraft(next);};
 const updateDraft=next=>{setForm(next);try{writeWeekPlan(sessionStorage,owner,week,next);setSaved(true);setError(false);}catch{setSaved(false);setError(true);}};
 return <section style={{marginTop:'1.25rem',borderTop:'1px solid var(--border-color)',paddingTop:'1rem'}}>
  <h3>{title||t('Chọn một bước và viết kế hoạch tuần tới')}</h3><p>{week} – {shiftDate(week,6)}</p>
  <p>{t('Lưu một bước bạn đã chọn cho tuần này. Kế hoạch không tự tạo thói quen, nhắc nhở hoặc đổi lịch thói quen.')}</p>
  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{t('Tải kế hoạch tuần đã lưu')}</button>
  {busy&&<p role="status">{t('Đang tải...')}</p>}{syncError&&<p role="alert">{t(syncError)}</p>}
  {remote&&<div style={{margin:'1rem 0',padding:'1rem',border:'1px solid var(--border-color)',borderRadius:'0.75rem'}}>
   <WeekPlanFocusLaunch key={remote.week+':'+remote.version} plan={remote} disabled={busy}/>
      <WeekPlanCalendarDownload plan={remote} disabled={busy}/>
   <h4>{t('Kế hoạch tuần trên tài khoản')}</h4><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{remote.action}</p><p>{remote.date} · {remote.time||t('Chưa chọn')} · {t(remote.completed?'Đã thực hiện':'Chưa thực hiện')}</p>
   <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}><button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>{update({action:remote.action,date:remote.date,time:remote.time});setVersion(remote.version);setSyncError('');}}>{t('Dùng kế hoạch tuần đã lưu')}</button>
   <button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>{setVersion(remote.version);setSyncError('');}}>{t('Giữ bản nháp để lưu tiếp')}</button></div>
  </div>}
  <fieldset disabled={busy} style={{border:0,padding:0}}>
  {options.length>0&&<><label className="form-label" htmlFor={'week-plan-source-'+week}>{t('Chọn gợi ý làm bước tiếp theo')}</label><select id={'week-plan-source-'+week} className="form-select" value={choice} onChange={event=>setChoice(event.target.value)}><option value="">{t('Gợi ý chung của tuần')}</option>{options.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select><p>{t('Chọn gợi ý chỉ đổi nội dung được đề xuất. Bản nháp đang viết vẫn được giữ.')}</p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selectedSuggestion}</p></>}
  <button type="button" className="btn btn-secondary btn-sm" disabled={Boolean(form.action.trim())||!selectedSuggestion?.trim()||selectedSuggestion.length>1000} onClick={()=>update({...form,action:selectedSuggestion})}>{t('Điền gợi ý vào bản nháp trống')}</button>
  <label className="form-label" htmlFor={'week-plan-action-'+week}>{t('Bước nhỏ bạn muốn thực hiện')}</label>
  <textarea id={'week-plan-action-'+week} className="form-input" rows={3} maxLength={1000} value={form.action} onChange={event=>update({...form,action:event.target.value})}/>
  <div style={{display:'flex',flexWrap:'wrap',gap:'1rem',margin:'1rem 0'}}>
   <div><label className="form-label" htmlFor={'week-plan-date-'+week}>{t('Ngày bắt đầu')}</label>
    <input id={'week-plan-date-'+week} className="form-input" type="date" min={week} max={shiftDate(week,6)} value={form.date} onChange={event=>update({...form,date:event.target.value})}/></div>
   <div><label className="form-label" htmlFor={'week-plan-time-'+week}>{t('Thời điểm')}</label>
    <input id={'week-plan-time-'+week} className="form-input" type="time" value={form.time} onChange={event=>update({...form,time:event.target.value})}/></div>
  </div>
  </fieldset>
  {cloudSaved&&<p role="status">{t('Đã lưu kế hoạch tuần trên tài khoản.')}</p>}
  {error?<p role="alert">{t('Chưa giữ được bản nháp. Kiểm tra ngày, giờ và quyền lưu trữ; sao chép nội dung trước khi rời trang.')}</p>:saved&&!cloudSaved&&<p role="status">{t('Đã giữ bản nháp kế hoạch trên tab này, chưa lưu lên máy chủ.')}</p>}
  <p>{t('Đổi nội dung hoặc lịch của kế hoạch đã thực hiện sẽ đưa bước đó về chưa thực hiện. Không tự đổi thói quen hoặc XP.')}</p>
  <button type="button" className="btn btn-primary" disabled={busy||version===null||!form.action.trim()} onClick={save}>{t('Lưu kế hoạch tuần lên tài khoản')}</button>
  <button type="button" className="btn btn-secondary btn-sm" disabled={!form.action.trim()} onClick={()=>{try{const file=weekPlanExport(week,form,t);downloadText(file.text,file.filename);}catch{toast.error(t('Kiểm tra ngày và giờ trước khi tải kế hoạch.'));}}}>{t('Tải bản nháp kế hoạch (.txt)')}</button>
 </section>;
}
