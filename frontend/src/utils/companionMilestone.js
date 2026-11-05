import {readCompanion} from './companion.js';
import {companionStageThreshold} from './companionProgression.js';
// Milestone acknowledgement is owned by the server, not this browser session.
// This keeps the same pending celebration on every signed-in device.
export function pendingCompanionMilestone(response) {
 const current=readCompanion(response),stage=current.pendingMilestone;
 return stage===null?null:{species:current.species,name:current.name,stage,xp:current.xp,threshold:companionStageThreshold(stage)};
}
