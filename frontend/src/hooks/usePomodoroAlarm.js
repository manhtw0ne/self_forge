import {useState,useRef,useCallback} from 'react';
import {readAlarm,writeAlarm,alarmSettings,playPomodoroAlarm} from '../utils/pomodoroAlarm';
export function usePomodoroAlarm(owner){
 const [initial]=useState(()=>{try{return {value:readAlarm(localStorage,owner),error:false};}catch{return {value:{enabled:false,volume:60,tone:'CLASSIC'},error:true};}});
 const [settings,setSettings]=useState(initial.value),[storageError,setStorageError]=useState(initial.error);const current=useRef(initial.value);
 const change=value=>{const next=alarmSettings(value);current.current=next;setSettings(next);try{writeAlarm(localStorage,owner,next);setStorageError(false);}catch{setStorageError(true);}};
 const play=useCallback(()=>playPomodoroAlarm(current.current,window.AudioContext||window.webkitAudioContext),[]);
 return {settings,change,play,storageError};
}
