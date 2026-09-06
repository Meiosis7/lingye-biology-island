(() => {
'use strict';
const $=id=>document.getElementById(id), creatures=BIO.creatures, regions=BIO.regions;
const KEY='lingye-expedition-v2';
let save,storageOK=true;
try{save=Core.sanitize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{save=Core.freshSave();storageOK=false}
let view='map',filter='all',encounter=null,trial=null,audio=null,moving=false,toastTimer,lastFocus=null;
const cBy=id=>creatures.find(c=>c.id===id),rBy=id=>regions.find(r=>r.id===id);
const shuffle=arr=>arr.map(x=>({x,n:Math.random()})).sort((a,b)=>a.n-b.n).map(o=>o.x);
const sprite=c=>`<span class="sprite" role="img" aria-label="${c.name}的像素形象" style="background-position:${([10,394,778,1162][c.index%4]/1176*100).toFixed(5)}% ${([20,290,526,758][Math.floor(c.index/4)]/764*100).toFixed(5)}%;clip-path:inset(0 0 ${[0,8,12,0][Math.floor(c.index/4)]}% 0)"></span>`;
const title=(tag,text)=>`<div class="modal-heading"><p class="eyebrow">${tag}</p><h2 id="modal-title">${text}</h2></div>`;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));storageOK=true}catch{storageOK=false}$('save-status').innerHTML=`<i></i>${storageOK?'进度已保存':'请导出存档'}`;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200)}
function sound(type='click'){
 if(!save.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const notes=type==='success'?[523,659,784,1047]:type==='wrong'?[196,147]:[392,523];notes.forEach((n,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.095;o.type='triangle';o.frequency.value=n;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.22)})}catch{/* Audio is optional. */}
}
function openModal(html){lastFocus=$('modal').open?lastFocus:document.activeElement;$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();$('modal').scrollTop=0;}
function closeModal(){encounter=null;trial=null;$('modal').close();if(lastFocus?.isConnected)lastFocus.focus();}
function setView(next){view=next;['map','dex','research'].forEach(v=>{$('view-'+v).classList.toggle('hidden',v!==view);document.querySelector(`[data-view="${v}"]`).classList.toggle('active',v===view)});if(view==='dex')renderDex();if(view==='research')renderResearch();sound();}
function renderPins(){
 $('map-pins').innerHTML=regions.map(r=>`<button class="map-pin ${r.id===save.region?'current':''}" style="left:${r.x}%;top:${r.y}%" data-region="${r.id}" aria-label="前往${r.name}" ${r.id===save.region?'aria-current="location"':''}><span class="pin-label"><span class="pin-icon">${r.icon}</span>${r.name}${r.pool.length&&r.pool.every(id=>save.caught.includes(id))?'<span class="pin-check">✓</span>':''}</span></button>`).join('');
 document.querySelectorAll('[data-region]').forEach(el=>el.onclick=()=>travel(el.dataset.region));
 const r=rBy(save.region);$('hero').style.left=r.x+'%';$('hero').style.top=r.y+'%';
}
function renderRegion(){const r=rBy(save.region),pool=Core.pool(r.id);
 $('area-index').textContent=String(regions.indexOf(r)).padStart(2,'0')+' / 05';
 $('region-info').innerHTML=`<h2 class="region-title">${r.name}</h2><p class="region-en">${r.en}</p><span class="habitat">${r.habitat}</span><p class="region-description">${r.description}</p>`;
 $('local-count').textContent=pool.length?`${pool.filter(c=>save.caught.includes(c.id)).length} / ${pool.length} 已收录`:'研究员服务站';
 $('local-creatures').innerHTML=pool.length?pool.map(c=>`<button class="local-card" data-detail="${c.id}" aria-label="查看${c.name}">${sprite(c)}<small>${c.name}</small>${save.caught.includes(c.id)?'<span class="collected-dot">✓</span>':''}</button>`).join(''):'<div class="lab-local">下一站：<button class="mini-link" id="first-trip">澄蓝潮湾 ↗</button><br>这里能遇见藻露团与触星葵。</div>';
 $('explore-btn').innerHTML=r.id==='lab'?'前往澄蓝潮湾 <span>↗</span>':'探索这片栖息地 <span>↗</span>';
 $('explore-btn').disabled=moving;
 $('explore-note').textContent=r.id==='lab'?'从潮湾出发，记录你的第一次相遇。':'观察 3 个特征，邀请生灵成为伙伴。';
 $('first-trip')?.addEventListener('click',()=>travel('tide'));bindDetails($('local-creatures'));
}
function travel(id){if(moving||!rBy(id))return;if(id===save.region){renderRegion();return}save.region=id;moving=true;$('hero').classList.add('walking');renderPins();renderRegion();persist();sound();setTimeout(()=>{moving=false;$('hero').classList.remove('walking');renderRegion()},1000)}
function renderMission(){
 const kinds=['plant','invert','vert'],incomplete=kinds.find(k=>!creatures.filter(c=>c.kind===k).every(c=>save.caught.includes(c.id)));
 let n=save.caught.length,max=1,text='记录第一位生灵伙伴',copy='找到它，辨认 3 个正确特征。',reward='每次收录 +20 研究点';
 if(n>0&&incomplete){const pool=creatures.filter(c=>c.kind===incomplete);n=pool.filter(c=>save.caught.includes(c.id)).length;max=pool.length;text='完成'+BIO.kinds[incomplete]+'卷';copy='在不同栖息地寻找尚未收录的类群。';reward='完成本卷 +50 研究点'}else if(n===16){n=16;max=16;text='生命群岛 · 全图鉴达成';copy='你已记录全部 16 个类群，试试分类训练吧。';reward='自然研究员 ✓'}
 $('mission-title').textContent=text;$('mission-copy').textContent=copy;$('mission-status').textContent=n+' / '+max;$('mission-reward').textContent=reward;$('mission-progress').style.width=Math.min(100,n/max*100)+'%';
}
function renderParty(){
 $('party-count').textContent=String(save.caught.length).padStart(2,'0');$('nav-count').textContent=String(save.caught.length).padStart(2,'0');
 const ids=[...save.caught].sort((a,b)=>save.xp[b]-save.xp[a]).slice(0,6);
 $('party-slots').innerHTML=Array.from({length:6},(_,i)=>ids[i]?`<button class="party-slot" data-detail="${ids[i]}" title="${cBy(ids[i]).name} · Lv.${Core.level(save.xp[ids[i]])}">${sprite(cBy(ids[i]))}<small>Lv.${Core.level(save.xp[ids[i]])}</small></button>`:`<span class="party-slot empty" aria-label="等待伙伴">+</span>`).join('');bindDetails($('party-slots'));
}
function renderAll(){renderPins();renderRegion();renderMission();renderParty();if(view==='dex')renderDex();if(view==='research')renderResearch();$('sound-btn').style.color=save.sound?'var(--accent)':'';$('sound-btn').setAttribute('aria-label',save.sound?'关闭音效':'开启音效');}
function bindDetails(parent){parent.querySelectorAll('[data-detail]').forEach(el=>el.onclick=()=>showDetail(el.dataset.detail))}
function explore(){if(moving||$('modal').open)return;if(save.region==='lab'){travel('tide');return}const pool=Core.pool(save.region),unseen=pool.filter(c=>!save.caught.includes(c.id));const c=shuffle(unseen.length?unseen:pool)[0];encounter=Core.newEncounter(c.id);sound();renderEncounter();}
function stage(c,tag='野外相遇'){return `<div class="encounter-stage"><span class="number">NO. ${c.number} / ${tag}</span>${sprite(c)}<div><h3>${c.name}</h3><p class="tag">${BIO.kinds[c.kind]} · ${c.group}</p></div></div>`}
function choices(q){return shuffle(q.options.map((text,i)=>({text,i}))).map((o,n)=>`<button class="answer-option" data-answer="${o.i}"><span>${String.fromCharCode(65+n)}</span>${o.text}</button>`).join('')}
function renderEncounter(){
 const c=cBy(encounter.id),q=c.questions[encounter.step];
 openModal(title('A NEW ENCOUNTER · '+rBy(save.region).en,'草叶间，传来了一点动静。')+`<div class="encounter-layout">${stage(c)}<div class="encounter-body"><div class="encounter-status"><span>特征观察 ${encounter.step+1} / 3</span><div class="steps">${[0,1,2].map(i=>`<i class="${i<encounter.step?'done':''}"></i>`).join('')}</div><span class="hearts" title="剩余观察机会">${'◆'.repeat(3-encounter.wrong)}${'◇'.repeat(encounter.wrong)}</span></div><p class="question">${q.prompt}</p><div class="answer-options">${choices(q)}</div><div id="feedback"></div><p class="encounter-hint">辨认全部 3 个特征即可收录；误判 3 次，相遇结束。</p></div></div>`);
 document.querySelectorAll('[data-answer]').forEach(el=>el.onclick=()=>answerEncounter(Number(el.dataset.answer),el,q));
}
function markAnswers(selected,q,correct){document.querySelectorAll('[data-answer]').forEach(el=>{el.disabled=true;if(Number(el.dataset.answer)===q.answer)el.classList.add('correct')});if(!correct)selected.classList.add('wrong')}
function remember(id,step){const key=id+':'+step;if(!save.mistakes.includes(key))save.mistakes.push(key);persist()}
function answerEncounter(choice,el,q){if(!encounter||el.disabled)return;const correct=choice===q.answer;markAnswers(el,q,correct);if(!correct)remember(encounter.id,encounter.step);encounter=Core.answer(encounter,correct);sound(correct?'click':'wrong');
 $('feedback').innerHTML=`<div class="answer-feedback ${correct?'':'error'}"><b>${correct?'观察正确。':'再看仔细一点。'}</b> ${q.explanation}</div><button id="next-question" class="primary wide next-btn">${encounter.status==='caught'?'邀请成为伙伴 ✦':encounter.status==='fled'?'结束这次观察':'继续观察 →'}</button>`;
 $('next-question').onclick=()=>{if(encounter.status==='caught')capture();else if(encounter.status==='fled')fled();else renderEncounter()};
}
function capture(){const c=cBy(encounter.id),was=save.caught.includes(c.id),before=save.research;save=Core.collect(save,c.id);persist();renderAll();encounter=null;sound('success');
 openModal(`<div class="result"><p class="eyebrow" style="justify-content:center">${was?'A FAMILIAR FRIEND':'COMPENDIUM UPDATED'}</p>${sprite(c)}<h2>${was?'再会，':'初次见面，'}${c.name}！</h2><p>${was?'你们的默契又增加了。':'新的类群已收录，生灵加入同行伙伴。'}<br>${c.features[0]}</p><div class="result-stats"><div><strong>+${save.research-before}</strong><span>研究点</span></div><div><strong>+20</strong><span>伙伴经验</span></div><div><strong>${save.caught.length}/16</strong><span>图鉴进度</span></div></div>${save.caught.length===16?'<div class="completed-banner">✦ 全图鉴完成 · 获得「自然研究员」称号</div>':''}<div class="button-row"><button id="keep-exploring" class="primary">继续探险 →</button><button id="caught-detail" class="outline">查看图鉴</button></div></div>`);
 $('keep-exploring').onclick=closeModal;$('caught-detail').onclick=()=>showDetail(c.id);
}
function fled(){const c=cBy(encounter.id);encounter=null;openModal(`<div class="result">${sprite(c)}<h2>它轻轻回到了栖息地。</h2><p>刚才混淆的知识点已经记入研究手册。<br>整理好观察，再来认识它吧。</p><div class="button-row"><button id="retry" class="primary">再探索一次</button><button id="back-map" class="outline">返回地图</button></div></div>`);$('retry').onclick=()=>{closeModal();explore()};$('back-map').onclick=closeModal;}
function renderDex(){const list=creatures.filter(c=>filter==='all'||c.kind===filter);$('dex-total').textContent=String(save.caught.length).padStart(2,'0')+' / 16';$('dex-grid').innerHTML=list.map(c=>`<button class="dex-card" data-detail="${c.id}"><span class="dex-num">NO. ${c.number}</span><span class="dex-state">${save.caught.includes(c.id)?'✦ 已收录 · Lv.'+Core.level(save.xp[c.id]):'待野外收录'}</span>${sprite(c)}<h3>${c.name}</h3><span class="tag">${c.group}</span><p>${rBy(c.region).name}</p><span class="arrow">↗</span></button>`).join('');bindDetails($('dex-grid'))}
function showDetail(id){const c=cBy(id),owned=save.caught.includes(id),lv=Core.level(save.xp[id]);openModal(title('FIELD RECORD · NO. '+c.number,'生灵观察档案')+`<div class="detail-layout"><div class="detail-stage">${sprite(c)}<div><h3>${c.name}</h3><p>${c.latin}</p><p>${owned?'✦ 已收录 / LV. '+lv:'尚未收录'}</p><div class="skill-tags">${c.skills.map((s,i)=>`<span>${owned&&lv>=[1,2,4][i]?'✦ ':'Lv.'+[1,2,4][i]+' '}${s}</span>`).join('')}</div></div></div><div class="detail-body"><p class="eyebrow">${BIO.kinds[c.kind]} / ${c.group}</p><h4>真实类群特征</h4><ul class="feature-list">${c.features.map(f=>`<li>${f}</li>`).join('')}</ul><h4>名字与形象</h4><p>${c.meaning}<br>${c.design}</p><h4>真实原型</h4><p>${c.prototype}</p><div class="note-box">${c.note}</div></div></div><div class="detail-actions"><button id="detail-travel" class="primary">去${rBy(c.region).name}寻找 ↗</button></div>`);$('detail-travel').onclick=()=>{closeModal();setView('map');travel(c.region)}}
function renderResearch(){
 $('research-points').textContent=save.research;$('research-tasks').innerHTML=['plant','invert','vert'].map((kind,i)=>{const pool=creatures.filter(c=>c.kind===kind),n=pool.filter(c=>save.caught.includes(c.id)).length;return `<div class="task-card ${n===pool.length?'done':''}"><span class="stamp">${['❧','◇','✦'][i]}</span><p class="tiny">VOLUME 0${i+1}</p><h3>${BIO.kinds[kind]}卷</h3><p>${['从藻丝到花果，辨认五类植物。','观察体节、对称与保护结构。','比较呼吸、生殖和体表特征。'][i]}</p><div class="meter"><i style="width:${n/pool.length*100}%"></i></div><div class="task-count"><span>${n} / ${pool.length} 类群</span><span>${n===pool.length?'✓ 已获得 50 研究点':'+50 研究点'}</span></div></div>`}).join('');
 $('mistake-count').textContent=save.mistakes.length+' 个知识点';$('mistake-list').innerHTML=save.mistakes.length?save.mistakes.slice(0,5).map(key=>{const [id,index]=key.split(':'),c=cBy(id);return `<button class="mistake-item" data-detail="${id}"><strong>${c.name} · ${c.group}</strong>${c.questions[index].prompt}</button>`}).join('')+(save.mistakes.length>5?`<p class="empty-note">另有 ${save.mistakes.length-5} 项，复习时会逐一出现。</p>`:''):'<div class="empty-note">暂无待巩固记录。<br>在探索与训练中，误判的特征会自动记在这里。</div>';
 $('review-btn').disabled=!save.mistakes.length;bindDetails($('mistake-list'));
}
function startTrial(review=false){
 if(!review&&!save.caught.length){openModal(title('TRAINING GROUNDS','先邀请一位同行伙伴')+'<div class="help-content"><p>分类训练由伙伴上场。先去任意生态区探索，完成 3 次特征观察，收录第一位生灵。</p><button id="training-first" class="primary wide next-btn">前往澄蓝潮湾 →</button></div>');$('training-first').onclick=()=>{closeModal();setView('map');travel('tide')};return}
 if(review&&!save.mistakes.length){toast('目前没有待巩固的知识点。');return}
 const keys=review?shuffle([...save.mistakes]):shuffle(creatures.flatMap(c=>c.questions.map((_,i)=>c.id+':'+i))).slice(0,5);
 const ally=[...save.caught].sort((a,b)=>save.xp[b]-save.xp[a])[0]||null;
 trial={review,keys,index:0,correct:0,wrong:0,ally};renderTrial();
}
function renderTrial(){const key=trial.keys[trial.index],[id,index]=key.split(':'),c=cBy(id),q=c.questions[index];
 const status=trial.review?`<div class="trial-bar"><span>${trial.index+1} / ${trial.keys.length}</span><div class="meter"><i style="width:${trial.index/trial.keys.length*100}%"></i></div><span>知识巩固</span></div>`:`<div class="battle-line"><div><b>${cBy(trial.ally).name} Lv.${Core.level(save.xp[trial.ally])}</b>专注 ${Math.max(0,100-trial.wrong*34)} / 100<div class="meter"><i style="width:${Math.max(0,100-trial.wrong*34)}%"></i></div></div><div><b>分类守门员</b>防线 ${Math.max(0,100-trial.correct*34)} / 100<div class="meter enemy"><i style="width:${Math.max(0,100-trial.correct*34)}%"></i></div></div></div>`;
 openModal(title(trial.review?'KNOWLEDGE REVISIT':'CLASSIFICATION CHALLENGE',trial.review?'让模糊的知识，重新清晰。':'用知识，为伙伴发出指令。')+`<div class="encounter-layout">${stage(c,trial.review?'复习对象':'辨认目标')}<div class="encounter-body">${status}<p class="question">${q.prompt}</p><div class="answer-options">${choices(q)}</div><div id="feedback"></div><p class="encounter-hint">${trial.review?'答对后从待巩固记录中移除。':'答对发动技能，答错消耗专注；先答对 3 题获胜。'}</p></div></div>`);
 document.querySelectorAll('[data-answer]').forEach(el=>el.onclick=()=>{if(el.disabled||!trial)return;const correct=Number(el.dataset.answer)===q.answer;markAnswers(el,q,correct);if(correct){trial.correct++;if(trial.review)save.mistakes=save.mistakes.filter(k=>k!==key)}else{trial.wrong++;remember(id,index)}persist();sound(correct?'click':'wrong');
 const skill=trial.ally?cBy(trial.ally).skills[Math.min(Core.level(save.xp[trial.ally])>=4?2:Core.level(save.xp[trial.ally])>=2?1:0,trial.correct%3)]:'';
 $('feedback').innerHTML=`<div class="answer-feedback ${correct?'':'error'}"><b>${correct?(trial.review?'已掌握。':`发动「${skill}」！`):'记录这个区别。'}</b> ${q.explanation}</div><button id="trial-next" class="primary wide next-btn">继续 →</button>`;$('trial-next').onclick=()=>{trial.index++;if(trial.index>=trial.keys.length||(!trial.review&&(trial.correct>=3||trial.wrong>=3)))finishTrial();else renderTrial()};});
}
function finishTrial(){const t=trial,won=t.correct>=3;if(!t.review){save.xp[t.ally]+=won?30:10;if(won){save.research+=25;save.trials++}}persist();renderAll();trial=null;sound(won||t.review?'success':'wrong');openModal(`<div class="result"><p class="eyebrow" style="justify-content:center">${t.review?'REVIEW COMPLETE':won?'CHALLENGE COMPLETE':'KEEP OBSERVING'}</p>${t.ally?sprite(cBy(t.ally)):sprite(cBy(t.keys[0].split(':')[0]))}<h2>${t.review?'观察笔记，更新完毕。':won?'分类挑战，胜利！':'练习结束，继续积累。'}</h2><p>${t.review?`本轮掌握 ${t.correct} 个知识点，尚有 ${save.mistakes.length} 个待巩固。`:won?'伙伴的技能来自你掌握的生物知识。':'误判的知识点已记入研究手册。'}</p><div class="result-stats"><div><strong>${t.correct}/${t.index}</strong><span>正确辨认</span></div>${!t.review?`<div><strong>+${won?30:10}</strong><span>伙伴经验</span></div><div><strong>+${won?25:0}</strong><span>研究点</span></div>`:''}</div><button id="trial-done" class="primary">继续探险 →</button></div>`);$('trial-done').onclick=closeModal;}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportSave(){download('灵野图鉴-探险存档.json',JSON.stringify(save,null,2),'application/json');toast('存档已导出，换设备时可在研究手册导入。')}
async function downloadGame(){
 if(location.protocol==='file:'){toast('当前文件就是离线游戏，复制这份 HTML 即可带走。');return}
 try{const response=await fetch('./灵野图鉴-离线版.html');if(!response.ok)throw Error('missing');download('灵野图鉴-离线版.html',await response.text(),'text/html;charset=utf-8');toast('离线游戏已下载。原进度请另行导出存档。')}catch{toast('离线包暂时无法下载，请使用交付文件中的离线版。')}
}
function importSave(file){if(!file)return;if(file.size>1000000){toast('存档文件过大，请选择导出的 JSON 存档。');return}const reader=new FileReader();reader.onload=()=>{try{const raw=JSON.parse(reader.result);if(raw.version!==2||!Array.isArray(raw.caught))throw Error('format');const next=Core.sanitize(raw);openModal(title('RESTORE EXPEDITION','导入探险存档')+`<div class="result"><p>将用这份存档替换本浏览器的当前进度。<br>图鉴 ${next.caught.length}/16 · 研究点 ${next.research}</p><div class="confirm-row"><button id="confirm-import" class="primary">导入这份存档</button><button id="cancel-import" class="outline">取消</button></div></div>`);$('confirm-import').onclick=()=>{save=next;persist();closeModal();renderAll();toast('探险进度已恢复。')};$('cancel-import').onclick=closeModal;}catch{toast('无法识别这份存档，请选择灵野图鉴导出的 JSON 文件。')}};reader.readAsText(file)}
function help(credits=false){openModal(title(credits?'ABOUT THIS EXPEDITION':'EXPLORER’S GUIDE',credits?'关于灵野图鉴':'你的第一本探险指南')+`<div class="help-content">${credits?`<p>《灵野图鉴 · 生命群岛》是一款原创生物类群收集游戏。名字、角色与地图为本项目设计，像素画由 AI 辅助生成。游戏中的表情、技能和伙伴行为属于艺术拟人化，不能当作真实生物结构。</p><h3>知识范围</h3><p>涵盖初中常见的 5 个植物类群、6 个无脊椎动物类群和 5 个脊椎动物类群。采用传统教学类群便于学习，类群不是同一级分类单位，也不代表全部生物。“藻类”“腔肠动物”等名称在现代分类中有更细的划分。</p><h3>形象与知识的边界</h3><p>以图鉴中的“真实类群特征”为准。图形中的脸、光泽和夸张轮廓是识别设计；比例不同于自然实物。藻类不画真正根茎叶、蕨类不画花果，植物精灵的拟人化不表示它们属于动物。</p><h3>教材与知识参考</h3><p>${BIO.sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label} ↗</a>`).join('<br>')}</p><h3>保存与离线使用</h3><p>游戏不需要账号。进度保存在当前浏览器；浏览器清理数据可能清除进度。研究手册可导出、导入存档，也可下载离线 HTML。离线文件可直接双击打开。</p>`:`<p>你是栖光研究所的新研究员。走进五片生态栖息地，认识 16 种原创生灵，把每一次相遇记进图鉴。</p><ol><li><b>选择地点：</b>点击地图地名，或用方向键 / WASD 切换地区。</li><li><b>观察生灵：</b>点击探索或按空格；系统优先寻找该区域尚未收录的伙伴。</li><li><b>辨认特征：</b>答对 3 个特征即可收录；误判 3 次，这次相遇结束。答错会显示解释并加入复习记录。</li><li><b>查阅与训练：</b>图鉴可随时阅读。收录伙伴后，分类训练答对即可发动技能，先答对 3 题获胜。</li><li><b>完成研究：</b>三卷图鉴各奖励 50 研究点；全收集额外奖励 150 点，解锁自然研究员称号。</li></ol><h3>伙伴成长</h3><p>相遇收录 +20 经验；训练胜利 +30 经验，练习未胜 +10 经验。每 40 经验提升一级；Lv.1、Lv.2 和 Lv.4 分别解锁三项特征技能。同行栏展示经验最高的六位伙伴，全部伙伴保留在图鉴中。</p><h3>随时保存，随身带走</h3><p>进度自动保存。换设备前，在研究手册导出存档。按 Esc 可退出当前观察；本次未完成的相遇不计入收录。</p>`}<button id="help-done" class="primary wide next-btn">回到探险 →</button></div>`);$('help-done').onclick=closeModal;}
$('explore-btn').onclick=explore;$('train-btn').onclick=()=>startTrial();$('review-btn').onclick=()=>startTrial(true);$('close-modal').onclick=closeModal;
$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal()});
$('sound-btn').onclick=()=>{save.sound=!save.sound;persist();renderAll();sound();toast(save.sound?'探险音效已开启':'探险音效已关闭')};
$('help-btn').onclick=()=>help();$('credits-btn').onclick=()=>help(true);
$('export-btn').onclick=exportSave;$('download-btn').onclick=downloadGame;$('import-btn').onclick=()=>$('import-file').click();$('import-file').onchange=e=>{importSave(e.target.files[0]);e.target.value=''};
$('dex-filters').querySelectorAll('button').forEach(el=>el.onclick=()=>{filter=el.dataset.filter;$('dex-filters').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===el));renderDex()});
document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>setView(el.dataset.view));document.querySelector('.brand').onclick=e=>{e.preventDefault();setView('map')};
document.addEventListener('keydown',e=>{if($('modal').open||view!=='map'||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
 if(e.code==='Space'&&e.target.tagName!=='BUTTON'&&e.target.tagName!=='A'){e.preventDefault();explore();return}
 const direction={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]}[e.key];if(!direction)return;e.preventDefault();if(moving)return;const current=rBy(save.region),[dx,dy]=direction;const choices=regions.filter(r=>(r.x-current.x)*dx+(r.y-current.y)*dy>5).map(r=>({r,score:Math.hypot(r.x-current.x,r.y-current.y)+Math.abs((r.x-current.x)*dy-(r.y-current.y)*dx)*1.6})).sort((a,b)=>a.score-b.score);if(choices.length)travel(choices[0].r.id);
});
// Use the page-scoped registry; unsupported browsers play normally.
const modelContext=document.modelContext;
if(modelContext?.registerTool){
 const register=tool=>{try{Promise.resolve(modelContext.registerTool(tool)).catch(()=>{})}catch{}};
 register({name:'inspect_expedition',title:'查看探险进度',description:'Read the current ecology region, collected biology creatures, and review count.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:async()=>({region:rBy(save.region).name,collected:save.caught.map(id=>cBy(id).name),reviewCount:save.mistakes.length})});
 register({name:'travel_to_habitat',title:'前往生态栖息地',description:'Move to an ecology region in the biology adventure. Does not start an encounter.',inputSchema:{type:'object',properties:{region:{type:'string',enum:regions.map(r=>r.id)}},required:['region'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input)=>{const region=input?.region;if(!rBy(region))return {error:'Unknown region'};if(moving||$('modal').open)return {error:'Finish the current movement or dialog first'};setView('map');travel(region);if(moving)await new Promise(resolve=>setTimeout(resolve,1050));return {region:rBy(save.region).name}}});
}
persist();renderAll();
})();
