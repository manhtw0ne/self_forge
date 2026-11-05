export function readFocusHistorySummary(value){
 if(!value||!['total','completed','incomplete','timedSessions','minutes'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0)||value.total!==value.completed+value.incomplete||value.timedSessions>value.completed||value.minutes<value.timedSessions*25||value.minutes>value.timedSessions*120)throw Error('Invalid history totals');
 return {total:value.total,completed:value.completed,incomplete:value.incomplete,timedSessions:value.timedSessions,minutes:value.minutes};
}
