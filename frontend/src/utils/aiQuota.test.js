import test from 'node:test';
import assert from 'node:assert/strict';
import {aiQuotaNotice} from './aiQuota.js';
import {journalCoachPayload,readJournalCoachReflection} from './journalCoach.js';

test('AI quota warnings are explicit at half, eighty percent and the limit',()=>{
 assert.equal(aiQuotaNotice({limit:4,remaining:3},'WEEKLY','vi'),null);
 assert.deepEqual(aiQuotaNotice({limit:4,remaining:2},'WEEKLY','vi'),{level:'info',message:'Bạn đã dùng một nửa lượt gợi ý AI trong tháng này.'});
 assert.deepEqual(aiQuotaNotice({limit:5,remaining:1},'GOAL','en'),{level:'warning',message:'You have used 4/5 ai plans this month.'});
 assert.deepEqual(aiQuotaNotice({limit:3,remaining:0},'RESTART','vi'),{level:'limit',message:'Bạn đã dùng hết lượt bản nháp AI trong tháng này.'});
 assert.deepEqual(aiQuotaNotice({limit:4,remaining:2},'JOURNAL','en'),{level:'info',message:'You have used half of this month’s ai reflections.'});
 assert.deepEqual(aiQuotaNotice({limit:3,remaining:0},'DAILY_FOCUS','en'),{level:'limit',message:'You have used all ai priority suggestions for this month.'});
 assert.deepEqual(aiQuotaNotice({limit:3,remaining:0},'CHAT','vi'),{level:'limit',message:'Bạn đã dùng hết lượt phiên hỏi đáp AI trong tháng này.'});
});

test('AI quota warnings fail closed for malformed server state',()=>{
 assert.throws(()=>aiQuotaNotice({limit:3,remaining:4},'WEEKLY'));
 assert.throws(()=>aiQuotaNotice({limit:3,remaining:2},'UNKNOWN'));
 assert.throws(()=>aiQuotaNotice({limit:3,remaining:2},'WEEKLY','fr'));
});

test('journal AI payload is consent-gated and its response is strictly bounded',()=>{
 const form={win:'One small win',obstacle:'Low energy',lesson:'Start smaller',tomorrowFocus:'Read one page'};
 assert.deepEqual(journalCoachPayload(form,true,'vi'),{...form,consent:true,language:'vi'});
 assert.throws(()=>journalCoachPayload(form,false,'vi'));
 assert.deepEqual(readJournalCoachReflection({reflection:'A tentative observation.',question:'What helped you start?',tomorrowAction:'Try one page tomorrow.'}),{reflection:'A tentative observation.',question:'What helped you start?',tomorrowAction:'Try one page tomorrow.'});
 assert.throws(()=>readJournalCoachReflection({reflection:'Missing fields'}));
});
