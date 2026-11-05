import {useEffect,useRef,useState} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {readRestartDays,restartDayRows,restartDayRequest} from '../utils/restartDays';
import {formatCalendarDate} from '../utils/dates';
export default function RestartDays({plan,today,onPlanChanged,onRecorded}){
 const {t,language}=useLanguage();const lock=useRef(false);const [data,setData]=useState(null);const [busy,setBusy]=useState(true);const [error,setError]=useState('');const [pending,setPending]=useState(null);const [conflict,setConflict]=useState(false);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');setData(null);onRecorded(null);
  api.get('/restart-plan/days',{params:{planVersion:plan.version}}).then(({data:value})=>{const result=readRestartDays(value,plan.version);if(active){setData(result);onRecorded(result);setPending(null);setConflict(false);}}).catch(failure=>{if(active){setError('Chưa tải được ghi nhận từng ngày. Tải lại trước khi thay đổi.');if(failure.response?.status===409)setConflict(true);}}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};
 },[plan.version,attempt,onRecorded]);
 const save=async body=>{if(lock.current||busy||conflict)return;lock.current=true;setBusy(true);setError('');setPending(body);onRecorded(null);
  try{const {data:value}=await api.put('/restart-plan/days',body);const result=readRestartDays(value,plan.version);if(result.tried[body.day-1]!==body.tried)throw Error('Mismatched day');setData(result);onRecorded(result);setPending(null);}
  catch(failure){if(failure.response?.status===409){setConflict(true);setError('Kế hoạch hoặc ghi nhận đã thay đổi. Tải bản đã lưu trước khi sửa tiếp.');}else setError('Chưa xác nhận được ngày đã lưu. Thử lại đúng thay đổi đang chờ hoặc tải bản đã lưu.');}
  finally{lock.current=false;setBusy(false);}
 };
 const rows=data?restartDayRows(plan,data,today):[];
 return <section style={{marginTop:'1rem'}}>
  <h3>{t('Ghi nhận từng ngày đã thử')}</h3><p>{t('Tự đánh dấu việc đã thử bước nhỏ. Không cộng XP, không thay check-in hoặc streak.')}</p>
  {busy&&<p role="status">{t('Đang tải...')}</p>}{error&&<p role="alert">{t(error)}</p>}
  {data&&<><p>{t('Đã thử {count}/3 ngày',{count:data.tried.filter(Boolean).length})}</p><ol style={{paddingLeft:'1.25rem'}}>{rows.map(row=><li key={row.day} style={{margin:'1rem 0'}}>
   <strong>{t('Ngày {count}',{count:row.day})}</strong> · {formatCalendarDate(row.date,language)}<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.action}</p>
   <p>{t(row.tried?'Đã ghi nhận là đã thử':'Chưa ghi nhận là đã thử')}</p>
   {row.available?<button className="btn btn-secondary btn-sm" disabled={busy||!!pending||conflict} onClick={()=>save(restartDayRequest(data,row.day,!row.tried))}>{t(row.tried?'Bỏ đánh dấu ngày này':'Tôi đã thử bước này')}</button>:<small>{t('Chưa đến ngày này theo múi giờ tài khoản.')}</small>}
  </li>)}</ol></>}
  {pending&&!conflict&&<button className="btn btn-primary btn-sm" disabled={busy} onClick={()=>save(pending)}>{t('Thử lại đúng ghi nhận đang chờ')}</button>}
  <button className="btn btn-secondary btn-sm" style={{marginLeft:'0.5rem'}} disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{t('Tải ghi nhận đã lưu')}</button>
  {conflict&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={onPlanChanged}>{t('Tải kế hoạch trên tài khoản')}</button>}
 </section>;
}
