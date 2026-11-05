const pattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function readRequestId(value){
 return typeof value==='string'&&pattern.test(value)?value:null;
}
