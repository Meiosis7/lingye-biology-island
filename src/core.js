globalThis.Core=(()=>{
 const valid=id=>BIO.creatures.some(c=>c.id===id);
 const number=(v,max=999999)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
 const freshSave=()=>({version:2,caught:[],xp:{},research:0,region:'lab',mistakes:[],badges:[],trials:0,sound:false});
 const pool=region=>BIO.creatures.filter(c=>BIO.regions.find(r=>r.id===region)?.pool.includes(c.id));
 const sanitize=input=>{
  const s=freshSave();if(!input||typeof input!=='object')return s;
  s.caught=[...new Set(Array.isArray(input.caught)?input.caught.filter(valid):[])];
  s.caught.forEach(id=>s.xp[id]=number(input.xp?.[id],20000));s.research=number(input.research);
  s.region=BIO.regions.some(r=>r.id===input.region)?input.region:'lab';
  s.mistakes=[...new Set(Array.isArray(input.mistakes)?input.mistakes.filter(k=>typeof k==='string'&&/^\w+:[012]$/.test(k)&&valid(k.split(':')[0])):[])];
  s.badges=Array.isArray(input.badges)?[...new Set(input.badges.filter(k=>['plant','invert','vert','all'].includes(k)))]:[];
  s.trials=number(input.trials);s.sound=input.sound===true;return s;
 };
 const reward=s=>{
  for(const kind of ['plant','invert','vert','all']){
   const target=BIO.creatures.filter(c=>kind==='all'||c.kind===kind);
   if(target.every(c=>s.caught.includes(c.id))&&!s.badges.includes(kind)){s.badges.push(kind);s.research+=kind==='all'?150:50;}
  }return s;
 };
 const collect=(input,id)=>{const s=sanitize(input);if(!valid(id))return s;if(!s.caught.includes(id))s.caught.push(id);s.xp[id]=(s.xp[id]||0)+20;s.research+=20;return reward(s)};
 const newEncounter=id=>({id,step:0,wrong:0,status:'active'});
 const answer=(e,correct)=>{if(e.status!=='active')return {...e};const n={...e};if(correct)n.step++;else n.wrong++;n.status=n.step>=3?'caught':n.wrong>=3?'fled':'active';return n};
 const level=xp=>Math.min(20,1+Math.floor(number(xp)/40));
 const facingBetween=(from,to,previous='down')=>{
  const dx=to.x-from.x,dy=to.y-from.y;if(dx===0&&dy===0)return previous;
  return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
 };
 return {freshSave,pool,sanitize,reward,collect,newEncounter,answer,level,facingBetween};
})();
