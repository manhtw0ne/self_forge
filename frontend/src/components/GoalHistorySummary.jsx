import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {goalHistorySummary,goalHistoryPageExport} from '../utils/goalHistorySummary';
import {downloadText} from '../utils/downloadText';
export default function GoalHistorySummary({data,goal,page,kind}){
 const {t}=useLanguage();const [exportError,setExportError]=useState(false);let summary;
 try{summary=goalHistorySummary(data,goal.id,kind);}catch{return <p role="alert">{t('Chưa tính được tóm tắt trang lịch sử này.')}</p>;}
 return <section style={{margin:'1rem 0',padding:'1rem',border:'1px solid var(--border-color)',borderRadius:8}} aria-label={t('Tóm tắt trang lịch sử tiến độ')}>
  <h3>{t('Tóm tắt trang {page}',{page})}</h3>
  <p>{t('{total} thay đổi: {added} lượt cộng, {corrected} lượt điều chỉnh.',{total:summary.count,added:summary.additions,corrected:summary.corrections})}</p>
  {summary.groups.map(group=><div key={group.unit} style={{margin:'.75rem 0'}}><strong>{group.unit||t('Không ghi đơn vị')}</strong><p>{t('Cộng tiến độ: {added} · Điều chỉnh tăng: {up} · Điều chỉnh giảm: {down}',{added:group.added,up:group.increased,down:group.decreased})}</p></div>)}
  <p>{t('Chỉ tính các bản ghi trên trang đang xem theo bộ lọc hiện tại. Đơn vị khác nhau được giữ riêng; các con số này không phải tổng tiến độ hay XP hiện tại.')}</p>
  <button type="button" className="btn btn-secondary btn-sm" disabled={!summary.count} onClick={()=>{try{const file=goalHistoryPageExport(data,goal,page,kind,t);downloadText(file.content,file.filename,'text/csv;charset=utf-8');setExportError(false);}catch{setExportError(true);}}}>{t('Tải CSV trang lịch sử này')}</button>
  {exportError&&<p role="alert">{t('Chưa tải được tệp lịch sử. Hãy thử lại.')}</p>}
 </section>;
}
