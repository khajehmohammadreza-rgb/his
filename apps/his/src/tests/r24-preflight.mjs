/** R24 release preflight; run: node tests/r24-preflight.mjs */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts=null;
try{ts=require('typescript');}catch(_){
  try{const globalRoot=execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim();ts=require(path.join(globalRoot,'typescript'));}catch(_){}
}
const root=path.resolve(import.meta.dirname,'..');
const all=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(item.name==='.git')continue;const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else all.push(p);}}
walk(root);
const errors=[],warnings=[];
if(!ts)warnings.push('TypeScript optional parser unavailable; Node syntax checks still executed.');
const check=(condition,message)=>{if(!condition)errors.push(message);};
const js=all.filter(f=>/\.(m?js)$/.test(f));
const php=all.filter(f=>/\.php$/.test(f));
const json=all.filter(f=>/\.json$/.test(f));
let imports=0;
for(const f of js){
 const relative=path.relative(root,f);
 try{execFileSync(process.execPath,['--check',f],{stdio:'pipe',timeout:15000});}catch(e){errors.push(`Node syntax ${relative}: ${e.stderr?.toString().slice(-260)}`);}
 const source=fs.readFileSync(f,'utf8');
 if(ts){const ast=ts.createSourceFile(relative,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
   for(const d of ast.parseDiagnostics||[]) errors.push(`Independent TS parser ${relative}@${d.start}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
 }
 for(const m of source.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*['"](\.[^'"]+)['"]/g)){
  imports++;const target=m[1].split('?')[0].split('#')[0];
  if(!fs.existsSync(path.resolve(path.dirname(f),target)))errors.push(`Missing import: ${relative} -> ${target}`);
 }
 if(relative.startsWith('app/') && !['app/bastiyan-app.bundle.js','app/vendor-runtime.js'].includes(relative)){
  if(/\?b=r23-513-1405/.test(source))errors.push(`Stale R23 import ${relative}`);
 }
}
for(const f of php){try{execFileSync('php',['-l',f],{stdio:'pipe',timeout:15000});}catch(e){errors.push(`PHP syntax ${path.relative(root,f)}: ${e.stderr?.toString().slice(-240)}`);}}
for(const f of json){try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){errors.push(`JSON ${path.relative(root,f)}: ${e.message}`);}}
const version=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
check(version.version==='5.1.4','Expected 5.1.4 version');check(version.buildNumber===514,'Expected build 514');
const required=['index.html','portal.js','app/main457-final.js','app/App457-final.js','app/utils/barcodeDecoder.js','app/components/BarcodeCameraScanner434.js','api/updater.php'];
for(const f of required)check(fs.existsSync(path.join(root,f)),`Required ${f}`);
const summary={date:'2026-10-10',version:version.version,javaScript:js.length,php:php.length,json:json.length,importsChecked:imports,independentParser:ts?'TypeScript JS grammar':'not installed (Node syntax only)',errors,warnings};
console.log(JSON.stringify(summary,null,2));
if(errors.length)process.exitCode=1;
