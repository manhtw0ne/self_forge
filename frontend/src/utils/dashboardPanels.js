export const dashboardPanelLabels={challenges:'Thử thách hôm nay',goals:'Mục tiêu cần xem hôm nay',week:'Kế hoạch tuần',companion:'Bạn đồng hành',focus:'Kế hoạch tập trung',restart:'Kế hoạch bắt đầu lại',insights:'Tổng kết tuần',dailyReview:'Nhìn lại cuối ngày'};
// The core dashboard is already present above these optional panels (habits,
// reminders, mood and the held focus session). New accounts therefore start
// with a small planning-oriented set instead of an overwhelming full feed.
// People can still deliberately reveal every panel from the dashboard.
const defaultVisiblePanelIds=new Set(['goals','week','focus']);
const key=owner=>{if(!Number.isSafeInteger(owner)||owner<1)throw Error('Invalid dashboard owner');return 'sf_dashboard_panels:'+owner;};
export function dashboardPanelDefaults(visible){
 const showAll=visible===true,hideAll=visible===false;
 return Object.fromEntries(Object.keys(dashboardPanelLabels).map(id=>[id,showAll ? true : hideAll ? false : defaultVisiblePanelIds.has(id)]));
}
function clean(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid dashboard preferences');const result={};for(const id of Object.keys(dashboardPanelLabels)){if(value[id]!==undefined&&typeof value[id]!=='boolean')throw Error('Invalid dashboard panel');result[id]=value[id]??true;}return result;}
export function readDashboardPanels(storage,owner){const raw=storage.getItem(key(owner));if(raw===null)return dashboardPanelDefaults();const value=JSON.parse(raw);if(![1,2].includes(value.version))throw Error('Invalid dashboard preference version');return clean(value.panels);}
export function writeDashboardPanels(storage,owner,panels){storage.setItem(key(owner),JSON.stringify({version:1,panels:clean(panels)}));}
export function dashboardPanelFromHash(hash){return {'#multi-focus-plan':'focus','#weekly-insights':'insights','#current-week-plan':'week','#dashboard-challenges':'challenges','#dashboard-goals':'goals','#dashboard-companion':'companion','#dashboard-focus':'focus','#dashboard-restart':'restart','#dashboard-dailyReview':'dailyReview'}[hash]??null;}
export function dashboardPanelOrder(value=Object.keys(dashboardPanelLabels)){
 if(!Array.isArray(value)||new Set(value).size!==value.length||value.some(id=>!Object.hasOwn(dashboardPanelLabels,id)))throw Error('Invalid dashboard order');return [...value,...Object.keys(dashboardPanelLabels).filter(id=>!value.includes(id))];
}
export function readDashboardLayout(storage,owner){
 const raw=storage.getItem(key(owner));if(raw===null)return {panels:dashboardPanelDefaults(),order:dashboardPanelOrder()};const value=JSON.parse(raw);if(![1,2].includes(value.version))throw Error('Invalid dashboard layout');return {panels:clean(value.panels),order:dashboardPanelOrder(value.version===1?undefined:value.order)};
}
export function writeDashboardLayout(storage,owner,layout){storage.setItem(key(owner),JSON.stringify({version:2,panels:clean(layout.panels),order:dashboardPanelOrder(layout.order)}));}
export function moveDashboardPanel(order,id,direction){if(![-1,1].includes(direction))throw Error('Invalid move');const next=dashboardPanelOrder(order),index=next.indexOf(id),to=index+direction;if(index<0||to<0||to>=next.length)return next;[next[index],next[to]]=[next[to],next[index]];return next;}
export function dashboardLayoutPreset(preset){
 if(preset==='ALL')return {panels:dashboardPanelDefaults(true),order:dashboardPanelOrder()};
 const selected={FOCUS:['focus','week','goals'],HABITS:['challenges','companion','insights','restart']}[preset];if(!selected)throw Error('Invalid layout preset');return {panels:Object.fromEntries(Object.keys(dashboardPanelLabels).map(id=>[id,selected.includes(id)])),order:dashboardPanelOrder(selected)};
}
