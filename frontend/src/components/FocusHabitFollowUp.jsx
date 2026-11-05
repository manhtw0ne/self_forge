import {Link} from 'react-router-dom';import {useLanguage} from '../context/useLanguage';import {focusHabitFollowUp} from '../utils/focusHabitFollowUp';
export default function FocusHabitFollowUp({session,compact=false}){
 const {t}=useLanguage();let links;try{links=focusHabitFollowUp(session);}catch{return null;}if(!links)return null;
 const content=<div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'0.75rem'}}><Link className="btn btn-secondary btn-sm" to={links.checkInPath}>{t('Kiểm tra check-in của thói quen này hôm nay')}</Link><Link className="btn btn-secondary btn-sm" to={links.statsPath}>{t('Xem tiến độ thói quen')}</Link></div>;
 return compact?content:<section className="card" style={{marginBottom:'1.5rem'}}><h2>{t('Sau phiên tập trung')}</h2><p>{t('Phiên đã được ghi nhận. Nếu đã thực sự làm xong thói quen, bạn có thể mở check-in để xác nhận riêng.')}</p>{content}</section>;
}
