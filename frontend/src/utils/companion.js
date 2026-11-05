import {companionNextThreshold,companionProgressForXp,companionProgressionVersion,companionStageForXp,isCompanionMilestoneStage} from './companionProgression.js';
export {companionProgressionVersion};
export const companionSpecies={CHON:'Chồn',CHIM:'Chim',KY_GIONG:'Kỳ giông'};
export function companionPayload(form,version){
 if(!form||!Object.hasOwn(companionSpecies,form.species)||typeof form.name!=='string'||form.name.length>40||typeof form.visible!=='boolean'||!Number.isSafeInteger(version)||version<0)throw Error('Invalid companion choice');
 return {species:form.species,name:form.name.trim(),visible:form.visible,expectedVersion:version};
}
export function readCompanion(value){
 if(!value||value.progressionVersion!==companionProgressionVersion||typeof value.available!=='boolean'||!Number.isSafeInteger(value.version)||value.version<0||!Number.isSafeInteger(value.xp)||value.xp<0||
    !Number.isSafeInteger(value.countedCheckIns)||value.countedCheckIns<0||value.countedCheckIns>value.xp||!Number.isSafeInteger(value.legacyExcluded)||value.legacyExcluded<0)throw Error('Invalid companion progress');
 const choice=companionPayload(value,value.version);const stage=companionStageForXp(value.xp),next=companionNextThreshold(stage);
 if(value.stage!==stage||value.nextThreshold!==next)throw Error('Invalid companion milestone');
 // The API omits nulls, so an absent field is the same as no pending milestone.
 const pending=Object.hasOwn(value,'pendingMilestone')?value.pendingMilestone:null;
 if(!(pending===null||isCompanionMilestoneStage(pending))||pending!==null&&(!value.available||!choice.visible||pending>stage))throw Error('Invalid companion pending milestone');
 return {available:value.available,species:choice.species,name:choice.name,visible:choice.visible,version:value.version,xp:value.xp,stage,nextThreshold:next,countedCheckIns:value.countedCheckIns,legacyExcluded:value.legacyExcluded,pendingMilestone:pending,progressionVersion:companionProgressionVersion};
}
export function companionProgress(value){return companionProgressForXp(readCompanion(value).xp);}
