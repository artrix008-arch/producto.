/* Short, style-aware feedback. No continuous loop and no changes to action semantics. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InteractionFX=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
  const PROFILES={
    default:{shape:'ripple',wave:'sine',hz:520,depth:.965,over:1.015,ms:330,ease:'cubic-bezier(.16,1,.3,1)'},
    pixel:{shape:'pixel',wave:'square',hz:330,depth:.94,over:1.02,ms:240,ease:'steps(4,end)'},
    'pixel-night':{shape:'orbit',wave:'triangle',hz:294,depth:.955,over:1.025,ms:420,ease:'cubic-bezier(.2,.85,.25,1)'},
    riso:{shape:'stamp',wave:'triangle',hz:262,depth:.96,over:1.018,ms:280,ease:'cubic-bezier(.2,.9,.2,1)'},
    pop:{shape:'burst',wave:'square',hz:523,depth:.92,over:1.045,ms:410,ease:'cubic-bezier(.34,1.56,.64,1)'},
    block:{shape:'block',wave:'triangle',hz:220,depth:.95,over:1.005,ms:230,ease:'cubic-bezier(.1,.8,.1,1)'},
    kawaii:{shape:'heart',wave:'sine',hz:784,depth:.93,over:1.04,ms:500,ease:'cubic-bezier(.3,1.6,.4,1)'},
    chrome:{shape:'sheen',wave:'sine',hz:880,depth:.975,over:1.012,ms:430,ease:'cubic-bezier(.22,.9,.28,1)'},
    terminal:{shape:'scan',wave:'square',hz:440,depth:.985,over:1,ms:190,ease:'steps(5,end)'},
    paper:{shape:'fold',wave:'triangle',hz:370,depth:.98,over:1.008,ms:360,ease:'cubic-bezier(.25,.7,.3,1)'},
    'spatial-glass':{shape:'glass',wave:'sine',hz:554,depth:.96,over:1.022,ms:540,ease:'cubic-bezier(.16,1.25,.3,1)'},
    'neo-arcade':{shape:'arcade',wave:'square',hz:659,depth:.935,over:1.035,ms:300,ease:'steps(6,end)'},
    'ai-data':{shape:'radar',wave:'triangle',hz:587,depth:.97,over:1.01,ms:350,ease:'cubic-bezier(.15,.85,.25,1)'}
  };
  const TARGET='button,a[href],select,input[type="range"],input[type="checkbox"],[role="checkbox"],[role="button"],.tab,.chip,.fchip,.day,.ncard,.task,.item,.sw,.dot,.chkopt,.emoji,.seg,.ach,.c-emoji,.lvl-wrap';
  let bridge=null,layer=null,started=false,observer=null,media=null,lastSound=-Infinity,actionUntil=0,impactAt=-Infinity;
  const previewWork=new Set(),entryTimers=new Set(),entryAnimations=new Map();
  const animations=new Set(),voices=new Set(),controls=new WeakMap(),removers=[];
  const profile=skin=>PROFILES[skin]||PROFILES.default;
  const pixelStyle=skin=>['pixel','pixel-night','neo-arcade','terminal'].includes(skin);
  function migrate(s){if(!s._interactionV1){s.sfx=s.sfx||{};s.sfx.tap=true;s._interactionV1=1;}if(typeof s.interactionMotion!=='boolean')s.interactionMotion=true;if(!['fade','wipe','sparkle','regular','none'].includes(s.pixelCompletionFx))s.pixelCompletionFx='fade';}
  function action(el){const id=el.id||'',label=el.getAttribute?.('aria-label')||el.title||el.textContent||'';
    if(el.matches?.('input[type="range"],select'))return 'adjust';
    if(el.matches?.('[role="checkbox"],input[type="checkbox"],.toggle,.check,.ck'))return el.getAttribute?.('aria-checked')==='true'||el.getAttribute?.('aria-pressed')==='true'||el.classList?.contains('on')?'off':'on';
    if(/close|cancel|dismiss/i.test(id+' '+label)||el.matches?.('.cp-close,.cp-done'))return 'dismiss';
    if(/delete|trash|remove/i.test(id+' '+label))return 'danger';
    if(el.matches?.('.tab,.seg,.stab,.chip,.fchip,.day,[data-scope],[data-page],[data-view]'))return 'navigate';
    if(/save|add|create|confirm|complete|start|resume|new/i.test(id+' '+label))return 'confirm';
    return 'tap';
  }
  function enabled(){return bridge&&bridge.state().interactionMotion!==false&&!document.hidden&&!media?.matches&&!document.body.classList.contains('saver');}
  function animate(el,frames,options,remove=false){options={...options,duration:options.duration/Math.max(.5,Math.min(3,Number(bridge?.state().fxSpeed)||1))};if(!el?.animate)return null;try{const a=el.animate(frames,options);a.playbackRate=1;animations.add(a);a.onfinish=a.oncancel=()=>{animations.delete(a);if(remove)el.remove();};return a;}catch(e){if(remove)el.remove();return null;}}
  function cancelPreview(){previewWork.forEach(a=>a.cancel());previewWork.clear();}
  function cleanup(){cancelPreview();entryTimers.forEach(clearTimeout);entryTimers.clear();entryAnimations.clear();animations.forEach(a=>a.cancel());animations.clear();if(layer)layer.replaceChildren();voices.forEach(v=>v.stop());voices.clear();}
  function sound(kind,preview=false){if(!bridge||document.hidden)return false;const s=bridge.state();const reward=['brand-type','create','complete','loot','claim','levelup','achievement','timer','charge','purchase','pixel-complete'].includes(kind)||kind.startsWith('quest-');if(!s.sfx?.on||!reward&&!s.sfx.tap&&!preview||s.skin==='pixel-night'&&!s.pixelNight?.sound&&!['quest-appear','brand-type'].includes(kind))return false;if(s.skin==='pixel-night'&&bridge.pixelSound&&!['quest-appear','brand-type'].includes(kind))return bridge.pixelSound(kind);
    const now=performance.now();if(!reward&&now-lastSound<55)return false;const vol=Math.min(1,Math.max(0,Number(s.sfx.vol??50)/100))*Math.min(2,Math.max(0,Number(s.sfx[['create','quest-appear','brand-type'].includes(kind)?'uiVol':reward?(kind==='timer'?'timerVol':'winVol'):'clkVol']??50)/50));if(!vol)return false;
    try{const ae=bridge.audio();if(!ae?.ready||ae.ctx.state!=='running')return false;lastSound=now;const c=ae.ctx,p=profile(s.skin),ratios={tap:[1],navigate:[1,1.25],on:[1,1.5],off:[1,.75],confirm:[1,1.25,1.5],dismiss:[1,.67],danger:[.6,.5],adjust:[1.125]}[kind]||[1];
      if((s.sfx.pack==='arcade'||kind==='purchase'||kind==='cat'||kind==='brand-type'||kind.startsWith('icon:')||kind.startsWith('pixel-')||kind.startsWith('quest-'))&&typeof ArcadeSFX!=='undefined'){const notes=ArcadeSFX.score(kind,s.skin);notes.forEach(n=>{while(voices.size>=16)voices.values().next().value.stop();const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+n.at;let ended=false;const voice={stop(){if(ended)return;ended=true;try{o.stop();}catch(e){}o.disconnect();g.disconnect();voices.delete(voice);}};voices.add(voice);o.type=n.wave;o.frequency.setValueAtTime(n.hz,t);if(n.end)o.frequency.exponentialRampToValueAtTime(n.end,t+n.ms);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(n.gain*.3*vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+n.ms);o.connect(g);g.connect(ae.limiter||c.destination);o.onended=voice.stop;o.start(t);o.stop(t+n.ms+.02);});return true;}
      while(voices.size>7)voices.values().next().value.stop();
      ratios.forEach((ratio,i)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.045,d=kind==='confirm'?.15:.095;let ended=false;const voice={stop(){if(ended)return;ended=true;try{o.stop();}catch(e){}o.disconnect();g.disconnect();voices.delete(voice);}};voices.add(voice);o.type=p.wave;o.frequency.setValueAtTime(p.hz*ratio,t);o.frequency.exponentialRampToValueAtTime(p.hz*ratio*(kind==='off'?.8:1.02),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035*vol*(p.wave==='square'?.45:1),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(ae.limiter||c.destination);o.onended=voice.stop;o.start(t);o.stop(t+d+.01);});return true;
    }catch(e){return false;}
  }
  function feedback(el,kind,withSound=true){if(!bridge||el.disabled||el.getAttribute?.('aria-disabled')==='true'||el.closest?.('[inert]'))return;actionUntil=performance.now()+90;
    const icon=iconFor(el);if(withSound&&!el.hasAttribute?.('data-rpg-cat'))sound(icon&&typeof PixelIcons!=='undefined'&&(bridge.state().skin!=='default'||el.closest?.('.shop-item'))&&(['tap','navigate'].includes(kind)||el.closest?.('.shop-item'))?PixelIcons.sound(icon.dataset.pixel):kind);if(!enabled())return;const p=profile(bridge.state().skin);
    iconFeedback(el);
    if(el.matches?.('select,input,.task,.ncard'))return;controls.get(el)?.cancel();const a=icon&&bridge.state().skin!=='default'?animate(el,[{translate:'0 0'},{translate:'0 2px'},{translate:'0 0'}],{duration:p.ms,easing:'steps(1,end)'}):animate(el,[{scale:'1'},{scale:String(p.depth),offset:.18},{scale:String(p.over),offset:.65},{scale:'1'}],{duration:p.ms,easing:p.ease});if(a)controls.set(el,a);
  }
  function iconFor(el){return el.closest?.('.shop-item')?.querySelector?.(':is(.shop-ic,.shop-cu,.shop-sc,.shop-pet) .px-icon[data-pixel]')||el.querySelector?.('.px-icon[data-pixel]');}
  function iconFeedback(el){if(!enabled()||typeof PixelIcons==='undefined')return;const icon=iconFor(el);if(!icon)return;controls.get(icon)?.cancel();const m=PixelIcons.motion(icon.dataset.pixel,el.closest?.('.shop-icon-preview,.rpg-companion')?'pixel':bridge.state().skin),a=animate(icon,m.frames,{duration:m.duration,easing:m.easing||'steps(1,end)'});if(a)controls.set(icon,a);}
  function pixelBits(el,count=4,duration=300){
    if(!layer||animations.size>48)return;const r=el.getBoundingClientRect();
    for(let i=0;i<count;i++){const bit=document.createElement('i'),side=i%4,f=(Math.floor(i/4)+1)/(Math.ceil(count/4)+1),x=side<2?r.left+r.width*f:(side===2?r.left:r.right??r.left+r.width),y=side<2?(side===0?r.top:r.bottom):r.top+r.height*f,size=i%3?4:7;
      bit.style.cssText='position:fixed;pointer-events:none;width:'+size+'px;height:'+size+'px;background:'+(i%3?'var(--acc)':'var(--ink)')+';left:'+x+'px;top:'+y+'px';layer.appendChild(bit);
      animate(bit,[{opacity:0,translate:'0 0',scale:'.5'},{opacity:1,scale:'1',offset:.2},{opacity:1,offset:.6},{opacity:0,scale:'.4',translate:(side===2?-28:side===3?28:0)+'px '+(side===0?-28:side===1?28:-8)+'px'}],{duration,easing:'steps(8,end)'},true);
    }
  }
  function pixelHover(el,enter){
    if(!bridge||!pixelStyle(bridge.state().skin)||!enabled()||el.disabled||el.getAttribute?.('aria-disabled')==='true'||el.closest?.('[inert]'))return;
    controls.get(el)?.cancel();const a=animate(el,enter?[{opacity:.92,translate:'0 1px',filter:'brightness(1)'},{opacity:1,translate:'0 0',filter:'brightness(1)'}]:[{opacity:1},{opacity:.92,offset:.5},{opacity:1}],{duration:enter?180:220,easing:'cubic-bezier(.2,.8,.2,1)'});if(a)controls.set(el,a);
    if(bridge.state().sfx?.hover!==false)sound(enter?'pixel-hover-in':'pixel-hover-out');
  }
  const circular='cubic-bezier(0,.55,.45,1)';
  function pop(el){if(!el||!enabled())return null;return animate(el,[{scale:'.35',rotate:'-18deg'},{scale:'1.28',rotate:'7deg',offset:.55},{scale:'1',rotate:'0deg'}],{duration:720,easing:circular});}
  function duplicate(source,card){if(!card||!source||!enabled())return;entryAnimations.get(card)?.cancel();const target=card.getBoundingClientRect();animate(card,[{translate:(source.left-target.left)+'px '+(source.top-target.top)+'px',scale:'.94'},{translate:'0 4px',scale:'1.02',offset:.82},{translate:'0 0',scale:'1'}],{duration:1100,easing:circular});}
  function layout(){return new Map([...document.querySelectorAll('#listTodo .task[data-id]')].map(el=>[el.dataset.id,el.getBoundingClientRect()]));}
  function reorder(before){if(!before||!enabled())return;document.querySelectorAll('#listTodo .task[data-id]').forEach(el=>{const old=before.get(el.dataset.id);if(!old)return;const now=el.getBoundingClientRect(),dy=old.top-now.top,dx=old.left-now.left;if(dx||dy)animate(el,[{translate:dx+'px '+dy+'px'},{translate:'0 0'}],{duration:820,easing:circular});});}
  function shine(el){if(!el||!layer||!enabled())return 0;const r=el.getBoundingClientRect();if(!r.width||!r.height)return 0;
    const wipe=document.createElement('div'),beam=document.createElement('i');wipe.className='habit-shiny-wipe';wipe.setAttribute('aria-hidden','true');wipe.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';wipe.appendChild(beam);layer.appendChild(wipe);
    animate(beam,[{translate:'-160% 0'},{translate:'460% 0'}],{duration:850,easing:circular});animate(wipe,[{opacity:1},{opacity:1,offset:.9},{opacity:0}],{duration:850,easing:'linear'},true);return 850/Math.max(.5,Math.min(3,Number(bridge.state().fxSpeed)||1));
  }
  function brandType(brand){if(!brand||!enabled())return;const chars=brand.querySelectorAll('.brand-char');chars.forEach((el,i)=>{controls.get(el)?.cancel();const a=animate(el,[{opacity:0,translate:'0 5px',scale:'.82'},{opacity:1,translate:'0 0',scale:'1'}],{duration:180,delay:i*95,easing:circular,fill:'backwards'});if(a)controls.set(el,a);const timer=setTimeout(()=>{entryTimers.delete(timer);if(enabled())sound('brand-type');},i*95);entryTimers.add(timer);});}
  function questEnter(cards){
    if(!enabled())return 0;
    const speed=Math.max(.5,Math.min(3,Number(bridge.state().fxSpeed)||1));
    const queue=cards.slice(0,10);
    queue.forEach((card,i)=>{if(card.classList.contains('pixel-finishing'))return;
      entryAnimations.get(card)?.cancel();
      const delay=i*130/speed;
      const a=animate(card,[{translate:'0 34px',scale:'.965'},{translate:'0 -2px',scale:'1.012',offset:.78},{translate:'0 0',scale:'1'}],{duration:600,delay,easing:'cubic-bezier(0,.55,.45,1)',fill:'backwards'});
      if(a){entryAnimations.set(card,a);const settled=a.onfinish;a.onfinish=a.oncancel=()=>{if(entryAnimations.get(card)===a)entryAnimations.delete(card);settled?.();};}
      const timer=setTimeout(()=>{entryTimers.delete(timer);if(enabled()&&card.isConnected!==false&&!card.classList.contains('pixel-finishing'))sound('quest-appear');},delay);entryTimers.add(timer);
    });return queue.length;
  }
  function previewPixel(effect){
    cancelPreview();
    const card=document.getElementById('pixelFinishPreview'),status=document.getElementById('pixelFinishStatus');if(!card)return;
    if(status)status.textContent=effect==='none'?'Completion animation is off.':effect==='regular'?'More effects uses the effect chosen for each quest.':!enabled()?'Turn on Motion to preview. Reduced motion and battery saver also pause animations.':'Preview: Pixel '+effect;
    if(effect==='none'||effect==='regular'||!enabled())return;
    card.scrollIntoView?.({block:'nearest'});const before=new Set(animations);pixelComplete(card,effect,true);animations.forEach(a=>{if(!before.has(a))previewWork.add(a);});
  }
  function pixelComplete(card,effect,preview=false){
    if(!card||!enabled()||!pixelStyle(bridge?.state().skin)||effect==='none')return 0;
    entryAnimations.get(card)?.cancel();
    const speed=Math.max(.5,Math.min(3,Number(bridge.state().fxSpeed)||1)),actual=Math.max(1100,Math.round((effect==='sparkle'?1900:effect==='wipe'?1700:1600)/speed)),duration=actual*speed;
    const frames=effect==='wipe'?[{opacity:1,clipPath:'inset(0 0 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)',offset:.7},{opacity:0,clipPath:'inset(0 100% 0 0)'}]:effect==='sparkle'?[{opacity:1,filter:'brightness(1)'},{opacity:1,filter:'brightness(1.12)',offset:.18},{opacity:1,filter:'brightness(1)',offset:.75},{opacity:0,translate:'0 -8px'}]:[{opacity:1},{opacity:1,offset:.7},{opacity:0}];
    card.classList.add('pixel-finishing');
    const a=animate(card,frames,{duration,easing:'steps(12,end)',fill:preview?'none':'forwards'});if(a){const settled=a.onfinish;const finish=()=>{card.classList.remove('pixel-finishing');settled?.();};a.onfinish=a.oncancel=finish;}
    if(layer&&animations.size<40){const r=card.getBoundingClientRect(),stamp=document.createElement('div');stamp.className='pixel-quest-complete';stamp.dataset.effect=effect;stamp.setAttribute('aria-hidden','true');stamp.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';
      stamp.innerHTML='<span class="pixel-quest-seal">✓</span><span class="pixel-quest-message"><b>QUEST COMPLETE</b><small>◆ ◆ ◆ &nbsp; WELL DONE</small></span><i class="pixel-quest-scan"></i>';layer.appendChild(stamp);
      const stampFrames=effect==='wipe'?[{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)',offset:.25},{opacity:1,clipPath:'inset(0 0 0 0)',offset:.78},{opacity:0,clipPath:'inset(0 0 0 100%)'}]:[{opacity:0,scale:'.94',translate:'0 12px'},{opacity:1,scale:'1',translate:'0 0',offset:.18},{opacity:1,offset:.8},{opacity:0,translate:'0 -6px'}];
      animate(stamp,stampFrames,{duration,easing:'steps(10,end)'},true);
      const scan=stamp.querySelector?.('.pixel-quest-scan');if(scan)animate(scan,[{left:'-15%',opacity:0},{opacity:.5,offset:.15},{left:'110%',opacity:0}],{duration,easing:'linear'});
    }
    pixelBits(card,effect==='sparkle'?20:12,duration);if(typeof ArcadeSFX==='undefined'||!ArcadeSFX.questSound(card.querySelector?.('.ttl')?.textContent))sound('pixel-complete');
    return actual;
  }
  function surface(el){if(!el||!enabled()||el.id==='checkpointModal')return;if(el.id==='addModal'||el.id==='charModal'){if(el.id==='addModal')sound('quest-open');return;}const p=profile(bridge.state().skin);animate(el.querySelector?.('.sheet')||el,[{opacity:0,translate:'0 12px',scale:'.985'},{opacity:1,translate:'0 0',scale:'1'}],{duration:p.ms+80,easing:p.ease});}
  function impact(){
    if(!enabled()||performance.now()-impactAt<350)return false;
    const targets=document.querySelectorAll('header,#main,#bottomNav,.modal.open>.sheet');if(!targets.length)return false;
    impactAt=performance.now();const p=profile(bridge.state().skin),amount=2.5;
    const keys=[{translate:'0 0'},{translate:-amount+'px 1px'},{translate:amount+'px -1px'},{translate:'-1.5px 0'},{translate:'1px 0'},{translate:'0 0'}];
    targets.forEach(el=>animate(el,keys,{duration:220,easing:p.ease.startsWith('steps')?'steps(6,end)':'linear'}));return true;
  }
  function sync(){if(!bridge)return;document.body.dataset.motionEnabled=String(bridge.state().interactionMotion!==false);const button=document.getElementById('interactionMotion');if(button){button.classList.toggle('on',bridge.state().interactionMotion);button.setAttribute('aria-pressed',String(bridge.state().interactionMotion));}const section=document.getElementById('pixelFinishSection');if(section)section.hidden=!pixelStyle(bridge.state().skin);const generic=document.getElementById('completionSection');if(generic)generic.hidden=pixelStyle(bridge.state().skin)&&bridge.state().pixelCompletionFx!=='regular';document.querySelectorAll('#pixelFinishRow [data-pixel-finish]').forEach(b=>{const on=b.dataset.pixelFinish===bridge.state().pixelCompletionFx;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});if(!enabled())cleanup();}
  function init(api){if(started)return;started=true;bridge=api;migrate(bridge.state());media=matchMedia('(prefers-reduced-motion: reduce)');layer=document.createElement('div');layer.id='interactionFx';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);
    const on=(el,event,fn,opts)=>{el.addEventListener(event,fn,opts);removers.push(()=>el.removeEventListener(event,fn,opts));};
    const brand=document.querySelector('.brand');if(brand){const label=brand.textContent.trim();brand.setAttribute('aria-label',label);brand.setAttribute('tabindex','0');brand.innerHTML=[...label].map(c=>'<span class="brand-char'+(c==='.'?' brand-period':'')+'" aria-hidden="true">'+c+'</span>').join('');brandType(brand);let typedAt=performance.now();const replayBrand=()=>{if(performance.now()-typedAt>1400){typedAt=performance.now();brandType(brand);}};on(brand,'pointerenter',replayBrand);on(brand,'focus',replayBrand);}
    const replay=document.getElementById('pixelFinishReplay');if(replay)on(replay,'click',()=>previewPixel(bridge.state().pixelCompletionFx));
    const finishRow=document.getElementById('pixelFinishRow');if(finishRow)on(finishRow,'click',e=>{const b=e.target.closest('[data-pixel-finish]');if(!b)return;bridge.state().pixelCompletionFx=b.dataset.pixelFinish;bridge.save();sync();previewPixel(b.dataset.pixelFinish);});
    on(window,'click',e=>{if(!e.isTrusted||document.hidden)return;const el=e.target.closest?.(TARGET);if(!el||el.matches('select,input[type="range"]'))return;const muted=el.id==='sfxToggle'&&bridge.state().sfx.on||el.id==='tapToggle'&&bridge.state().sfx.tap;feedback(el,action(el),!muted&&!el.closest?.('#soundDemos,#soundEnableTest,#soundPackRow'));if(muted)cleanup();},true);
    on(window,'pointerover',e=>{if(!e.isTrusted||e.pointerType!=='mouse')return;const el=e.target.closest?.('button,.shop-item,.item,.ach');if(!el||el.disabled||el.getAttribute?.('aria-disabled')==='true'||el.contains?.(e.relatedTarget)||el.closest?.('[inert]'))return;iconFeedback(el);if(el.matches?.('button'))pixelHover(el,true);},true);
    on(window,'pointerout',e=>{if(!e.isTrusted||e.pointerType!=='mouse')return;const el=e.target.closest?.('button');if(el&&!el.contains?.(e.relatedTarget))pixelHover(el,false);},true);
    on(window,'keydown',e=>{if(!e.isTrusted||e.repeat||!['Enter',' '].includes(e.key))return;const el=e.target.closest?.('[role="checkbox"],[role="button"],.task,.ncard');if(el&&!el.matches('button,input,select')&&e.target===el)feedback(el,action(el));},true);
    on(document,'change',e=>{if(e.isTrusted&&e.target.matches?.('select,input[type="range"]'))feedback(e.target,'adjust');},true);
    on(document,'input',e=>{if(e.isTrusted&&e.target.matches?.('input[type="range"]')){actionUntil=performance.now()+90;sound('adjust');}},true);
    observer=new MutationObserver(records=>{if(records.some(r=>r.target===document.body))sync();for(const r of records){const el=r.target,old=r.oldValue||'';if(el.id==='setModal'&&!el.classList.contains('open'))cancelPreview();if((el.classList.contains('open')&&!old.split(' ').includes('open'))||(el.classList.contains('show')&&!old.split(' ').includes('show')))surface(el);}});
    observer.observe(document.body,{attributes:true,attributeFilter:['class','data-skin']});document.querySelectorAll('.modal,#editor,.pop').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class'],attributeOldValue:true}));
    on(document,'visibilitychange',()=>{if(document.hidden)cleanup();});on(window,'pagehide',cleanup);const changed=()=>{if(media.matches)cleanup();};media.addEventListener?.('change',changed);removers.push(()=>media.removeEventListener?.('change',changed));
    const button=document.getElementById('interactionMotion');if(button){on(button,'click',()=>{bridge.state().interactionMotion=!bridge.state().interactionMotion;bridge.save();sync();if(!enabled())cleanup();});sync();}
  }
  function destroy(){cleanup();observer?.disconnect();removers.splice(0).forEach(f=>f());layer?.remove();layer=null;bridge=null;started=false;}
  return {PROFILES,pop,duplicate,layout,reorder,shine,brandType,questEnter,previewPixel,profile,pixelStyle,pixelHover,pixelComplete,migrate,action,sound,feedback,impact,enter:surface,init,sync,destroy,ownsCurrentAction:()=>performance.now()<actionUntil};
});
