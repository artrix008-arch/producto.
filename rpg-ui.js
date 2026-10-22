/* Bounded RPG event feedback; no animation loop, global tree observer or audio buffers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RPGUI=api;})(globalThis,function(){'use strict';
 let bridge=null,layer=null,media=null,last=0,catAt=-Infinity;const running=new Set();
 const PATTERNS={complete:8,impact:[80,35,120],purchase:8,achievement:[10,30,10],legendary:25};
 function allowed(state){return !document.hidden&&state?.interactionMotion!==false&&!media?.matches&&!document.body.classList.contains('saver');}
 function haptic(kind,state){if(!state?.rpgHaptics||document.hidden||!PATTERNS[kind])return false;try{if(typeof navigator.vibrate!=='function')return false;return navigator.vibrate(PATTERNS[kind]);}catch(_){return false;}}
 function clear(){running.forEach(a=>a.cancel());running.clear();layer?.replaceChildren();}
 function event(kind,target,state){state=state||bridge?.state();haptic(kind,state);if(!allowed(state)||performance.now()-last<250||running.size>=16)return;last=performance.now();
  if(!layer){layer=document.createElement('div');layer.className='rpg-particles';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);}
  const r=target?.getBoundingClientRect?.(),x=r?r.left+r.width/2:innerWidth/2,y=r?r.top+r.height/2:innerHeight*.38;
  const count=Math.min(kind==='complete'?6:10,16-running.size);for(let i=0;i<count;i++){const p=document.createElement('i');p.style.cssText='left:'+Math.round(x)+'px;top:'+Math.round(y)+'px;--spark:'+['#ffe174','#85d5e5','#9ace68'][i%3];layer.appendChild(p);if(!p.animate){p.remove();continue;}const a=p.animate([{translate:'0 0',opacity:1},{translate:Math.round(Math.cos(i*2.4)*(18+i*4))+'px '+Math.round(-24-Math.sin(i*.8)*18-i*3)+'px',opacity:0}],{duration:440+i*12,easing:'steps(8,end)'});running.add(a);a.onfinish=a.oncancel=()=>{running.delete(a);p.remove();};}
 }
 function decorate(root){if(typeof PixelIcons==='undefined'||!root?.querySelectorAll)return;
  for(const el of root.querySelectorAll('[data-rpg-static]')){if(!el.firstChild)el.innerHTML=PixelIcons.html(el.dataset.rpgStatic);}
  for(const el of root.querySelectorAll('.empty .e-dot')){if(el.firstChild)continue;el.classList.add('rpg-empty');el.innerHTML=PixelIcons.html('cat-grey','sleep')+PixelIcons.html('quest-normal');}
 }
 function sync(){const b=document.getElementById('rpgHaptics');if(b&&bridge){const on=!!bridge.state().rpgHaptics;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));}}
 function init(api){if(bridge)return;bridge=api;media=matchMedia('(prefers-reduced-motion: reduce)');decorate(document);sync();
  document.getElementById('rpgHaptics')?.addEventListener('click',()=>{bridge.state().rpgHaptics=!bridge.state().rpgHaptics;bridge.save();sync();haptic('complete',bridge.state());});
  document.addEventListener('click',e=>{if(!e.isTrusted)return;const cat=e.target.closest?.('[data-rpg-cat]');if(!cat)return;if(performance.now()-catAt>15000){catAt=performance.now();if(typeof InteractionFX!=='undefined')InteractionFX.sound('cat');}});
  document.addEventListener('visibilitychange',()=>{document.body.dataset.rpgHidden=String(document.hidden);if(document.hidden)clear();});window.addEventListener('pagehide',clear);media.addEventListener?.('change',()=>{if(media.matches)clear();});
 }
 return {PATTERNS,event,haptic,decorate,init,sync,clear,status:()=>({animations:running.size,particles:layer?.childElementCount||0})};
});
