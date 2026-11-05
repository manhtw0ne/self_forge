const difficulties=new Set(['EASY','MEDIUM','HARD']);

function text(value,maximum){
 if(typeof value!=='string'||!value.trim()||value.trim().length>maximum)throw Error('Invalid habit coach text');
 return value.trim();
}

export function readHabitCoachStatus(value){
 if(!value||typeof value.available!=='boolean'||!Number.isInteger(value.limit)||value.limit<0||value.limit>100||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>value.limit)throw Error('Invalid habit coach status');
 return {available:value.available,limit:value.limit,remaining:value.remaining};
}

export function readHabitCoachHabits(value){
 if(!Array.isArray(value))throw Error('Invalid habit coach habits');
 const ids=new Set();
 return value.map(row=>{
  if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.trim().length>255||!difficulties.has(row.difficulty)||!Number.isInteger(row.targetPerWeek)||row.targetPerWeek<1||row.targetPerWeek>7||row.active!==true)throw Error('Invalid habit coach habit');
  ids.add(row.id);return {id:row.id,name:row.name.trim(),difficulty:row.difficulty,targetPerWeek:row.targetPerWeek};
 });
}

export function habitCoachPayload({question,habitId,consent,language}){
 const clean=text(question,600);
 if(clean.length<5||consent!==true||!['vi','en'].includes(language)||(habitId!==null&&(!Number.isSafeInteger(habitId)||habitId<1)))throw Error('Invalid habit coach request');
 return {question:clean,habitId,consent:true,language};
}

export function readHabitCoachReply(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid habit coach reply');
 return {answer:text(value.answer,800),experiment:text(value.experiment,280)};
}
