/* Original pixel scenery; no artwork, libraries, or timers borrowed from other skins. */
(function(){'use strict';
  const doc=document,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let mounted=false,root=null,layers=[],frame=0,lastPaint=0,observer=null,resizeTimer=0;
  let bridge=null,animations=new Set(),ghosts=new Set(),lastNumbers=new Map(),bodyObserver=null,paintTimer=0,skyKey='';
  const numberSelector='#coinBal,#lvlBadge,#shopCoins,#pav,#pomoTime';
  const ease='cubic-bezier(.45,0,.15,1)';
  let colors={};
  function palette(){
    if(typeof Wallpapers!=='undefined'&&Wallpapers.find(doc.body.dataset.bg)){Wallpapers.syncPalette({bg:doc.body.dataset.bg,mode:doc.body.dataset.mode});return;}
    const body=doc.body,acc=TaskTools.rgb(getComputedStyle(body).getPropertyValue('--acc')),light=body.dataset.mode==='light';
    const swatch=doc.querySelector?.('#swRow [data-t="'+body.dataset.theme+'"]'),base=swatch?.style.getPropertyValue('--b'),baseRGB=base?TaskTools.rgb(base):acc;
    const tint=Math.max(...baseRGB)-Math.min(...baseRGB)>20?baseRGB:acc;
    const mix=(base,amount)=>'#'+TaskTools.rgb(base).map((v,i)=>Math.round(v*(1-amount)+tint[i]*amount).toString(16).padStart(2,'0')).join('');
    colors={void:mix(light?'#ffffff':'#070a12',.07),indigo:mix(light?'#ffffff':'#111521',.12),navy:mix(light?'#ffffff':'#1a2030',.2),mid:mix(light?'#dce1e9':'#232d42',.26),band:mix(light?'#e7eaf0':'#192238',.22),nebula:mix(light?'#d9e0eb':'#343749',.3),moon:mix(light?'#152036':'#f6f8ff',.09),ice:mix(light?'#33415a':'#d1dbee',.12),secondary:mix(light?'#8290a6':'#73829f',.2),core:mix(light?'#243149':'#eef5ff',.18),orange:mix(light?'#33415a':'#dae7ff',.3),teal:mix(light?'#21334a':'#d7f0ff',.2),violet:mix(light?'#39435a':'#b8c8ed',.25)};
    Object.entries(colors).forEach(([name,value])=>body.style.setProperty('--pn-'+name,value));
    body.style.setProperty('--ink-rgb',TaskTools.rgb(colors.moon).join(','));
    if(window.AppUI)window.AppUI.palette();
  }
  function active(){return mounted&&doc.body.dataset.skin==='pixel-night';}
  function still(){return reduce.matches||doc.body.classList.contains('saver')||doc.body.classList.contains('calm')||doc.body.dataset.motionEnabled==='false';}
  function animate(el,keys,options){
    if(still()||!el.animate)return;
    const a=el.animate(keys,options);animations.add(a);
    a.onfinish=a.oncancel=()=>animations.delete(a);return a;
  }
  function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
  function makeSky(){
    if(!root)return;root.replaceChildren();layers=[];
    const bg=doc.body.dataset.bg||'aurora',native=!['none','aurora','gradient','mesh','glow','waves','grid','rays'].includes(bg);
    doc.body.classList.toggle('pn-native-bg',native);root.hidden=bg==='none'||native;if(root.hidden)return;
    const light=doc.body.dataset.mode==='light';
    // One pixel scale for both axes, including the 16px overscan on each side.
    // Independent width/height clamps stretched round sprites on tall phones.
    const pixelScale=Math.max(3,(innerWidth+32)/320,(innerHeight+32)/320);
    const w=Math.ceil((innerWidth+32)/pixelScale),h=Math.ceil((innerHeight+32)/pixelScale);
    const random=rng(271828);
    for(let i=0;i<3;i++){
      const canvas=doc.createElement('canvas');canvas.width=w;canvas.height=h;
      root.appendChild(canvas);const ctx=canvas.getContext('2d');if(!ctx)continue;
      ctx.imageSmoothingEnabled=false;
      const stars=Array.from({length:i===0?0:i===1?65:28},()=>({x:Math.floor(random()*w),y:Math.floor(random()*h*.85),phase:random()*Math.PI*2,period:2+random()*2,size:random()>.94?2:1}));
      if(i===0){
        // Stepped nebula ribbons, dithered at their edges on a low-resolution backing.
        ctx.fillStyle=colors.void;ctx.fillRect(0,0,w,h);
        const bands=[colors.void,colors.indigo,colors.band,colors.mid,colors.nebula];
        for(let y=0;y<h;y+=4){
          const t=y/h;ctx.fillStyle=bands[Math.min(4,Math.floor(t*5))];ctx.globalAlpha=.45;
          ctx.fillRect(0,y,w,4);
          const edge=Math.floor(w*(.52+Math.sin(t*(bg==='waves'?13:5.4))*.27));
          ctx.fillStyle=bands[t>.65?3:4];ctx.globalAlpha=.42;
          ctx.fillRect(edge,y,w-edge,4);
          ctx.globalAlpha=.2;ctx.fillStyle=colors.secondary;
          for(let x=edge-12;x<edge+10;x+=2){if((x+y)%4===0)ctx.fillRect(x,y+(x%4),1,1);}
        }
        // A tiny original setting sun, rendered entirely as square cells.
        if(bg==='grid'){
          ctx.globalAlpha=.25;ctx.fillStyle=light?'#6177A7':colors.secondary;
          for(let x=0;x<w;x+=16)ctx.fillRect(x,0,1,h);
          for(let y=0;y<h;y+=16)ctx.fillRect(0,y,w,1);
        }
        if(bg==='mesh'){
          ctx.globalAlpha=.2;
          for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8){ctx.fillStyle=(x+y)%24?colors.secondary:colors.teal;if(random()>.5)ctx.fillRect(x,y,6,6);}
        }
        if(bg==='rays'){
          ctx.globalAlpha=.12;ctx.fillStyle=colors.core;
          for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4)if(Math.floor(Math.atan2(y-h*.23,x-w*.83)*10)%3===0)ctx.fillRect(x,y,4,4);
        }
        const cx=Math.floor(w*.83),cy=Math.floor(h*.23),r=bg==='rays'?18:10;
        for(let y=-r;y<=r;y++){for(let x=-r;x<=r;x++){
          if(x*x+y*y>r*r)continue;
          ctx.globalAlpha=.85;ctx.fillStyle=y<0?colors.core:colors.orange;
          if(y<4||y%3!==0)ctx.fillRect(cx+x,cy+y,1,1);
        }}
        ctx.globalAlpha=1;
      }
      layers.push({canvas,ctx,stars,w,h,depth:i+1});
    }
    paint(0);
  }
  function paint(t){
    layers.forEach((l,i)=>{if(i===0)return;
      const {ctx,w,h}=l;ctx.clearRect(0,0,w,h);
      for(const s of l.stars){
        ctx.globalAlpha=still()?.65:.3+.65*(.5+.5*Math.sin(t/1000*Math.PI*2/s.period+s.phase));
        ctx.fillStyle=i===1?colors.ice:colors.moon;ctx.fillRect(s.x,s.y,s.size,s.size);
      }
      ctx.globalAlpha=1;
      if(i===2){ // Four-pixel satellite; discrete 8 fps cels, smooth layer drift.
        const cel=still()?0:Math.floor(t/125)%6;
        ctx.fillStyle=colors.teal;ctx.fillRect(w*.19|0,h*.2|0,3,1);
        ctx.fillStyle=colors.violet;ctx.fillRect((w*.19|0)+1,(h*.2|0)-1,1,3);
        ctx.globalAlpha=.35+cel*.08;ctx.fillStyle=colors.ice;ctx.fillRect((w*.19|0)-1,h*.2|0,1,1);ctx.globalAlpha=1;
      }
    });
  }
  function loop(t){
    frame=0;if(!active()||doc.hidden||still())return;
    // Only repaint the tiny star buffers at 8 fps; compositor-only drift runs at display rate.
    if(t-lastPaint>=125){paint(t);lastPaint=t;}
    layers.forEach(l=>{const x=Math.sin(t/48000+l.depth)*l.depth*3,y=Math.cos(t/61000+l.depth)*l.depth*2;
      l.canvas.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px)';});
    paintTimer=setTimeout(()=>{paintTimer=0;frame=requestAnimationFrame(loop);},125);
  }
  function motion(){
    cancelAnimationFrame(frame);clearTimeout(paintTimer);paintTimer=0;frame=0;if(!active())return;
    if(doc.hidden||still()){
      animations.forEach(a=>a.cancel());ghosts.forEach(g=>g.remove());ghosts.clear();
      layers.forEach(l=>{l.canvas.style.transform='none';});paint(0);
    }else if(layers.length)frame=requestAnimationFrame(loop);
  }
  function resize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{makeSky();motion();},120);}
  function numbers(){
    if(!active())return;
    doc.querySelectorAll(numberSelector).forEach(el=>{
      const value=el.textContent,old=lastNumbers.get(el.id);lastNumbers.set(el.id,value);
      if(old===undefined||old===value||still()||doc.hidden)return;
      if(getComputedStyle(el).visibility==='hidden'||(el.checkVisibility&&!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})))return;
      const box=el.getBoundingClientRect();if(!box.width||box.top<0||box.top>innerHeight)return;
      animate(el,[{transform:'translateY(10px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:300,easing:ease});
      const ghost=doc.createElement('span');ghost.className='pn-odometer-old';
      ghost.textContent=old;ghost.setAttribute('aria-hidden','true');
      ghost.style.cssText='left:'+box.left+'px;top:'+box.top+'px;font-size:'+getComputedStyle(el).fontSize;
      doc.body.appendChild(ghost);ghosts.add(ghost);
      const a=animate(ghost,[{transform:'translateY(0)',opacity:1},{transform:'translateY(-12px)',opacity:0}],{duration:270,easing:ease});
      if(a)a.onfinish=a.oncancel=()=>{animations.delete(a);ghost.remove();ghosts.delete(ghost);};else{ghost.remove();ghosts.delete(ghost);}
      if(sound)sound.play('tick');
    });
  }
  function transition(kind){
    if(!active()||doc.hidden)return;
    if(kind==='page'){
      const main=doc.getElementById('main');if(main)animate(main,[{transform:'scale(.985)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:480,easing:ease});
    }
    if(sound)sound.play('whoosh');
  }
  /* A theme-owned bus on the existing AE context. No media files or extra context. */
  class SoundManager{
    constructor(api){this.api=api;this.ctx=null;this.master=null;this.nodes=new Set();this.unlocked=false;this.last={};this.initializing=false;this.resuming=null;this.pending=null;
      this.gesture=e=>{if(!e.isTrusted)return;this.unlocked=true;this.sync();};
      this.selection=e=>{if(!e.isTrusted||window.InteractionFX?.ownsCurrentAction())return;if(e.target.closest('button,input,select,[role="button"]'))this.play('tick');};
      this.interruption=()=>{if(navigator.audioSession&&navigator.audioSession.state==='interrupted'){this.unlocked=false;this.stop();}};}
    mount(){doc.addEventListener('pointerdown',this.gesture,{passive:true});doc.addEventListener('keydown',this.gesture);doc.addEventListener('click',this.selection);}
    allowed(){const p=this.api.prefs();return active()&&!doc.hidden&&p.sound&&p.sfx?.on!==false&&Number(p.sfx?.vol??50)>0&&this.unlocked&&(!navigator.audioSession||navigator.audioSession.state!=='interrupted');}
    init(){
      if(this.master||this.initializing||!this.allowed())return;
      let audio;this.initializing=true;try{audio=this.api.audio();}finally{this.initializing=false;}if(!audio||!audio.ctx||!this.allowed())return;
      this.ctx=audio.ctx;const c=this.ctx;
      // Ambient sessions obey the device's silent policy where this API exists.
      // Never use a playback-session or silent-media workaround to bypass it.
      try{if(navigator.audioSession&&this.sessionType===undefined){this.sessionType=navigator.audioSession.type;
        navigator.audioSession.type='ambient';navigator.audioSession.addEventListener('statechange',this.interruption);}}catch(e){}
      this.master=c.createGain();this.master.gain.value=.38; // Clear transients; the user volume still controls the master.
      this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=5500;
      this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-1;this.limiter.knee.value=0;
      this.limiter.ratio.value=20;this.limiter.attack.value=.001;this.limiter.release.value=.12;
      this.master.connect(this.filter);this.filter.connect(this.limiter);this.limiter.connect(c.destination);
    }
    sync(){
      if(doc.hidden)this.unlocked=false;
      if(!this.allowed()){this.stop();return;}
      this.init();if(!this.master)return;this.master.gain.value=.38*Math.min(1,Math.max(0,Number(this.api.prefs().sfx?.vol??50)/100));
      // Resume is only reached after a trusted gesture, including after foregrounding.
      if(this.ctx.state!=='running')this.resume();
      // Theme audio is limited to short interaction sounds; no background drone.
    }
    resume(){
      if(this.resuming||!this.ctx||!this.allowed())return;
      const context=this.ctx;this.resuming=Promise.resolve(context.resume()).then(()=>{this.resuming=null;const pending=this.pending;this.pending=null;if(pending&&context===this.ctx&&this.allowed()&&context.state==='running')this.play(...pending);},()=>{this.resuming=null;this.pending=null;});
    }
    track(node,connections){
      while(this.nodes.size>=16){const old=this.nodes.values().next().value;try{old.stop();}catch(e){}this.nodes.delete(old);}
      this.nodes.add(node);node.onended=()=>{this.nodes.delete(node);for(const n of connections||[]){try{n.disconnect();}catch(e){}}};return node;
    }
    tone(freq,end,duration,gain,type,delay=0){
      const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';
      o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+Math.min(.012,duration/4));
      g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);
      this.track(o,[o,g]);o.start(t);o.stop(t+duration+.015);
    }
    play(kind,category){
      if(!this.allowed())return;this.init();if(!this.master)return;
      if(this.ctx.state!=='running'){this.pending=[kind,category];this.resume();return;}
      const prefs=this.api.prefs().sfx||{},reward=['success','complete','loot','claim','levelup','achievement','charge','purchase','pixel-complete'].includes(kind)||kind.startsWith('quest-');
      const family=category==='key'?'keyVol':kind==='timer'?'timerVol':reward?'winVol':'uiVol';
      if(category==='key'&&(prefs.keys===false||prefs.key==='none'))return;
      const gain=Math.min(2,Math.max(0,Number(prefs[family]??50)/50));if(!gain)return;
      this.master.gain.value=.38*Math.min(1,Math.max(0,Number(prefs.vol??50)/100));
      const now=performance.now(),gap=category==='key'?28:reward?180:55;
      if(this.last[kind]!==undefined&&now-this.last[kind]<gap)return;
      if(!reward&&this.lastReward!==undefined&&now-this.lastReward<100)return;
      this.last[kind]=now;if(reward)this.lastReward=now;
      const notes=window.ArcadeSFX.score(category==='key'?'key':kind,prefs.pack==='arcade'?'pixel':'pixel-night',prefs.key);
      notes.forEach(n=>this.tone(n.hz,n.end,n.ms,n.gain*gain*(n.wave==='square'?.55:1),n.wave,n.at));
    }
    stop(){
      this.nodes.forEach(n=>{try{n.stop();}catch(e){}});this.nodes.clear();
      if(this.master){this.master.disconnect();this.filter.disconnect();this.limiter.disconnect();}
      this.master=null;this.filter=null;this.limiter=null;this.last={};this.pending=null;this.lastReward=undefined;
    }
    destroy(){this.stop();this.unlocked=false;doc.removeEventListener('pointerdown',this.gesture);doc.removeEventListener('keydown',this.gesture);doc.removeEventListener('click',this.selection);
      try{if(navigator.audioSession&&this.sessionType!==undefined){navigator.audioSession.removeEventListener('statechange',this.interruption);navigator.audioSession.type=this.sessionType;}}catch(e){}
    }
    status(){return {enabled:!!this.api.prefs().sound,unlocked:this.unlocked,nodes:this.nodes.size,drone:0,connected:!!this.master,context:this.ctx?.state||'not-started'};}
  }
  let sound=null;
  function visibility(){motion();if(sound)sound.sync();}
  function settings(){
    const key=[doc.body.dataset.bg,doc.body.dataset.mode,doc.body.dataset.theme].join('|');
    if(key!==skyKey){skyKey=key;palette();makeSky();}
    if(sound)sound.sync();motion();
  }
  function mount(api){
    bridge=api;if(mounted){settings();return;}mounted=true;
    root=doc.createElement('div');root.id='pn-background';root.setAttribute('aria-hidden','true');doc.body.prepend(root);
    palette();makeSky();numbers();
    observer=new MutationObserver(numbers);
    doc.querySelectorAll(numberSelector).forEach(el=>observer.observe(el,{childList:true,characterData:true,subtree:true}));
    bodyObserver=new MutationObserver(settings);bodyObserver.observe(doc.body,{attributes:true,attributeFilter:['data-bg','data-mode','data-theme','data-motion-enabled','class']});
    addEventListener('resize',resize);doc.addEventListener('visibilitychange',visibility);
    reduce.addEventListener('change',motion);motion();
    if(typeof SoundManager!=='undefined'){sound=new SoundManager(api);sound.mount();}
  }
  function unmount(){
    if(!mounted)return;mounted=false;
    cancelAnimationFrame(frame);frame=0;clearTimeout(resizeTimer);clearTimeout(paintTimer);paintTimer=0;skyKey='';
    if(observer)observer.disconnect();observer=null;
    if(bodyObserver)bodyObserver.disconnect();bodyObserver=null;
    removeEventListener('resize',resize);doc.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',motion);
    animations.forEach(a=>a.cancel());animations.clear();ghosts.forEach(g=>g.remove());ghosts.clear();lastNumbers.clear();
    if(sound)sound.destroy();sound=null;if(root)root.remove();root=null;layers=[];bridge=null;Object.keys(colors).forEach(name=>doc.body.style.removeProperty('--pn-'+name));doc.body.style.removeProperty('--ink-rgb');doc.body.classList.remove('pn-native-bg');
  }
  window.PixelNight={mount,unmount,transition,settings,play(kind,category){if(sound&&active())sound.play(kind,category);},
    status(){return {mounted,frame:!!frame,layers:layers.length,animations:animations.size,ghosts:ghosts.size,sound:sound?sound.status():null};}};
})();
