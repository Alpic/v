// Re-render mockup screens: node v/design/render.js "$PWD/v/design"
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});
await p.goto('file://'+process.argv[2]+'/mockup.html');await p.waitForTimeout(500);
const m={home:'01_home',story:'02_story',blindspot:'03_blindspot',source:'04_source',bias:'05_bias',states:'06_states','home-dark':'07_home_dark','story-dark':'08_story_dark','bias-dark':'09_bias_dark',desktop:'10_desktop_home'};
for(const [id,f] of Object.entries(m)){const e=await p.$('#'+id);if(e)await e.screenshot({path:process.argv[2]+'/shots/'+f+'.png'});else console.log('missing',id)}
await b.close()})()
