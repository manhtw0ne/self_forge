const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLocaleLowerCase('en').trim();
export const quickPages=[['/','Dashboard','Dashboard'],['/habits','Thói quen','Habits'],['/check-in-history','Lịch sử check-in','Check-in history'],['/journal','Nhật ký','Journal'],['/stats','Thống kê','Statistics'],['/challenges','Thử thách','Challenges'],['/rewards','Thành tựu và phần thưởng','Achievements and rewards'],['/pomodoro','Tập trung Pomodoro','Pomodoro focus'],['/review','Tổng kết tuần','Weekly review'],['/goals','Mục tiêu','Goals'],['/reminders','Nhắc nhở','Reminders'],['/companion','Bạn đồng hành','Companion'],['/coach','AI Coach thói quen','AI Habit Coach'],['/profile','Cá nhân và cài đặt','Profile and settings'],['/help','Trợ giúp','Help']];
export function quickSearchSource(value,kind){
 if(!['active','inactive','goals','challenges','rewards'].includes(kind)||!Array.isArray(value))throw Error('Invalid search source');const ids=new Set();
 return value.map(row=>{const habit=kind==='active'||kind==='inactive';if(!row||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>255||(kind==='goals'||kind==='challenges')&&!['ACTIVE','COMPLETED','ABANDONED'].includes(row.status)||habit&&row.active!==(kind==='active')||kind==='rewards'&&typeof row.claimed!=='boolean')throw Error('Invalid search row');ids.add(row.id);
 const description=typeof row.description==='string'?row.description:'',tags=habit&&typeof row.tags==='string'?row.tags:'',related=kind==='challenges'&&typeof row.habitName==='string'?row.habitName:'';
 const path=habit?'/habits?habit='+row.id:kind==='goals'?'/goals?goal='+row.id:kind==='challenges'?'/challenges?challenge='+row.id:'/rewards?reward='+row.id;
 return {key:kind+':'+row.id,name:row.name,kind,status:habit?null:kind==='rewards'?(row.claimed?'CLAIMED':'UNCLAIMED'):row.status,path,searchText:normalize(row.name+' '+description+' '+tags+' '+related)};});
}
export function quickSearchResults(sources,query,en=false,type='ALL'){
 if(!['ALL','PAGES','HABITS','GOALS','CHALLENGES','REWARDS'].includes(type))throw Error('Invalid search type');
 if(typeof query!=='string'||query.length>100)throw Error('Invalid search query');const words=normalize(query).split(/\s+/).filter(Boolean);const matches=text=>words.every(word=>text.includes(word));
 const pages=quickPages.filter(row=>matches(normalize(row[1]+' '+row[2]))).map(row=>({key:'page:'+row[0],name:row[en?2:1],path:row[0],kind:'page'}));
 const items=Object.values(sources).flat().filter(row=>words.length&&matches(row.searchText)).map(({searchText:_searchText,...row})=>row);
  const types={HABITS:['active','inactive'],GOALS:['goals'],CHALLENGES:['challenges'],REWARDS:['rewards']};
 const filtered=type==='PAGES'?[]:type==='ALL'?items:Object.values(sources).flat().filter(row=>types[type].includes(row.kind)&&matches(row.searchText)).map(({searchText:_searchText,...row})=>row);
 const rank=row=>{const name=normalize(row.name),needle=normalize(query);return needle&&name===needle?0:needle&&name.startsWith(needle)?1:2;};
 return {pages:type==='ALL'||type==='PAGES'?pages:[],items:filtered.sort((a,b)=>rank(a)-rank(b)||normalize(a.name).localeCompare(normalize(b.name))||a.key.localeCompare(b.key))};
}

export function quickSearchNextIndex(current,key,count){if(!Number.isInteger(count)||count<1)return null;if(!Number.isInteger(current)||current<0||current>=count)current=-1;if(key==='Home')return 0;if(key==='End')return count-1;if(key==='ArrowDown')return current<0?0:Math.min(count-1,current+1);if(key==='ArrowUp')return current<0?count-1:Math.max(0,current-1);return null;}
