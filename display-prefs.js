/* Text size and control spacing are independent preferences; no page zoom required. */
(function(root){'use strict';
  const LEGACY={sm:90,md:100,lg:130,xl:200};
  const bounded=(value,min,max,fallback)=>value!==null&&value!==''&&Number.isFinite(Number(value))?Math.max(min,Math.min(max,Math.round(Number(value)/5)*5)):fallback;
  function normalize(s){s.textScale=bounded(s.textScale,85,200,LEGACY[s.textSize]||100);s.appSize=bounded(s.appSize,80,125,100);return s;}
  function sync(s){normalize(s);const style=document.documentElement.style;style.setProperty('--text-scale',String(s.textScale/100));style.setProperty('--layout-scale',String(s.appSize/100));style.setProperty('font-size',(16*s.textScale/100)+'px','important');
    const size=s.textScale>=160?'xl':s.textScale>=120?'lg':s.textScale<=95?'sm':'md';if(document.body.dataset.size!==size)document.body.dataset.size=size;
    for(const [id,key] of [['textScale','textScale'],['appSize','appSize']]){const input=document.getElementById(id),output=document.getElementById(id+'Value');if(input&&document.activeElement!==input)input.value=s[key];if(output)output.textContent=s[key]+'%';}
    document.querySelectorAll?.('#sizeRow [data-sz]').forEach(b=>{const on=LEGACY[b.dataset.sz]===s.textScale;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  }
  function bind(getState,save){for(const [id,key] of [['textScale','textScale'],['appSize','appSize']]){const input=document.getElementById(id);if(!input)continue;input.oninput=()=>{const s=getState();s[key]=Number(input.value);sync(s);root.AppUI?.palette();};input.onchange=()=>save();}
    const reset=document.getElementById('displaySizeReset');if(reset)reset.onclick=()=>{const s=getState();s.textSize='md';s.textScale=100;s.appSize=100;sync(s);root.AppUI?.palette();save();};
  }
  const api={normalize,sync,bind,LEGACY};if(typeof module==='object'&&module.exports)module.exports=api;else root.DisplayPrefs=api;
})(globalThis);
