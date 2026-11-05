export function habitPath(page,id){
 if(!['/','/habits','/stats'].includes(page)||!Number.isSafeInteger(id)||id<=0)throw Error('Invalid habit link');return page+'?habit='+id;
}
export function readHabitTarget(search){
 const params=new URLSearchParams(search);const values=params.getAll('habit');if(!values.length)return null;
 const id=values.length===1&&/^[1-9]\d*$/.test(values[0])?Number(values[0]):null;
 return {id:Number.isSafeInteger(id)&&id>0?id:null};
}
export function targetedHabits(active,inactive,target){
 if(!target)return null;return target.id===null?[]:[...active,...inactive].filter(row=>row.id===target.id);
}
