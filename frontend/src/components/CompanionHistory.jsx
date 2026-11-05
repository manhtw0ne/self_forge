import {checkInEntryPath} from '../utils/checkInNavigation';
import {useState,useEffect} from 'react';
import {Link} from 'react-router-dom';
import ModalOverlay from './ModalOverlay';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {readCompanionHistory} from '../utils/companionHistory';
import {companionSpecies} from '../utils/companion';
import {companionStageCount,companionStages} from '../utils/companionProgression';
import {formatCalendarDate,profileTimezone} from '../utils/dates';
import CompanionImage from './CompanionImage';

export default function CompanionHistory({companion,timezone,onClose}){
 const {t,language}=useLanguage();
 const [cursors,setCursors]=useState([null]),[page,setPage]=useState(0),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const before=cursors[page];
 useEffect(()=>{let active=true;setLoading(true);setError(false);setData(null);
  api.get('/companion/history',{params:{beforeId:before??undefined}}).then(({data:result})=>{const value=readCompanionHistory(result);if(active)setData(value);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[before,attempt]);
 return <ModalOverlay onClose={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="companion-history-title" onClick={event=>event.stopPropagation()} style={{maxWidth:'720px'}}>
  <h2 id="companion-history-title">{t('Hình thái và lịch sử bạn đồng hành')}</h2>
  <p>{companion.name||t(companionSpecies[companion.species])} · {t('Hình thái {stage}/{total}',{stage:companion.stage,total:companionStageCount})} · {companion.xp} XP</p>
  <details><summary>{t('Xem trước {count} hình thái',{count:companionStageCount})}</summary><div style={{display:'flex',flexWrap:'wrap',gap:'1rem',margin:'1rem 0'}}>{companionStages.map(({stage,threshold})=><figure key={stage} style={{margin:0,flex:'1 1 120px',textAlign:'center'}}>
   <CompanionImage species={companion.species} stage={stage} width="120" height="120" alt={t('Bạn đồng hành {name}, hình thái {stage}',{name:companion.name||t(companionSpecies[companion.species]),stage})} loading="lazy" decoding="async" style={{objectFit:'contain'}}/>
   <figcaption>{t('Hình thái {stage}/{total}',{stage,total:companionStageCount})} · {threshold} XP<br/>{t(stage<=companion.stage?'Đã đạt theo tiến độ hiện tại':'Chưa đạt mốc này')}</figcaption>
  </figure>)}</div></details>
  <h3 style={{marginTop:'1rem'}}>{t('Các thay đổi điểm có căn cứ')}</h3>
  <p>{t('Điểm bên dưới là điểm cơ sở của bạn đồng hành, không phải khoản thưởng hoặc phạt của số dư tài khoản. Chỉ gồm thay đổi có nhật ký đã lưu.')}</p>
  <button className="btn btn-secondary btn-sm" disabled={loading} onClick={()=>{setLoading(true);setCursors([null]);setPage(0);setAttempt(value=>value+1);}}>{t('Tải lịch sử mới nhất')}</button>
  {loading?<p role="status">{t('Đang tải...')}</p>:error?<p role="alert">{t('Chưa tải được lịch sử bạn đồng hành. Thử tải lại.')}</p>:data&&<>
   {data.items.length===0?<p>{t('Chưa có thay đổi điểm phù hợp trên trang này.')}</p>:<ol style={{paddingLeft:'1.25rem'}}>{data.items.map(row=><li key={row.id} style={{margin:'1rem 0',overflowWrap:'anywhere'}}>
    <strong>{row.delta>0?'+':''}{row.delta} XP</strong> · {row.habitName}<br/>{t(row.reason==='COMPLETED'?'Hoàn thành thói quen':'Điều chỉnh check-in đã hoàn thành')}<br/>
    {t('Ngày check-in')}: {formatCalendarDate(row.date,language)} · #{row.checkInId}<br/>
    <Link className="btn btn-secondary btn-sm" to={checkInEntryPath(row.date,row.checkInId)}>{language==='en'?'Open source check-in':'Mở check-in làm căn cứ'}</Link><br/>
    {t('Ghi nhận thay đổi lúc')}: {new Date(row.changedAt).toLocaleString(language==='en'?'en-US':'vi-VN',{timeZone:profileTimezone(timezone)})}
   </li>)}</ol>}
   <p>{t('Trang này hiển thị tối đa 20 thay đổi; không phải toàn bộ lịch sử hoặc tổng XP.')}</p>
   <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}><button className="btn btn-secondary" disabled={page===0} onClick={()=>{setLoading(true);setPage(value=>value-1);}}>{t('Thay đổi mới hơn')}</button><button className="btn btn-secondary" disabled={!data.nextCursor} onClick={()=>{setLoading(true);setCursors(values=>[...values.slice(0,page+1),data.nextCursor]);setPage(value=>value+1);}}>{t('Thay đổi cũ hơn')}</button></div>
  </>}
  <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',marginTop:'1rem'}}><Link className="btn btn-secondary" to="/check-in-history">{t('Xem check-in làm căn cứ')}</Link><button className="btn btn-secondary" onClick={onClose}>{t('Đóng')}</button></div>
 </section></ModalOverlay>;
}
