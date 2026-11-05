export function breakDurations(value={}){
 const shortMinutes=value.shortMinutes??5,longMinutes=value.longMinutes??15;
 if(!Number.isInteger(shortMinutes)||shortMinutes<1||shortMinutes>30||!Number.isInteger(longMinutes)||longMinutes<5||longMinutes>60)throw Error('Invalid break durations');
 return {shortMinutes,longMinutes};
}
export function changeBreakDuration(mode,minutes,current){
 if(![1,2].includes(mode))throw Error('Invalid break mode');
 const next=breakDurations({...current,[mode===1?'shortMinutes':'longMinutes']:minutes});
 return {...next,secondsLeft:minutes*60,deadline:null,running:false};
}
