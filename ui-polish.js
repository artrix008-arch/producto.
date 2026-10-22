/* Shared DOM behavior; storage and quest rules continue to belong to index.html. */
(function(){'use strict';
  const doc=document,lists=new Map(),selected=new Set(),modalStack=[],heights=new Map();let api=null,frame=0;
  let observer=null,resizeObserver=null,lastFocus=null,undoRecord=null,redoRecord=null;
  const $=s=>doc.querySelector(s),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function announce(text){const live=$('#uiLive');if(live){live.textContent='';requestAnimationFrame(()=>live.textContent=text);}}
  function palette(){
    const b=doc.body;['--readable-ink','--muted-ink','--action-ink','--focus-ink','--on-acc','--danger'].forEach(k=>b.style.removeProperty(k));
    const s=getComputedStyle(b),bg=s.getPropertyValue('--bg').trim()||s.backgroundColor,ink=s.getPropertyValue('--ink').trim()||s.color,acc=s.getPropertyValue('--acc').trim()||ink;
    const readable=TaskTools.readable(ink,bg);b.style.setProperty('--readable-ink',readable);b.style.setProperty('--muted-ink',TaskTools.muted(readable,bg,6));
    const action=TaskTools.contrast(TaskTools.rgb(acc),[0,0,0])>=TaskTools.contrast(TaskTools.rgb(acc),[255,255,255])?'#05040B':'#FFFFFF';
    b.style.setProperty('--action-ink',TaskTools.readable(action,acc));b.style.setProperty('--on-acc',TaskTools.readable(action,acc));b.style.setProperty('--focus-ink',TaskTools.readable(acc,bg,3));b.style.setProperty('--accent-ink',TaskTools.readable(acc,bg));
    b.style.setProperty('--danger',TaskTools.readable(s.getPropertyValue('--danger').trim()||'#EF233C',bg));
    heights.clear();viewport();schedule();
  }
  function viewport(){
    const vv=visualViewport,nav=$('#bottomNav'),navHeight=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().height:0;
    doc.documentElement.style.setProperty('--available-height',(vv?vv.height:innerHeight)+'px');doc.documentElement.style.setProperty('--viewport-top',(vv?vv.offsetTop:0)+'px');
    doc.documentElement.style.setProperty('--nav-height',navHeight+'px');schedule();
  }
  function focusable(root){return [...root.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]')].filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).opacity!=='0');}
  function dialogs(){
    const open=[...doc.querySelectorAll('.modal.open,#editor.open,.pop.show,#levelCut.show')];
    const topBefore=modalStack.at(-1);
    open.forEach(el=>{if(!modalStack.some(x=>x.el===el)){
      const title=el.querySelector('h2,h1,.sheet-h');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
      if(title){if(!title.id)title.id=el.id+'Label';el.setAttribute('aria-labelledby',title.id);}else el.setAttribute('aria-label',el.id.replace(/Modal$/,'').replace(/([A-Z])/g,' $1'));
      modalStack.push({el,returnTo:doc.activeElement});
    }});
    for(let i=modalStack.length-1;i>=0;i--)if(!open.includes(modalStack[i].el)){
      const [closed]=modalStack.splice(i,1);closed.el.inert=false;
      if(closed===topBefore){const target=closed.returnTo?.isConnected?closed.returnTo:closed.el.id==='editor'?$('#nNew'):$('#cTitle');if(target)requestAnimationFrame(()=>target.focus({preventScroll:true}));}
    }
    const top=modalStack.at(-1)?.el;
    modalStack.forEach((x,i)=>{x.el.style.zIndex=String(120+i*2);x.el.inert=x.el!==top;});
    for(const child of doc.body.children){if(child.matches('header,main,footer,#bottomNav,#quickFab'))child.inert=!!top;}
    if(top&&top!==topBefore?.el){const targets=focusable(top);requestAnimationFrame(()=>{if(!top.contains(doc.activeElement)){const e=targets[0]||top;e.tabIndex=e.tabIndex<0?-1:e.tabIndex;e.focus({preventScroll:true});}});}
  }
  function renderList(id,rows,html){const el=doc.getElementById(id);if(!el)return;el.setAttribute('role','list');lists.set(id,{el,rows,html});draw(lists.get(id));}
  function draw(list){
    const {el,rows,html}=list;if(!el.isConnected)return;
    const main=$('#main'),large=rows.length>180,estimate=Math.max(150,parseFloat(getComputedStyle(doc.documentElement).fontSize)*11);
    let visible=rows,before=0,after=0;
    if(large){const base=el.getBoundingClientRect().top-main.getBoundingClientRect().top+main.scrollTop,hs=rows.map(t=>heights.get(t.id)||estimate),r=TaskTools.range(hs,main.scrollTop-base,main.scrollTop+main.clientHeight-base,estimate*3);
      visible=rows.slice(r.start,Math.max(r.end,r.start+1));before=r.before;after=r.after;}
    const active=doc.activeElement,owner=active?.closest('.task'),token=owner&&el.contains(owner)?{id:owner.dataset.id,act:active.dataset.act}:null;
    const previous=new Map([...el.children].filter(x=>x.dataset.id).map(x=>[x.dataset.id,x])),nodes=[];
    function spacer(h){const div=doc.createElement('div');div.className='virtual-spacer';div.style.setProperty('--spacer-height',h+'px');div.setAttribute('aria-hidden','true');return div;}
    if(before)nodes.push(spacer(before));
    visible.forEach(t=>{const source=html(t),old=previous.get(t.id);let node=old;
      if(!old||old._source!==source){const template=doc.createElement('template');template.innerHTML=source;node=template.content.firstElementChild;node._source=source;}
      node.setAttribute('aria-posinset',String(rows.indexOf(t)+1));node.setAttribute('aria-setsize',String(rows.length));
      node.querySelectorAll('.ttl,.dsc').forEach(e=>e.setAttribute('dir','auto'));
      nodes.push(node);if(large&&resizeObserver)resizeObserver.observe(node);
    });
    if(after)nodes.push(spacer(after));
    const keep=new Set(nodes);[...el.children].forEach(x=>{if(!keep.has(x)){resizeObserver?.unobserve(x);x.remove();}});
    nodes.forEach((node,i)=>{if(el.children[i]!==node)el.insertBefore(node,el.children[i]||null);});
    if(token&&!active.isConnected&&!modalStack.length&&visible.some(t=>t.id===token.id)){const target=el.querySelector('[data-id="'+CSS.escape(token.id)+'"] [data-act="'+CSS.escape(token.act||'check')+'"]');target?.focus({preventScroll:true});}
  }
  function schedule(){if(frame||doc.hidden)return;frame=requestAnimationFrame(()=>{frame=0;lists.forEach(l=>{if(l.rows.length>180&&l.el.getClientRects().length)draw(l);});});}
  function bulkUI(){
    if(!api)return;const s=api.state(),ids=new Set(s.tasks.filter(t=>t.st==='live').map(t=>t.id));[...selected].forEach(id=>{if(!ids.has(id))selected.delete(id);});
    const bar=$('#bulkBar'),toggle=$('#bulkToggle');if(bar)bar.hidden=!s.bulkMode;if(toggle)toggle.setAttribute('aria-pressed',String(!!s.bulkMode));
    const count=$('#bulkCount');if(count)count.textContent=selected.size+' selected';
    ['bulkComplete','bulkDelete','bulkMove'].forEach(id=>{const b=doc.getElementById(id);if(b)b.disabled=!selected.size;});
  }
  function snapshot(ids){return {...TaskTools.capture(api.state(),ids),open:[...doc.querySelectorAll('.modal.open')].map(x=>x.id)};}
  function restore(a,b){
    api.cancelRewards?.(a.ids);const s=TaskTools.restore(api.state(),a,b);[...a.rows,...(a.notes||[])].forEach(old=>{const t=s.tasks.find(x=>x.id===old.id)||(s.notes||[]).find(x=>x.id===old.id);if(t)api.stamp(t);});
    b.open.filter(id=>!a.open.includes(id)).forEach(id=>doc.getElementById(id)?.classList.remove('open'));
    api.save();api.render();bulkUI();
  }
  function transaction(label,ids,change){const before=snapshot(ids);change();const after=snapshot(ids);undoRecord={label,before,after};redoRecord=null;offerUndo();bulkUI();}
  function offerUndo(){if(!undoRecord)return;const record=undoRecord;api.undoToast(record.label,()=>{restore(record.before,record.after);undoRecord=null;redoRecord=record;api.undoToast('Undone · '+record.label,()=>{restore(record.after,record.before);undoRecord=record;redoRecord=null;offerUndo();},5500);const b=$('#undoBtn');if(b)b.textContent='redo';announce('Action undone');},5500);}
  function complete(id,button){const reopening=api.state().tasks.find(t=>t.id===id)?.done;transaction(reopening?'Quest reopened':'Quest completed',[id],()=>api.complete(id,button,true));announce(reopening?'Task reopened':'Task completed');}
  function bulk(action){const ids=[...selected],s=api.state();if(!ids.length)return;
    transaction(action==='delete'?'Tasks moved to trash':action==='complete'?'Tasks completed':'Tasks moved',ids,()=>{
      for(const id of ids){const t=s.tasks.find(x=>x.id===id);if(!t)continue;
        if(action==='complete'&&!t.done)api.complete(id,null,'batch');
        if(action==='delete'){t.st='trash';api.stamp(t);}
        if(action==='move'){t.tab=$('#bulkList').value;api.stamp(t);}
      }if(action==='complete')api.finishBatch();selected.clear();api.save();api.render();});bulkUI();announce('Bulk action finished');
  }
  function move(id,direction){const s=api.state();if(s.sort!=='manual'){api.toast('Choose manual order to move quests.');return;}
    const t=s.tasks.find(x=>x.id===id);if(!t)return;const group=s.tasks.filter(x=>x.st==='live'&&!x.done).sort((a,b)=>(a.ord||0)-(b.ord||0)),i=group.indexOf(t),j=i+direction;
    if(j<0||j>=group.length)return;const before=typeof InteractionFX!=='undefined'?InteractionFX.layout():null;[group[i],group[j]]=[group[j],group[i]];group.forEach((x,k)=>{x.ord=k;api.stamp(x);});api.save();api.render();if(before)InteractionFX.reorder(before);announce('Quest moved '+(direction<0?'up':'down'));
  }
  function init(bridge){
    api=bridge;const live=doc.createElement('div');live.id='uiLive';live.className='ui-live';live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');doc.body.appendChild(live);
    $('#toast')?.setAttribute('aria-live','polite');const character=$('#lvlWrap');if(character){character.setAttribute('role','button');character.tabIndex=0;character.setAttribute('aria-label','Open character');}
    [['calPrev','Previous month'],['calNext','Next month'],['setClose','Close settings'],['cTitle','Quest title'],['cDue','Due date'],['aDue','Due date'],['qeDue','Due date'],['cDue2','End date'],['aDue2','End date'],['qeDue2','End date'],['musicVol','Music volume'],['sfxVol','Sound effects volume'],['winVol','Reward volume'],['aTitle','Quest title'],['qeTitle','Quest title'],['habitInput','New habit'],['nQuick','Quick note']].forEach(([id,name])=>doc.getElementById(id)?.setAttribute('aria-label',name));
    doc.querySelectorAll('.hdchip').forEach((b,i)=>b.setAttribute('aria-label',['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i%7]));
    doc.querySelectorAll('input,select,textarea').forEach(el=>{if(!el.getAttribute('aria-label')&&!el.labels?.length)el.setAttribute('aria-label',el.title||el.placeholder||el.id.replace(/([A-Z])/g,' $1')||'Value');});
    resizeObserver=new ResizeObserver(entries=>{let changed=false;entries.forEach(e=>{if(e.target.dataset.id){const value=e.target.getBoundingClientRect().height+8;if(Math.abs((heights.get(e.target.dataset.id)||0)-value)>1){heights.set(e.target.dataset.id,value);changed=true;}}});if(changed)schedule();});
    observer=new MutationObserver(records=>{if(records.some(r=>r.target===doc.body))palette();if(records.some(r=>r.target.classList?.contains('modal')||r.target.id==='editor'||r.target.classList?.contains('pop')||r.target.id==='levelCut'))dialogs();});
    observer.observe(doc.body,{attributes:true,attributeFilter:['data-theme','data-skin','data-mode','data-size']});doc.querySelectorAll('.modal,#editor,.pop,#levelCut').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
    $('#main')?.addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>{heights.clear();viewport();});visualViewport?.addEventListener('resize',viewport);visualViewport?.addEventListener('scroll',viewport);
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
    $('#bulkToggle')?.addEventListener('click',()=>{api.state().bulkMode=!api.state().bulkMode;selected.clear();api.render();bulkUI();});
    ['Complete','Delete','Move'].forEach(action=>doc.getElementById('bulk'+action)?.addEventListener('click',()=>bulk(action.toLowerCase())));
    $('#bulkAll')?.addEventListener('click',()=>{api.visibleTasks().forEach(t=>selected.add(t.id));api.render();bulkUI();});
    doc.addEventListener('click',e=>{const b=e.target.closest('[data-act="select"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const id=b.closest('[data-id]').dataset.id;selected.has(id)?selected.delete(id):selected.add(id);api.render();bulkUI();},true);
    doc.addEventListener('click',e=>{const add=e.target.closest('[data-new-note]');if(add){api.newNote(add.dataset.newNote);return;}const empty=e.target.closest('[data-empty-action]');if(empty){if(empty.dataset.emptyAction==='habit')$('#habitInput')?.focus();else if(empty.dataset.emptyAction==='quest')api.quick();else{api.state().scope='all';api.save();api.render();}}});
    doc.addEventListener('keydown',e=>{
      const top=modalStack.at(-1)?.el;if(e.key==='Escape'&&top){e.preventDefault();e.stopImmediatePropagation();api.dismiss(top);return;}if(e.key==='Tab'&&top){const items=focusable(top),first=items[0],last=items.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&(doc.activeElement===first||!top.contains(doc.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(doc.activeElement===last||!top.contains(doc.activeElement))){e.preventDefault();first.focus();}}
      if(e.target===character&&(e.key==='Enter'||e.key===' ')){e.preventDefault();character.click();}
      const card=e.target.closest('.task[data-id]');if(card&&e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(card.dataset.id,e.key==='ArrowUp'?-1:1);}
      if(card&&(e.ctrlKey||e.metaKey)&&['Home','End'].includes(e.key)&&!top){const list=[...lists.values()].find(x=>x.el.contains(card));if(list&&list.rows.length>180){e.preventDefault();const main=$('#main'),last=e.key==='End',base=list.el.getBoundingClientRect().top-main.getBoundingClientRect().top+main.scrollTop;main.scrollTop=last?base+list.rows.reduce((n,t)=>n+(heights.get(t.id)||Math.max(150,parseFloat(getComputedStyle(doc.documentElement).fontSize)*11)),0)-main.clientHeight:base;draw(list);const t=last?list.rows.at(-1):list.rows[0];list.el.querySelector('[data-id="'+CSS.escape(t.id)+'"]')?.focus({preventScroll:true});}}
      if(card&&e.target===card&&['Enter',' '].includes(e.key)){e.preventDefault();api.open(card.dataset.id);}
      const note=e.target.closest('.ncard[data-id]');if(note&&e.target===note&&['Enter',' '].includes(e.key)){e.preventDefault();api.note(note.dataset.id);}
      if(e.key==='Tab'&&card&&!top){const list=[...lists.values()].find(x=>x.el.contains(card)),items=focusable(card);
        if(list&&list.rows.length>180&&((!e.shiftKey&&e.target===items.at(-1))||(e.shiftKey&&e.target===card))){const i=list.rows.findIndex(x=>x.id===card.dataset.id),next=list.rows[i+(e.shiftKey?-1:1)];
          if(next&&!list.el.querySelector('[data-id="'+CSS.escape(next.id)+'"]')){e.preventDefault();const main=$('#main'),base=list.el.getBoundingClientRect().top-main.getBoundingClientRect().top+main.scrollTop;
            main.scrollTop=base+list.rows.slice(0,i+(e.shiftKey?-1:1)).reduce((n,t)=>n+(heights.get(t.id)||180),0);draw(list);
            list.el.querySelector('[data-id="'+CSS.escape(next.id)+'"]')?.focus({preventScroll:true});}
        }}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea,[contenteditable="true"]')){if(e.shiftKey&&redoRecord){e.preventDefault();restore(redoRecord.after,redoRecord.before);undoRecord=redoRecord;redoRecord=null;offerUndo();}else if(undoRecord){e.preventDefault();const r=undoRecord;restore(r.before,r.after);redoRecord=r;undoRecord=null;announce('Action undone');}}
    },true);
    let swipe=null,suppressClick=null;
    doc.addEventListener('click',e=>{if(suppressClick&&Date.now()<suppressClick.until&&e.target.closest('.task')?.dataset.id===suppressClick.id){e.preventDefault();e.stopImmediatePropagation();}},true);
    $('#main')?.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest('button,input,textarea,[contenteditable="true"]'))return;const card=e.target.closest('.task');if(card)swipe={id:card.dataset.id,x:e.clientX,y:e.clientY,card};},{passive:true});
    $('#main')?.addEventListener('pointermove',e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){swipe.card.style.transform='';swipe.card.classList.remove('swiping');swipe=null;return;}if(Math.abs(dx)>20){swipe.card.style.transform='translateX('+Math.max(-96,Math.min(96,dx))+'px)';swipe.card.classList.add('swiping');}},{passive:true});
    const end=e=>{if(!swipe)return;const s=swipe;swipe=null;s.card.classList.add('swipe-return');s.card.style.transform='';s.card.classList.remove('swiping');setTimeout(()=>s.card.classList.remove('swipe-return'),220);const dx=e.clientX-s.x;if(e.type==='pointercancel'||Math.abs(dx)<80||Math.abs(e.clientY-s.y)>45)return;suppressClick={id:s.id,until:Date.now()+350};
      if(dx>0){const t=api.state().tasks.find(x=>x.id===s.id);if(t&&!t.done)complete(s.id,null);}else transaction('Quest moved to trash',[s.id],()=>{const t=api.state().tasks.find(x=>x.id===s.id);if(t){t.st='trash';api.stamp(t);api.save();api.render();}});
    };$('#main')?.addEventListener('pointerup',end);$('#main')?.addEventListener('pointercancel',end);
    palette();viewport();dialogs();bulkUI();
  }
  let lastStorageError=0;
  window.AppUI={init,renderList,palette,announce,bulkUI,selected,complete,transaction,move,
    recordReward(owner,gold){const task=api.state().tasks.find(t=>t.id===owner&&t.done&&t.rewarded);if(task){task.coinAwd=(task.coinAwd||0)+gold;api.stamp(task);}const recorded=undoRecord?.after.rows.find(t=>t.id===owner&&t.done);if(recorded){undoRecord.after.coins+=gold;recorded.coinAwd=(recorded.coinAwd||0)+gold;}},
    storageError(){if(!api||Date.now()-lastStorageError<6000)return;lastStorageError=Date.now();api.toast('Storage is full. Export a backup from Settings → Account.');announce('Storage is full. Your changes could not be saved.');},
    refresh(){if(!api)return;const s=api.state();const list=$('#bulkList');if(list){const value=list.value;list.replaceChildren(new Option('Main list',''),...(s.tabs||[]).map(t=>new Option(t.name,t.id)));list.value=value;}bulkUI();},
    afterRender(){dialogs();schedule();},schedule};
})();
