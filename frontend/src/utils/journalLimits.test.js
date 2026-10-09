import test from 'node:test';
import assert from 'node:assert/strict';
import { oversizedJournalFields } from './journalLimits.js';
test('accepts the boundary and reports all oversized sections without truncating', () => {
 const form = {win:'x'.repeat(5000), obstacle:'y'.repeat(5001), lesson:'z'.repeat(5002), tomorrowFocus:''};
 assert.deepEqual(oversizedJournalFields(form), ['obstacle','lesson']);
 assert.equal(form.obstacle.length,5001);
});
test('emoji length matches browser and Java UTF-16 validation', () => {
 assert.deepEqual(oversizedJournalFields({win:'😊'.repeat(2500)}), []);
 assert.deepEqual(oversizedJournalFields({win:'😊'.repeat(2501)}), ['win']);
});
