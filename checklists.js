/* One checklist controller for notes, quest editors and read-only descriptions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Checklist=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
  const bookmarks=new WeakMap();let bridge=null,initialized=false;
  const cleanText=s=>String(s||'').replace(/[\u200b\u00a0]/g,' ').trim();
  function prefix(text){const m=String(text||'').match(/^\s*(?:-\s+)?\[([ xX]?)\]\s([\s\S]*)$/);return m?{checked:m[1].toLowerCase()==='x',text:m[2]}:null;}
  function stats(value){const s=String(value||'');let done=(s.match(/☑/g)||[]).length,total=done+(s.match(/☐/g)||[]).length;for(const m of s.matchAll(/<(?:div|p|li)\b[^>]*\bclass=["']([^"']*)["'][^>]*>/gi)){const c=m[1].split(/\s+/);if(c.includes('ckl')){total++;if(c.includes('on'))done++;}}return {done,total};}
  function selection(el){const s=window.getSelection();if(s?.rangeCount&&el.contains(s.getRangeAt(0).commonAncestorContainer))return s.getRangeAt(0);return null;}
  function caret(node,end=false){const r=document.createRange();r.selectNodeContents(node);r.collapse(!end);const s=window.getSelection();s.removeAllRanges();s.addRange(r);node.parentElement?.closest('[contenteditable="true"]')?.focus({preventScroll:true});}
  function state(line,on){line.classList.toggle('on',on);const box=line.querySelector('.ck');if(box){box.classList.toggle('on',on);box.setAttribute('aria-checked',String(on));box.setAttribute('aria-label',(on?'Uncheck: ':'Check: ')+(cleanText(line.querySelector('.ck-text')?.textContent)||'Checklist item'));}}
  function make(content,checked=false){const line=document.createElement('div');line.className='ckl';const box=document.createElement('span');box.className='ck';box.contentEditable='false';box.setAttribute('role','checkbox');box.tabIndex=0;const text=document.createElement('span');text.className='ck-text';if(content?.nodeType)text.appendChild(content);else if(content)text.textContent=content;if(!text.childNodes.length)text.appendChild(document.createElement('br'));line.append(box,text);state(line,checked);return line;}
  function normalize(root){
    if([...root.childNodes].some(n=>n.nodeType===3&&/^\s*[☐☑]/.test(n.textContent))){const nodes=[...root.childNodes],out=document.createDocumentFragment();let block=document.createElement('div');const flush=()=>{if(block.childNodes.length){out.appendChild(block);block=document.createElement('div');}};nodes.forEach(n=>{if(n.nodeName==='BR'){flush();n.remove();}else if(n.nodeType===1&&/^(DIV|P|UL|OL)$/.test(n.nodeName)){flush();out.appendChild(n);}else block.appendChild(n);});flush();root.replaceChildren(out);}
    /* Upgrade literal legacy markers without touching unrelated formatting. */
    [...root.querySelectorAll('div,p,li')].filter(el=>!el.closest('.ckl')&&!el.querySelector('div,p,li,img,ul,ol')).forEach(el=>{const m=el.textContent.match(/^\s*([☐☑])\s?/);if(!m)return;const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(n.textContent.includes(m[1])){n.textContent=n.textContent.replace(m[0],'');break;}}const fragment=document.createDocumentFragment();while(el.firstChild)fragment.appendChild(el.firstChild);el.replaceWith(make(fragment,m[1]==='☑'));});
    root.querySelectorAll('.ckl').forEach(line=>{const boxes=[...line.querySelectorAll('.ck')],checked=line.classList.contains('on')||boxes.some(x=>x.classList.contains('on'));let box=boxes[0];if(!box){box=document.createElement('span');box.className='ck';line.prepend(box);}boxes.slice(1).forEach(x=>x.remove());box.contentEditable='false';box.setAttribute('role','checkbox');box.tabIndex=0;let text=[...line.children].find(x=>x.classList.contains('ck-text'));if(!text){text=document.createElement('span');text.className='ck-text';[...line.childNodes].filter(x=>x!==box).forEach(x=>text.appendChild(x));line.appendChild(text);}if(!text.childNodes.length)text.appendChild(document.createElement('br'));state(line,checked);});
    return root;
  }
  function html(value){const el=document.createElement('div');el.innerHTML=value;normalize(el);return el.innerHTML;}
  function fire(el){el.dispatchEvent(new Event('input',{bubbles:true}));}
  function plain(line){const d=document.createElement('div'),text=line.querySelector('.ck-text');if(text)while(text.firstChild)d.appendChild(text.firstChild);if(!cleanText(d.textContent)&&!d.querySelector('img'))d.innerHTML='<br>';line.replaceWith(d);return d;}
  function block(el,r){const n=r?.startContainer,e=n?.nodeType===1?n:n?.parentElement;const b=e?.closest('div,p,li');return b&&b!==el&&el.contains(b)?b:null;}
  function insert(el){if(!el||el.contentEditable==='false')return;let r=selection(el)||bookmarks.get(el);el.focus({preventScroll:true});if(r&&el.contains(r.commonAncestorContainer)){const s=window.getSelection();s.removeAllRanges();s.addRange(r);}else{caret(el,true);r=selection(el);}const b=block(el,r),line=b?.closest('.ckl');
    if(line){const d=plain(line);caret(d,true);fire(el);return;}
    if(b&&b.tagName!=='LI'&&!b.querySelector('ul,ol')){const f=document.createDocumentFragment();while(b.firstChild)f.appendChild(b.firstChild);const row=make(f);b.replaceWith(row);caret(row.querySelector('.ck-text'),true);}
    else if(b?.tagName==='LI'){const list=b.parentElement,rows=[...list.children].map(li=>{const f=document.createDocumentFragment();while(li.firstChild)f.appendChild(li.firstChild);return make(f);});list.replaceWith(...rows);caret(rows[0].querySelector('.ck-text'),true);}
    else{const row=make();if(r){/* Wrap the current root-level line, including styled inline nodes. */let n=r.startContainer;while(n.parentNode&&n.parentNode!==el)n=n.parentNode;if(n.parentNode===el&&!(n.nodeType===1&&/^(DIV|P|UL|OL)$/.test(n.nodeName))){let first=n,last=n;while(first.previousSibling&&first.previousSibling.nodeName!=='BR'&&!(first.previousSibling.nodeType===1&&/^(DIV|P|UL|OL)$/.test(first.previousSibling.nodeName)))first=first.previousSibling;while(last.nextSibling&&last.nextSibling.nodeName!=='BR'&&!(last.nextSibling.nodeType===1&&/^(DIV|P|UL|OL)$/.test(last.nextSibling.nodeName)))last=last.nextSibling;const range=document.createRange();range.setStartBefore(first);range.setEndAfter(last);const fragment=range.extractContents();row.querySelector('.ck-text').replaceChildren(fragment);range.insertNode(row);}else{r.deleteContents();r.insertNode(row);}}else el.appendChild(row);caret(row.querySelector('.ck-text'),true);}
    normalize(el);fire(el);
  }
  function enter(el,e){if(e.isComposing||el._composing||e.shiftKey||e.ctrlKey||e.metaKey)return false;const r=selection(el),line=block(el,r)?.closest('.ckl');if(!line||!el.contains(line))return false;
    const text=line.querySelector('.ck-text');if(!text?.contains(r.startContainer)||!text.contains(r.endContainer))return false;e.preventDefault();e.stopPropagation();
    if(!cleanText(text.textContent)){const d=plain(line);caret(d);fire(el);return true;}
    r.deleteContents();const tail=document.createRange();tail.selectNodeContents(text);tail.setStart(r.startContainer,r.startOffset);const fragment=tail.extractContents(),next=make(fragment);line.after(next);if(!cleanText(text.textContent))text.innerHTML='<br>';caret(next.querySelector('.ck-text'));fire(el);return true;
  }
  function backspace(el,e){if(e.isComposing||el._composing)return;const r=selection(el),line=block(el,r)?.closest('.ckl'),text=line?.querySelector('.ck-text');if(!r?.collapsed||!text?.contains(r.startContainer))return;const pre=document.createRange();pre.selectNodeContents(text);pre.setEnd(r.startContainer,r.startOffset);if(cleanText(pre.toString()))return;e.preventDefault();const d=plain(line);caret(d);fire(el);}
  function autoformat(el){if(el._composing||el._formatting)return;const r=selection(el);if(!r)return;const b=block(el,r);if(b?.closest('.ckl')||b?.tagName==='LI')return;let raw=b?b.textContent:el.childNodes.length===1&&el.firstChild.nodeType===3?el.firstChild.textContent:null;if(raw===null)return;const p=prefix(raw),bullet=raw.match(/^([-*+] |1[.)] )([\s\S]*)$/);if(!p&&!bullet)return;
    el._formatting=true;try{let node;
      if(p){node=make(p.text,p.checked);if(b)b.replaceWith(node);else el.replaceChildren(node);caret(node.querySelector('.ck-text'),true);}
      else{node=document.createElement(bullet[1][0]==='1'?'ol':'ul');const li=document.createElement('li');li.textContent=bullet[2];if(!li.textContent)li.innerHTML='<br>';node.appendChild(li);if(b)b.replaceWith(node);else el.replaceChildren(node);caret(li,true);}
    }finally{el._formatting=false;}fire(el);
  }
  function wire(el){if(!el||el.dataset.ckwired)return;el.dataset.ckwired='1';el.addEventListener('focus',()=>normalize(el));el.addEventListener('compositionstart',()=>{el._composing=true;});el.addEventListener('compositionend',()=>{el._composing=false;autoformat(el);});
    el.addEventListener('keydown',e=>{if(e.key==='Enter')enter(el,e);else if(e.key==='Backspace')backspace(el,e);});el.addEventListener('beforeinput',e=>{if(e.inputType==='insertParagraph')enter(el,e);});
    el.addEventListener('input',()=>{if(el._composing)return;autoformat(el);el.querySelectorAll('.ckl').forEach(l=>state(l,l.classList.contains('on')));});
  }
  function toggle(box){const line=box.closest('.ckl');if(!line)return;state(line,!line.classList.contains('on'));const editor=line.closest('.rte,#eBody');if(editor){fire(editor);bridge?.changed(editor);}else{const description=line.closest('.dsc');if(description)bridge?.changed(description);}}
  function init(api){if(initialized)return;initialized=true;bridge=api;document.addEventListener('selectionchange',()=>{document.querySelectorAll('.rte,#eBody').forEach(el=>{const r=selection(el);if(r)bookmarks.set(el,r.cloneRange());});});
    document.addEventListener('pointerdown',e=>{if(e.target.closest('.ck'))e.preventDefault();},true);
    document.addEventListener('click',e=>{const box=e.target.closest('.ck');if(!box)return;e.preventDefault();e.stopImmediatePropagation();toggle(box);},true);
    document.addEventListener('keydown',e=>{const box=e.target.closest('.ck');if(!box||![' ','Enter'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();toggle(box);},true);
    document.querySelectorAll('.rte,#eBody').forEach(wire);
  }
  return {prefix,stats,cleanText,make,normalize,html,insert,wire,init};
});
