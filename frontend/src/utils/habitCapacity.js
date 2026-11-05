export function readHabitCapacity(value){
 const max=value?.limits?.maxHabits,current=value?.limits?.currentHabits;
 if(typeof value?.isPremium!=='boolean'||!Number.isSafeInteger(max)||max< -1||!Number.isSafeInteger(current)||current<0||(max===-1&&!value.isPremium))throw Error('Invalid habit capacity');
 return {current,max:max===-1?null:max,remaining:max===-1?null:Math.max(0,max-current),unlimited:max===-1};
}
export function fitsHabitCapacity(capacity,count){if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid selection count');return !capacity||capacity.unlimited||count<=capacity.remaining;}
export function fitHabitTemplate(rows,capacity){
 if(!Array.isArray(rows)||!capacity||!Number.isSafeInteger(capacity.current)||capacity.current<0||(!capacity.unlimited&&(!Number.isSafeInteger(capacity.remaining)||capacity.remaining<0)))throw Error('Unknown habit capacity');
 let remaining=capacity.unlimited?rows.length:capacity.remaining;return rows.map(row=>{const selected=row.selected===true&&remaining>0;if(selected)remaining--;return {...row,selected};});
}
