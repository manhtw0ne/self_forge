import { validCalendarDate, shiftDate } from './dates.js';
export const restartReasons = { BUSY:'Quá bận', HARD:'Mục tiêu quá khó', FORGOT:'Quên thực hiện', REST:'Cần nghỉ và điều chỉnh' };
export function restartSteps(reason,t=value=>value) {
 if(!Object.hasOwn(restartReasons,reason))throw Error('Invalid reason');
 const first={BUSY:'Dành 2 phút cho phiên bản nhỏ nhất của thói quen.',HARD:'Giảm độ khó và thử một bước nhỏ bạn thấy khả thi.',FORGOT:'Chọn một thời điểm và đặt dấu nhắc dễ nhìn, rồi làm một bước nhỏ.',REST:'Chọn nghỉ ngơi hoặc một bước nhẹ phù hợp với sức của bạn.'};
 return [t(first[reason]),t('Lặp lại bước nhỏ vào thời điểm bạn chọn; có thể giảm thêm nếu cần.'),t('Nhìn lại hai ngày: chọn giữ, tăng nhẹ, giảm hoặc dừng kế hoạch.')];
}
export function restartPayload(value) {
 if(!value||!Object.hasOwn(restartReasons,value.reason)||typeof value.name!=='string'||value.name.length>255||!validCalendarDate(value.start)||value.start>'9999-12-29'||
  !Array.isArray(value.steps)||value.steps.length!==3||value.steps.some(step=>typeof step!=='string'||step.length>500))throw Error('Invalid restart plan');
 return {name:value.name,reason:value.reason,start:value.start,steps:[...value.steps]};
}
const key=owner=>{if(!Number.isSafeInteger(owner)||owner<=0)throw Error('Invalid owner');return `sf_restart_plan:${owner}`;};
export function writeRestartPlan(storage,owner,value){storage.setItem(key(owner),JSON.stringify({version:1,...restartPayload(value)}));}
export function readRestartPlan(storage,owner){const raw=storage.getItem(key(owner));if(!raw)return null;const value=JSON.parse(raw);if(value.version!==1)throw Error('Invalid version');return restartPayload(value);}
export function restartExport(value,t=text=>text){const plan=restartPayload(value);if(!plan.name.trim()||plan.steps.some(step=>!step.trim()))throw Error('Incomplete plan');return {
 filename:`selfforge-restart-${plan.start}.txt`,text:[t('Kế hoạch bắt đầu lại trong 3 ngày'),plan.name,t(restartReasons[plan.reason]),
 ...plan.steps.map((step,index)=>`${shiftDate(plan.start,index)}\n${step}`),
 t('Đây là bản nháp tự chọn, không tự thay lịch, XP hoặc streak. Check-in vẫn thực hiện như bình thường.')].join('\n\n')};}

export function readServerRestart(value) {
 if(value==null || value==='')return null;
 const plan=restartPayload(value);
 if(!Number.isSafeInteger(value.version)||value.version<1||!plan.name.trim()||plan.steps.some(step=>!step.trim()))throw Error('Invalid server plan');
 return {...plan,version:value.version};
}

export function restartDay(value,today) {
 const plan=readServerRestart(value);if(!plan)return null;
 if(!validCalendarDate(today))throw Error('Invalid account date');
 if(today<plan.start)return {state:'scheduled',date:plan.start,name:plan.name};
 const end=shiftDate(plan.start,2);
 if(today>end)return {state:'ended',date:end,name:plan.name};
 const index=Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(plan.start+'T00:00:00Z'))/86400000);
 return {state:'active',date:today,day:index+1,action:plan.steps[index],name:plan.name};
}

export function savedRestartExport(value,t=text=>text) {
 const plan=readServerRestart(value);if(!plan)throw Error('No saved plan');
 const file=restartExport(plan,t);
 return {filename:'selfforge-restart-saved-'+plan.start+'.txt',text:[t('Bản sao kế hoạch đã tải từ tài khoản'),t('Phiên bản')+': '+plan.version,
 t('Chỉ gồm bản đã tải, không gồm thay đổi đang sửa.'),file.text].join('\n\n')};
}

export function restartSavePayload(value,version) {
 const plan=restartPayload(value);
 if(!Number.isSafeInteger(version)||version<0||!plan.name.trim()||plan.steps.some(step=>!step.trim()))throw Error('Invalid save request');
 return {...plan,expectedVersion:version};
}

export const restartDecisions={KEEP:'Giữ mức hiện tại',EASIER:'Giảm nhẹ để dễ duy trì',HARDER:'Tăng nhẹ khi thấy sẵn sàng',PAUSE:'Nghỉ và điều chỉnh sau'};
export function restartReviewPayload(value,planVersion,expectedVersion){
 if(!Number.isSafeInteger(planVersion)||planVersion<1||!Number.isSafeInteger(expectedVersion)||expectedVersion<0||
    (value?.daysTried==null||value.daysTried==='')||!Number.isInteger(Number(value?.daysTried))||Number(value.daysTried)<0||Number(value.daysTried)>3||
    !Object.hasOwn(restartDecisions,value?.decision)||typeof value.note!=='string'||value.note.length>500)throw Error('Invalid review');
 return {planVersion,expectedVersion,daysTried:Number(value.daysTried),decision:value.decision,note:value.note};
}
export function readRestartReview(value,planVersion){
 if(value==null||value==='')return null;
 if(value.planVersion!==planVersion||!Number.isSafeInteger(value.version)||value.version<1)throw Error('Invalid review version');
 const clean=restartReviewPayload(value,planVersion,value.version);
 return {planVersion,version:value.version,daysTried:clean.daysTried,decision:clean.decision,note:clean.note};
}
