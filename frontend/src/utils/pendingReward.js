import {rewardPayload} from './rewardForm.js';
const key = owner => {
  if(!Number.isSafeInteger(owner)||owner<1)throw Error('Invalid reward owner');
  return 'sf_reward_create:'+owner;
};
function validate(value){
  if(!value||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId))throw Error('Invalid pending reward');
  if(typeof value.name!=='string'||typeof value.description!=='string'||!Number.isInteger(value.xpCost))throw Error('Invalid pending reward');
  return {...rewardPayload(value),requestId:value.requestId};
}
export function readPendingReward(storage,owner){const raw=storage.getItem(key(owner));return raw===null?null:validate(JSON.parse(raw));}
export function clearPendingReward(storage,owner){storage.removeItem(key(owner));}
export async function createRewardSafely(storage,owner,form,post,makeId=()=>crypto.randomUUID()){
  const payload=readPendingReward(storage,owner)??validate({...rewardPayload(form),requestId:makeId()});
  storage.setItem(key(owner),JSON.stringify(payload));
  let response;
  try{response=await post(payload);}catch(error){
    if([400,422].includes(error.response?.status)){try{clearPendingReward(storage,owner);}catch{/* Retain original error. */}}
    throw error;
  }
  try{clearPendingReward(storage,owner);return {response,pending:null};}
  catch{return {response,pending:payload};}
}
