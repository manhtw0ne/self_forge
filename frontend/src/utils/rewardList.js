const text=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
export function selectRewards(rows,{query='',status='ALL',sort='NEWEST',xp=0}={}){
 const words=text(query).trim().split(/\s+/).filter(Boolean);
 const result=rows.filter(row=>(status==='ALL'||status==='CLAIMED'&&row.claimed||status==='UNCLAIMED'&&!row.claimed||status==='AFFORDABLE'&&!row.claimed&&Number.isSafeInteger(xp)&&xp>=row.xpCost)&&words.every(word=>text([row.name,row.description].join(' ')).includes(word)));
 if(sort==='CHEAPEST'||sort==='EXPENSIVE')result.sort((a,b)=>(sort==='CHEAPEST'?a.xpCost-b.xpCost:b.xpCost-a.xpCost)||b.id-a.id);
 if(sort==='NAME')result.sort((a,b)=>text(a.name).localeCompare(text(b.name))||b.id-a.id);
 return result;
}
export function rewardListPage(rows,page,size=12){
 if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(size)||size<1||size>100)throw Error('Invalid reward page');
 const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.min(page,pages);
 return {items:rows.slice((current-1)*size,current*size),page:current,pages,total:rows.length};
}

export function repeatRewardForm(reward){
 if(!reward||!Number.isSafeInteger(reward.id)||reward.id<1||reward.claimed!==true||typeof reward.name!=='string'||!reward.name.trim()||reward.name.length>255||(reward.description!=null&&typeof reward.description!=='string')||(reward.description?.length??0)>255||!Number.isSafeInteger(reward.xpCost)||reward.xpCost<1||reward.xpCost>1000000)throw Error('Invalid claimed reward');
 return {name:reward.name,description:reward.description??'',xpCost:reward.xpCost};
}
