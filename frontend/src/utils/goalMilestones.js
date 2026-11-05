export function goalMilestones(goal){
 if(!goal||!Number.isSafeInteger(goal.targetValue)||goal.targetValue<1||goal.targetValue>2147483647||!Number.isSafeInteger(goal.currentValue)||goal.currentValue<0||!['ACTIVE','COMPLETED','ABANDONED'].includes(goal.status))throw Error('Invalid goal');
 const values=new Map();
 for(const percent of [25,50,75,100]){const value=Math.ceil(goal.targetValue*percent/100);values.set(value,percent);}
 const milestones=[...values].map(([value,percent])=>({value,percent,reached:goal.currentValue>=value,remaining:Math.max(0,value-goal.currentValue)}));
 return {milestones,next:goal.status==='ACTIVE'?milestones.find(row=>!row.reached)??null:null};
}
