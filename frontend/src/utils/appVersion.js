export function createVersionChecker({version,fetchVersion,publish,now=()=>Date.now()}){
 if(typeof version!=='string'||! /^[a-f0-9]{64}$/.test(version))throw Error('Invalid current version');
 let active=true,busy=false,last=-Infinity;
 return {async check(){if(!active||busy||now()-last<60000)return;last=now();busy=true;
  try{const response=await fetchVersion();if(!response||typeof response.version!=='string'||! /^[a-f0-9]{64}$/.test(response.version))throw Error('Invalid version response');if(active)publish(response.version!==version);}
  catch{/* An unavailable version check must not interrupt account features. */}finally{busy=false;}
 },stop(){active=false;}};
}
