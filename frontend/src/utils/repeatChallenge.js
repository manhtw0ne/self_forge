import {challengeNextStep} from './challengeNextStep.js';
import {challengeWindowDays,challengeWindow} from './challengeWindow.js';
export function repeatChallengeDraft(challenge,progress,habits,today,mode='SAME'){
 const step=challengeNextStep(challenge,progress,today);
 if(!step||!['STOPPED','REACHED','ENDED'].includes(step.kind)||!['SAME','LIGHT'].includes(mode)||!Number.isSafeInteger(challenge.id)||challenge.id<1||!Number.isSafeInteger(challenge.habitId)||challenge.habitId<1||!habits.some(h=>h.id===challenge.habitId&&h.active===true)||typeof challenge.name!=='string'||!challenge.name.trim()||challenge.name.length>255||(challenge.description!=null&&typeof challenge.description!=='string')||(challenge.description?.length??0)>255)throw Error('Không thể dùng lại thử thách này. Kiểm tra tiến độ và trạng thái thói quen.');
 const targetDays=mode==='LIGHT'?Math.max(1,Math.ceil(challenge.targetDays/2)):challenge.targetDays;
 const windowDays=challengeWindowDays(challenge);
 challengeWindow(targetDays,windowDays,today);
 return {habitId:String(challenge.habitId),name:challenge.name,description:challenge.description??'',targetDays,windowDays,startDate:today};
}
