import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJournalDraft, writeJournalDraft, removeJournalDraft } from './journalDraft.js';
const memory = () => { const data=new Map(); return { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v), removeItem:k=>data.delete(k) }; };
const form={win:'Tiến bộ 🌱',obstacle:'',lesson:'Learn',tomorrowFocus:'Read'};
test('journal drafts survive reload and stay isolated by account and date',()=>{
 const s=memory();writeJournalDraft(s,1,'2026-10-06',form);
 assert.deepEqual(readJournalDraft(s,1,'2026-10-06'),form);
 assert.equal(readJournalDraft(s,2,'2026-10-06'),null);assert.equal(readJournalDraft(s,1,'2026-10-05'),null);
 writeJournalDraft(s,1,'2026-10-05',form);removeJournalDraft(s,1,'2026-10-06');
 assert.equal(readJournalDraft(s,1,'2026-10-06'),null);assert.deepEqual(readJournalDraft(s,1,'2026-10-05'),form);
});
test('corrupt drafts and storage failures are surfaced without silently deleting content',()=>{
 const s=memory();s.setItem('sf_journal_draft:1:2026-10-06','{');
 assert.throws(()=>readJournalDraft(s,1,'2026-10-06'));assert.equal(s.getItem('sf_journal_draft:1:2026-10-06'),'{');
 assert.throws(()=>writeJournalDraft({setItem(){throw Error('full');}},1,'2026-10-06',form));
 assert.throws(()=>readJournalDraft({getItem(){throw Error('blocked');}},1,'2026-10-06'));
});
