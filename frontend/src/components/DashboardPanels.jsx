import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useLanguage} from '../context/useLanguage';
import {dashboardPanelLabels,dashboardPanelDefaults,readDashboardLayout,writeDashboardLayout,dashboardPanelFromHash,dashboardPanelOrder,moveDashboardPanel,dashboardLayoutPreset} from '../utils/dashboardPanels';
export default function DashboardPanels({owner,panels}){
 const {t}=useLanguage(),{hash}=useLocation();
 const [initial]=useState(()=>{try{return {layout:readDashboardLayout(localStorage,owner),error:false};}catch{return {layout:dashboardLayoutPreset('ALL'),error:true};}});
 const [layout,setLayout]=useState(initial.layout),[storageError,setStorageError]=useState(initial.error),[announcement,setAnnouncement]=useState('');const {panels:preferences,order}=layout;const reveal=dashboardPanelFromHash(hash);
 // Panels that were opened once stay mounted when hidden. This retains an
 // in-progress local draft or timer while still allowing first-load code
 // splitting for panels a person has never chosen to see.
 const [activated,setActivated]=useState(()=>new Set(Object.keys(initial.layout.panels).filter(id=>initial.layout.panels[id])));
 useEffect(()=>{const requested=[...order.filter(id=>preferences[id]),reveal].filter(Boolean);if(!requested.length)return;setActivated(current=>{const next=new Set(current);let changed=false;for(const id of requested)if(!next.has(id)){next.add(id);changed=true;}return changed?next:current;});},[order,preferences,reveal]);
 const update=next=>{setLayout(next);try{writeDashboardLayout(localStorage,owner,next);setStorageError(false);}catch{setStorageError(true);}};
 return <><details className="card" style={{margin:'1.5rem 0'}}><summary>{t('Tùy chỉnh các phần trên Dashboard')}</summary>
 <p>{t('Danh sách thói quen hôm nay, phiên đang giữ và nhắc nhở hôm nay luôn hiển thị. Người mới bắt đầu với một bố cục gọn; chọn các phần bổ sung bạn muốn xem.')}</p>
 <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',margin:'1rem 0'}}>{[['FOCUS','Bố cục tập trung làm việc'],['HABITS','Bố cục theo dõi thói quen'],['ALL','Khôi phục bố cục đầy đủ']].map(([value,label])=><button type="button" className="btn btn-secondary btn-sm" key={value} onClick={()=>{update(dashboardLayoutPreset(value));setAnnouncement(t('Đã áp dụng bố cục được chọn.'));}}>{t(label)}</button>)}</div>
 <fieldset style={{border:0,padding:0,margin:'1rem 0'}}><legend className="form-label">{t('Các phần bổ sung')}</legend><ol style={{listStyle:'none',padding:0}}>{order.map((id,index)=><li key={id} style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',alignItems:'center',margin:'1rem 0'}}><label style={{display:'flex',gap:'0.5rem',alignItems:'center',flex:'1 1 200px'}}><input type="checkbox" checked={preferences[id]} onChange={event=>update({...layout,panels:{...preferences,[id]:event.target.checked}})}/>{index+1}. {t(dashboardPanelLabels[id])}</label>{[[-1,'Đưa lên trước'],[1,'Đưa xuống sau']].map(([direction,label])=><button type="button" className="btn btn-secondary btn-sm" key={direction} disabled={direction===-1?index===0:index===order.length-1} aria-label={t('{action}: {name}',{action:t(label),name:t(dashboardPanelLabels[id])})} onClick={()=>{update({...layout,order:moveDashboardPanel(order,id,direction)});setAnnouncement(t('Đã chuyển {name} đến vị trí {position}.',{name:t(dashboardPanelLabels[id]),position:index+direction+1}));}}>{t(label)}</button>)}</li>)}</ol></fieldset>
 <p role="status" aria-live="polite">{announcement}</p>
 <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><button type="button" className="btn btn-secondary btn-sm" onClick={()=>update({...layout,panels:dashboardPanelDefaults(false)})}>{t('Ẩn các phần bổ sung')}</button><button type="button" className="btn btn-secondary btn-sm" onClick={()=>update({...layout,panels:dashboardPanelDefaults(true)})}>{t('Hiện tất cả các phần')}</button><button type="button" className="btn btn-secondary btn-sm" onClick={()=>update({...layout,order:dashboardPanelOrder()})}>{t('Khôi phục thứ tự mặc định')}</button></div>
 <p>{t('Ẩn chỉ thay đổi cách hiển thị, không xóa dữ liệu, bản nháp hoặc dừng tác vụ đang chạy. Tùy chọn lưu theo tài khoản trên trình duyệt này.')}</p>{storageError&&<p role="alert">{t('Chưa lưu được bố cục Dashboard. Lựa chọn hiện tại vẫn dùng khi trang đang mở.')}</p>}{reveal&&!preferences[reveal]&&<p role="status">{t('Phần {name} đang được hiện tạm vì bạn mở bằng liên kết trực tiếp.',{name:t(dashboardPanelLabels[reveal])})}</p>}</details>
 {order.map(id=>{const panel=panels.find(row=>row.id===id);const visible=preferences[id]||reveal===id;return panel&&activated.has(id)?<div key={id} id={'dashboard-'+id} hidden={!visible}>{panel.content}</div>:null;})}
 </>;
}
