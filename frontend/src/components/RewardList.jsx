import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {selectRewards,rewardListPage} from '../utils/rewardList';
export default function RewardList({rewards,xp,children,scoped=false}){
 const {t}=useLanguage();const [filters,setFilters]=useState({query:'',status:'ALL',sort:'NEWEST'}),[page,setPage]=useState(1);
 const result=rewardListPage(selectRewards(rewards,{...filters,xp}),page);
 const change=(field,value)=>{setFilters(current=>({...current,[field]:value}));setPage(1);};
 if(scoped)return rewards.length?children(rewards):null;
 return <section aria-label={t('Danh sách phần thưởng')}>
  <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',marginBottom:'1rem',alignItems:'end'}}>
   <label style={{flex:'1 1 200px'}}>{t('Tìm phần thưởng')}<input type="search" className="form-input" maxLength={255} value={filters.query} onChange={e=>change('query',e.target.value)}/></label>
   <label>{t('Trạng thái')}<select className="form-input" value={filters.status} onChange={e=>change('status',e.target.value)}>
    {Object.entries({ALL:'Tất cả',UNCLAIMED:'Chưa nhận',AFFORDABLE:'Đủ XP để nhận',CLAIMED:'Đã nhận'}).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
   </select></label>
   <label>{t('Sắp xếp')}<select className="form-input" value={filters.sort} onChange={e=>change('sort',e.target.value)}>
    {Object.entries({NEWEST:'Mới nhất',CHEAPEST:'XP thấp đến cao',EXPENSIVE:'XP cao đến thấp',NAME:'Tên phần thưởng'}).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
   </select></label>
   <button className="btn btn-secondary" onClick={()=>{setFilters({query:'',status:'ALL',sort:'NEWEST'});setPage(1);}}>{t('Xóa bộ lọc')}</button>
  </div>
  <p role="status">{t('Hiển thị {shown}/{total} phần thưởng', {shown:result.total,total:rewards.length})}</p>
  {filters.status==='AFFORDABLE'&&<p className="text-muted">{t('Mỗi phần thưởng được so riêng với số dư XP hiện tại. Dùng dự toán để chọn nhiều phần thưởng cùng lúc.')}</p>}
  {result.total===0?<p>{t('Không có phần thưởng phù hợp. Thử đổi bộ lọc.')}</p>:children(result.items)}
  {result.pages>1&&<nav aria-label={t('Trang phần thưởng')} style={{display:'flex',gap:'.75rem',alignItems:'center',flexWrap:'wrap',marginTop:'1rem'}}>
   <button className="btn btn-secondary" disabled={result.page<=1} onClick={()=>setPage(result.page-1)}>{t('Trang trước')}</button>
   <span>{t('Trang {page}/{total}',{page:result.page,total:result.pages})}</span>
   <button className="btn btn-secondary" disabled={result.page>=result.pages} onClick={()=>setPage(result.page+1)}>{t('Trang sau')}</button>
  </nav>}
 </section>;
}
