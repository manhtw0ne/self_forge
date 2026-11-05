const key=(owner,goal)=>{if(![owner,goal].every(value=>Number.isSafeInteger(value)&&value>0))throw Error('Invalid goal plan owner');return 'sf_goal_plan_preferences:'+owner+':'+goal;};
export function goalPlanPreference(value){
 if(!value||!Array.isArray(value.days)||!value.days.length||value.days.length>7||new Set(value.days).size!==value.days.length||value.days.some(day=>!Number.isInteger(day)||day<0||day>6)||typeof value.unit!=='string'||value.unit.length>255||typeof value.capacity!=='string')throw Error('Invalid goal plan preferences');
 const capacity=value.capacity.trim();if(capacity&&(!Number.isSafeInteger(Number(capacity))||Number(capacity)<1||Number(capacity)>2147483647))throw Error('Invalid goal capacity');
 return {days:[...value.days].sort((a,b)=>a-b),capacity:capacity?String(Number(capacity)):'',unit:value.unit};
}
export function readGoalPlanPreference(storage,owner,goal){const raw=storage.getItem(key(owner,goal));if(raw===null)return null;const value=JSON.parse(raw);if(value.version!==1)throw Error('Invalid goal plan preference version');return goalPlanPreference(value);}
export function writeGoalPlanPreference(storage,owner,goal,value){storage.setItem(key(owner,goal),JSON.stringify({version:1,...goalPlanPreference(value)}));}
export function removeGoalPlanPreference(storage,owner,goal){storage.removeItem(key(owner,goal));}
