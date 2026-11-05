import { validCalendarDate, shiftDate, calendarWeekStart } from './dates.js';
import { readWeeklyInsight } from './weeklyInsight.js';
export const weeklySuggestions = {
 FIRST_CHECK_IN: 'Chưa có check-in để nhận xét. Thử bắt đầu bằng một thói quen nhỏ và ghi nhận kết quả.',
 SMALLER_STEP: 'Có ít nhất hai lượt thất bại đã ghi nhận. Có thể thử một bước nhỏ hơn; đây là đề xuất, chưa phải kết luận về nguyên nhân.',
 REVIEW_SCHEDULE: 'Có ít nhất hai lượt bỏ qua đã ghi nhận. Xem lại lịch và chọn thời điểm phù hợp hơn.',
 KEEP_SMALL_STEP: 'Giữ một bước nhỏ khả thi trong tuần tới và tiếp tục ghi nhận kết quả.',
};
const key = (owner, week) => {
 if(!Number.isSafeInteger(owner)||owner<=0||!validCalendarDate(week))throw Error('Invalid plan owner');
 return `sf_week_plan:${owner}:${week}`;
};
function fields(form, week) {
 if(!form || typeof form.action!=='string' || form.action.length>1000 || !validCalendarDate(form.date) || form.date<week || form.date>shiftDate(week,6) ||
    typeof form.time!=='string' || (form.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)))throw Error('Invalid plan');
 return { action:form.action,date:form.date,time:form.time };
}
export function writeWeekPlan(storage, owner, week, form) {storage.setItem(key(owner,week),JSON.stringify({version:1,...fields(form,week)}));}
export function readWeekPlan(storage, owner, week) {
 const raw=storage.getItem(key(owner,week));if(!raw)return null;
 const parsed=JSON.parse(raw);if(parsed.version!==1)throw Error('Invalid version');return fields(parsed,week);
}
export function weeklyInsightExport(snapshot, t=value=>value) {
 readWeeklyInsight(snapshot,snapshot.weekStart);
 return {filename:`selfforge-week-${snapshot.weekStart}.txt`,text:[
  t('Tổng kết tuần từ dữ liệu đã ghi nhận'),`${snapshot.weekStart} – ${snapshot.weekEnd}`,
  t('Dữ liệu đến ngày {date}').replace('{date}',snapshot.observedThrough),snapshot.timezone,
  `${t('Đã hoàn thành')}: ${snapshot.completed}`,`${t('Thất bại')}: ${snapshot.failed}`,`${t('Bỏ qua')}: ${snapshot.skipped}`,
  `${t('Pomodoro')}: ${snapshot.focusSessions} · ${snapshot.focusMinutes} ${t('phút')}`,
  t('Gợi ý theo quy tắc, chưa sử dụng AI.'),t(weeklySuggestions[snapshot.suggestion]),'',
  t('Các lượt ghi nhận trong tổng kết'),...snapshot.evidence.map(row=>`${row.date} · #${row.id} · ${t({COMPLETED:'Đã hoàn thành',FAILED:'Thất bại',SKIPPED:'Bỏ qua'}[row.status])}`),
  `${t('Mã phiên tập trung')}: ${snapshot.focusSourceIds.join(', ')}`, '',
  t('Không check-in không được tính là thất bại. Số phút là thời lượng đã đặt của các phiên hoàn thành.')
 ].join('\n')};
}
export function weekPlanExport(week, form, t=value=>value) {
 if(!validCalendarDate(week))throw Error('Invalid week');const value=fields(form,week);if(!value.action.trim())throw Error('Empty action');
 return {filename:`selfforge-week-plan-${week}.txt`,text:[t('Bản nháp kế hoạch tuần'),`${week} – ${shiftDate(week,6)}`,value.action,
 `${t('Ngày bắt đầu')}: ${value.date}`,`${t('Thời điểm')}: ${value.time||t('Chưa chọn')}`,
 t('Bản nháp do bạn chọn. Chưa tạo thói quen, nhắc nhở hoặc thay đổi lịch trên máy chủ.')].join('\n')};
}

export function weekSavePayload(form,week,version){
 if(!validCalendarDate(week)||calendarWeekStart(week)!==week||!Number.isSafeInteger(version)||version<0)throw Error('Invalid week version');
 const value=fields(form,week);if(!value.action.trim())throw Error('Empty action');return {...value,expectedVersion:version};
}
export function readServerWeekPlan(value,week){
 if(value==null||value==='')return null;
 if(value.week!==week||!Number.isSafeInteger(value.version)||value.version<1||typeof value.completed!=='boolean')throw Error('Invalid saved week plan');
 const clean=weekSavePayload(value,week,value.version);
 return {week,action:clean.action,date:clean.date,time:clean.time,version:value.version,completed:value.completed};
}

export const WEEK_PLAN_CHANGED='sf:week-plan-changed';
export function notifyWeekPlan(){try{if(typeof window!=='undefined')window.dispatchEvent(new Event(WEEK_PLAN_CHANGED));}catch{/* Optional UI refresh. */}}
