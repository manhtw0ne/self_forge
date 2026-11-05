import {readTimer} from './pomodoroTimer.js';import {readPendingStart} from './pomodoroStart.js';import {readFocusSession} from './focusRecovery.js';
export function dashboardFocus(storage,owner,now=Date.now()){
 if(!Number.isSafeInteger(owner)||owner<1||!Number.isFinite(now))throw Error('Invalid focus owner');
 const pending=readPendingStart(storage,owner);if(pending)return {kind:'PENDING',minutes:pending.durationMinutes};
 const timer=readTimer(storage,owner,now);if(!timer)return null;
 if(timer.mode===0)return timer.sessionId?{kind:'FOCUS',sessionId:timer.sessionId,secondsLeft:timer.secondsLeft,running:timer.running,selectedHabit:timer.selectedHabit,focusMinutes:timer.focusMinutes}:null;
 const duration=timer.mode===1?300:900;if(!timer.running&&timer.secondsLeft===duration)return null;
 return {kind:'BREAK',secondsLeft:timer.secondsLeft,running:timer.running,minutes:duration/60};
}
export function verifiedDashboardFocus(local,response){
 if(local?.kind!=='FOCUS')throw Error('No held focus session');const session=readFocusSession(response,local.sessionId);const habit=local.selectedHabit===''?null:/^[1-9]\d*$/.test(local.selectedHabit)?Number(local.selectedHabit):NaN;
 if(session.habitId!==habit||session.durationMinutes!==local.focusMinutes)throw Error('Mismatched held session');
 return {kind:session.completed?'SAVED':local.secondsLeft===0?'NEEDS_CONFIRM':local.running?'RUNNING':'PAUSED',minutes:session.durationMinutes,secondsLeft:local.secondsLeft,sessionId:session.id};
}
