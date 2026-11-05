import {journalFields} from './journalLimits.js';
import {appendJournalEvidence} from './journalEvidence.js';
export const journalTemplates=[
 {id:'brief',name:'Nhìn lại trong vài phút',prompts:{win:'Một việc nhỏ hôm nay mình thấy đáng ghi nhận là gì?',obstacle:'Điều gì khiến ngày hôm nay khó hơn mình dự kiến?',lesson:'Mình muốn giữ lại điều gì từ trải nghiệm hôm nay?',tomorrowFocus:'Ngày mai mình muốn ưu tiên một việc nhỏ nào?'}},
 {id:'restart',name:'Sau một ngày mất nhịp',prompts:{win:'Dù chưa theo đúng kế hoạch, mình đã làm được điều gì?',obstacle:'Trở ngại cụ thể nào mình muốn ghi lại, không tự trách bản thân?',lesson:'Mình có thể giảm độ khó hoặc đổi thời điểm ở bước nào?',tomorrowFocus:'Phiên bản nhỏ nhất mình sẵn sàng thử lại vào ngày mai là gì?'}},
 {id:'focus',name:'Sau một buổi tập trung',prompts:{win:'Trong buổi tập trung, mình đã thực sự hoàn thành phần nào?',obstacle:'Điều gì đã làm mình phân tâm hoặc phải dừng lại?',lesson:'Điều kiện nào giúp mình tập trung tốt hơn?',tomorrowFocus:'Bước tiếp theo cụ thể để tiếp tục công việc này là gì?'}}
];
export function applyJournalTemplate(form,id,fields,t=value=>value){
 const template=journalTemplates.find(row=>row.id===id);
 if(!template||!Array.isArray(fields)||!fields.length||new Set(fields).size!==fields.length||fields.some(field=>!Object.hasOwn(journalFields,field)))throw Error('Invalid template selection');
 const next={};for(const field of Object.keys(journalFields)){if(typeof form?.[field]!=='string')throw Error('Invalid journal');next[field]=form[field];}
 for(const field of fields)next[field]=appendJournalEvidence(next,field,t(template.prompts[field]));
 return next;
}
