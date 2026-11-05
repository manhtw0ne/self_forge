import test from 'node:test';
import assert from 'node:assert/strict';
import { goalPlan, goalPlanExport, goalCapacity, goalHabitSuggestion } from './goalPlan.js';
import { todayInTimezone } from './dates.js';
const goal = { name: 'Read', status: 'ACTIVE', targetValue: 12, currentValue: 2, deadline: '2026-10-19', unit: 'books' };
test('inclusive deadline allocates only selected weekdays with exact integer total', () => {
  const plan = goalPlan(goal, '2026-10-13', [1, 3, 5]);
  assert.equal(plan.sessions, 3);
  assert.deepEqual(plan.preview, [{ date: '2026-10-14', amount: 4 }, { date: '2026-10-16', amount: 3 }, { date: '2026-10-19', amount: 3 }]);
  assert.equal(plan.perSession, 4);
  assert.equal(plan.preview.reduce((sum, row) => sum + row.amount, 0), 10);
});
test('due today, overdue, undated and ended goals remain distinct', () => {
  assert.equal(goalPlan(goal, '2026-10-19').sessions, 1);
  assert.equal(goalPlan(goal, '2026-10-20').state, 'overdue');
  assert.equal(goalPlan({ ...goal, deadline: null }, '2026-10-13').state, 'undated');
  assert.equal(goalPlan({ ...goal, status: 'ABANDONED' }, '2026-10-13').state, 'ended');
  assert.equal(goalPlan({ ...goal, currentValue: 12 }, '2026-10-13').state, 'ended');
  assert.equal(goalPlan(goal, '2026-10-19', [2]).state, 'no-days');
  assert.equal(goalPlan(goal, '2026-10-13', []).state, 'no-days');
});
test('calendar arithmetic covers leap day and DST without changing day count', () => {
  assert.equal(goalPlan({ ...goal, deadline: '2028-03-01' }, '2028-02-28').sessions, 3);
  assert.equal(goalPlan({ ...goal, deadline: '2026-03-10' }, '2026-03-07').sessions, 4);
  const now = new Date('2026-10-19T01:00:00Z');
  assert.equal(goalPlan(goal, todayInTimezone('Asia/Ho_Chi_Minh', now)).sessions, 1);
  assert.equal(goalPlan(goal, todayInTimezone('America/Los_Angeles', now)).sessions, 2);
});
test('duplicate weekdays never inflate capacity and previews never exceed deadline', () => {
  assert.equal(goalPlan(goal, '2026-10-13', [1, 1, 3, 5, 8, -1]).sessions, 3);
  const short = goalPlan({ ...goal, deadline: '2026-10-14' }, '2026-10-13');
  assert.equal(short.preview.length, 2);
  const small = goalPlan({ ...goal, targetValue: 3 }, '2026-10-13');
  assert.equal(small.preview.reduce((sum, row) => sum + row.amount, 0), 1);
  assert.ok(small.preview.every(row => row.amount >= 0));
});
test('long plans remain bounded and reject malformed server data', () => {
  const long = goalPlan({ ...goal, deadline: '2099-12-31', targetValue: 2147483647 }, '2026-10-13');
  assert.equal(long.preview.length, 7);
  assert.ok(Number.isSafeInteger(long.perSession));
  for (const changes of [{ deadline: '2026-02-30' }, { targetValue: 0 }, { currentValue: -1 }, { targetValue: Infinity }])
    assert.equal(goalPlan({ ...goal, ...changes }, '2026-10-13').state, 'invalid');
});
test('export contains chosen schedule and source amounts without private extra fields', () => {
  const plan = goalPlan(goal, '2026-10-13', [1, 3, 5]);
  const exported = goalPlanExport({ ...goal, token: 'SECRET' }, plan, '2026-10-13');
  assert.match(exported.content, /2026-10-14: 4 books/);
  assert.match(exported.content, /Thứ hai, Thứ tư, Thứ sáu/);
  assert.ok(!exported.content.includes('SECRET'));
  assert.throws(() => goalPlanExport(goal, { state: 'undated' }, '2026-10-13'));
});

test('personal session capacity reveals shortfall and suggests a selected completion day',()=>{
 const pace=goalCapacity(goal,'2026-10-13',[1,3,5,3],2);
 assert.deepEqual(pace,{state:'ready',capacity:2,needed:5,available:3,fits:false,shortfall:2,recommendedDeadline:'2026-10-23'});
 assert.equal(goalCapacity(goal,'2026-10-13',[1,3,5],4).fits,true);
 const tight=goalCapacity({...goal,deadline:'2026-10-13'},'2026-10-13',[3],10);
 assert.equal(tight.available,0);assert.equal(tight.recommendedDeadline,'2026-10-14');
 assert.equal(goalCapacity(goal,'2026-10-13',[],2).state,'no-days');
 for(const amount of ['',null,0,-2,1.5,Infinity,'2x'])assert.throws(()=>goalCapacity(goal,'2026-10-13',[1],amount));
 assert.equal(goalCapacity({...goal,targetValue:2147483647},'2026-10-13',[1],1).recommendedDeadline,null);
});
test('habit suggestion caps its small step at chosen capacity and remains a reviewed draft',()=>{
 const plan=goalPlan(goal,'2026-10-13',[1,3,5]);const pace=goalCapacity(goal,'2026-10-13',[1,3,5],2);
 const render=(key,params)=>key.replace('{amount}',params.amount).replace('{unit}',params.unit);
 const suggestion=goalHabitSuggestion(goal,plan,pace,render);
 assert.equal(suggestion.targetPerWeek,3);assert.equal(suggestion.difficulty,'EASY');assert.match(suggestion.description,/2 books/);
 assert.equal(suggestion.requestId,undefined);assert.equal(goalHabitSuggestion(goal,{state:'overdue'},pace),null);
 assert.equal(goalHabitSuggestion({...goal,unit:'x'.repeat(255)},plan,pace,render).description,'');
 assert.equal(goal.currentValue,2);assert.equal(goal.deadline,'2026-10-19');
});
