import {readCheckInRange} from './checkInRange.js';
import {encodeCsv} from './csv.js';
export function readCheckInExport(value,scope,today,timezone){
 if(!Array.isArray(value?.items)||value.items.length>10000||value.nextCursor!==null)throw Error('Invalid complete check-in export');let before=null;const items=[],ids=new Set();
 for(let offset=0;offset<Math.max(1,value.items.length);offset+=20){const page=readCheckInRange({...value,items:value.items.slice(offset,offset+20),nextCursor:null},scope,today,timezone,before);for(const row of page.items){if(ids.has(row.id))throw Error('Duplicate check-in');ids.add(row.id);items.push(row);}const last=items.at(-1);before=last?{date:last.date,id:last.id}:null;}
 return {scope:{...scope},timezone:value.timezone,items};
}
export function checkInRangeExport(snapshot,includeNotes=false,en=false){
 if(typeof includeNotes!=='boolean'||!snapshot?.items?.length)throw Error('No check-ins to export');const label=status=>(en?{COMPLETED:'Completed',FAILED:'Failed',SKIPPED:'Skipped',ALL:'All'}:{COMPLETED:'Hoàn thành',FAILED:'Thất bại',SKIPPED:'Bỏ qua',ALL:'Tất cả'})[status];
 return {filename:'selfforge-checkins-'+snapshot.scope.fromDate+'-'+snapshot.scope.toDate+'.csv',content:encodeCsv([
 [en?'Scope':'Phạm vi',en?'All matching saved check-ins, not only the displayed page':'Toàn bộ check-in đã lưu phù hợp, không chỉ trang đang xem',snapshot.scope.fromDate,snapshot.scope.toDate,snapshot.timezone],
 [en?'Status':'Trạng thái',label(snapshot.scope.status),en?'Query':'Từ khóa',snapshot.scope.query],
 [en?'Check-in ID':'Mã check-in',en?'Habit':'Thói quen',en?'Date':'Ngày',en?'Status':'Trạng thái',...(includeNotes?[en?'Note':'Ghi chú']:[])],
 ...snapshot.items.map(row=>[row.id,row.habitName,row.date,label(row.status),...(includeNotes?[row.note]:[])])])};
}
