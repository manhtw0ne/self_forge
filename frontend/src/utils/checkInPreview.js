import {companionProgressionVersion,companionStageForXp} from './companionProgression.js';
export function readCheckInPreview(value,id,from,to){
 if(!value||value.companionProgressionVersion!==companionProgressionVersion||value.checkInId!==id||value.fromStatus!==from||value.toStatus!==to||typeof value.allowed!=='boolean'||!['READY','LEGACY','INSUFFICIENT_XP'].includes(value.reason))throw Error('Invalid check-in preview');
 if(value.allowed){if(value.reason!=='READY'||!Number.isSafeInteger(value.accountDelta))throw Error('Invalid account effect');}
 else if(value.reason==='READY'||value.accountDelta!==null)throw Error('Invalid blocked effect');
 if(value.companionDelta!==null){
  if(!value.allowed||!Number.isSafeInteger(value.companionDelta)||![value.companionXpBefore,value.companionXpAfter].every(xp=>Number.isSafeInteger(xp)&&xp>=0)||value.companionXpAfter!==Math.max(0,value.companionXpBefore+value.companionDelta))throw Error('Invalid companion effect');
  if(value.stageBefore!==companionStageForXp(value.companionXpBefore)||value.stageAfter!==companionStageForXp(value.companionXpAfter))throw Error('Invalid stage preview');
 }else if([value.companionXpBefore,value.companionXpAfter,value.stageBefore,value.stageAfter].some(field=>field!==null))throw Error('Incomplete companion preview');
 return {checkInId:id,fromStatus:from,toStatus:to,allowed:value.allowed,reason:value.reason,accountDelta:value.accountDelta,companionDelta:value.companionDelta,companionXpBefore:value.companionXpBefore,companionXpAfter:value.companionXpAfter,stageBefore:value.stageBefore,stageAfter:value.stageAfter,companionProgressionVersion};
}
