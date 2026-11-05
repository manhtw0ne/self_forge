import {useRef,useState} from 'react';import api from '../api/client';import ModalOverlay from './ModalOverlay';import {useLanguage} from '../context/useLanguage';import {goalSnapshot} from '../utils/goalForm';import {goalCorrectionPayload,goalCorrectionStatus} from '../utils/goalCorrection';
export default function GoalCorrectionDialog({goal,onSaved,onClose}){
 const {t}=useLanguage();const [base,setBase]=useState(()=>goalSnapshot(goal));const [amount,setAmount]=useState(String(goal.currentValue));const [busy,setBusy]=useState(false);const lock=useRef(false);const [pending,setPending]=useState(null);const [conflict,setConflict]=useState(false);const [latest,setLatest]=useState(null);const [error,setError]=useState('');
 let body=null,status=null;try{body=goalCorrectionPayload(base,amount);status=goalCorrectionStatus(base,amount);}catch{/* Keep invalid input editable. */}
 const save=async event=>{event.preventDefault();if(lock.current||conflict||!body)return;const request=pending||body;lock.current=true;setBusy(true);setError('');setPending(request);
  try{const {data}=await api.patch('/goals/'+base.id+'/progress',request);if(data.id!==base.id||data.currentValue!==request.currentValue||data.status!==goalCorrectionStatus(data,request.currentValue))throw Error('Mismatched correction');onSaved(data);}
  catch(failure){if(failure.response?.status===409)setConflict(true);if(failure.response?.status===400||failure.response?.status===404)setPending(null);setError(failure.response?.data?.detail||'Chưa xác nhận được việc điều chỉnh. Thử lại đúng số lượng hoặc xem bản trên máy chủ.');}
  finally{lock.current=false;setBusy(false);}
 };
 const inspect=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const {data}=await api.get('/goals');const current=data.find(row=>row.id===base.id);if(!current)throw Error('Missing goal');setLatest(goalSnapshot(current));}catch{setError('Chưa tải được mục tiêu mới. Số lượng đang nhập vẫn được giữ.');}finally{lock.current=false;setBusy(false);}};
 const close=()=>{if(lock.current)return;if(pending&&!window.confirm(t('Yêu cầu điều chỉnh chưa được xác nhận. Đóng và kiểm tra bản đã lưu sau?')))return;onClose();};
 return <ModalOverlay onClose={close}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="goal-correction-title" onClick={event=>event.stopPropagation()}><h2 id="goal-correction-title">{t('Điều chỉnh số lượng thực tế')}</h2><p>{base.name} · {base.currentValue}/{base.targetValue} {base.unit}</p><p>{t('Đặt lại số lượng đã thực sự hoàn thành, không phải cộng thêm. Thao tác này không thay XP hoặc check-in.')}</p>{error&&<p role="alert">{t(error)}</p>}
  <form onSubmit={save}><label className="form-label" htmlFor="goal-correction-value">{t('Số lượng thực tế')}</label><input id="goal-correction-value" className="form-input" type="number" min="0" max={base.targetValue} step="1" value={amount} readOnly={!!pending} disabled={busy||conflict} onChange={event=>setAmount(event.target.value)}/>
   {body?<p role="status">{t('Dự kiến: {count}/{target} {unit} · {status}',{count:body.currentValue,target:base.targetValue,unit:base.unit,status:t(status==='COMPLETED'?'Đã hoàn thành':'Đang thực hiện')})}</p>:<p>{t('Nhập số nguyên từ 0 đến chỉ tiêu hiện tại.')}</p>}
   {base.status==='COMPLETED'&&status==='ACTIVE'&&<p>{t('Giảm số lượng sẽ mở lại mục tiêu đang thực hiện. Tài khoản miễn phí vẫn chịu giới hạn ba mục tiêu.')}</p>}
   <button className="btn btn-primary" disabled={busy||conflict||!body||!pending&&body.currentValue===base.currentValue}>{t(pending?'Thử lại đúng số lượng':'Lưu số lượng thực tế')}</button>
  </form>
  {error&&<button className="btn btn-secondary" disabled={busy} style={{marginTop:'1rem'}} onClick={inspect}>{t('Xem mục tiêu trên máy chủ')}</button>}
  {latest&&<div style={{marginTop:'1rem'}}><p>{latest.name} · {latest.currentValue}/{latest.targetValue} {latest.unit}</p><button className="btn btn-secondary" disabled={busy} onClick={()=>{setBase(latest);setPending(null);setConflict(false);setError('');setLatest(null);}}>{t('Giữ số lượng đang nhập và dùng bản mới')}</button></div>}
  <button className="btn btn-secondary" style={{marginTop:'1rem'}} disabled={busy} onClick={close}>{t('Đóng')}</button>
 </section></ModalOverlay>;
}
