import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAndRefresh } from './saveAndRefresh.js';
test('save failure never refreshes or reports success', async () => {
 let refreshed = false;
 await assert.rejects(saveAndRefresh(async () => {throw new Error('timeout');}, async () => {refreshed=true;}));
 assert.equal(refreshed,false);
});
test('refresh failure preserves confirmed save and never repeats it', async () => {
 let saves = 0;
 assert.deepEqual(await saveAndRefresh(async () => {saves++;}, async () => {throw new Error('offline');}), {saved:true,refreshFailed:true});
 assert.equal(saves,1);
});
test('successful refresh returns authoritative state', async () => {
 assert.deepEqual(await saveAndRefresh(async () => {}, async () => ({count:1})), {saved:true,data:{count:1}});
});
