/* Bounded, short-lived loot effects. Reward accounting stays in the app. */
(function(root){'use strict';
  let particles=new Set(),animations=new Set(),current=null;
  function clear(){animations.forEach(a=>a.cancel());animations.clear();particles.forEach(p=>p.remove());particles.clear();if(current)delete current.dataset.lootPhase;current=null;}
  function begin(overlay){clear();current=overlay;overlay.dataset.lootPhase='charging';}
  function burst(overlay,tier,quiet){
    if(current!==overlay)return;overlay.dataset.lootPhase='open';if(quiet)return;
    const host=overlay.querySelector('#lcCoins'),small=innerWidth<621;
    const count=Math.min(small?8:14,6+tier*2);
    for(let i=0;i<count;i++){
      const p=document.createElement('i'),angle=-Math.PI+(i+.5)/count*Math.PI,distance=(small?75:110)+tier*8;
      p.className=i%3?'loot-mote':'loot-diamond';host.appendChild(p);particles.add(p);
      const dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance-40;
      const a=p.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:`translate(${dx}px,${dy}px) scale(1) rotate(90deg)`,opacity:1,offset:.45},{transform:`translate(${dx*1.2}px,${dy+45}px) scale(.2) rotate(180deg)`,opacity:0}],{duration:900+i*24,easing:'cubic-bezier(.2,.7,.3,1)'});
      animations.add(a);a.onfinish=a.oncancel=()=>{animations.delete(a);particles.delete(p);p.remove();};
    }
  }
  function reveal(overlay){if(current===overlay)overlay.dataset.lootPhase='reward';}
  root.LootFX={begin,burst,reveal,clear,status:()=>({particles:particles.size,animations:animations.size})};
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden){animations.forEach(a=>a.cancel());animations.clear();particles.forEach(p=>p.remove());particles.clear();}});
})(typeof window==='undefined'?globalThis:window);
