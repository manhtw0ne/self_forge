import {reviewFromRecordedDays} from '../utils/restartFollowUp';
import {useState,useEffect,useRef} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {restartDecisions,restartReviewPayload,readRestartReview} from '../utils/restartPlan';
export default function RestartReview({plan,onPlanChanged,recordedDays,onNextPlan}){
 const {t}=useLanguage();const lock=useRef(false);
 const [form,setForm]=useState({daysTried:'',decision:'KEEP',note:''});
 const [saved,setSaved]=useState(null);const [version,setVersion]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');setVersion(null);
  api.get('/restart-plan/review').then(({data})=>{const review=readRestartReview(data,plan.version);if(active){setSaved(review);if(!review)setVersion(0);}})
   .catch(()=>{if(active)setError('Chưa tải được đánh giá. Nội dung đang viết vẫn được giữ.');}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[attempt,plan.version]);
 const submit=async event=>{event.preventDefault();if(lock.current||busy||version===null)return;
  let body;try{body=restartReviewPayload(form,plan.version,version);if(form.daysTried==='')throw Error('Missing count');}catch{setError('Chọn số ngày đã thử và hướng đi tiếp theo.');return;}
  lock.current=true;setBusy(true);setError('');
  try{const {data}=await api.put('/restart-plan/review',body);const review=readRestartReview(data,plan.version);if(!review)throw Error('Missing review');setSaved(review);setVersion(review.version);}
  catch(failure){if(failure.response?.status===409){setVersion(null);setError('Kế hoạch hoặc đánh giá đã thay đổi. Tải bản đã lưu và kiểm tra trước khi gửi tiếp.');}
   else setError('Chưa xác nhận được đánh giá đã lưu. Giữ nội dung và thử lại hoặc tải bản đã lưu.');}
  finally{lock.current=false;setBusy(false);}
 };
 return <section style={{borderTop:'1px solid var(--border-color)',marginTop:'1rem',paddingTop:'1rem'}} aria-labelledby="restart-review-title">
  <h3 id="restart-review-title">{t('Nhìn lại sau 3 ngày')}</h3>
  <p>{t('Đây là tự đánh giá, không cộng XP hoặc thay thế check-in. Lựa chọn tiếp theo chưa tự đổi thói quen.')}</p>
  {error&&<p role="alert">{t(error)}</p>}
  {saved&&<div role="status"><h4>{t('Đánh giá đã lưu')}</h4><p>{t('Đã thử {count}/3 ngày',{count:saved.daysTried})} · {t(restartDecisions[saved.decision])}</p>
   <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{saved.note}</p>
   <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>{setForm({daysTried:saved.daysTried,decision:saved.decision,note:saved.note});setVersion(saved.version);setError('');}}>{t('Dùng đánh giá đã lưu để chỉnh sửa')}</button>
   {version===null&&<button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setVersion(saved.version)}>{t('Giữ nội dung đang viết để lưu tiếp')}</button>}
   {saved.decision!=='PAUSE'&&<div style={{marginTop:'1rem'}}><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>onNextPlan(saved)}>{t('Lập bản nháp 3 ngày tiếp theo')}</button><p>{t('Dựa trên đánh giá đã lưu. Bạn xem và sửa bước mới trước khi lưu kế hoạch; chưa đổi thói quen hoặc điểm.')}</p></div>}
  </div>}
  <form onSubmit={submit}><fieldset disabled={busy} style={{border:0,padding:0}}>
   {recordedDays&&<div style={{margin:'1rem 0'}}><p>{t('Ghi nhận từng ngày trên tài khoản: {count}/3 ngày đã thử.',{count:recordedDays.tried.filter(Boolean).length})}</p><button type="button" className="btn btn-secondary btn-sm" onClick={()=>setForm(current=>reviewFromRecordedDays(current,recordedDays,plan.version))}>{t('Dùng số ngày đã ghi nhận')}</button></div>}
   <label className="form-label" htmlFor="restart-review-days">{t('Bạn đã thử bước nhỏ trong bao nhiêu ngày?')}</label>
   <select id="restart-review-days" className="form-select" value={form.daysTried} required onChange={event=>setForm({...form,daysTried:event.target.value})}>
    <option value="">{t('Chọn số ngày')}</option>{[0,1,2,3].map(day=><option key={day} value={day}>{day}/3</option>)}
   </select>
   <label className="form-label" htmlFor="restart-review-decision">{t('Hướng đi tiếp theo')}</label>
   <select id="restart-review-decision" className="form-select" value={form.decision} onChange={event=>setForm({...form,decision:event.target.value})}>{Object.entries(restartDecisions).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select>
   <label className="form-label" htmlFor="restart-review-note">{t('Điều giúp bạn hoặc gây khó khăn')}</label>
   <textarea id="restart-review-note" className="form-input" rows={3} maxLength={500} value={form.note} onChange={event=>setForm({...form,note:event.target.value})}/>
  </fieldset>
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'1rem'}}>
   <button className="btn btn-primary" disabled={busy||version===null||form.daysTried===''}>{t('Lưu đánh giá')}</button>
   <button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{t('Tải đánh giá đã lưu')}</button>
   <button type="button" className="btn btn-secondary" disabled={busy} onClick={onPlanChanged}>{t('Tải kế hoạch trên tài khoản')}</button>
  </div></form>
  <p style={{color:'var(--text-muted)'}}>{t('Nội dung chưa lưu chỉ được giữ trên màn hình này. Kế hoạch mới sẽ có đánh giá riêng.')}</p>
 </section>;
}
