const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function game(initial=null,blocked=false){
 const {document,window}=parseHTML(fs.readFileSync('index.html','utf8'));let stored=initial?JSON.stringify(initial):null;const timers=[];
 document.getElementById('modal').showModal=function(){this.open=true};document.getElementById('modal').close=function(){this.open=false};
 const registrations=[];document.modelContext={registerTool(tool){registrations.push(tool)}};
 const ctx={document,window,navigator:{},localStorage:{getItem(){if(blocked)throw Error('unavailable');return stored},setItem(k,v){if(blocked)throw Error('unavailable');stored=v}},location:{protocol:'https:'},console,setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},Blob,URL,FileReader:class{readAsText(file){this.result=file.content;this.onload()}}};vm.createContext(ctx);
 for(const path of ['src/data.js','src/core.js','src/game.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
 const get=id=>document.getElementById(id),click=selector=>{const el=document.querySelector(selector);assert.ok(el,'must have '+selector);assert.ok(!el.disabled,'must be enabled '+selector);el.click();return el};
 return {document,ctx,get,click,registrations,flush(){while(timers.length)timers.shift()()},saved:()=>JSON.parse(stored)};
}
test('new explorer can travel, capture all 16 groups and obtain completion rewards',()=>{
 const g=game();assert.equal(g.get('region-info').textContent.includes('栖光研究所'),true);
 for(const region of g.ctx.BIO.regions.filter(r=>r.pool.length)){
  g.click(`[data-region="${region.id}"]`);g.flush();
  for(let i=0;i<region.pool.length;i++){
   g.click('#explore-btn');for(let j=0;j<3;j++){g.click('[data-answer="0"]');g.click('#next-question')}
   assert.ok(g.get('modal-content').textContent.includes('图鉴进度'));g.click('#keep-exploring');
  }
 }
 const s=g.saved();assert.equal(s.caught.length,16);assert.equal(s.research,620);assert.equal(s.badges.length,4);
 g.click('[data-view="dex"]');assert.equal(g.document.querySelectorAll('.dex-card').length,16);
 g.click('[data-filter="plant"]');assert.equal(g.document.querySelectorAll('.dex-card').length,5);
 g.click('[data-view="research"]');assert.equal(g.document.querySelectorAll('.task-card.done').length,3);
});
test('three mistaken observations end encounter, preserve notebook and review clears it',()=>{
 const g=game();g.click('#explore-btn');g.flush();g.click('#explore-btn');
 for(let i=0;i<3;i++){g.click('[data-answer="1"]');assert.ok(g.get('feedback').textContent.length>20);g.click('#next-question')}
 assert.equal(g.saved().caught.length,0);assert.equal(g.saved().mistakes.length,1);g.click('#back-map');g.click('[data-view="research"]');g.click('#review-btn');g.click('[data-answer="0"]');g.click('#trial-next');assert.equal(g.saved().mistakes.length,0);g.click('#trial-done');assert.ok(g.get('review-btn').disabled);
});
test('training wins reward research and level companions; losses add only practice experience',()=>{
 const g=game({version:2,caught:['zao'],xp:{zao:20},research:20});g.click('#train-btn');
 for(let i=0;i<3;i++){g.click('[data-answer="0"]');g.click('#trial-next')}
 assert.equal(g.saved().xp.zao,50);assert.equal(g.saved().research,45);assert.equal(g.saved().trials,1);g.click('#trial-done');g.click('#train-btn');
 for(let i=0;i<3;i++){g.click('[data-answer="1"]');g.click('#trial-next')}
 assert.equal(g.saved().xp.zao,60);assert.equal(g.saved().research,45);assert.equal(g.saved().mistakes.length,3);
});
test('saved progress is restored and storage restrictions do not stop play',()=>{
 const first=game({version:2,caught:['zao'],xp:{zao:40},research:100,region:'moss'});assert.ok(first.get('region-info').textContent.includes('雾蕨幽林'));assert.equal(first.document.querySelectorAll('.party-slot[data-detail]').length,1);
 const g=game(null,true);assert.ok(g.get('save-status').textContent.includes('导出'));g.click('#explore-btn');g.flush();g.click('#explore-btn');assert.ok(g.document.querySelectorAll('[data-answer]').length===3);
});
test('new explorers receive actionable training instructions and every guide card opens',()=>{
 const g=game();g.click('#train-btn');g.click('#training-first');g.flush();assert.equal(g.saved().region,'tide');g.click('[data-view="dex"]');
 for(const c of g.ctx.BIO.creatures){g.click(`.dex-card[data-detail="${c.id}"]`);assert.ok(g.get('modal-content').textContent.includes(c.group));assert.equal(g.document.querySelectorAll('.feature-list li').length,3);g.click('#close-modal')}
});
test('rapid answer clicks cannot double advance the same question',()=>{
 const g=game();g.click('#explore-btn');g.flush();g.click('#explore-btn');const answer=g.click('[data-answer="0"]');answer.click();g.click('#next-question');assert.ok(g.get('modal-content').textContent.includes('特征观察 2 / 3'));
});
test('import requires confirmation, restores valid save and ignores invalid files',()=>{
 const g=game();const field=g.get('import-file');field.onchange({target:{files:[{size:10,content:'{"version":2,"caught":["zao"],"research":60,"xp":{"zao":40}}'}],value:''}});
 assert.equal(g.saved().caught.length,0);g.click('#confirm-import');assert.equal(g.saved().caught.join(','),'zao');assert.equal(g.saved().research,60);
 field.onchange({target:{files:[{size:5,content:'broken'}],value:''}});assert.equal(g.saved().caught.join(','),'zao');assert.ok(g.get('toast').textContent.includes('无法识别'));
});
test('WebMCP tools register on the document context and share visible state',async()=>{
 const g=game();assert.equal(g.registrations.length,2);const read=g.registrations.find(t=>t.name==='inspect_expedition'),move=g.registrations.find(t=>t.name==='travel_to_habitat');
 assert.ok(read.annotations.readOnlyHint);const bad=await move.execute({region:'invalid'});assert.ok(bad.error);assert.equal(g.saved().region,'lab');
 const pending=move.execute({region:'moss'});g.flush();const result=await pending;assert.equal(result.region,'雾蕨幽林');assert.equal((await read.execute({})).region,'雾蕨幽林');
});
test('researcher portrait opens without changing progress and movement has direction and rest states',()=>{
 const g=game();const before=JSON.stringify(g.saved());g.click('#researcher-btn');assert.ok(g.get('modal-content').textContent.includes('岑叶'));assert.ok(g.get('modal-content').textContent.includes('野外研究员'));g.click('#close-modal');assert.equal(JSON.stringify(g.saved()),before);
 g.click('[data-region="tide"]');assert.equal(g.get('hero').dataset.facing,'left');assert.ok(g.get('hero').classList.contains('walking'));g.flush();assert.ok(!g.get('hero').classList.contains('walking'));
 g.click('[data-region="moss"]');assert.equal(g.get('hero').dataset.facing,'up');g.flush();g.click('[data-region="pine"]');assert.equal(g.get('hero').dataset.facing,'right');g.flush();
 g.click('[data-region="wetland"]');assert.equal(g.get('hero').dataset.facing,'down');g.flush();assert.equal(g.saved().caught.length,0);
});
test('updated game entrypoint versions styles and scripts to invalidate older browser caches',()=>{
 const {document}=parseHTML(fs.readFileSync('index.html','utf8'));const version=require('../package.json').version;
 for(const el of document.querySelectorAll('script[src],link[rel="stylesheet"]'))assert.ok((el.getAttribute('src')||el.getAttribute('href')).includes('v='+version));
});
