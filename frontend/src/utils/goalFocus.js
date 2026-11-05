export function goalFocusHabits(links,owned,created=null){
 if(!Array.isArray(links)||!Array.isArray(owned))throw Error('Invalid goal habits');
 const valid=row=>row&&Number.isSafeInteger(row.id)&&row.id>0&&typeof row.name==='string'&&typeof row.active==='boolean';
 if(!links.every(valid)||!owned.every(valid)||(created&&!valid(created)))throw Error('Invalid goal habit');
 const active=new Map(owned.filter(row=>row.active).map(row=>[row.id,row]));
 // A successful server creation/link response can add the newly selected habit.
 if(created?.active)active.set(created.id,created);
 const ids=new Set([...links.map(row=>row.id),...(created?[created.id]:[])]);
 return [...ids].filter(id=>active.has(id)).map(id=>({id,name:active.get(id).name}));
}
