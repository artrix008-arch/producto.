/* Load only the selected wallpaper. Video audio is removed from the web assets. */
(function(root){'use strict';
  const CATALOG=[
    ['shrine','Forest shrine'],['last-tree','The last tree'],['sunset-city','Sunset city'],
    ['blue-night','Blue night tower'],['sakura-station','Sakura station'],['rainy-train','Rainy train'],
    ['garden-ruins','Garden ruins'],['snow-cabin','Snow cabin'],['pixel-coast','Pixel coast'],
    ['zephyr','Zephyr street'],['corridor','Quiet corridor'],['city-window','City window'],['hillside','Hillside friend']
  ].map(([id,name])=>({id:'wp-'+id,name,src:'/wallpapers/v1/'+id+'.mp4',poster:'/wallpapers/v1/'+id+'.jpg'}));
  const TONES=[
    ['#28443b','#d9a85f','#fff3da'],['#5c486a','#d49ab2','#fff1f5'],['#5e4055','#efaa78','#352936'],
    ['#272f62','#9ec7f4','#f0f5ff'],['#456475','#b15d7b','#152330'],['#365a4b','#e5b585','#f2fff7'],
    ['#485c4e','#d7b775','#233f31'],['#243b4d','#9ac9dd','#edfaff'],['#3e7892','#dabf72','#173e50'],
    ['#6d586b','#c77d98','#241f30'],['#263738','#afcaab','#effaf0'],['#39304e','#f0ab75','#fff5dc'],['#4d7c88','#e5ca7b','#143440']
  ];
  CATALOG.forEach((w,i)=>{w.tone=TONES[i];});
  const RETIRED=new Set(['wp-shrine','wp-last-tree','wp-garden-ruins','wp-zephyr','wp-corridor','wp-hillside']);
  for(let i=CATALOG.length-1;i>=0;i--)if(RETIRED.has(CATALOG[i].id))CATALOG.splice(i,1);
  const SETS=[['set1','Tatami room','#74604d','#dca66c'],['set2','Neighborhood house','#685b83','#d7a786'],['set3','Old street','#4a7185','#eba57c'],['set4','Village house','#526d61','#d8b97a']].map(([set,name,tint,accent])=>({id:'wp-'+set,set,name:name+' · day to night',tone:[tint,accent,'#fff8ed'],poster:'/wallpapers/sets/'+set+'-morning-thumb.webp'}));
  CATALOG.push(...SETS);
  const find=id=>CATALOG.find(w=>w.id===id);
  function phase(hour,set){return hour<6||hour>=21?'night':hour<12?'morning':hour>=18&&set==='set4'?'evening':'afternoon';}
  function resolve(w,date=new Date()){if(!w?.set)return w;const time=phase(date.getHours(),w.set),dark=time==='night';return {...w,phase:time,poster:'/wallpapers/sets/'+w.set+'-'+time+'-thumb.webp',src:'/wallpapers/sets/'+w.set+'-'+time+'.webp',tone:[dark?'#25384f':w.tone[0],dark?'#9fc3df':w.tone[1],dark?'#f5f8ff':'#fff8ed']};}
  function nextBoundary(date=new Date()){const next=new Date(date);const h=[6,12,18,21].find(h=>h>date.getHours());if(h===undefined){next.setDate(next.getDate()+1);next.setHours(6,0,0,0);}else next.setHours(h,0,0,0);return next-date;}

  const rgb=hex=>hex.match(/[\da-f]{2}/gi).map(x=>parseInt(x,16));
  const mix=(a,b,n)=>'#'+rgb(a).map((x,i)=>Math.round(x*(1-n)+rgb(b)[i]*n).toString(16).padStart(2,'0')).join('');
  function palette(id,dark=false){const w=resolve(find(id));if(!w)return null;const [tint,accent,pageInk]=w.tone;
    const bg=mix(dark?'#090f17':'#ffffff',tint,dark?.25:.14),surf=mix(dark?'#111923':'#ffffff',tint,dark?.28:.08),surf2=mix(dark?'#1a2530':'#ffffff',tint,dark?.4:.2),ink=mix(dark?'#f8fafc':'#101820',tint,dark?.06:.12),muted=mix(dark?'#dce5ed':'#34404b',tint,.1),line=mix(dark?'#9aaabc':'#667787',tint,.4);
    return {bg,surf,surf2,ink,muted,line,accent,pageInk};
  }
  const previousPalette=new Map();let paletteKey='';
  function syncPalette(state){const mode=document.body.dataset?.mode||state.mode,p=palette(state.bg,mode==='dark'),key=p?state.bg+':'+mode+':'+resolve(find(state.bg))?.phase:'';
    if(key===paletteKey)return;paletteKey=key;
    if(!p){for(const [name,[value,priority]] of previousPalette){if(value)document.body.style.setProperty(name,value,priority);else document.body.style.removeProperty(name);}previousPalette.clear();return;}
    const vars={'--bg':p.bg,'--surf':p.surf,'--surf2':p.surf2,'--ink':p.ink,'--ink-rgb':rgb(p.ink).join(','),'--acc':p.accent,'--acc-rgb':rgb(p.accent).join(','),'--line':p.line,'--muted':p.muted,'--secondary':p.accent,'--empty-ink':p.muted,'--wp-page-ink':p.pageInk,
      '--pn-void':p.bg,'--pn-indigo':p.surf,'--pn-navy':p.surf2,'--pn-moon':p.ink,'--pn-ice':p.muted,'--pn-secondary':p.line,'--pn-core':p.ink,'--pn-teal':p.accent,'--pn-orange':p.accent,'--pn-violet':p.accent,'--panel-shadow':'none'};
    for(const [name,value] of Object.entries(vars)){if(!previousPalette.has(name))previousPalette.set(name,[document.body.style.getPropertyValue(name),document.body.style.getPropertyPriority(name)]);document.body.style.setProperty(name,value,'important');}
    root.AppUI?.palette();
  }
  function button(id,label){const w=resolve(find(id));return '<button type="button" class="seg'+(w?' wallpaper-choice':'')+'" data-bg="'+id+'" aria-pressed="false">'+(w?'<img src="'+w.poster+'" alt="" loading="lazy" width="160" height="90"><span>'+w.name+'</span>':label)+'</button>';}
  function createPlayer(video,allowed){let current='',revision=0,failed=false;
    return {select(w){const next=w?.src||'';if(next===current)return;revision++;failed=false;video.pause();current=next;
      if(w){video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.poster=w.poster;video.src=w.src;}
      else{video.removeAttribute('src');video.removeAttribute('poster');}
      video.load();},
    update(){if(!current||failed||!allowed()){revision++;video.pause();return;}
      if(!video.paused)return;const token=++revision;
      const pending=video.play();pending?.then(()=>{if(token!==revision&&!allowed())video.pause();}).catch(()=>{});},
    error(){failed=true;revision++;video.pause();video.removeAttribute('src');video.load();},
    selected:()=>current};
  }
  let layer=null,player=null,motion=null,image=null,timer=null,currentState=null,focused=true;
  function syncBlend(state){const on=state.wallpaperBlend!==false;
    document.body.dataset.wallpaperBlend=on?'on':'off';
    const toggle=document.getElementById('wallpaperBlendToggle');
    if(toggle){toggle.setAttribute('aria-checked',String(on));toggle.classList.toggle('on',on);toggle.textContent='Wallpaper blend: '+(on?'on':'off');}
  }
  function sync(state){if(typeof document==='undefined')return;
    currentState={...state};clearTimeout(timer);
    syncBlend(state);
    const blur=Math.max(0,Math.min(8,+state.wallpaperBlur||0));const slider=document.getElementById('wallpaperBlur'),value=document.getElementById('wallpaperBlurValue');if(slider&&document.activeElement!==slider)slider.value=blur;if(value)value.textContent=blur+' px';
    syncPalette(state);
    const w=resolve(find(state.bg)),kind=w?(w.set?'image':'video'):state.bg==='white'?'white':'';
    if(document.body.dataset.wallpaper!==kind)document.body.dataset.wallpaper=kind;
    if(!layer&&!w)return;
    if(!layer){
      layer=document.createElement('div');layer.id='wallpaperLayer';layer.setAttribute('aria-hidden','true');
      const video=document.createElement('video');video.preload='none';video.tabIndex=-1;video.setAttribute('disablepictureinpicture','');video.setAttribute('muted','');video.setAttribute('playsinline','');layer.appendChild(video);document.body.prepend(layer);
      image=document.createElement('img');image.alt='';image.decoding='async';layer.appendChild(image);
      focused=typeof document.hasFocus==='function'?document.hasFocus():true;
      motion=matchMedia('(prefers-reduced-motion: reduce)');
      const allowed=()=>document.body.dataset.wallpaper==='video'&&!document.hidden&&focused&&!motion.matches&&!document.body.classList.contains('saver')&&document.body.dataset.motionEnabled!=='false';
      player=createPlayer(video,allowed);
      const update=()=>player.update();video.addEventListener('error',()=>player.error());
      document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentState)sync(currentState);else{clearTimeout(timer);update();}});
      window.addEventListener('blur',()=>{focused=false;update();});window.addEventListener('focus',()=>{focused=true;if(currentState)sync(currentState);});window.addEventListener('pagehide',()=>{focused=false;clearTimeout(timer);update();});window.addEventListener('pageshow',()=>{focused=document.hasFocus();if(currentState)sync(currentState);});motion.addEventListener('change',update);
      new MutationObserver(()=>{syncPalette({bg:document.body.dataset.bg,mode:document.body.dataset.mode});update();}).observe(document.body,{attributes:true,attributeFilter:['class','data-motion-enabled','data-mode','data-skin','data-theme']});
    }
    layer.hidden=!w;layer.style.filter=blur?'blur('+blur+'px)':'none';layer.style.inset=blur?'-12px':'0';image.hidden=kind!=='image';layer.querySelector('video').hidden=kind!=='video';if(kind==='image'){if(image.getAttribute('src')!==w.src)image.src=w.src;if(!document.hidden)timer=setTimeout(()=>sync(currentState),nextBoundary()+100);}else image.removeAttribute('src');player.select(kind==='video'?w:null);player.update();
  }
  const api={CATALOG,SETS,phase,resolve,nextBoundary,find,button,createPlayer,sync,syncBlend,palette,syncPalette};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.Wallpapers=api;
})(globalThis);
