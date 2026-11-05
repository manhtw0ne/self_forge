import CompanionGallery from './CompanionGallery';
import CompanionCardDownload from './CompanionCardDownload';
import MotionSettings from './MotionSettings';
import CompanionWeek from './CompanionWeek';
import {useState,useEffect,useCallback,useRef} from 'react';
import api from '../api/client';
import {pendingCompanionMilestone} from '../utils/companionMilestone';
import CompanionHistory from './CompanionHistory';
import ModalOverlay from './ModalOverlay';
import {useLanguage} from '../context/useLanguage';
import {PROGRESS_CHANGED} from '../utils/progressSync';
import {createLatestRequest} from '../utils/latestRequest';
import {companionSpecies,companionPayload,readCompanion,companionProgress} from '../utils/companion';
import {companionEvolutionThresholds,companionStageCount} from '../utils/companionProgression';
import CompanionImage from './CompanionImage';
import CompanionRhythm from './CompanionRhythm';
import {Link} from 'react-router-dom';
import {publishAccountDataChange,subscribeAccountDataChanges} from '../utils/accountDataSync';
export default function CompanionCard({owner,timezone,standalone=false}){
 const {t,language}=useLanguage(),en=language==='en',stageThresholds=companionEvolutionThresholds().join(en?' and ':' và ');const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState(false);const [busy,setBusy]=useState(false);const lock=useRef(false);const gate=useRef(createLatestRequest());
 const [milestone,setMilestone]=useState(null),[milestoneBusy,setMilestoneBusy]=useState(false),[milestoneError,setMilestoneError]=useState(false);
 const [historyOpen,setHistoryOpen]=useState(false);
 const [open,setOpen]=useState(false);const [form,setForm]=useState({species:'CHON',name:'',visible:true});const [version,setVersion]=useState(0);const [error,setError]=useState('');const [conflict,setConflict]=useState(false);
 const accept=useCallback(response=>{const value=readCompanion(response);setData(value);setMilestone(pendingCompanionMilestone(value));setMilestoneError(false);},[]);
 const refresh=useCallback(()=>{if(lock.current)return;setLoading(true);setLoadError(false);return gate.current.run(()=>api.get('/companion'),response=>accept(response.data),()=>setLoadError(true),()=>setLoading(false));},[accept]);
 const announceCompanionChange=()=>{try{publishAccountDataChange(owner,'companion',window.localStorage);}catch{/* Cross-tab refresh is optional. */}};
 useEffect(()=>{setMilestone(null);void refresh();const visible=()=>{if(document.visibilityState==='visible')void refresh();};const stopSync=typeof window==='undefined'?()=>{}:subscribeAccountDataChanges(window,owner,change=>{if(change.resource==='dashboard'||change.resource==='companion')void refresh();});window.addEventListener(PROGRESS_CHANGED,refresh);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);const activeGate=gate.current;
  return()=>{activeGate.invalidate();stopSync();window.removeEventListener(PROGRESS_CHANGED,refresh);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
 },[owner,refresh]);
 const settings=()=>{if(!data||busy)return;setForm({species:data.species,name:data.name,visible:data.version===0?true:data.visible});setVersion(data.version);setError('');setConflict(false);setOpen(true);};
 const save=async event=>{event.preventDefault();if(lock.current||conflict)return;let body;try{body=companionPayload(form,version);}catch{setError('Kiểm tra loài và tên bạn đồng hành, tối đa 40 ký tự.');return;}
  lock.current=true;gate.current.invalidate();setLoading(false);setBusy(true);setError('');
  try{const response=await api.put('/companion',body);accept(response.data);setOpen(false);announceCompanionChange();}
  catch(failure){if(failure.response?.status===409)setConflict(true);setError(failure.response?.data?.detail||'Chưa xác nhận được lựa chọn đã lưu. Giữ nội dung và thử lại hoặc tải bản mới.');}
  finally{lock.current=false;setBusy(false);}
 };
 const acknowledgeMilestone=async()=>{if(!milestone||milestoneBusy)return;setMilestoneBusy(true);setMilestoneError(false);try{const response=await api.post('/companion/milestones/'+milestone.stage+'/ack');accept(response.data);announceCompanionChange();}catch{setMilestoneError(true);}finally{setMilestoneBusy(false);}};
 if(data&&!data.available)return standalone?<section className="card" role="status"><h2 className="card-title">{t('Bạn đồng hành')}</h2><p>{t('Tính năng bạn đồng hành đang tạm tắt. Tiến độ thói quen chính của bạn không bị ảnh hưởng.')}</p></section>:null;
 const titleId=standalone?'companion-progress-title':'companion-title';
 return <section className="card" style={{margin:'1.5rem 0'}} aria-labelledby={titleId}>
  <h2 className="card-title" id={titleId}>{t(standalone?'Tiến độ và lựa chọn':'Bạn đồng hành')}</h2>
  {loading&&<p role="status">{t('Đang tải...')}</p>}
  {loadError&&<div role="alert"><p>{t('Chưa tải được bạn đồng hành. Các chức năng khác vẫn dùng được.')}</p><button className="btn btn-secondary" disabled={busy||loading} onClick={refresh}>{t('Tải lại')}</button></div>}
  {milestone&&data?.visible&&<div className="companion-milestone" role="status" aria-live="polite">
   <CompanionImage species={milestone.species} stage={milestone.stage} alt="" width="96" height="96" style={{objectFit:'contain'}}/>
   <div><strong>{t('Bạn đồng hành đã đạt hình thái {stage}!',{stage:milestone.stage})}</strong><p>{t('Các check-in hợp lệ đã đưa tiến độ qua mốc {xp} XP.',{xp:milestone.threshold})}</p><p>{t('Tiếp tục theo nhịp của bạn; không cần làm thêm nhiệm vụ chăm thú.')}</p>{milestoneError&&<p role="alert">{en?'Could not save that you have seen this milestone. Please try again.':'Chưa lưu được việc bạn đã xem mốc này. Hãy thử lại.'}</p>}<button className="btn btn-secondary btn-sm" disabled={milestoneBusy} onClick={acknowledgeMilestone}>{milestoneBusy?(en?'Saving…':'Đang lưu…'):(en?'Mark as seen':'Đã xem mốc mới')}</button></div>
  </div>}
  {data&&<>{data.visible?<div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'1.25rem'}}>
   <CompanionImage species={data.species} stage={data.stage} alt={t('Bạn đồng hành {name}, hình thái {stage}',{name:data.name||t(companionSpecies[data.species]),stage:data.stage})} width="160" height="160" loading="lazy" decoding="async" style={{objectFit:'contain'}}/>
   <div style={{flex:'1 1 200px'}}><h3 style={{overflowWrap:'anywhere'}}>{data.name||t(companionSpecies[data.species])}</h3><p>{t('Hình thái {stage}/{total}',{stage:data.stage,total:companionStageCount})} · {data.xp} XP</p>
    <progress max="100" value={companionProgress(data)} aria-label={t('Tiến độ hình thái tiếp theo')} style={{width:'100%'}}/>
    <p>{t(data.nextThreshold===null?'Đã đạt hình thái cuối. Tiến độ thói quen vẫn được ghi nhận.':'Còn {xp} XP đến hình thái tiếp theo.',{xp:data.nextThreshold===null?0:data.nextThreshold-data.xp})}</p>
   </div>
  </div>:<p>{t('Bạn có thể chọn bạn đồng hành để nhìn thấy tiến độ thói quen. Không cần chăm thú hoặc làm thêm nhiệm vụ.')}</p>}
  <button className="btn btn-secondary" disabled={busy||loading||loadError} onClick={settings}>{t(data.visible?'Đổi hoặc ẩn bạn đồng hành':'Chọn bạn đồng hành')}</button>
  {!standalone&&<Link className="btn btn-secondary" style={{marginLeft:'0.5rem',marginTop:'0.5rem'}} to="/companion">{en?'Open companion page':'Mở trang bạn đồng hành'}</Link>}
  {data.visible&&<button className="btn btn-secondary" style={{marginLeft:'0.5rem',marginTop:'0.5rem'}} disabled={busy||loading||loadError} onClick={()=>setHistoryOpen(true)}>{t('Xem hình thái và lịch sử điểm')}</button>}
  {data.visible&&<CompanionCardDownload companion={data} timezone={timezone} disabled={busy||loading||loadError}/>}
  {data.visible&&<CompanionWeek owner={owner} timezone={timezone}/>}
  {data.visible&&<CompanionRhythm owner={owner} timezone={timezone}/>}
  {data.visible&&<details style={{marginTop:'1rem'}}><summary>{t('Điểm bạn đồng hành được tính thế nào?')}</summary>
   <p>{t('Cộng điểm cơ sở đã lưu của check-in thói quen hoàn thành hợp lệ, theo tỷ lệ 1:1; có thể gồm lịch sử đã có.')} {t('Mốc hình thái là {thresholds} XP.',{thresholds:stageThresholds})}</p>
   <p>{t('Không cộng từ Pomodoro, mục tiêu hoặc thử thách. Đổi thưởng không trừ tiến độ này. Sửa check-in thành chưa hoàn thành sẽ điều chỉnh điểm và hình thái tương ứng.')}</p>
   <p>{t('{count} check-in có điểm lưu được tính; {legacy} check-in cũ thiếu căn cứ điểm không được cộng.',{count:data.countedCheckIns,legacy:data.legacyExcluded})}</p>
  </details>}
  </>}
  {historyOpen&&data&&<CompanionHistory companion={data} timezone={timezone} onClose={()=>setHistoryOpen(false)}/>}
  {open&&<ModalOverlay onClose={()=>{if(!lock.current)setOpen(false);}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="companion-settings-title" onClick={event=>event.stopPropagation()}>
   <h2 id="companion-settings-title">{t('Chọn và đặt tên bạn đồng hành')}</h2>
   <MotionSettings/>
   <p>{t('Ba loài dùng cùng tiến độ. Đổi loài hoặc ẩn không mất điểm đã ghi nhận.')}</p>
   <p>{t('Cộng điểm cơ sở đã lưu của check-in thói quen hoàn thành hợp lệ, theo tỷ lệ 1:1; có thể gồm lịch sử đã có.')} {t('Mốc hình thái là {thresholds} XP.',{thresholds:stageThresholds})}</p>
   {error&&<p role="alert">{t(error)}</p>}
   <form onSubmit={save}><fieldset disabled={busy||conflict} style={{border:0,padding:0}}>
    <CompanionGallery key={version} species={form.species} stage={data.stage} xp={data.xp} disabled={busy||conflict} onSelect={species=>setForm(current=>({...current,species}))}/>
    <label className="form-label" htmlFor="companion-name">{t('Tên tùy chọn')}</label><input id="companion-name" className="form-input" maxLength={40} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
    <label style={{display:'block',margin:'1rem 0'}}><input type="checkbox" checked={form.visible} onChange={e=>setForm({...form,visible:e.target.checked})}/> {t('Hiển thị trên Dashboard')}</label>
   </fieldset><button className="btn btn-primary" disabled={busy||conflict}>{t('Lưu lựa chọn')}</button></form>
   {conflict&&<div style={{marginTop:'1rem'}}><button className="btn btn-secondary" disabled={loading||busy} onClick={refresh}>{t('Tải lựa chọn đã lưu')}</button>
    {data&&data.version!==version&&!loading&&!loadError&&<><p>{data.name||t(companionSpecies[data.species])} · v{data.version}</p><button className="btn btn-secondary" disabled={busy} onClick={()=>{setVersion(data.version);setConflict(false);setError('');}}>{t('Giữ lựa chọn đang nhập và dùng phiên bản mới')}</button></>}
   </div>}
   <button className="btn btn-secondary" style={{marginTop:'1rem'}} disabled={busy} onClick={()=>setOpen(false)}>{t('Đóng')}</button>
  </section></ModalOverlay>}
 </section>;
}
