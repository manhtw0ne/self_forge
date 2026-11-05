import test from 'node:test';import assert from 'node:assert/strict';import {challengeLink,readChallengeProposal,challengeProposalDraft} from './challengeProposal.js';
test('challenge proposals use only validated identifiers and calendar targets',()=>{
 assert.equal(challengeLink(12),'/challenges?habit=12&target=3&window=7');assert.deepEqual(readChallengeProposal('?habit=12'),{habitId:12,targetDays:3,windowDays:7});assert.equal(readChallengeProposal('?other=1'),null);
 for(const search of ['?habit=0','?habit=1&habit=2','?habit=2&target=8&window=7','?habit=2&window=366','?habit=2&target=','?target=3','?habit=9007199254740992','?habit=2&window=7&window=7'])assert.equal(readChallengeProposal(search).invalid,true,search);
 assert.throws(()=>challengeLink(1,3,2));
});
test('proposal drafts require an active owned habit and never substitute another habit',()=>{
 const proposal=readChallengeProposal('?habit=12&target=5&window=14');const owned=[{id:11,name:'Other',active:true},{id:12,name:' Read ',active:true}];
 assert.deepEqual(challengeProposalDraft(proposal,owned),{habitId:'12',name:'Read',description:'',targetDays:5,windowDays:14});assert.equal(challengeProposalDraft(proposal,[owned[0]]),null);assert.equal(challengeProposalDraft(proposal,[{...owned[1],active:false}]),null);assert.equal(challengeProposalDraft({invalid:true},owned),null);assert.equal(challengeProposalDraft(null,owned),null);
});
