const time=/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/;
const days=/^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$/;
export function reminderSnapshot(value){
 if(!value||!time.test(value.reminderTime)||typeof value.daysOfWeek!=='string'||value.daysOfWeek.length>27||!days.test(value.daysOfWeek)||(value.message!=null&&(typeof value.message!=='string'||value.message.length>255))||typeof value.enabled!=='boolean')throw Error('Invalid reminder snapshot');
 return {reminderTime:value.reminderTime,daysOfWeek:value.daysOfWeek,message:value.message??'',enabled:value.enabled};
}
export function reminderEditPayload(form,saved){
 const expected=reminderSnapshot(saved);
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.reminderTime)||typeof form.daysOfWeek!=='string'||!days.test(form.daysOfWeek)||form.daysOfWeek.length>27||typeof form.message!=='string'||form.message.length>255)throw Error('Kiểm tra giờ, ngày và lời nhắn trước khi lưu lịch nhắc.');
 return {reminderTime:form.reminderTime===expected.reminderTime.slice(0,5)?expected.reminderTime:form.reminderTime,daysOfWeek:form.daysOfWeek,message:form.message,expected};
}
export function readLatestReminder(value,id){if(value?.id!==id||!Number.isSafeInteger(value.habitId)||value.habitId<1)throw Error('Invalid reminder source');const snapshot=reminderSnapshot(value);return {id:value.id,habitId:value.habitId,habitName:typeof value.habitName==='string'?value.habitName:'',...snapshot};}
