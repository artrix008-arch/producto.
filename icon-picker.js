/* A bounded picker: cached search index, 60 results per page, delegated input. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.IconPicker=api;})(typeof globalThis==='undefined'?this:globalThis,function(){'use strict';
  const PAGE_SIZE=60,cache=new WeakMap(),pixelCache=new WeakMap(),active=new Map();let sequence=0;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\uFE0F]/g,'');
  const localizedWords=s=>typeof KhmerLocale==='object'?KhmerLocale.translate(s):'';
  function index(categories){if(cache.has(categories))return cache.get(categories);const seen=new Map();
    categories.forEach(([category,rows])=>rows.forEach(([symbol,keywords])=>{const old=seen.get(symbol);if(old){old.groups.add(category);old.search+=' '+fold(category+' '+keywords);return;}seen.set(symbol,{symbol,label:keywords||category,groups:new Set([category]),search:fold(symbol+' '+keywords+' '+category)});}));
    const records=[...seen.values()];cache.set(categories,records);return records;
  }
  function results(records,query='',category='',page=0){const q=fold(query).trim(),terms=q.split(/\s+/).filter(Boolean);const matches=records.filter(e=>(!category||e.groups.has(category))&&terms.every(t=>e.search.includes(t)));
    if(q){const score=e=>{const words=e.search.split(/[^\p{L}\p{N}]+/u),primary=fold(e.label).split(/[^\p{L}\p{N}]+/u);return terms.reduce((n,t)=>n+(primary.includes(t)?20:primary.some(w=>w.startsWith(t))?10:0),0)+ (fold(e.label)===q?40:0)+(fold(e.symbol)===q?20:0)+terms.reduce((n,t)=>n+(words.includes(t)?4:words.some(w=>w.startsWith(t))?2:0),0);};const ranks=new Map(matches.map(e=>[e,score(e)]));matches.sort((a,b)=>ranks.get(b)-ranks.get(a));}
    const pages=Math.max(1,Math.ceil(matches.length/PAGE_SIZE)),current=Math.min(pages-1,Math.max(0,page|0));return {items:matches.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE),total:matches.length,pages,page:current};
  }
  function pixelIndex(icons){const source=icons.pickerEntries?.()||icons.entries;if(!pixelCache.has(source))pixelCache.set(source,source.map(e=>({symbol:e.symbol,label:e.label,groups:new Set([e.group]),essential:e.essential,search:fold(e.symbol+' '+e.label+' '+(e.keywords||'')+' '+e.id+' '+localizedWords(e.label)+' '+localizedWords(e.group))})));return pixelCache.get(source);}
  function mount(host,options){active.get(host)?.destroy();const id='iconPicker'+(++sequence),doc=host.ownerDocument,pixels=pixelIndex(options.icons),all=pixels,essentials=pixels.filter(e=>e.essential);
    let kind='pixel',query='',category='',page=0,timer=0,live=true,current=[];
    host.innerHTML='<div class="icon-picker" data-icon-picker-root><div class="picker-tabs" role="group" aria-label="Icon collection"><button type="button" class="seg on" data-kind="pixel" aria-pressed="true">Essentials</button><button type="button" class="seg" data-kind="emoji" aria-pressed="false">All items</button></div><div class="emoji-top"><input class="picker-search" id="'+id+'Search" type="search" aria-label="Search icons" placeholder="Search icons…" autocomplete="off"><button type="button" class="btn sm" data-no-icon>No icon</button></div><select class="picker-category" aria-label="Icon category" hidden><option value="">All categories</option>'+[...new Set((options.icons.pickerEntries?.()||options.icons.entries).map(e=>e.group))].map(label=>'<option value="'+escape(label)+'">'+escape(label)+'</option>').join('')+'</select><div class="picker-results emoji-wrap" role="group" aria-label="Choose an icon"></div><div class="picker-footer"><button type="button" class="ibt" data-page="prev" aria-label="Previous icons">‹</button><span class="picker-count" role="status" aria-live="polite"></span><button type="button" class="ibt" data-page="next" aria-label="Next icons">›</button></div></div>';
    const root=host.querySelector('[data-icon-picker-root]'),grid=root.querySelector('.picker-results'),input=root.querySelector('input'),select=root.querySelector('select'),count=root.querySelector('.picker-count');
    const button=e=>'<button type="button" class="emoji" data-e="'+escape(e.symbol)+'" aria-label="'+escape(e.label)+'" title="'+escape(e.label)+'">'+options.icons.html(e.symbol)+'</button>';
    function paint(){if(!live)return;const r=results(kind==='pixel'&&!query?essentials:all,query,kind==='emoji'?category:'',page);page=r.page;current=r.items;
      const recent=!query&&!category&&!page?[...new Set(options.recents?.()||[])].slice(0,12).map(symbol=>all.find(e=>fold(e.symbol)===fold(symbol))||all.find(e=>options.icons.get(e.symbol)===options.icons.get(symbol))).filter(Boolean):[];
      grid.innerHTML=(recent.length?'<div class="emoji-cat">Recent</div><div class="emoji-grid">'+recent.map(button).join('')+'</div>':'')+(r.items.length?'<div class="emoji-grid">'+r.items.map(button).join('')+'</div>':'<p class="emoji-none">No matching icons. Try another word.</p>');
      grid.scrollTop=0;count.textContent=r.total+' icons · '+(r.page+1)+' / '+r.pages;root.querySelector('[data-page="prev"]').disabled=page===0;root.querySelector('[data-page="next"]').disabled=page>=r.pages-1;select.hidden=kind==='pixel';
      root.querySelectorAll('[data-kind]').forEach(b=>{const on=b.dataset.kind===kind;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    }
    function flush(){clearTimeout(timer);timer=0;query=input.value;page=0;paint();}
    function click(e){const b=e.target.closest('button');if(!b||!root.contains(b)||b.disabled)return;
      if(b.hasAttribute('data-e')){clearTimeout(timer);options.onPick(b.dataset.e);return;}
      if(b.hasAttribute('data-no-icon')){clearTimeout(timer);options.onPick('');return;}
      if(b.dataset.kind){clearTimeout(timer);query=input.value;kind=b.dataset.kind;category='';select.value='';page=0;paint();return;}
      if(b.dataset.page){if(timer||query!==input.value){flush();return;}page+=b.dataset.page==='next'?1:-1;paint();}
    }
    function onInput(){clearTimeout(timer);timer=setTimeout(flush,90);}
    function onChange(){category=select.value;query=input.value;clearTimeout(timer);page=0;paint();}
    function key(e){if(e.target!==input)return;if(e.key==='Enter'){e.preventDefault();if(timer||query!==input.value)flush();if(current[0])options.onPick(current[0].symbol);}if(e.key==='Escape'&&input.value){e.preventDefault();e.stopPropagation();input.value='';flush();}}
    host.addEventListener('click',click);input.addEventListener('input',onInput);input.addEventListener('keydown',key);select.addEventListener('change',onChange);
    const instance={focus(){input.focus({preventScroll:true});},destroy(){if(!live)return;live=false;clearTimeout(timer);host.removeEventListener('click',click);input.removeEventListener('input',onInput);input.removeEventListener('keydown',key);select.removeEventListener('change',onChange);root.remove();active.delete(host);}};active.set(host,instance);paint();return instance;
  }
  function closeAll(keep){for(const [host,picker] of active)if(!(keep&&(host===keep||keep.contains?.(host)))||!host.querySelector('[data-icon-picker-root]'))picker.destroy();}
  return {PAGE_SIZE,index,pixelIndex,results,mount,closeAll};
});
