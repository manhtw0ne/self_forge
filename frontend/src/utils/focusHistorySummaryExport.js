import {readFocusHistorySummary} from './focusHistorySummary.js';
import {focusHistoryRange} from './focusHistoryRange.js';
import {profileTimezone} from './dates.js';
export function focusHistorySummaryExport(value,{query='',status='ALL',fromDate='',toDate='',today,timezone},t=text=>text){
 const summary=readFocusHistorySummary(value);focusHistoryRange(fromDate,toDate,today);
 if(typeof query!=='string'||query.length>100||!['ALL','COMPLETED','INCOMPLETE'].includes(status)||status==='COMPLETED'&&summary.incomplete!==0||status==='INCOMPLETE'&&summary.completed!==0)throw Error('Invalid focus summary scope');
 const lines=['SelfForge — '+t('Tổng kết toàn bộ kết quả Pomodoro'),t('Ngày xuất')+': '+today,t('Múi giờ')+': '+profileTimezone(timezone),t('Từ ngày')+': '+(fromDate||t('Không giới hạn')),t('Đến ngày')+': '+(toDate||t('Không giới hạn')),t('Trạng thái')+': '+t({ALL:'Tất cả',COMPLETED:'Đã hoàn thành',INCOMPLETE:'Chưa hoàn thành'}[status]),t('Bộ lọc ghi chú')+': '+t(query.trim()?'Có tìm từ khóa':'Không tìm từ khóa'),'',t('Tổng số phiên')+': '+summary.total,t('Đã hoàn thành')+': '+summary.completed,t('Chưa hoàn thành')+': '+summary.incomplete,t('Phiên hoàn thành có thời lượng 25–120 phút')+': '+summary.timedSessions,t('Tổng phút tập trung hợp lệ')+': '+summary.minutes,'',t('Tổng kết bao gồm mọi trang phù hợp bộ lọc, tính theo ngày bắt đầu phiên trong múi giờ tài khoản.'),t('Không gồm ghi chú riêng tư, cụm từ tìm kiếm, mã phiên hoặc thay đổi chưa lưu. Thời lượng phiên chưa hoàn thành không được cộng.')];
 return {filename:'selfforge-focus-summary-'+today+'.txt',text:lines.join('\n')};
}
