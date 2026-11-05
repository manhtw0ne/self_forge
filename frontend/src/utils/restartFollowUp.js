import {readServerRestart,readRestartReview,restartSteps,restartPayload,restartDay} from './restartPlan.js';
import {readRestartDays} from './restartDays.js';
export function reviewFromRecordedDays(form,records,planVersion){
 const days=readRestartDays(records,planVersion);
 return {daysTried:days.tried.filter(Boolean).length,decision:form.decision,note:form.note};
}
export function restartFollowUp(plan,review,today,t=value=>value){
 const source=readServerRestart(plan);if(!source||restartDay(source,today).state!=='ended')throw Error('Review period has not ended');
 const saved=readRestartReview(review,source.version);if(!saved)throw Error('No saved review');
 if(saved.decision==='PAUSE')return null;
 let steps=[...source.steps];
 if(saved.decision==='EASIER')steps=restartSteps('HARD',t);
 if(saved.decision==='HARDER')steps=[t('Chọn một mức tăng nhỏ so với bước trước, chỉ khi bạn thấy sẵn sàng.'),t('Thử lại mức mới; quay về bước cũ nếu thấy quá sức.'),t('Nhìn lại hai ngày: chọn giữ, tăng nhẹ, giảm hoặc dừng kế hoạch.')];
 return restartPayload({name:source.name,reason:source.reason,start:today,steps});
}
