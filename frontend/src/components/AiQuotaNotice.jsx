import {aiQuotaNotice} from '../utils/aiQuota';

export default function AiQuotaNotice({status,feature,en=false}){
 const notice=aiQuotaNotice(status,feature,en?'en':'vi');
 if(!notice)return null;
 return <p role={notice.level==='limit'?'alert':'status'} style={{marginTop:'.5rem',color:notice.level==='limit'?'var(--danger-color)':notice.level==='warning'?'var(--warning-color, #a15c00)':'var(--text-secondary)'}}>{notice.message}</p>;
}
