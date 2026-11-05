import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNAL_COACH_FIELD_LIMIT,journalCoachEligibility,journalCoachPayload,readJournalCoachReflection,readJournalCoachStatus,readSavedJournalCoachReflection,writeSavedJournalCoachReflection,removeSavedJournalCoachReflection} from './journalCoach.js';

const form={win:'Completed one page',obstacle:'Low energy',lesson:'Smaller starts help',tomorrowFocus:'Read after breakfast'};

test('journal coach sends only bounded visible journal fields after consent',()=>{
 assert.deepEqual(journalCoachPayload(form,true,'en'),{...form,consent:true,language:'en'});
 assert.throws(()=>journalCoachPayload(form,false,'en'));
 assert.throws(()=>journalCoachPayload({...form,win:'x'.repeat(JOURNAL_COACH_FIELD_LIMIT+1)},true,'en'));
 assert.deepEqual(journalCoachEligibility({win:'',obstacle:'',lesson:'',tomorrowFocus:''}),{ok:false,reason:'empty'});
});

test('journal coach fails closed for malformed server responses',()=>{
 assert.deepEqual(readJournalCoachStatus({available:true,limit:4,remaining:3}),{available:true,limit:4,remaining:3});
 assert.deepEqual(readJournalCoachReflection({reflection:'A tentative reflection.',question:'What helped?',tomorrowAction:'Try one small step.'}),{reflection:'A tentative reflection.',question:'What helped?',tomorrowAction:'Try one small step.'});
 assert.throws(()=>readJournalCoachReflection({reflection:'Only one field'}));
 assert.throws(()=>readJournalCoachStatus({available:true,limit:4,remaining:5}));
});
test('journal coach keeps an AI reflection only for the matching account, date, visible text and language',()=>{
 const values=new Map(),storage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const advice={reflection:'Keep it small.',question:'What worked?',tomorrowAction:'Read one page.'};
 assert.deepEqual(writeSavedJournalCoachReflection(storage,7,'2026-10-29',form,'en',advice),advice);
 assert.deepEqual(readSavedJournalCoachReflection(storage,7,'2026-10-29',form,'en'),advice);
 assert.equal(readSavedJournalCoachReflection(storage,8,'2026-10-29',form,'en'),null);
 assert.equal(readSavedJournalCoachReflection(storage,7,'2026-10-30',form,'en'),null);
 assert.equal(readSavedJournalCoachReflection(storage,7,'2026-10-29',{...form,lesson:'Different'},'en'),null);
 assert.equal(readSavedJournalCoachReflection(storage,7,'2026-10-29',form,'vi'),null);
 removeSavedJournalCoachReflection(storage,7,'2026-10-29');
 assert.equal(readSavedJournalCoachReflection(storage,7,'2026-10-29',form,'en'),null);
});
