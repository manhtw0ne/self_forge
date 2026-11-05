export const motionKey='sf_motion_preference';
export function parseMotion(value){if(value===null)return 'SYSTEM';if(!['SYSTEM','REDUCED'].includes(value))throw Error('Invalid motion preference');return value;}
export function readMotion(storage){return parseMotion(storage.getItem(motionKey));}
export function saveMotion(storage,value){storage.setItem(motionKey,parseMotion(value));}
export function reducedMotion(preference,systemReduced){return parseMotion(preference)==='REDUCED'||systemReduced===true;}
