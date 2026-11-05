import {Link} from 'react-router-dom';
import {categoryHabitsPath} from '../utils/categoryNavigation';
import {useEffect,useRef,useState} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {createLatestRequest} from '../utils/latestRequest';
import {activityMonth} from '../utils/monthlyActivity';
import {readCategoryActivity,categoryActivityName,categoryActivityExport} from '../utils/categoryActivity';
import {downloadText} from '../utils/downloadText';
export default function CategoryActivity({today,timezone}){
 const {t}=useLanguage();const [open,setOpen]=useState(false),[offset,setOffset]=useState(0),[data,setData]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[exportError,setExportError]=useState(false);const gate=useRef(createLatestRequest()),month=activityMonth(today,offset);
 useEffect(()=>{const request=gate.current;if(!open)return;setLoading(true);setError(false);setData(null);setExportError(false);void request.run(()=>api.get('/stats/categories',{params:{month}}),response=>setData(readCategoryActivity(response.data,month,today,timezone)),()=>setError(true),()=>setLoading(false));return()=>request.invalidate();},[open,month,today,timezone,attempt]);
 return <section className="card" style={{margin:'1rem 0'}}><h2 className="card-title">{t('Check-in theo danh mục trong tháng')}</h2>
  <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} onClick={()=>{setData(null);setOpen(value=>!value);}}>{t(open?'Thu gọn thống kê danh mục':'Xem thống kê danh mục')}</button>
  {open&&<><p>{t('Phân nhóm theo danh mục hiện tại, không phải danh mục tại thời điểm check-in.')}</p><p>{t('Chỉ tính lượt đã ghi của cả thói quen đang bật và đã tắt. Ngày chưa check-in không được suy ra là thất bại; danh mục chưa có lượt ghi trong tháng không xuất hiện.')}</p>
   <label className="form-label" htmlFor="category-activity-month">{t('Tháng')}</label><select id="category-activity-month" className="form-select" value={offset} onChange={event=>{setData(null);setOffset(Number(event.target.value));}}>{Array.from({length:24},(_,index)=><option key={index} value={-index}>{activityMonth(today,-index)}</option>)}</select>
   {loading&&<p role="status">{t('Đang tải...')}</p>}{error&&<p role="alert">{t('Chưa tải được thống kê danh mục. Hãy thử lại.')}</p>}
   {!loading&&!error&&data&&<><p>{t('Đã ghi {total} lượt: {completed} hoàn thành, {failed} thất bại, {skipped} bỏ qua.',{total:data.checkIns,...data})}</p>
    {data.categories.length===0?<p>{t('Chưa có check-in đã ghi trong tháng này.')}</p>:<ul style={{listStyle:'none',padding:0}}>{data.categories.map(row=><li key={row.categoryId??'none'} style={{padding:'1rem 0',borderBottom:'1px solid var(--border-color)'}}><h3 style={{overflowWrap:'anywhere'}}>{categoryActivityName(row,t)}</h3><p>{t('{count} thói quen có check-in',{count:row.habits})}</p><p>{t('{completed} hoàn thành · {failed} thất bại · {skipped} bỏ qua',row)}</p><progress max={row.checkIns} value={row.completed} aria-label={t('Hoàn thành trên các lượt đã ghi')}/><p>{t('{completed}/{total} lượt đã ghi hoàn thành ({percent}%)',{completed:row.completed,total:row.checkIns,percent:Math.round(row.completed/row.checkIns*100)})}</p><Link className="btn btn-secondary btn-sm" to={categoryHabitsPath(row.categoryId)}>{t('Mở các thói quen của danh mục này')}</Link></li>)}</ul>}
    <button type="button" className="btn btn-secondary btn-sm" disabled={!data.categories.length} onClick={()=>{try{const file=categoryActivityExport(data,t);downloadText(file.content,file.filename,'text/csv;charset=utf-8');setExportError(false);}catch{setExportError(true);}}}>{t('Tải CSV thống kê danh mục')}</button>
    {exportError&&<p role="alert">{t('Chưa tải được tệp thống kê. Hãy thử lại.')}</p>}
   </>}
   <button type="button" className="btn btn-secondary btn-sm" disabled={loading} style={{marginTop:'.75rem'}} onClick={()=>setAttempt(value=>value+1)}>{t('Tải lại')}</button>
  </>}
 </section>;
}
