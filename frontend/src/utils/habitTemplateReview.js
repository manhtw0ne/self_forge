export function habitTemplateDraft(template,t=value=>value){
 if(!template||!Array.isArray(template.habits)||template.habits.length<1||template.habits.length>10)throw Error('Invalid template');
 return template.habits.map(row=>({selected:true,name:t(row.name),description:t(row.description??''),tags:t(row.tags??''),difficulty:row.difficulty??'MEDIUM',targetPerWeek:row.targetPerWeek??7,categoryId:''}));
}
export function habitTemplateSelection(rows,categories=[]){
 if(!Array.isArray(rows))throw Error('Invalid selection');const selected=rows.filter(row=>row?.selected===true);
 if(!selected.length||selected.length>10)throw Error('Choose one to ten habits');
 return selected.map(row=>{
  const target=Number(row.targetPerWeek),category=row.categoryId===''||row.categoryId==null?null:Number(row.categoryId);
  if(typeof row.name!=='string'||!row.name.trim()||row.name.trim().length>255||!['EASY','MEDIUM','HARD'].includes(row.difficulty)||!Number.isInteger(target)||target<1||target>7||['description','tags'].some(key=>typeof row[key]!=='string'||row[key].length>255)||category!==null&&(!Number.isSafeInteger(category)||category<1||!categories.some(item=>item.id===category)))throw Error('Invalid template habit');
  return {name:row.name.trim(),description:row.description.trim(),tags:row.tags.trim(),difficulty:row.difficulty,targetPerWeek:target,...(category!==null?{categoryId:category}:{})};
 });
}
const normalized=name=>String(name??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
export function habitTemplateDuplicates(rows,existing){
 const names=new Set(existing.map(row=>normalized(row.name))),duplicates=[];
 for(const row of rows.filter(row=>row.selected)){const name=normalized(row.name);if(name&&names.has(name))duplicates.push(row.name.trim());names.add(name);}
 return [...new Set(duplicates)];
}
