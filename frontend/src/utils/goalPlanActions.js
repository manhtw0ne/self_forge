import {goalPlan,goalCapacity} from './goalPlan.js';
export function plannedGoalProgress(goal,today,weekdays,capacity=null){
 const plan=goalPlan(goal,today,weekdays);if(plan.state!=='ready')return null;
 const row=plan.preview.find(value=>value.date===today&&value.amount>0);if(!row)return null;
 if(capacity===null)return row.amount;const pace=goalCapacity(goal,today,weekdays,capacity);if(pace.state!=='ready')return null;return Math.min(row.amount,pace.capacity);
}
export function plannedGoalDeadline(goal,today,weekdays,capacity){
 const pace=goalCapacity(goal,today,weekdays,capacity);if(pace.state!=='ready'||!pace.recommendedDeadline)throw Error('No feasible proposed deadline');return pace.recommendedDeadline;
}
export function progressPrefill(pending,suggested=1){
 if(pending)return pending.amount;if(!Number.isSafeInteger(suggested)||suggested<1||suggested>2147483647)throw Error('Invalid progress prefill');return suggested;
}
