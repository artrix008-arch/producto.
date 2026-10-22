/* Data-only helpers shared by the app and dependency-free regression tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TaskTools=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
  const issued=new Set();let sequence=0;
  function makeId(){let id;do{id=typeof crypto!=='undefined'&&crypto.randomUUID?'p'+crypto.randomUUID():'p'+Date.now().toString(36)+'-'+(++sequence).toString(36)+'-'+Math.random().toString(36).slice(2,9);}while(issued.has(id));issued.add(id);return id;}
  function repairRows(rows){const seen=new Set();return (Array.isArray(rows)?rows:[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map(x=>{
    if(typeof x.id!=='string'||!/^[\w:-]{1,128}$/.test(x.id)||seen.has(x.id))x.id=makeId();seen.add(x.id);issued.add(x.id);return x;});}
  function title(raw){const value=String(raw||'').trim().normalize('NFC');return {value,error:!value?'A quest needs a title.':Array.from(value).length>240?'Keep the title to 240 characters; use notes for the rest.':''};}
  function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number),t=new Date(0);t.setUTCFullYear(y,m-1,d);t.setUTCHours(0,0,0,0);return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d;}
  function checkedDate(y,m,d){const key=String(y).padStart(4,'0')+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');if(!validDate(key))return new Date(NaN);const date=new Date(0);date.setFullYear(+y,+m,+d);date.setHours(0,0,0,0);return date;}
  function deadline(due,time,end){if(due&&!validDate(due))return 'Choose a valid date.';if(end&&!validDate(end))return 'Choose a valid end date.';if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return 'Choose a valid time from 00:00 to 23:59.';if(end&&(!due||end<due))return 'The end date must be on or after the start date.';return '';}
  function tags(raw){return [...new Set((Array.isArray(raw)?raw:String(raw||'').split(/[\s,]+/)).map(x=>String(x).replace(/^#/,'').normalize('NFC').toLocaleLowerCase()).filter(x=>/^[\p{L}\p{M}\p{N}_-]+$/u.test(x)))].slice(0,20);}
  function norm(s){return String(s||'').normalize('NFKD').replace(/(\p{Script=Latin})\p{M}+/gu,'$1').toLocaleLowerCase();}
  const searchCache=new WeakMap();
  function matches(t,q){if(!q)return true;const signature=[t.t,t.d,(t.tags||[]).join(' ')].join('\n');let hit=searchCache.get(t);if(!hit||hit.signature!==signature){hit={signature,text:norm(signature.replace(/<[^>]*>/g,' '))};searchCache.set(t,hit);}return norm(q).trim().split(/\s+/).every(term=>hit.text.includes(term));}
  function rgb(value){const s=String(value).trim();if(/^#[\da-f]{3}$/i.test(s))return s.slice(1).split('').map(x=>parseInt(x+x,16));if(/^#[\da-f]{6,8}$/i.test(s))return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const n=s.match(/[\d.]+/g);return n&&n.length>=3?n.slice(0,3).map(Number):[0,0,0];}
  function luminance(c){return c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);}
  function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function readable(ink,bg,min=4.5){const a=rgb(ink),b=rgb(bg);if(contrast(a,b)>=min)return 'rgb('+a.join(',')+')';const end=contrast([0,0,0],b)>contrast([255,255,255],b)?[0,0,0]:[255,255,255];for(let i=1;i<=20;i++){const c=a.map((v,k)=>Math.round(v+(end[k]-v)*i/20));if(contrast(c,b)>=min)return 'rgb('+c.join(',')+')';}return 'rgb('+end.join(',')+')';}
  function muted(ink,bg,min=4.5){const a=rgb(ink),b=rgb(bg);for(let i=55;i<=100;i+=5){const c=a.map((v,k)=>Math.round(v*i/100+b[k]*(1-i/100)));if(contrast(c,b)>=min)return 'rgb('+c.join(',')+')';}return readable(ink,bg,min);}
  function range(heights,top,bottom,overscan=500){let start=0,end=0,y=0,before=0,total=heights.reduce((a,b)=>a+b,0);while(start<heights.length&&y+heights[start]<Math.max(0,top-overscan))y+=heights[start++];before=y;end=start;while(end<heights.length&&y<bottom+overscan)y+=heights[end++];return {start,end,before,after:Math.max(0,total-y),total};}
  function reorder(rows,id,before){const sorted=rows.slice().sort((a,b)=>(a.ord||0)-(b.ord||0)),from=sorted.findIndex(x=>x.id===id);if(from<0)return sorted;const [item]=sorted.splice(from,1),to=before?sorted.findIndex(x=>x.id===before):-1;sorted.splice(to<0?sorted.length:to,0,item);sorted.forEach((x,i)=>x.ord=i);return sorted;}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function capture(state,ids){return {ids,rows:clone(state.tasks.filter(t=>ids.includes(t.id))),notes:clone((state.notes||[]).filter(t=>ids.includes(t.id))),coins:state.coins||0,xp:state.xp||0,stats:clone(state.stats||{}),items:clone(state.items||[]),ach:clone(state.ach||{}),extras:Object.fromEntries(['challenges','chalDone','goalsRewarded','enc'].map(k=>[k,clone(state[k]??null)]))};}
  function restore(state,a,b){
    const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    function rows(key,oldRows,newRows){oldRows.forEach(old=>{const current=state[key].find(t=>t.id===old.id),after=newRows.find(t=>t.id===old.id);if(!current||!after)return;
      for(const k of new Set([...Object.keys(old),...Object.keys(after)]))if(!equal(old[k],after[k])&&equal(current[k],after[k])){if(old[k]===undefined)delete current[k];else current[k]=clone(old[k]);}
    });}
    rows('tasks',a.rows,b.rows);if(state.notes)rows('notes',a.notes||[],b.notes||[]);
    state.coins=Math.max(0,(state.coins||0)+a.coins-b.coins);state.xp=Math.max(0,(state.xp||0)+a.xp-b.xp);
    for(const key of ['completed','legendary'])state.stats[key]=Math.max(0,(state.stats[key]||0)+(a.stats[key]||0)-(b.stats[key]||0));
    for(const key of Object.keys(a.stats))if(!['completed','legendary'].includes(key)&&state.stats[key]===b.stats[key])state.stats[key]=a.stats[key];
    const added=b.items.filter(x=>!a.items.some(y=>y.id===x.id));state.items=state.items.filter(x=>!added.some(y=>y.id===x.id));
    a.items.filter(x=>!b.items.some(y=>y.id===x.id)).forEach(x=>{if(!state.items.some(y=>y.id===x.id))state.items.push(clone(x));});
    Object.keys(b.ach).filter(k=>!a.ach[k]&&state.ach[k]===b.ach[k]).forEach(k=>delete state.ach[k]);Object.assign(state.ach,a.ach);
    Object.keys(a.extras||{}).forEach(k=>{if(equal(state[k]??null,b.extras[k]))state[k]=clone(a.extras[k]);});
    return state;
  }
  return {makeId,repairRows,title,validDate,checkedDate,deadline,tags,matches,rgb,contrast,readable,muted,range,reorder,clone,capture,restore};
});
