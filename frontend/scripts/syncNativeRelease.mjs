import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');

function positiveBuildNumber(value,name){
 if(!Number.isSafeInteger(value)||value<1||value>2100000000)throw new Error(`${name} must be an integer between 1 and 2100000000.`);
 return value;
}

export function parseReleaseConfig(text){
 let config;
 try{config=JSON.parse(text);}catch{throw new Error('release.config.json must contain valid JSON.');}
 if(!config||Array.isArray(config)||typeof config!=='object')throw new Error('release.config.json must be an object.');
 if(typeof config.marketingVersion!=='string'||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(config.marketingVersion))throw new Error('marketingVersion must use release semver such as 1.0.0.');
 return {marketingVersion:config.marketingVersion,androidVersionCode:positiveBuildNumber(config.androidVersionCode,'androidVersionCode'),iosBuildNumber:positiveBuildNumber(config.iosBuildNumber,'iosBuildNumber')};
}

function replaceExactly(source,pattern,replacement,label,expectedCount){
 let count=0;
 const updated=source.replace(pattern,(...args)=>{count+=1;return replacement(...args);});
 if(count!==expectedCount)throw new Error(`${label} must appear exactly ${expectedCount} time${expectedCount===1?'':'s'} in its native project file.`);
 return updated;
}

export function updateNativeReleaseFiles(release,{androidGradle,iosProject}){
 const updatedAndroid=replaceExactly(androidGradle,/^([ \t]*versionCode[ \t]+)\d+[ \t]*$/gm,(_match,prefix)=>`${prefix}${release.androidVersionCode}`,'Android versionCode',1);
 const finalAndroid=replaceExactly(updatedAndroid,/^([ \t]*versionName[ \t]+)"[^"]+"[ \t]*$/gm,(_match,prefix)=>`${prefix}"${release.marketingVersion}"`,'Android versionName',1);
 const updatedIos=replaceExactly(iosProject,/([ \t]*CURRENT_PROJECT_VERSION = )[^;]+;/g,(_match,prefix)=>`${prefix}${release.iosBuildNumber};`,'iOS CURRENT_PROJECT_VERSION',2);
 const finalIos=replaceExactly(updatedIos,/([ \t]*MARKETING_VERSION = )[^;]+;/g,(_match,prefix)=>`${prefix}${release.marketingVersion};`,'iOS MARKETING_VERSION',2);
 return {androidGradle:finalAndroid,iosProject:finalIos};
}

function readNativeReleaseFiles(){
 return {
  androidPath:join(root,'android','app','build.gradle'),
  iosPath:join(root,'ios','App','App.xcodeproj','project.pbxproj'),
  androidGradle:readFileSync(join(root,'android','app','build.gradle'),'utf8'),
  iosProject:readFileSync(join(root,'ios','App','App.xcodeproj','project.pbxproj'),'utf8')
 };
}

export function synchronizeNativeRelease(mode,files=readNativeReleaseFiles(),configText=readFileSync(join(root,'release.config.json'),'utf8')){
 if(!['--check','--sync'].includes(mode))throw new Error('Use --check to verify native versions or --sync to update them.');
 const release=parseReleaseConfig(configText);
 const updated=updateNativeReleaseFiles(release,files);
 const synchronized=updated.androidGradle===files.androidGradle&&updated.iosProject===files.iosProject;
 if(mode==='--check'&&!synchronized)throw new Error('Native release versions are out of sync. Run npm run native:release:sync before creating a store build.');
 if(mode==='--sync'){
  if(updated.androidGradle!==files.androidGradle)writeFileSync(files.androidPath,updated.androidGradle);
  if(updated.iosProject!==files.iosProject)writeFileSync(files.iosPath,updated.iosProject);
 }
 return {release,synchronized:mode==='--sync'||synchronized};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=synchronizeNativeRelease(process.argv[2]);
 console.log(`Native release ${result.release.marketingVersion} is synchronized (Android ${result.release.androidVersionCode}, iOS ${result.release.iosBuildNumber}).`);
}
