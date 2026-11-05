import { useState,useEffect } from 'react';
import api from '../api/client';
import { observeProgress } from '../utils/progressSync';
import { readHabitGoalLinks } from '../utils/habitGoalLinks';
export function useHabitGoalLinks(owner){
 const [state,setState]=useState({links:new Map(),loading:true,error:false});const [attempt,setAttempt]=useState(0);
 useEffect(()=>observeProgress({target:window,document,
  load:async()=>readHabitGoalLinks((await api.get('/habits/goal-links')).data),
  publish:links=>setState({links,loading:false,error:false}),
  fail:()=>setState({links:new Map(),loading:false,error:true}),
 }),[owner,attempt]);
 return {...state,retry:()=>setAttempt(value=>value+1)};
}
