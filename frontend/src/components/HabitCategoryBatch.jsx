import {useEffect,useRef,useState} from 'react';
import api from '../api/client';
import {useLanguage} from '../context/useLanguage';
import {localizedCategory} from '../utils/language';
import {categoryBatchPayload,readCategoryBatch,clearCategoryBatch,applyCategoryBatch} from '../utils/habitCategoryBatch';
export default function HabitCategoryBatch({owner,habits,categories,disabled,onBusy,onChanged}){
 const {t,language}=useLanguage();const [initial]=useState(()=>{try{return {body:readCategoryBatch(sessionStorage,owner),error:false};}catch{return {body:null,error:true};}});
 const [open,setOpen]=useState(Boolean(initial.body)||initial.error),[selected,setSelected]=useState([]),[target,setTarget]=useState(''),[query,setQuery]=useState(''),[review,setReview]=useState(initial.body),[pending,setPending]=useState(Boolean(initial.body)),[blocked,setBlocked]=useState(initial.error),[error,setError]=useState(initial.error?'Không đọc được yêu cầu gán danh mục đã lưu. Kiểm tra danh sách trước khi bỏ yêu cầu.':'');const inFlight=useRef(false);
 useEffect(()=>{if(!selected.length&&!review)return;const guard=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[selected.length,review]);
 const reset=()=>{setReview(null);setSelected([]);setTarget('');setPending(false);setBlocked(false);setError('');};
 const discard=()=>{if(disabled||inFlight.current)return;if((pending||blocked)&&!window.confirm(t('Bỏ yêu cầu gán danh mục đang chờ? Thay đổi có thể đã được áp dụng; kiểm tra danh sách trước khi tạo nhóm mới.')))return;try{clearCategoryBatch(sessionStorage,owner);reset();}catch{setError('Chưa xóa được yêu cầu đã lưu.');}};
 const apply=async()=>{if(disabled||inFlight.current||blocked||!review)return;inFlight.current=true;onBusy(true);setError('');
  try{const result=await applyCategoryBatch(sessionStorage,owner,review,body=>api.patch('/habits/categories',body));if(result.pending){setPending(true);setReview(result.pending);}else reset();await onChanged();}
  catch(error){let corrupt=false;try{const body=readCategoryBatch(sessionStorage,owner);setPending(Boolean(body));if(body)setReview(body);}catch{corrupt=true;}setBlocked(corrupt||error.response?.status===409||error.response?.status===403);setError(error.response?.data?.detail||'Chưa xác nhận được việc gán danh mục. Thử lại cùng nhóm hoặc kiểm tra danh sách trước khi bỏ yêu cầu.');}
  finally{inFlight.current=false;onBusy(false);}
 };
 const shown=habits.filter(row=>row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const categoryName=id=>id===null?t('Không có danh mục'):localizedCategory(language,categories.find(row=>row.id===id))||t('Danh mục không còn trong danh sách');
 return <section className="card" style={{margin:'1rem 0'}}><h2 className="card-title">{t('Gán danh mục cho nhiều thói quen')}</h2>
  <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t(open?'Thu gọn gán danh mục':'Mở gán danh mục hàng loạt')}</button>
  {open&&<><p>{t('Chọn tối đa 50 thói quen, kể cả thói quen đã tắt. Chỉ danh mục được đổi; trạng thái bật/tắt, điểm và lịch sử được giữ nguyên.')}</p>
   {error&&<p role="alert">{t(error)}</p>}
   {!review&&!blocked?<>
    <label className="form-label" htmlFor="category-batch-target">{t('Danh mục sẽ áp dụng')}</label><select id="category-batch-target" className="form-select" disabled={disabled} value={target} onChange={event=>setTarget(event.target.value)}><option value="">{t('Không có danh mục')}</option>{categories.map(row=><option key={row.id} value={row.id}>{localizedCategory(language,row)}</option>)}</select>
    <label className="form-label" htmlFor="category-batch-search">{t('Tìm thói quen')}</label><input id="category-batch-search" className="form-input" type="search" maxLength={255} value={query} onChange={event=>setQuery(event.target.value)}/>
    <p role="status">{t('Đã chọn {count}/50 thói quen',{count:selected.length})}</p>
    <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
     <button type="button" className="btn btn-secondary btn-sm" disabled={disabled||!shown.length||new Set([...selected,...shown.map(row=>row.id)]).size>50} onClick={()=>setSelected(ids=>[...new Set([...ids,...shown.map(row=>row.id)])])}>{t('Thêm các mục đang hiển thị vào lựa chọn')}</button>
     <button type="button" className="btn btn-secondary btn-sm" disabled={disabled||!selected.length} onClick={()=>setSelected([])}>{t('Bỏ chọn tất cả')}</button>
    </div>
    <div style={{maxHeight:320,overflowY:'auto',margin:'1rem 0'}}>{shown.map(row=><label key={row.id} style={{display:'flex',gap:'.75rem',alignItems:'start',padding:'.5rem 0'}}><input type="checkbox" disabled={disabled||!selected.includes(row.id)&&selected.length>=50} checked={selected.includes(row.id)} onChange={event=>setSelected(ids=>event.target.checked?[...ids,row.id]:ids.filter(id=>id!==row.id))}/><span>{row.name} · {t(row.active?'Đang bật':'Đã tắt')} · {categoryName(row.categoryId??null)}</span></label>)}</div>
    <button type="button" className="btn btn-primary btn-sm" disabled={disabled||!selected.length} onClick={()=>{try{setReview(categoryBatchPayload(habits,selected,target?Number(target):null,categories));setError('');}catch{setError('Chọn từ 1 đến 50 thói quen và danh mục hợp lệ.');}}}>{t('Xem lại nhóm thay đổi')}</button>
   </>:review?<>
    <h3>{t('Danh mục sẽ áp dụng')}: {categoryName(review.categoryId)}</h3>
    {pending&&<p>{t('Nhóm thay đổi đang chờ xác nhận. Gửi lại dùng đúng các thói quen và danh mục đã chọn trước đó.')}</p>}
    <ul>{review.items.map(item=><li key={item.habitId}>{habits.find(row=>row.id===item.habitId)?.name||'#'+item.habitId}: {categoryName(item.expected.categoryId)} → {categoryName(review.categoryId)}</li>)}</ul>
    <p>{t('Cả nhóm được áp dụng cùng lúc. Nếu danh mục của một thói quen đã đổi ở nơi khác, ứng dụng yêu cầu kiểm tra lại thay vì ghi đè.')}</p>
    <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}><button type="button" className="btn btn-primary btn-sm" disabled={disabled||blocked} onClick={apply}>{t(pending?'Thử lại cùng nhóm':'Áp dụng danh mục cho nhóm')}</button><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>{if(pending)discard();else{setReview(null);setError('');}}}>{t(pending?'Bỏ yêu cầu chờ':'Quay lại lựa chọn')}</button></div>
   </>:<button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={discard}>{t('Bỏ yêu cầu chờ')}</button>}
   {(pending||blocked)&&<button type="button" className="btn btn-secondary btn-sm" disabled={disabled} style={{marginTop:'.75rem'}} onClick={onChanged}>{t('Tải lại danh sách')}</button>}
  </>}
 </section>;
}
