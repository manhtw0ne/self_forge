import test from 'node:test';
import assert from 'node:assert/strict';
import {journalSaveConfirmed} from './journalSaveRecovery.js';

const submitted={win:'One small win',obstacle:'',lesson:'Start smaller',tomorrowFocus:'Read one page'};
const entry={id:7,date:'2026-10-28',...submitted};

test('matching journal entry confirms a save after an uncertain connection',()=>{
 assert.equal(journalSaveConfirmed(entry,'2026-10-28',submitted),true);
 assert.equal(journalSaveConfirmed({...entry,lesson:'Changed elsewhere'},'2026-10-28',submitted),false);
 assert.equal(journalSaveConfirmed({...entry,id:0},'2026-10-28',submitted),false);
});
