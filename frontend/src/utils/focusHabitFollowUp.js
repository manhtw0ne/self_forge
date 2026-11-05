import {readFocusSession} from './focusRecovery.js';import {habitPath} from './habitNavigation.js';
export function focusHabitFollowUp(value){const session=readFocusSession(value);if(!session.completed||session.habitId===null)return null;return {sessionId:session.id,checkInPath:habitPath('/',session.habitId)+'#today-habits',statsPath:habitPath('/stats',session.habitId)};}
