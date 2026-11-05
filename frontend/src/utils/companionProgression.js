// This mirrors the versioned progression contract emitted by the API.
// A backend rule change must increment the version before the client accepts it.
export const companionProgressionVersion=1;
export const companionStages=Object.freeze([
 Object.freeze({stage:1,threshold:0}),
 Object.freeze({stage:2,threshold:100}),
 Object.freeze({stage:3,threshold:500}),
]);
export const companionStageCount=companionStages.length;

function stageIndex(stage){
 const index=companionStages.findIndex(value=>value.stage===stage);
 if(index<0)throw Error('Invalid companion stage');
 return index;
}
export function isCompanionStage(stage){return Number.isInteger(stage)&&companionStages.some(value=>value.stage===stage);}
export function isCompanionMilestoneStage(stage){return isCompanionStage(stage)&&stage!==companionStages[0].stage;}
export function companionStageThreshold(stage){return companionStages[stageIndex(stage)].threshold;}
export function companionNextThreshold(stage){return companionStages[stageIndex(stage)+1]?.threshold??null;}
export function companionStageForXp(xp){
 if(!Number.isSafeInteger(xp)||xp<0)throw Error('Invalid companion XP');
 return companionStages.reduce((current,value)=>xp>=value.threshold?value.stage:current,companionStages[0].stage);
}
export function companionProgressForXp(xp){
 const stage=companionStageForXp(xp),next=companionNextThreshold(stage);
 if(next===null)return 100;
 const floor=companionStageThreshold(stage);
 return Math.min(100,Math.max(0,Math.round((xp-floor)/(next-floor)*100)));
}
export function companionEvolutionThresholds(){return companionStages.slice(1).map(value=>value.threshold);}
