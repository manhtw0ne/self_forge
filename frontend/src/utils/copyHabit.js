export function copyHabitForm(source,categories,mode='same'){
 if(!source||!Number.isSafeInteger(source.id)||source.id<1||typeof source.name!=='string'||!source.name.trim()||source.name.length>255||!['EASY','MEDIUM','HARD'].includes(source.difficulty)||!Number.isInteger(source.targetPerWeek)||source.targetPerWeek<1||source.targetPerWeek>7||!['same','lighter'].includes(mode))throw Error('Invalid source habit');
 for(const key of ['description','tags'])if(source[key]!=null&&(typeof source[key]!=='string'||source[key].length>255))throw Error('Invalid source text');
 const categoryId=Number.isSafeInteger(source.categoryId)&&categories.some(row=>row.id===source.categoryId)?source.categoryId:'';
 return {name:source.name,description:source.description??'',difficulty:source.difficulty,targetPerWeek:mode==='lighter'?Math.max(1,Math.ceil(source.targetPerWeek/2)):source.targetPerWeek,categoryId,tags:source.tags??''};
}
