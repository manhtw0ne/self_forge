import {useEffect,useState} from 'react';import {Link} from 'react-router-dom';
import {useLanguage} from '../context/useLanguage';import {useAccountDate} from '../hooks/useAccountDate';import {readDailyFocusDraft} from '../utils/dailyFocusDraft';import {dailyFocusContinuation} from '../utils/dailyFocusContinuation';
import {dailyFocusAccountDraft} from '../utils/dailyFocusAccount';import api from '../api/client';

export default function DailyFocusContinuation({owner,timezone,session,habits,locked,onRest,onPrepare}){
 const {t,language}=useLanguage(),today=useAccountDate(timezone),en=language==='en';
 const [saved]=useState(()=>{try{return {draft:readDailyFocusDraft(sessionStorage,owner),error:false};}catch{return {draft:null,error:true};}});
 const [account,setAccount]=useState({loading:true,draft:null,error:false});
 useEffect(()=>{let active=true;setAccount({loading:true,draft:null,error:false});api.get('/daily-focus-plans').then(({data})=>{const draft=dailyFocusAccountDraft(data,today);if(active)setAccount({loading:false,draft,error:false});}).catch(()=>{if(active)setAccount({loading:false,draft:null,error:true});});return()=>{active=false;};},[today]);

 // A valid account plan is authoritative. Browser storage is an offline fallback,
 // but must never replace a plan selected on another signed-in device.
 const draft=account.loading?null:(account.draft??saved.draft),source=account.draft?'account':'browser';let continuation=null,invalidPlan=false;
 try{if(draft)continuation=dailyFocusContinuation(draft,session,habits,today,timezone);}catch{invalidPlan=true;}
 const error=!account.loading&&(invalidPlan||(!draft&&(saved.error||account.error)));
 if(account.loading&&saved.draft)return <section className="card" style={{margin:'1rem 0'}} aria-label={t('Tiếp tục kế hoạch tập trung')}><p role="status">{en?'Checking today’s account-saved focus plan…':'Đang kiểm tra kế hoạch tập trung hôm nay trên tài khoản…'}</p></section>;
 if(!continuation&&!error)return null;
 const matched=source==='account'?(en?`This completed session matches task ${continuation.position}/${continuation.total} in today’s account-saved plan.`:`Phiên vừa lưu khớp việc ${continuation.position}/${continuation.total} trong kế hoạch hôm nay đã lưu trên tài khoản.`):(en?`This completed session matches task ${continuation.position}/${continuation.total} in today’s browser draft.`:`Phiên vừa lưu khớp việc ${continuation.position}/${continuation.total} trong bản nháp hôm nay trên trình duyệt này.`);
 return <section className="card" style={{margin:'1rem 0'}} aria-label={t('Tiếp tục kế hoạch tập trung')}><h2 className="card-title">{t('Tiếp tục kế hoạch tập trung')}</h2>
  {error?<p role="alert">{t('Chưa xác minh được kế hoạch và thói quen. Mở lại kế hoạch để kiểm tra trước khi tiếp tục.')}</p>:<><p>{matched}</p>
   {source==='browser'&&account.error&&<p role="status">{en?'Your account plan could not be checked, so this suggestion uses this browser’s draft only.':'Chưa kiểm tra được kế hoạch trên tài khoản, nên gợi ý này chỉ dùng bản nháp của trình duyệt hiện tại.'}</p>}
   {continuation.next?<><p>{t('Tiếp theo: {name}, {minutes} phút.',{name:continuation.next.name,minutes:continuation.next.minutes})}</p><div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><button className="btn btn-secondary" disabled={locked} onClick={onRest}>{t('Chuẩn bị nghỉ 5 phút')}</button><button className="btn btn-primary" disabled={locked} onClick={()=>onPrepare(continuation.next)}>{t('Chuẩn bị việc tiếp theo')}</button></div></>:<p>{t('Đây là việc cuối trong kế hoạch. Bạn có thể nghỉ hoặc xem lại quỹ thời gian trước khi làm thêm.')}</p>}
   <p>{t('Bạn tự bấm bắt đầu sau khi chuẩn bị. Màn hình này không xác nhận các việc trước đã hoàn thành và không tự check-in.')}</p>
  </>}
  <Link className="btn btn-secondary btn-sm" style={{marginTop:'0.75rem'}} to="/#multi-focus-plan">{t('Xem lại kế hoạch nhiều phiên')}</Link>
 </section>;
}
