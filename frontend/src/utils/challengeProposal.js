const integer=value=>/^[1-9]\d*$/.test(String(value))&&Number.isSafeInteger(Number(value));
export function challengeLink(habitId,targetDays=3,windowDays=7){
 if(!integer(habitId)||!integer(targetDays)||!integer(windowDays)||Number(targetDays)>Number(windowDays)||Number(windowDays)>365)throw Error('Invalid challenge proposal');
 return '/challenges?'+new URLSearchParams({habit:String(habitId),target:String(targetDays),window:String(windowDays)});
}
export function readChallengeProposal(search){
 const params=new URLSearchParams(search);const keys=['habit','target','window'];
 if(!keys.some(key=>params.has(key)))return null;
 const habit=params.get('habit'),target=params.get('target')??'3',window=params.get('window')??'7';
 try{if(keys.some(key=>params.getAll(key).length>1))throw Error();challengeLink(habit,target,window);return {habitId:Number(habit),targetDays:Number(target),windowDays:Number(window)};}catch{return {invalid:true};}
}
export function challengeProposalDraft(proposal,habits){
 if(!proposal||proposal.invalid)return null;
 const habit=habits.find(row=>row.id===proposal.habitId&&row.active===true);
 if(!habit||typeof habit.name!=='string'||!habit.name.trim())return null;
 return {habitId:String(habit.id),name:habit.name.trim().slice(0,255),description:'',targetDays:proposal.targetDays,windowDays:proposal.windowDays};
}
