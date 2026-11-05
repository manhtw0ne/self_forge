import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {companionSpecies} from '../utils/companion';
import {companionStageCount,companionStageThreshold,companionStages} from '../utils/companionProgression';
import CompanionImage from './CompanionImage';

export default function CompanionGallery({species,stage,xp,disabled,onSelect}){
 const {language,t}=useLanguage(),en=language==='en';
 const [preview,setPreview]=useState(stage),[overviewOpen,setOverviewOpen]=useState(false);
 const formLabel=en?'Form':'Hình thái';
 return <section aria-labelledby="companion-gallery-title" style={{margin:'1rem 0'}}>
  <h3 id="companion-gallery-title">{en?'Meet your companions':'Chọn bạn đồng hành bằng hình ảnh'}</h3>
  <p>{en?'All three species use the same progress. Preview any form; your actual form is still determined by valid check-in XP. Selection is saved only when you press Save below.':'Ba loài dùng chung tiến độ. Có thể xem trước mọi hình thái; hình thái thực tế vẫn dựa trên XP check-in hợp lệ. Lựa chọn chỉ được lưu khi bạn bấm Lưu bên dưới.'}</p>
  <label className="form-label" htmlFor="companion-gallery-stage">{en?'Preview form':'Hình thái xem trước'}
   <select id="companion-gallery-stage" className="form-select" value={preview} disabled={disabled} onChange={event=>setPreview(Number(event.target.value))}>
    {companionStages.map(({stage:value,threshold})=><option key={value} value={value}>{formLabel} {value}/{companionStageCount} · {threshold} XP{value===stage?(en?' · Current':' · Hiện tại'):''}</option>)}
   </select>
  </label>
  <p role="status">{en?'Current progress':'Tiến độ hiện tại'}: {xp} XP · {formLabel} {stage}/{companionStageCount}. {preview>stage?(en?'This preview is above your current milestone.':'Hình thái xem trước này cao hơn mốc hiện tại.'):''}</p>
  <fieldset disabled={disabled} style={{border:0,padding:0,margin:'1rem 0'}}>
   <legend className="form-label">{en?'Choose a species':'Chọn loài'}</legend>
   <div className="companion-gallery">{Object.entries(companionSpecies).map(([key,name])=><label key={key} className={'companion-gallery-choice'+(species===key?' is-selected':'')}>
    <span className="companion-gallery-label"><input type="radio" name="companion-gallery-species" value={key} checked={species===key} onChange={()=>onSelect(key)}/><strong>{t(name)}</strong>{species===key&&<span>{en?'Selected':'Đang chọn'}</span>}</span>
    <CompanionImage species={key} stage={preview} alt={t('Bạn đồng hành {name}, hình thái {stage}',{name:t(name),stage:preview})} width="160" height="160" loading="lazy" decoding="async"/>
    <span>{en?'Preview form':'Xem trước hình thái'} {preview}/{companionStageCount} · {companionStageThreshold(preview)} XP</span>
   </label>)}</div>
  </fieldset>
  <details onToggle={event=>setOverviewOpen(event.currentTarget.open)}>
   <summary>{en?'Compare all nine appearances':'So sánh đủ chín hình ảnh'}</summary>
   {overviewOpen&&<div className="companion-gallery-overview">{Object.entries(companionSpecies).map(([key,name])=><section key={key}>
    <h4>{t(name)}</h4><div className="companion-gallery-stages">{companionStages.map(({stage:value,threshold})=><figure key={value}>
     <CompanionImage species={key} stage={value} width="88" height="88" alt={t('Bạn đồng hành {name}, hình thái {stage}',{name:t(name),stage:value})} loading="lazy" decoding="async"/>
     <figcaption>{formLabel} {value}<br/>{threshold} XP</figcaption>
    </figure>)}</div>
   </section>)}</div>}
  </details>
 </section>;
}
