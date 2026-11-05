import {test} from 'node:test';import assert from 'node:assert/strict';import {companionCardModel} from './companionCard.js';
const source={available:true,species:'CHON',name:'Tên riêng',visible:true,version:2,xp:150,stage:2,nextThreshold:500,countedCheckIns:15,legacyExcluded:7,progressionVersion:1,email:'PRIVATE_EMAIL',journal:'PRIVATE_JOURNAL'};
test('companion card hides custom name and XP by default and excludes account metadata',()=>{
 const card=companionCardModel(source,'2026-10-16');assert.equal(card.name,'Chồn');assert.equal(card.xpLabel,null);assert.equal(card.stage,2);assert.equal(card.stageLabel,'Hình thái 2/3');assert.equal(card.filename,'selfforge-companion-2026-10-16.png');
 const content=JSON.stringify(card);for(const secret of ['Tên riêng','PRIVATE_EMAIL','PRIVATE_JOURNAL','legacyExcluded','countedCheckIns','150'])assert.ok(!content.includes(secret));
});
test('optional card details use only verified current progress and sanitize multiline names',()=>{
 const card=companionCardModel({...source,name:'Leaf\nHome'},'2026-10-16',{includeName:true,includeXp:true});assert.equal(card.name,'Leaf Home');assert.equal(card.xpLabel,'150 XP từ thói quen');assert.equal(card.stage,2);assert.equal(source.name,'Tên riêng');
 assert.equal(companionCardModel({...source,name:'\u0000'},'2026-10-16',{includeName:true}).name,'Chồn');
});
test('hidden/disabled companions, inconsistent stages, invalid dates and nonboolean options cannot produce cards',()=>{
 for(const row of [{...source,visible:false},{...source,available:false},{...source,stage:3}])assert.throws(()=>companionCardModel(row,'2026-10-16'));
 assert.throws(()=>companionCardModel(source,'2026-02-30'));assert.throws(()=>companionCardModel(source,'2026-10-16',{includeXp:'yes'}));
});
