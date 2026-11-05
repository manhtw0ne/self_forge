import {useEffect,useRef,useState} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {localizedCategory} from '../utils/language';
import {categoryFormValue,categoryPayload,categoryUsage} from '../utils/categoryForm';
export default function CategoryManager({categories,habits,disabled,onBusy,onCategories,onChanged}){
 const {t,language}=useLanguage();const [open,setOpen]=useState(false),[editing,setEditing]=useState(null),[formOpen,setFormOpen]=useState(false),[form,setForm]=useState(()=>categoryFormValue(null)),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[conflict,setConflict]=useState(false);const inFlight=useRef(false);
 const dirty=formOpen&&JSON.stringify(form)!==JSON.stringify(categoryFormValue(editing));
 useEffect(()=>{if(!dirty&&!uncertain)return;const guard=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty,uncertain]);
 const reset=()=>{setFormOpen(false);setEditing(null);setForm(categoryFormValue(null));setUncertain(false);setConflict(false);setError('');};
 const start=category=>{if(disabled||inFlight.current||uncertain)return;if(dirty&&!window.confirm(t('Bỏ thay đổi danh mục chưa lưu?')))return;setEditing(category);setForm(categoryFormValue(category));setFormOpen(true);setError('');};
 const reload=async()=>{
  if(disabled||inFlight.current)return;if((dirty||uncertain)&&!window.confirm(t('Tải lại danh mục và đóng biểu mẫu? Kiểm tra danh sách sau khi tải; yêu cầu trước có thể đã thành công.')))return;
  inFlight.current=true;onBusy(true);
  try{const {data}=await api.get('/categories');onCategories(data);reset();await onChanged();}catch{setError('Chưa tải được danh mục. Nội dung hiện tại được giữ.');}finally{inFlight.current=false;onBusy(false);}
 };
 const save=async event=>{
  event.preventDefault();if(disabled||inFlight.current||conflict)return;let payload;try{payload=categoryPayload(form,editing);}catch(error){setError(error.message);return;}
  inFlight.current=true;onBusy(true);setError('');
  try{if(editing)await api.patch('/categories/'+editing.id,payload);else await api.post('/categories',payload);reset();await onChanged();}
  catch(error){setError(error.response?.data?.detail||'Chưa xác nhận được việc lưu danh mục. Thử lại cùng nội dung hoặc tải lại để kiểm tra.');setUncertain(![400,401,403,404,422].includes(error.response?.status));setConflict(error.response?.status===409);}
  finally{inFlight.current=false;onBusy(false);}
 };
 const remove=async category=>{
  if(disabled||inFlight.current||uncertain||category.systemDefault||categoryUsage(habits,category.id)>0)return;
  if(!window.confirm(t('Xóa danh mục “{name}”?',{name:category.name})))return;
  inFlight.current=true;onBusy(true);setError('');
  try{await api.delete('/categories/'+category.id);if(editing?.id===category.id)reset();await onChanged();}catch(error){setError(error.response?.data?.detail||'Chưa xác nhận được việc xóa danh mục. Tải lại danh sách để kiểm tra.');}finally{inFlight.current=false;onBusy(false);}
 };
 return <section className="card" style={{margin:'1rem 0'}}>
  <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}><h2 className="card-title">{t('Quản lý danh mục thói quen')}</h2><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} aria-expanded={open} onClick={()=>{if(open&&(dirty||uncertain)&&!window.confirm(t('Đóng phần quản lý? Biểu mẫu vẫn được giữ trong trang này.')))return;setOpen(value=>!value);}}>{t(open?'Thu gọn danh mục':'Mở quản lý danh mục')}</button></div>
  {open&&<><p>{t('Danh mục riêng chỉ thuộc tài khoản của bạn. Danh mục hệ thống được giữ nguyên. Muốn xóa một danh mục, trước hết gỡ nó khỏi các thói quen đang bật và đã tắt.')}</p>
   <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',margin:'1rem 0'}}><button type="button" className="btn btn-primary btn-sm" disabled={disabled||uncertain} onClick={()=>start(null)}>{t('Tạo danh mục riêng')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={reload}>{t('Tải lại danh mục')}</button></div>
   {error&&<p role="alert">{t(error)}</p>}
   {formOpen&&<form onSubmit={save} style={{margin:'1rem 0'}}>
    <h3>{t(editing?'Sửa danh mục riêng':'Tạo danh mục riêng')}</h3><fieldset disabled={disabled||uncertain} style={{border:0,padding:0,minWidth:0}}>
     <label className="form-label" htmlFor="category-name">{t('Tên danh mục')}</label><input id="category-name" className="form-input" required maxLength={255} value={form.name} onChange={event=>setForm({...form,name:event.target.value})}/>
     <label className="form-label" htmlFor="category-icon">{t('Biểu tượng danh mục')}</label><input id="category-icon" className="form-input" maxLength={32} value={form.icon} onChange={event=>setForm({...form,icon:event.target.value})}/>
     <label className="form-label" htmlFor="category-color">{t('Màu danh mục')}</label><input id="category-color" type="color" value={form.color} onChange={event=>setForm({...form,color:event.target.value})}/>
    </fieldset>
    <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',marginTop:'.75rem'}}><button type="submit" className="btn btn-primary btn-sm" disabled={disabled||conflict}>{t(uncertain?'Thử lại cùng nội dung':'Lưu danh mục')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={disabled||uncertain} onClick={()=>{if(dirty&&!window.confirm(t('Bỏ thay đổi danh mục chưa lưu?')))return;reset();}}>{t('Hủy')}</button></div>
   </form>}
   <ul style={{listStyle:'none',padding:0}}>{categories.map(category=>{const used=categoryUsage(habits,category.id);return <li key={category.id} style={{display:'flex',gap:'.75rem',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',padding:'.75rem 0',borderBottom:'1px solid var(--border-color)'}}><div><strong>{category.icon} {localizedCategory(language,category)}</strong><p>{t(category.systemDefault?'Danh mục hệ thống':'Danh mục riêng')} · {t('{count} thói quen đang dùng',{count:used})}</p></div>{!category.systemDefault&&<div style={{display:'flex',gap:'.5rem'}}><button type="button" className="btn btn-secondary btn-sm" disabled={disabled||uncertain} onClick={()=>start(category)}>{t('Sửa')}</button><button type="button" className="btn btn-danger btn-sm" disabled={disabled||uncertain||used>0} onClick={()=>remove(category)}>{t('Xóa')}</button></div>}</li>;})}</ul>
  </>}
 </section>;
}
