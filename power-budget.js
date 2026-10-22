/* Park decorative work after interaction, without polling or changing saved preferences. */
(function(root){'use strict';
  let api=null,idleTimer=0,audioTimer=0,resting=false,lastInput=0;
  const paused=new Set(),IDLE_MS=8000,AUDIO_MS=12000;
  function refresh(){
    if(!resting)return;
    for(const a of document.getAnimations?.()||[]){
      if(a.playState==='running'&&a.effect?.getTiming().iterations===Infinity){a.pause();paused.add(a);}
    }
    for(const a of paused)if(a.playState==='idle'||a.playState==='finished'||a.effect?.target?.isConnected===false)paused.delete(a);
  }
  function rest(){clearTimeout(idleTimer);idleTimer=0;resting=true;document.body.dataset.powerResting='true';api?.rest(true);refresh();}
  function wake(){
    if(document.hidden||!document.hasFocus())return;
    if(resting){resting=false;document.body.dataset.powerResting='false';api?.rest(false);
      for(const a of paused)if(a.playState==='paused'&&a.effect?.target?.isConnected!==false)a.play();paused.clear();}
    clearTimeout(idleTimer);idleTimer=setTimeout(rest,IDLE_MS);
  }
  function input(e){if(!e.isTrusted)return;const now=Date.now();if(now-lastInput<1000&&!resting)return;lastInput=now;wake();}
  function audioUsed(){clearTimeout(audioTimer);audioTimer=setTimeout(()=>{audioTimer=0;api?.quietAudio();},AUDIO_MS);}
  function visibility(){if(document.hidden){rest();clearTimeout(audioTimer);audioTimer=0;api?.quietAudio(true);}else wake();}
  function init(bridge){if(api)return;api=bridge;
    for(const name of ['pointerdown','pointermove','keydown','input','scroll'])document.addEventListener(name,input,{passive:true,capture:true});
    document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',rest);window.addEventListener('focus',wake);
    window.addEventListener('pagehide',()=>{rest();clearTimeout(audioTimer);api?.quietAudio(true);});
    if(document.hidden||!document.hasFocus())rest();else wake();
  }
  root.PowerBudget={init,refresh,audioUsed,rest,wake,status:()=>({resting,paused:paused.size,idleTimer:!!idleTimer,audioTimer:!!audioTimer})};
})(typeof window==='undefined'?globalThis:window);
