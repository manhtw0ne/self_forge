export function categoryFormValue(category){return {name:category?.name??'',color:/^#[0-9a-f]{6}$/i.test(category?.color??'')?category.color:'#7c3aed',icon:category?.icon??''};}
export function categoryPayload(form,existing=null){
 if(typeof form?.name!=='string'||!form.name.trim()||form.name.trim().length>255||typeof form.icon!=='string'||form.icon.length>32||!/^#[0-9a-f]{6}$/i.test(form.color))throw Error('Nhập tên tối đa 255 ký tự, biểu tượng tối đa 32 ký tự và chọn màu hợp lệ.');
 if(existing&&(existing.systemDefault!==false||!Number.isSafeInteger(existing.id)||existing.id<1))throw Error('Không thể sửa danh mục hệ thống.');
 return {name:form.name.trim(),color:form.color,icon:form.icon.trim(),...(existing?{expected:{name:existing.name,color:existing.color??null,icon:existing.icon??null}}:{})};
}
export function categoryUsage(habits,categoryId){return habits.filter(row=>row.categoryId===categoryId).length;}
