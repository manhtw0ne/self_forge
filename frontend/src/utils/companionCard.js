import {readCompanion,companionSpecies} from './companion.js';
import {companionStageCount} from './companionProgression.js';
import {validCalendarDate} from './dates.js';
const translate=(text,params={})=>text.replace(/\{(\w+)\}/g,(_,key)=>String(params[key]??''));
export function companionCardModel(value,date,{includeName=false,includeXp=false}={},t=translate){
 const source=readCompanion(value);
 if(!source.available||!source.visible||!validCalendarDate(date)||date<'0001-01-01'||typeof includeName!=='boolean'||typeof includeXp!=='boolean')throw Error('Invalid companion card');
 const cleanedName=Array.from(source.name,char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127?' ':char).join('').trim();
 return {species:source.species,stage:source.stage,date,
  name:includeName&&cleanedName?cleanedName:t(companionSpecies[source.species]),
  title:t('Mỗi ngày một bước nhỏ'),stageLabel:t('Hình thái {stage}/{total}',{stage:source.stage,total:companionStageCount}),
  xpLabel:includeXp?t('{xp} XP từ thói quen',{xp:source.xp}):null,
  footer:t('Cùng SelfForge duy trì điều quan trọng'),filename:'selfforge-companion-'+date+'.png'};
}
export async function renderCompanionCard(model,imageUrl){
 const image=await new Promise((resolve,reject)=>{
  const img=new Image();const timeout=setTimeout(()=>{img.onload=null;img.onerror=null;reject(Error('Image timeout'));},15000);
  img.onload=()=>{clearTimeout(timeout);resolve(img);};img.onerror=()=>{clearTimeout(timeout);reject(Error('Image unavailable'));};img.src=imageUrl;
 });
 if(!image.naturalWidth||!image.naturalHeight)throw Error('Invalid companion art');
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const background=ctx.createLinearGradient(0,0,1080,1080);background.addColorStop(0,'#111827');background.addColorStop(1,'#312e81');ctx.fillStyle=background;ctx.fillRect(0,0,1080,1080);
 ctx.textAlign='center';ctx.fillStyle='#c4b5fd';ctx.font='600 32px "Segoe UI", Arial, sans-serif';ctx.fillText('SelfForge',540,88,900);
 ctx.fillStyle='#ffffff';ctx.font='700 48px "Segoe UI", Arial, sans-serif';ctx.fillText(model.title,540,170,920);
 const scale=Math.min(480/image.naturalWidth,480/image.naturalHeight),width=image.naturalWidth*scale,height=image.naturalHeight*scale;ctx.drawImage(image,(1080-width)/2,245+(480-height)/2,width,height);
 ctx.fillStyle='#ffffff';ctx.font='700 44px "Segoe UI", Arial, sans-serif';ctx.fillText(model.name,540,790,920);
 ctx.fillStyle='#ddd6fe';ctx.font='500 32px "Segoe UI", Arial, sans-serif';ctx.fillText(model.stageLabel,540,845,920);
 if(model.xpLabel){ctx.fillStyle='#c4b5fd';ctx.font='500 28px "Segoe UI", Arial, sans-serif';ctx.fillText(model.xpLabel,540,890,920);}
 ctx.fillStyle='#cbd5e1';ctx.font='24px "Segoe UI", Arial, sans-serif';ctx.fillText(model.footer,540,990,920);ctx.font='20px "Segoe UI", Arial, sans-serif';ctx.fillText(model.date,540,1030,920);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('PNG unavailable')),'image/png'));return blob;
}
