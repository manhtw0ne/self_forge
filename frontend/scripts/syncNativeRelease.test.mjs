import assert from 'node:assert/strict';
import test from 'node:test';
import {parseReleaseConfig,synchronizeNativeRelease,updateNativeReleaseFiles} from './syncNativeRelease.mjs';

const android=`android {
  defaultConfig {
    versionCode 7
    versionName "0.7.0"
  }
}
`;
const ios=`CURRENT_PROJECT_VERSION = 7;
MARKETING_VERSION = 0.7.0;
CURRENT_PROJECT_VERSION = 7;
MARKETING_VERSION = 0.7.0;
`;

test('parses a safe native release configuration',()=>{
 assert.deepEqual(parseReleaseConfig('{"marketingVersion":"1.2.3","androidVersionCode":12,"iosBuildNumber":13}'),{marketingVersion:'1.2.3',androidVersionCode:12,iosBuildNumber:13});
});

test('rejects unsafe native release configuration',()=>{
 assert.throws(()=>parseReleaseConfig('{"marketingVersion":"1.2","androidVersionCode":0,"iosBuildNumber":1}'),/marketingVersion/);
 assert.throws(()=>parseReleaseConfig('{"marketingVersion":"1.2.3","androidVersionCode":1,"iosBuildNumber":0}'),/iosBuildNumber/);
});

test('updates Android and iOS release metadata together',()=>{
 const updated=updateNativeReleaseFiles({marketingVersion:'1.2.3',androidVersionCode:12,iosBuildNumber:13},{androidGradle:android,iosProject:ios});
 assert.match(updated.androidGradle,/versionCode 12/);
 assert.match(updated.androidGradle,/versionName "1.2.3"/);
 assert.equal((updated.iosProject.match(/CURRENT_PROJECT_VERSION = 13;/g)||[]).length,2);
 assert.equal((updated.iosProject.match(/MARKETING_VERSION = 1.2.3;/g)||[]).length,2);
});

test('check fails when a native project is not synchronized',()=>{
 const files={androidPath:'unused',iosPath:'unused',androidGradle:android,iosProject:ios};
 const config='{ "marketingVersion": "1.2.3", "androidVersionCode": 12, "iosBuildNumber": 13 }';
 assert.throws(()=>synchronizeNativeRelease('--check',files,config),/out of sync/);
});
