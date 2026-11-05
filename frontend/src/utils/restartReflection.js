import {appendJournalEvidence} from './journalEvidence.js';
import {readServerRestart} from './restartPlan.js';
import {validCalendarDate,shiftDate} from './dates.js';
export function restartReflection(value,date,en=false){
 if(!validCalendarDate(date))throw Error('Invalid reflection date');const plan=readServerRestart(value);if(!plan||date<plan.start||date>shiftDate(plan.start,2))return null;
 const index=[0,1,2].find(i=>shiftDate(plan.start,i)===date);if(index===undefined)throw Error('Invalid plan day');
 const title=(en?'Saved three-day plan':'Kế hoạch ba ngày đã lưu')+' · v'+plan.version+' · '+date+' · '+plan.name;
 const step=(en?'Planned step':'Bước dự định')+': '+plan.steps[index];
 const questions=en?{win:'What did I actually try today, even if it was smaller than planned?',obstacle:'What made this step difficult today? What do I want to record without blaming myself?',lesson:'What did I learn about the size or timing of this step?',tomorrowFocus:'What is one small step I choose for tomorrow? I can also rest or adjust the plan.'}:{win:'Hôm nay mình đã thực sự thử điều gì, kể cả nhỏ hơn dự định?',obstacle:'Điều gì khiến bước này khó thực hiện hôm nay? Mình muốn ghi lại điều gì mà không tự trách?',lesson:'Mình học được gì về khối lượng hoặc thời điểm thực hiện bước này?',tomorrowFocus:'Một bước nhỏ mình tự chọn cho ngày mai là gì? Mình cũng có thể nghỉ hoặc điều chỉnh kế hoạch.'};
 return {date,day:index+1,version:plan.version,name:plan.name,step:plan.steps[index],prompts:Object.fromEntries(Object.entries(questions).map(([field,question])=>[field,[title,step,question].join('\n')]))};
}

export function appendRestartReflection(form,field,text){if(typeof text!=='string'||typeof form?.[field]!=='string')throw Error('Invalid reflection');if(form[field].includes(text.trim()))return form[field];return appendJournalEvidence(form,field,text);}
