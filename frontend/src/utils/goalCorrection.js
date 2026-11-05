import {goalSnapshot} from './goalForm.js';
export function goalCorrectionPayload(goal,amount){
 const currentValue=Number(amount);if(amount==null||String(amount).trim()===''||!Number.isSafeInteger(currentValue)||currentValue<0||!goal||!Number.isSafeInteger(goal.id)||goal.id<=0||!Number.isSafeInteger(goal.targetValue)||goal.targetValue<1||currentValue>goal.targetValue||!['ACTIVE','COMPLETED'].includes(goal.status))throw Error('Invalid goal correction');
 return {currentValue,expected:goalSnapshot(goal)};
}
export function goalCorrectionStatus(goal,amount){const body=goalCorrectionPayload(goal,amount);return body.currentValue===goal.targetValue?'COMPLETED':'ACTIVE';}
