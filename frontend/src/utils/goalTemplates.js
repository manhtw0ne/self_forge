import {validCalendarDate,shiftDate} from './dates.js';import {goalPayload} from './goalForm.js';import {goalPlan} from './goalPlan.js';
export const goalTemplates=[
 {id:'reading',name:'Đọc sách từng chút',description:'Chọn số trang bạn muốn đọc và điều chỉnh theo quỹ thời gian của mình.',targetValue:60,unit:'trang',days:30},
 {id:'vocabulary',name:'Tích lũy từ vựng',description:'Ghi nhận những từ bạn đã thực sự học; có thể giảm số lượng khi cần.',targetValue:30,unit:'từ',days:30},
 {id:'focus',name:'Duy trì các buổi tập trung',description:'Tự ghi số buổi đã làm vào mục tiêu. Pomodoro không tự cộng tiến độ mục tiêu.',targetValue:12,unit:'phiên',days:30},
 {id:'journal',name:'Dành thời gian nhìn lại',description:'Chọn số bài nhật ký muốn viết. Viết nhật ký không tự cộng số lượng vào mục tiêu.',targetValue:8,unit:'bài',days:30},
 {id:'practice',name:'Luyện một kỹ năng',description:'Chọn các bài tập phù hợp trình độ và tự ghi nhận phần đã làm.',targetValue:10,unit:'bài tập',days:30},
 {id:'movement',name:'Dành thời gian vận động',description:'Chọn hoạt động và số buổi phù hợp với bạn; có thể chỉnh mục tiêu trước khi lưu.',targetValue:12,unit:'buổi',days:30}
];
export function goalTemplateForm(id,today,t=value=>value){
 if(!validCalendarDate(today))throw Error('Invalid account date');const template=goalTemplates.find(row=>row.id===id);if(!template)throw Error('Invalid goal template');
 const form={name:t(template.name),description:t(template.description),targetValue:template.targetValue,unit:t(template.unit),deadline:shiftDate(today,template.days-1)};goalPayload(form);return form;
}
export function goalDraftPreview(form,today,weekdays){const payload=goalPayload(form);return goalPlan({...payload,currentValue:0,status:'ACTIVE'},today,weekdays);}
