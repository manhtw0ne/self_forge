import test from 'node:test';
import assert from 'node:assert/strict';
import {readWeeklyCoachAdvice,readWeeklyCoachStatus,weeklyCoachFeedbackPayload,weeklyCoachPayload} from './weeklyCoach.js';

const snapshot={version:1,weekStart:'2026-10-12',weekEnd:'2026-10-18',observedThrough:'2026-10-18',timezone:'Asia/Ho_Chi_Minh',completed:1,failed:1,skipped:0,focusSessions:1,focusMinutes:25,suggestion:'KEEP_SMALL_STEP',evidence:[{id:1,date:'2026-10-12',status:'COMPLETED',habitId:4,habitName:'Read'},{id:2,date:'2026-10-13',status:'FAILED',habitId:4,habitName:'Read'}],focusSourceIds:[8]};
const advice={headline:'Thử giảm bước đọc trong vài ngày.',observations:[{habitId:4,text:'Có một lượt chưa hoàn thành được ghi nhận; đây chỉ là dấu hiệu để thử điều chỉnh.'}],experiments:['Đọc một trang sau bữa sáng trong ba ngày.']};

test('coach request sends only an explicit weekly reference and consent',()=>{
 assert.deepEqual(weeklyCoachPayload(snapshot,true,'vi'),{weekStart:'2026-10-12',consent:true,language:'vi'});
 assert.throws(()=>weeklyCoachPayload(snapshot,false,'vi'));
 assert.throws(()=>weeklyCoachPayload(snapshot,true,'fr'));
});
test('coach advice stays bound to habits in the saved weekly evidence',()=>{
 assert.deepEqual(readWeeklyCoachStatus({available:true,journalsIncluded:false,limit:4,remaining:3}),{available:true,journalsIncluded:false,limit:4,remaining:3});
 assert.equal(readWeeklyCoachAdvice(advice,snapshot).observations[0].habitId,4);
 assert.throws(()=>readWeeklyCoachAdvice({...advice,observations:[{habitId:99,text:'Invented'}]},snapshot));
 assert.throws(()=>readWeeklyCoachAdvice({...advice,experiments:[]},snapshot));
 assert.throws(()=>readWeeklyCoachStatus({available:true,journalsIncluded:true,limit:4,remaining:3}));
 assert.throws(()=>readWeeklyCoachStatus({available:true,journalsIncluded:false,limit:4,remaining:5}));
});
test('weekly feedback contains only a voluntary structured rating or next step',()=>{
 assert.deepEqual(weeklyCoachFeedbackPayload(snapshot,{helpfulnessRating:5},'vi'),{weekStart:'2026-10-12',language:'vi',helpfulnessRating:5,followUpDecision:null});
 assert.deepEqual(weeklyCoachFeedbackPayload(snapshot,{followUpDecision:'WILL_TRY'},'en'),{weekStart:'2026-10-12',language:'en',helpfulnessRating:null,followUpDecision:'WILL_TRY'});
 assert.equal(readWeeklyCoachAdvice({...advice,helpfulnessRating:4,followUpDecision:'NOT_NOW'},snapshot).followUpDecision,'NOT_NOW');
 assert.throws(()=>weeklyCoachFeedbackPayload(snapshot,{},'vi'));
 assert.throws(()=>weeklyCoachFeedbackPayload(snapshot,{helpfulnessRating:6},'vi'));
 assert.throws(()=>readWeeklyCoachAdvice({...advice,followUpDecision:'UNKNOWN'},snapshot));
});
