const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),delivery=path.join(root,'成品');
const files=['index.html','src/style.css','src/data.js','src/core.js','src/game.js','assets/lingye/world.png','assets/lingye/creatures.png','assets/ai-pixel/hero.png'];
for(const file of files){if(!fs.statSync(path.join(root,file)).size)throw Error('Missing content: '+file);if(file.endsWith('.js'))new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});}
fs.mkdirSync(dist,{recursive:true});fs.mkdirSync(delivery,{recursive:true});
for(const file of files){const target=path.join(dist,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target)}
const uri=file=>'data:image/png;base64,'+fs.readFileSync(path.join(root,file)).toString('base64');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');let css=fs.readFileSync(path.join(root,'src/style.css'),'utf8');
css=css.replace("url('../assets/lingye/creatures.png')",`url('${uri('assets/lingye/creatures.png')}')`);
html=html.replace('<link rel="stylesheet" href="./src/style.css">','<style>'+css+'</style>');
for(const file of ['src/data.js','src/core.js','src/game.js'])html=html.replace(`<script src="./${file}"></script>`,'<script>'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
for(const file of ['assets/lingye/world.png','assets/ai-pixel/hero.png'])html=html.replace(`src="./${file}"`,`src="${uri(file)}"`);
if(/<(?:script|link|img)[^>]+(?:src|href)="\.\//.test(html))throw Error('Offline dependency remains');
fs.writeFileSync(path.join(dist,'灵野图鉴-离线版.html'),html);fs.writeFileSync(path.join(delivery,'灵野图鉴-离线版.html'),html);
fs.writeFileSync(path.join(delivery,'开始探险.txt'),'灵野图鉴 · 生命群岛\n\n双击“灵野图鉴-离线版.html”，用 Chrome、Edge、Safari 等现代浏览器打开即可游玩，无需安装，无需联网。\n\n操作：点击地图地点前往；点击探索或按空格相遇；方向键 / WASD 切换地区。答对3个特征收录生灵，误判3次结束相遇。\n\n内容：16种原创生灵，5个植物类群、6个无脊椎动物类群、5个脊椎动物类群，5片生态区与研究所，48道观察题，图鉴、训练、错题复习、等级技能与研究徽章。\n\n保存：自动保存在当前浏览器。在“研究手册”中可导出与导入 JSON 存档。在线版与离线版进度不自动互通，请导出后导入。\n\n提示：如系统使用编辑器打开 HTML，请右键选择“打开方式”→浏览器。手机建议通过在线版游玩。\n\n形象为原创拟人化设计；真实生物知识以图鉴特征卡为准。\n');
console.log('Build complete: static site + standalone offline HTML ('+(Buffer.byteLength(html)/1024/1024).toFixed(2)+' MB).');
