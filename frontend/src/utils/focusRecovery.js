export function readFocusSession(value,expectedId=null){
 if(!value||!Number.isSafeInteger(value.id)||value.id<=0||(expectedId!==null&&value.id!==expectedId)||
    !Number.isInteger(value.durationMinutes)||value.durationMinutes<25||value.durationMinutes>120||typeof value.completed!=='boolean'||
    (value.habitId!==null&&(!Number.isSafeInteger(value.habitId)||value.habitId<=0))||typeof value.startedAt!=='string'||!Number.isFinite(Date.parse(value.startedAt)))throw Error('Invalid focus session');
 return {id:value.id,habitId:value.habitId,durationMinutes:value.durationMinutes,startedAt:value.startedAt,completed:value.completed};
}
export function focusRecovery(value,kind,now=Date.now()){
 const session=readFocusSession(value);
 if(!Number.isFinite(now)||!['RESUME','REPEAT'].includes(kind))throw Error('Invalid focus recovery');
 if(kind==='RESUME'&&session.completed||kind==='REPEAT'&&!session.completed)throw Error('Session status changed');
 const duration=session.durationMinutes*60;
 const remaining=kind==='REPEAT'?duration:Math.min(duration,Math.max(0,Math.ceil((Date.parse(session.startedAt)+duration*1000-now)/1000)));
 return {mode:0,focusMinutes:session.durationMinutes,secondsLeft:remaining,running:false,sessionId:kind==='RESUME'?session.id:null,selectedHabit:String(session.habitId??''),deadline:null};
}
export function confirmFocusStart(value,payload){
 const session=readFocusSession(value);
 if(session.habitId!==payload.habitId||session.durationMinutes!==payload.durationMinutes)throw Error('Mismatched focus response');
 return session;
}
