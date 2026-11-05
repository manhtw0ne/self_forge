const views=['all','active','inactive'];
export function categoryHabitsPath(categoryId,view='all'){
 if(categoryId!==null&&(!Number.isSafeInteger(categoryId)||categoryId<1)||!views.includes(view))throw Error('Invalid category link');
 return '/habits?'+new URLSearchParams({category:categoryId===null?'none':String(categoryId),state:view});
}
export function readCategoryTarget(search){
 const params=new URLSearchParams(search);if(!params.has('category'))return null;
 const categories=params.getAll('category'),states=params.getAll('state');const category=categories[0],view=states[0]??'all';
 if(categories.length!==1||states.length>1||params.has('habit')||!views.includes(view)||(category!=='none'&&(!/^[1-9]\d*$/.test(category)||!Number.isSafeInteger(Number(category)))))return {invalid:true,category:null,view:'all'};
 return {invalid:false,category,view};
}
export function categoryScopeHabits(active,inactive,scope){
 if(!scope)return null;if(scope.invalid||!views.includes(scope.view))return [];
 return scope.view==='all'?[...active,...inactive]:scope.view==='active'?active:inactive;
}
