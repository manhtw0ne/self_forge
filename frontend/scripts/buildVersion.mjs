import {createHash} from 'node:crypto';import {readdirSync,readFileSync} from 'node:fs';import {join,relative,sep} from 'node:path';
export function buildVersion(root){
 const hash=createHash('sha256');const files=[];
 const visit=directory=>{for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(directory,entry.name);if(entry.isDirectory())visit(path);else if(entry.isFile())files.push(path);}};
 for(const directory of ['src','public','scripts'])visit(join(root,directory));for(const name of ['package.json','package-lock.json','vite.config.js'])files.push(join(root,name));
 for(const file of files.sort()){hash.update(relative(root,file).split(sep).join('/'));hash.update('\0');hash.update(readFileSync(file));hash.update('\0');}return hash.digest('hex');
}
