import {validCalendarDate} from './dates.js';
import {focusPlan} from './focusPlan.js';
const key=owner=>{if(!Number.isSafeInteger(owner)||owner<1)throw Error('Invalid draft owner');return 'sf_daily_focus:'+owner;};
export function dailyFocusDraft(value){
 if(!value||value.version!==1||!validCalendarDate(value.date)||!Array.isArray(value.ids)||value.ids.length<1||value.ids.length>3||new Set(value.ids).size!==value.ids.length||value.ids.some(id=>!Number.isSafeInteger(id)||id<1))throw Error('Invalid daily focus draft');
 focusPlan(value.budget,value.energy);return {version:1,date:value.date,budget:Number(value.budget),energy:value.energy,ids:[...value.ids]};
}
export function readDailyFocusDraft(storage,owner){const raw=storage.getItem(key(owner));return raw===null?null:dailyFocusDraft(JSON.parse(raw));}
export function writeDailyFocusDraft(storage,owner,value){const clean=dailyFocusDraft(value);storage.setItem(key(owner),JSON.stringify(clean));return clean;}
export function removeDailyFocusDraft(storage,owner){storage.removeItem(key(owner));}
