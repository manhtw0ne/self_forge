import {useEffect,useLayoutEffect,useState} from 'react';
import {MotionContext} from './MotionContext';
import {readMotion,saveMotion,parseMotion,reducedMotion,motionKey} from '../utils/motionPreference';
export default function MotionProvider({children}){
 const [initial]=useState(()=>{try{return {preference:readMotion(localStorage),error:false};}catch{return {preference:'SYSTEM',error:true};}});
 const [preference,setPreference]=useState(initial.preference),[storageError,setStorageError]=useState(initial.error);
 const [systemReduced,setSystemReduced]=useState(()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}});
 useEffect(()=>{let query;try{query=window.matchMedia('(prefers-reduced-motion: reduce)');}catch{return;}const change=event=>setSystemReduced(event.matches);setSystemReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 useEffect(()=>{const sync=event=>{if(event.key!==motionKey&&event.key!==null)return;try{setPreference(parseMotion(event.key===null?null:event.newValue));setStorageError(false);}catch{setStorageError(true);}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 const reduced=reducedMotion(preference,systemReduced);
 useLayoutEffect(()=>{document.documentElement.setAttribute('data-reduced-motion',String(reduced));},[reduced]);
 const change=value=>{const next=parseMotion(value);setPreference(next);try{saveMotion(localStorage,next);setStorageError(false);}catch{setStorageError(true);}};
 return <MotionContext.Provider value={{preference,change,reduced,systemReduced,storageError}}>{children}</MotionContext.Provider>;
}
