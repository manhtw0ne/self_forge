import {profileTimezone} from './dates.js';
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
export function searchHelp(items,query){const terms=normalize(query).trim().split(/\s+/).filter(Boolean);return items.filter(item=>{const text=normalize([item.viQuestion,item.enQuestion,item.viAnswer,item.enAnswer].join(' '));return terms.every(term=>text.includes(term));});}
export function supportDiagnostics(value,capturedAt=new Date()){
 if(!value||! /^(development|[a-f0-9]{64})$/.test(value.version)||typeof value.online!=='boolean'||typeof value.standalone!=='boolean'||!Number.isInteger(value.width)||value.width<0||value.width>10000||!(value.requestId===null||typeof value.requestId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.requestId))||!Number.isFinite(capturedAt.getTime()))throw Error('Invalid diagnostics');
 const result={app:'SelfForge',version:value.version,timezone:profileTimezone(value.timezone),online:value.online,mode:value.standalone?'standalone':'browser',viewportWidth:value.width,capturedAt:capturedAt.toISOString()};
 return value.requestId?{...result,requestId:value.requestId}:result;
}
