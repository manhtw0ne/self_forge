function validGoal(goal){
 return goal&&Number.isSafeInteger(goal.id)&&goal.id>0&&typeof goal.name==='string'&&goal.name.trim()&&goal.name.length<=255&&
  Number.isInteger(goal.targetValue)&&goal.targetValue>0&&Number.isInteger(goal.currentValue)&&goal.currentValue>=0&&goal.currentValue<=goal.targetValue&&
  (goal.description==null||typeof goal.description==='string')&&(goal.unit==null||typeof goal.unit==='string')&&
  (goal.deadline==null||typeof goal.deadline==='string');
}
function text(value,maximum){
 if(typeof value!=='string'||!value.trim()||value.trim().length>maximum)throw Error('Invalid goal coach text');
 return value.trim();
}
function list(value,min,max){return Array.isArray(value)&&value.length>=min&&value.length<=max;}

export function readGoalCoachStatus(value){
 if(!value||typeof value.available!=='boolean'||!Number.isInteger(value.limit)||value.limit<0||value.limit>100||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>value.limit)throw Error('Invalid goal coach status');
 return {available:value.available,limit:value.limit,remaining:value.remaining};
}

export function goalCoachPayload(goal,consent,language){
 if(!validGoal(goal)||consent!==true||!['vi','en'].includes(language))throw Error('Invalid goal coach request');
 return {consent:true,language};
}

export function readGoalCoachPlan(value){
 if(!value||!list(value.steps,1,3)||!list(value.habits,1,3))throw Error('Invalid goal coach plan');
 return {headline:text(value.headline,280),steps:value.steps.map(item=>text(item,280)),habits:value.habits.map(row=>{
  if(!row||!['EASY','MEDIUM','HARD'].includes(row.difficulty)||!Number.isInteger(row.targetPerWeek)||row.targetPerWeek<1||row.targetPerWeek>7)throw Error('Invalid suggested habit');
  return {name:text(row.name,255),description:text(row.description,255),difficulty:row.difficulty,targetPerWeek:row.targetPerWeek};
 })};
}
