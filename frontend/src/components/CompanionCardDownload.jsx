import {useEffect,useRef,useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {todayInTimezone} from '../utils/dates';
import {companionCardModel,renderCompanionCard} from '../utils/companionCard';
import {companionArt} from '../utils/companionArt';
export default function CompanionCardDownload({companion,timezone,disabled}){
 const {t}=useLanguage();const [open,setOpen]=useState(false),[includeName,setIncludeName]=useState(false),[includeXp,setIncludeXp]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false),[preview,setPreview]=useState(null);const token=useRef(0),objectUrl=useRef(null);
 const clear=()=>{token.current++;if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current=null;setPreview(null);setBusy(false);setError(false);};
 useEffect(()=>()=>{token.current++;if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);},[]);
 const create=async()=>{
  if(disabled||busy)return;clear();const version=++token.current;setBusy(true);
  try{const model=companionCardModel(companion,todayInTimezone(timezone),{includeName,includeXp},t),blob=await renderCompanionCard(model,companionArt[model.species][model.stage-1]);if(version!==token.current)return;const url=URL.createObjectURL(blob);objectUrl.current=url;setPreview({url,filename:model.filename,date:model.date});}
  catch{if(version===token.current)setError(true);}finally{if(version===token.current)setBusy(false);}
 };
 return <section style={{marginTop:'1rem'}}><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} aria-expanded={open} onClick={()=>{clear();setOpen(value=>!value);}}>{t(open?'Ẩn thẻ tiến độ':'Tạo ảnh bạn đồng hành')}</button>
  {open&&<><p>{t('Tạo ảnh từ hình thái hiện tại để tự lưu hoặc chia sẻ. Ảnh không chứa email, nhật ký hoặc tên thói quen và không tự đăng lên mạng.')}</p>
   <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',margin:'.75rem 0'}}><label><input type="checkbox" checked={includeName} disabled={busy} onChange={event=>{clear();setIncludeName(event.target.checked);}}/> {t('Hiện tên riêng của bạn đồng hành')}</label><label><input type="checkbox" checked={includeXp} disabled={busy} onChange={event=>{clear();setIncludeXp(event.target.checked);}}/> {t('Hiện XP từ thói quen')}</label></div>
   <button type="button" className="btn btn-secondary btn-sm" disabled={disabled||busy} onClick={create}>{t(busy?'Đang tạo ảnh…':'Tạo ảnh xem trước')}</button>
   {error&&<p role="alert">{t('Chưa tạo được ảnh trên trình duyệt này. Bạn có thể thử lại; tiến độ không thay đổi.')}</p>}
   {preview&&<figure style={{margin:'1rem 0'}}><img src={preview.url} alt={t('Ảnh xem trước bạn đồng hành, không tự chia sẻ')} width="1080" height="1080" style={{display:'block',maxWidth:'100%',height:'auto',borderRadius:12}}/><figcaption><p>{t('Ảnh chụp tiến độ tại thời điểm tạo, không tự cập nhật khi check-in thay đổi.')}</p><a className="btn btn-primary btn-sm" href={preview.url} download={preview.filename}>{t('Tải ảnh PNG')}</a></figcaption></figure>}
  </>}
 </section>;
}
