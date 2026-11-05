import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {journalTemplates} from '../utils/journalTemplates';
import {journalFields} from '../utils/journalLimits';
export default function JournalTemplatePicker({disabled,onApply}){
 const {t}=useLanguage();const [id,setId]=useState(journalTemplates[0].id),[fields,setFields]=useState([]);const template=journalTemplates.find(row=>row.id===id);
 return <details className="card" style={{margin:'1rem 0'}}><summary>{t('Chọn mẫu câu hỏi để bắt đầu viết')}</summary><p>{t('Đây là câu hỏi có sẵn để bạn tự suy ngẫm. Chọn từng mục muốn thêm; câu hỏi được nối vào nội dung đang có, chưa lưu lên máy chủ.')}</p>
 <label className="form-label">{t('Chủ đề viết')}<select className="form-select" disabled={disabled} value={id} onChange={event=>{setId(event.target.value);setFields([]);}}>{journalTemplates.map(row=><option key={row.id} value={row.id}>{t(row.name)}</option>)}</select></label>
 <fieldset disabled={disabled} style={{border:0,padding:0,margin:'1rem 0'}}><legend className="form-label">{t('Chọn câu hỏi muốn thêm')}</legend>{Object.entries(journalFields).map(([field,label])=><label key={field} style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',margin:'1rem 0'}}><input type="checkbox" checked={fields.includes(field)} onChange={event=>setFields(previous=>event.target.checked?[...previous,field]:previous.filter(value=>value!==field))}/><span><strong>{t(label)}</strong><br/>{t(template.prompts[field])}</span></label>)}</fieldset>
 <button type="button" className="btn btn-secondary btn-sm" disabled={disabled||!fields.length} onClick={()=>{if(onApply(id,fields))setFields([]);}}>{t('Thêm {count} câu hỏi vào bản nháp',{count:fields.length})}</button>
 </details>;
}
