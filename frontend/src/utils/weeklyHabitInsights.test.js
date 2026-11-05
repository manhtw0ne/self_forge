import test from 'node:test';import assert from 'node:assert/strict';import {weeklyHabitInsights} from './weeklyHabitInsights.js';
const row=(id,habitId,status)=>({id,habitId,habitName:'Habit '+habitId,status,date:'2026-10-12'});
const snapshot={version:1,weekStart:'2026-10-12',weekEnd:'2026-10-18',observedThrough:'2026-10-15',completed:1,failed:2,skipped:2,focusSessions:0,focusMinutes:0,focusSourceIds:[],suggestion:'SMALLER_STEP',evidence:[row(1,5,'FAILED'),row(2,5,'FAILED'),row(3,6,'SKIPPED'),row(4,6,'SKIPPED'),row(5,7,'COMPLETED')]};
test('habit-specific weekly steps carry actual counts and source IDs without inferred causes',()=>{
 const results=weeklyHabitInsights(snapshot);assert.deepEqual(results.map(r=>r.suggestion),['SMALLER_STEP','REVIEW_SCHEDULE','KEEP_SMALL_STEP']);assert.deepEqual(results[0].sourceIds,[1,2]);assert.equal(results[0].failed,2);assert.equal(results[0].completed,0);assert.ok(results[0].action.startsWith('Habit 5:'));assert.equal(results[0].xp,undefined);
});
test('weekly habit steps reject unsupported metadata and do not read private notes',()=>{
 const value=weeklyHabitInsights({...snapshot,evidence:snapshot.evidence.map(r=>({...r,note:'SECRET'}))});assert.ok(!JSON.stringify(value).includes('SECRET'));
 for(const change of [{habitId:0},{habitName:''},{habitName:'x'.repeat(256)}])assert.throws(()=>weeklyHabitInsights({...snapshot,evidence:[{...snapshot.evidence[0],...change},...snapshot.evidence.slice(1)]}));
 assert.throws(()=>weeklyHabitInsights({...snapshot,evidence:[snapshot.evidence[0],{...snapshot.evidence[1],habitName:'Other name'},...snapshot.evidence.slice(2)]}));
});
