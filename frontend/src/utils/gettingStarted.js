import {validCalendarDate,profileTimezone} from './dates.js';
const key = userId => {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw Error('Invalid guide owner');
  return 'sf_getting_started:' + userId;
};
export function guideHidden(storage, userId) {
  const value = storage.getItem(key(userId));
  if (value !== null && value !== '1') throw Error('Invalid guide preference');
  return value === '1';
}
export function hideGuide(storage, userId) { storage.setItem(key(userId), '1'); }

export function gettingStartedProgress(value,today,timezone){if(!validCalendarDate(today)||value?.observedThrough!==today||value.timezone!==profileTimezone(timezone)||['activeHabit','completedCheckIn'].some(key=>typeof value[key]!=='boolean'))throw Error('Invalid getting started status');const steps=[{id:'habit',done:value.activeHabit,path:'/habits'},{id:'checkin',done:value.completedCheckIn,path:'/#today-habits'}];return {steps,completed:steps.filter(row=>row.done).length,next:steps.find(row=>!row.done)??null};}
