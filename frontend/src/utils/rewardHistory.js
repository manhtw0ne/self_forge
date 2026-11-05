import {todayInTimezone,profileTimezone} from './dates.js';
import {encodeCsv} from './csv.js';
export function rewardHistory(rewards,timezone,month='ALL'){
 if(!Array.isArray(rewards)||!['ALL','UNKNOWN'].includes(month)&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid reward history');const zone=profileTimezone(timezone),ids=new Set();let total=0;
 const all=rewards.filter(row=>row.claimed===true).map(row=>{if(!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>255||typeof row.description!=='string'&&row.description!=null||!Number.isSafeInteger(row.xpCost)||row.xpCost<1||row.xpCost>1000000)throw Error('Invalid claimed reward');ids.add(row.id);if(row.claimedAt!=null&&typeof row.claimedAt!=='string')throw Error('Invalid claim time');const instant=row.claimedAt==null?null:new Date(row.claimedAt);if(instant&&!Number.isFinite(instant.getTime()))throw Error('Invalid claim time');return {id:row.id,name:row.name,description:row.description??'',xpCost:row.xpCost,claimedAt:instant?.toISOString()??null,date:instant?todayInTimezone(zone,instant):null};});
 const months=[...new Set(all.filter(row=>row.date).map(row=>row.date.slice(0,7)))].sort().reverse();const rows=all.filter(row=>month==='ALL'||month==='UNKNOWN'&&!row.date||row.date?.slice(0,7)===month).sort((a,b)=>(b.claimedAt??'').localeCompare(a.claimedAt??'')||b.id-a.id);for(const row of rows){total+=row.xpCost;if(!Number.isSafeInteger(total))throw Error('XP total out of range');}
 return {rows,total,months,hasUnknown:all.some(row=>!row.date),timezone:zone,month};
}
export function rewardHistoryExport(history,en=false){return {filename:'selfforge-reward-history-'+history.month.toLowerCase()+'.csv',content:encodeCsv([
 [en?'Scope':'Phạm vi',en?'Claimed rewards still present in the current account list; deleted rewards are excluded.':'Phần thưởng đã nhận hiện còn trong danh sách tài khoản; không gồm phần thưởng đã xóa.',history.month,history.timezone],
 en?['Reward','Description','XP cost','Claimed at (UTC)','Account date']:['Phần thưởng','Mô tả','XP đã dùng','Thời điểm nhận (UTC)','Ngày theo tài khoản'],
 ...history.rows.map(row=>[row.name,row.description,row.xpCost,row.claimedAt??'',row.date??''])])};}
