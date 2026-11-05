import test from 'node:test';import assert from 'node:assert/strict';import {goalAgenda} from './goalAgenda.js';
const goal=(id,deadline,changes={})=>({id,deadline,name:'Read '+id,unit:'pages',targetValue:100,currentValue:25,status:'ACTIVE',...changes});
test('goal agenda separates overdue and inclusive seven-day deadlines without guessed progress',()=>{
 const value=goalAgenda([goal(1,'2026-10-14'),goal(2,'2026-10-15'),goal(3,'2026-10-21'),goal(4,'2026-10-22'),goal(5,null),goal(6,'2026-10-15',{status:'COMPLETED'}),goal(7,null,{currentValue:100})],'2026-10-15');
 assert.deepEqual(value.dueSoon.map(row=>row.id),[2,3]);assert.deepEqual(value.overdue.map(row=>row.id),[1]);assert.equal(value.active.length,5);assert.equal(value.dueSoon[0].remaining,75);assert.equal(value.dueSoon[0].percent,25);
 assert.equal(value.active.at(-1).deadline,null);
});
test('goal agenda rejects ambiguous data and strips private fields without changing source goals',()=>{
 const original=goal(1,null,{note:'SECRET',progress:999});const value=goalAgenda([original],'2026-10-15');assert.ok(!JSON.stringify(value).includes('SECRET'));assert.equal(value.active[0].percent,25);assert.equal(original.progress,999);
 for(const row of [goal(1,'2026-02-30'),goal(1,null,{currentValue:-1}),goal(1,null,{targetValue:0}),goal(1,null,{status:'UNKNOWN'})])assert.throws(()=>goalAgenda([row],'2026-10-15'));
 assert.throws(()=>goalAgenda([original,original],'2026-10-15'));
});
