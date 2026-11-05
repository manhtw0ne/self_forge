import {useEffect} from 'react';import {usePremium} from '../context/usePremium';import {readHabitCapacity} from '../utils/habitCapacity';
export function useHabitCapacity(enabled,refreshKey){
 const {isPremium,limits,loading,error,refreshPremium}=usePremium();
 useEffect(()=>{if(enabled)void refreshPremium();},[enabled,refreshKey,refreshPremium]);
 let capacity=null,invalid=false;
 try{if(limits)capacity=readHabitCapacity({isPremium,limits});}catch{invalid=true;}
 return {capacity,loading:enabled&&loading,error:enabled&&(error||invalid),reload:refreshPremium};
}
