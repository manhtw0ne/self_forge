import FocusHabitFollowUp from './FocusHabitFollowUp';
import {useLanguage} from '../context/useLanguage';
export default function FocusSessionAction({session,onSelect,disabled}){
 const {t}=useLanguage();
 return <>{onSelect&&<button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onSelect(session.id,session.completed?'REPEAT':'RESUME')}>{t(session.completed?'Lặp lại cấu hình phiên này':'Khôi phục phiên này')}</button>}<FocusHabitFollowUp session={session} compact/></>;
}
