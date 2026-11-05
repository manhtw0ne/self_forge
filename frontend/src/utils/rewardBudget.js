export function rewardBudget(rewards,selected,xp){
 if(!Array.isArray(rewards)||!Array.isArray(selected)||selected.length>20||new Set(selected).size!==selected.length||selected.some(id=>!Number.isSafeInteger(id)||id<1)||!Number.isSafeInteger(xp)||xp<0)throw Error('Invalid reward budget');
 const ids=new Set();for(const row of rewards){if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||typeof row.name!=='string'||typeof row.claimed!=='boolean'||!Number.isSafeInteger(row.xpCost)||row.xpCost<1||row.xpCost>1000000)throw Error('Invalid reward');ids.add(row.id);}
 let total=0;const rows=[],unavailable=[];
 for(const id of selected){const reward=rewards.find(row=>row.id===id);if(!reward||reward.claimed){unavailable.push(id);continue;}total+=reward.xpCost;rows.push({id,name:reward.name,cost:reward.xpCost,cumulative:total,remaining:Math.max(0,xp-total),shortfall:Math.max(0,total-xp)});}
 return {rows,unavailable,total,remaining:Math.max(0,xp-total),shortfall:Math.max(0,total-xp),fits:unavailable.length===0&&total<=xp};
}
export function moveRewardPriority(ids,id,direction){
 if(![-1,1].includes(direction)||!Array.isArray(ids))throw Error('Invalid priority');const next=[...ids],index=next.indexOf(id),destination=index+direction;if(index<0||destination<0||destination>=next.length)return next;[next[index],next[destination]]=[next[destination],next[index]];return next;
}
