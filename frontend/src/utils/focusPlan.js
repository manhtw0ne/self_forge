export function focusPlan(budget,energy){
 const minutes=Number(budget);
 if(budget==null||budget===''||!Number.isInteger(minutes)||minutes<5||minutes>240||!['LOW','MEDIUM','HIGH'].includes(energy))throw Error('Invalid focus plan');
 if(minutes<25)return {focusMinutes:null,smallStepMinutes:Math.min(minutes,5),remaining:minutes-Math.min(minutes,5)};
 const focusMinutes=Math.min(minutes,{LOW:25,MEDIUM:45,HIGH:60}[energy]);
 return {focusMinutes,smallStepMinutes:null,remaining:minutes-focusMinutes};
}
export function focusLink(minutes,habitId=null){
 if(!Number.isInteger(minutes)||minutes<25||minutes>120||(habitId!==null&&(!Number.isSafeInteger(habitId)||habitId<=0)))throw Error('Invalid focus link');
 const query=new URLSearchParams({focus:String(minutes)});if(habitId!==null)query.set('habit',String(habitId));return '/pomodoro?'+query;
}
export function readFocusLink(search){
 const query=new URLSearchParams(search);if(query.getAll('focus').length!==1||query.getAll('habit').length>1)return null;
 const raw=query.get('focus'),habit=query.get('habit');if(!/^\d+$/.test(raw)||habit!==null&&!/^\d+$/.test(habit))return null;
 const minutes=Number(raw),habitId=habit===null?null:Number(habit);try{focusLink(minutes,habitId);return {minutes,habitId};}catch{return null;}
}

// Dashboard's scheduledToday is the server-authoritative result of the
// account timezone, a habit's weekday schedule, and pause history.  Focus
// suggestions must not turn a scheduled rest day into a to-do item.
export function focusHabits(rows){return rows.filter(h=>Number.isSafeInteger(h.habitId)&&h.habitId>0&&typeof h.name==='string'&&h.scheduledToday===true&&h.todayStatus!=='COMPLETED').map(h=>({id:h.habitId,name:h.name}));}
