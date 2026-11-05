const positive=value=>Number.isSafeInteger(value)&&value>0;
const key=owner=>{if(!positive(owner))throw Error('Invalid category batch owner');return 'sf_habit_categories:'+owner;};
export function categoryBatchPayload(habits,ids,categoryId,categories){
 if(!Array.isArray(ids)||!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>!positive(id))||categoryId!==null&&(!positive(categoryId)||!categories.some(row=>row.id===categoryId)))throw Error('Chọn từ 1 đến 50 thói quen và danh mục hợp lệ.');
 return validate({categoryId,items:ids.map(id=>{const matches=habits.filter(row=>row.id===id);if(matches.length!==1)throw Error('Habit unavailable');return {habitId:id,expected:{categoryId:matches[0].categoryId??null}};})});
}
function validate(value){
 if(!value||value.categoryId!==null&&!positive(value.categoryId)||!Array.isArray(value.items)||!value.items.length||value.items.length>50)throw Error('Invalid category batch');const seen=new Set();
 return {categoryId:value.categoryId,items:value.items.map(row=>{if(!row||!positive(row.habitId)||seen.has(row.habitId)||!row.expected||row.expected.categoryId!==null&&!positive(row.expected.categoryId))throw Error('Invalid category item');seen.add(row.habitId);return {habitId:row.habitId,expected:{categoryId:row.expected.categoryId}};})};
}
export function readCategoryBatch(storage,owner){const raw=storage.getItem(key(owner));return raw===null?null:validate(JSON.parse(raw));}
export function clearCategoryBatch(storage,owner){storage.removeItem(key(owner));}
export async function applyCategoryBatch(storage,owner,body,patch){
 const payload=readCategoryBatch(storage,owner)??validate(body);storage.setItem(key(owner),JSON.stringify(payload));let response;
 try{response=await patch(payload);}catch(error){if([400,404,422].includes(error.response?.status)){try{clearCategoryBatch(storage,owner);}catch{/* Retain original error. */}}throw error;}
 try{clearCategoryBatch(storage,owner);return {response,pending:null};}catch{return {response,pending:payload};}
}
