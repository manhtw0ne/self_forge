export const defaultAlarm={enabled:true,volume:60,tone:'CLASSIC'};
const key=owner=>{if(!Number.isSafeInteger(owner)||owner<1)throw Error('Invalid alarm owner');return 'sf_pomodoro_alarm:'+owner;};
export function alarmSettings(value){if(!value||typeof value.enabled!=='boolean'||!Number.isInteger(value.volume)||value.volume<0||value.volume>100||!['CLASSIC','SOFT'].includes(value.tone))throw Error('Invalid alarm settings');return {enabled:value.enabled,volume:value.volume,tone:value.tone};}
export function readAlarm(storage,owner){const raw=storage.getItem(key(owner));return raw===null?{...defaultAlarm}:alarmSettings(JSON.parse(raw));}
export function writeAlarm(storage,owner,value){storage.setItem(key(owner),JSON.stringify(alarmSettings(value)));}
export async function playPomodoroAlarm(settings,AudioContext){
 const value=alarmSettings(settings);if(!value.enabled||!value.volume||!AudioContext)return false;let context;
 try{context=new AudioContext();if(context.state==='suspended')await context.resume();const frequencies=value.tone==='SOFT'?[440,523,659]:[880,880,1100];frequencies.forEach((frequency,index)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=value.volume/200;oscillator.connect(gain);gain.connect(context.destination);if(index===frequencies.length-1)oscillator.onended=()=>{void context.close().catch(()=>{});};const start=context.currentTime+index*0.25;oscillator.start(start);oscillator.stop(start+0.15);});return true;}catch{if(context)try{await context.close();}catch{/* Unsupported audio must not interrupt a session. */}return false;}
}
