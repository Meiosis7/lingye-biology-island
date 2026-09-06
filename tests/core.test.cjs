const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const file of ['src/data.js','src/core.js']) if(fs.existsSync(file)) vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const D=ctx.BIO,C=ctx.Core;
test('curriculum covers 5 plant, 6 invertebrate and 5 vertebrate groups',()=>{
 assert.ok(D,'curriculum must exist');assert.equal(D.creatures.length,16);
 for(const [kind,n] of [['plant',5],['invert',6],['vert',5]]) assert.equal(D.creatures.filter(c=>c.kind===kind).length,n);
 assert.equal(new Set(D.creatures.map(c=>c.id)).size,16);
 for(const c of D.creatures){assert.equal(c.questions.length,3);for(const q of c.questions){assert.equal(q.options.length,3);assert.ok(q.answer>=0&&q.answer<3);assert.ok(q.explanation.length>8);}}
});
test('every creature can be encountered in a matching habitat',()=>{
 assert.ok(C,'mechanics must exist');for(const c of D.creatures) assert.ok(D.regions.some(r=>C.pool(r.id).some(x=>x.id===c.id)));
});
test('three correct identifications capture and wrong answers do not advance',()=>{
 assert.ok(C);let s=C.newEncounter('zao');s=C.answer(s,false);assert.equal(s.step,0);assert.equal(s.wrong,1);
 s=C.answer(s,true);s=C.answer(s,true);assert.equal(s.status,'active');s=C.answer(s,true);assert.equal(s.status,'caught');
 assert.equal(C.answer(s,true).step,3);
});
test('three errors end an encounter',()=>{
 assert.ok(C);let s=C.newEncounter('zao');for(let i=0;i<3;i++)s=C.answer(s,false);assert.equal(s.status,'fled');
});
test('repeated captures add experience without duplicate entries',()=>{
 assert.ok(C);let s=C.freshSave();s=C.collect(s,'zao');s=C.collect(s,'zao');assert.equal(s.caught.length,1);assert.equal(s.xp.zao,40);assert.equal(s.research,40);assert.equal(C.level(s.xp.zao),2);
});
test('corrupt or malicious saves cannot inject unknown creatures or invalid scores',()=>{
 assert.ok(C);const s=C.sanitize({caught:['zao','zao','<img>'],xp:{zao:-5,missing:99},research:-100,region:'bad',mistakes:['bad']});
 assert.equal(s.caught.join(','),'zao');assert.equal(s.xp.zao,0);assert.equal(s.research,0);assert.equal(s.region,'lab');assert.equal(s.mistakes.length,0);
 assert.equal(C.sanitize(null).caught.length,0);
});
test('completed research rewards are granted exactly once',()=>{
 assert.ok(C);let s=C.freshSave();for(const c of D.creatures.filter(c=>c.kind==='plant'))s=C.collect(s,c.id);
 const points=s.research;s=C.reward(s);assert.equal(s.research,points);assert.ok(s.badges.includes('plant'));
});
