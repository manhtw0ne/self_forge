import {rewardPayload} from './rewardForm.js';
export function rewardEditPayload(form,source){
 if(!source||!Number.isSafeInteger(source.id)||source.id<1||source.claimed!==false||typeof source.name!=='string'||!source.name.trim()||(source.description!=null&&typeof source.description!=='string')||!Number.isInteger(source.xpCost)||source.xpCost<1||source.xpCost>1000000)throw Error('Invalid reward source');
 return {...rewardPayload(form),expected:{name:source.name,description:source.description||'',xpCost:source.xpCost}};
}
