/* Display-only localization. Canonical English and user content stay untouched. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KhmerLocale=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const messages=Object.create(null),textRecords=new WeakMap(),attrRecords=new WeakMap();
  const attributes=['placeholder','data-ph','title','aria-label','data-tooltip','alt'];
  const SKIP='script,style,code,pre,svg,textarea,[contenteditable="true"],[translate="no"],[data-i18n="off"],.ttl,.dsc,.nttl,.nsnip,.rttl,.gn,.upnm,.hname,.hab-inline>b,.cxnm,.cq-t,.tsticker,.badge.tag,.tfoc,.pip,#eTitle,#qvTitle,#qvTtl,#qeTitle,#greetTime,.credit-name,.brand,.ck-text,#skinRow,#fontRow,#trackRow [data-track]:not([data-track="lofi-shuffle"]),#mdTrack option:not([value="lofi-shuffle"]),.checkpoint-tasks [dir="auto"]';
  let getLanguage=()=> 'en',base={},observer=null,pending=new Set(),scheduled=false;
  const key=s=>s.trim().replace(/\s+/g,' ').replace(/[’]/g,"'").toLowerCase();
  function add(entries){for(const [en,km] of Object.entries(entries))messages[key(en)]=km;}
  function lookup(s){const k=key(s);return messages[k]??base[k];}
  function core(s){
    const exact=lookup(s);if(exact!==undefined)return exact;
    // Decorations are not part of the label; preserve the original icon and spacing.
    const decorated=s.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
    if(decorated&&decorated[2]!==s){const v=lookup(decorated[2]);if(v!==undefined)return decorated[1]+v+decorated[3];}
    for(const [re,render] of patterns){const m=s.match(re);if(m){const value=render(m);if(value!==null)return value;}}
    const parts=s.split(/(\s+[·—|]\s+)/);if(parts.length>1){let changed=false;const out=parts.map((p,i)=>{if(i%2)return p;const v=core(p);if(v!==null)changed=true;return v??p;});if(changed)return out.join('');}
    return null;
  }
  function translate(raw,language='km',fallback){if(language!=='km')return raw;if(fallback)base=fallback;const trimmed=String(raw).trim();if(!trimmed||!/[A-Za-z]/.test(trimmed))return raw;const v=core(trimmed);return v===null?raw:String(raw).replace(trimmed,v);}
  const count=(n,word)=>n+' '+word;
  const patterns=[
    [/^(.+), reversed$/i,m=>{const title=core(m[1]);return title===null?null:title+', '+(lookup('reversed')??'reversed');}],
    [/^(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King) of (Wands|Cups|Swords|Pentacles)$/i,m=>(lookup(m[1])??m[1])+' នៃ'+(lookup(m[2])??m[2])],
    [/^([\d,]+) icons$/i,m=>m[1]+' រូបតំណាង'],
    [/^(Focus|Break|Timer) (\d+:\d{2})$/i,m=>(lookup(m[1])??m[1])+' '+m[2]],
    [/^(Check|Uncheck):\s*(.*)$/is,m=>(m[1].toLowerCase()==='check'?'ធីក៖ ':'ដោះធីក៖ ')+m[2]],
    [/^(\d+) of (\d+) (done )?today$/i,m=>m[1]+' ក្នុង '+m[2]+' '+(m[3]?'រួចរាល់ថ្ងៃនេះ':'ថ្ងៃនេះ')],
    [/^Add quest \(([^)]+)\)$/i,m=>'បន្ថែមបេសកកម្ម ('+m[1]+')'],
    [/^(.+) (of .+)$/i,m=>lookup(m[1])!==undefined&&lookup(m[2])!==undefined?lookup(m[1])+' '+lookup(m[2]):null],
    [/^(\+\d+%) (.+)$/i,m=>lookup(m[2])!==undefined?m[1]+' '+lookup(m[2]):m[0]],
    [/^saved (.+)$/i,m=>'បានរក្សាទុក '+m[1]],
    [/^\+(\d+) more (completed|in your quest list)$/i,m=>'+'+m[1]+(m[2].toLowerCase()==='completed'?' ទៀតរួចរាល់':' ទៀតក្នុងបញ្ជីបេសកកម្ម')],
    [/^(\d+)\s+quests?$/i,m=>count(m[1],'បេសកកម្ម')],
    [/^(\d+)\s+quests? completed$/i,m=>m[1]+' បេសកកម្មរួចរាល់'],
    [/^Complete ([\d,]+) quests?$/i,m=>'ធ្វើឱ្យរួច '+m[1]+' បេសកកម្ម'],
    [/^Complete ([\d,]+) legendary quests?$/i,m=>'ធ្វើបេសកកម្ម Legendary '+m[1]+' ឱ្យរួច'],
    [/^Reach level (\d+)$/i,m=>'ឡើងដល់ Level '+m[1]],
    [/^Reach a (\d+)-day streak$/i,m=>'រក្សា Streak '+m[1]+' ថ្ងៃ'],
    [/^Reach (\d+) perfect days$/i,m=>'ធ្វើរួចអស់ក្នុងថ្ងៃ ចំនួន '+m[1]+' ថ្ងៃ'],
    [/^Gather (\d+) items$/i,m=>'ប្រមូលរបស់ '+m[1]+' មុខ'],
    [/^Keep (\d+) notes$/i,m=>'រក្សាកំណត់ត្រា '+m[1]],
    [/^Keep a habit for (\d+) days running$/i,m=>'រក្សាទម្លាប់ជាប់គ្នា '+m[1]+' ថ្ងៃ'],
    [/^Hold ([\d,]+) Gold at once$/i,m=>'មានកាក់មាស '+m[1]+' ក្នុងពេលតែមួយ'],
    [/^Own (\d+) artifacts$/i,m=>'មានវត្ថុពិសេស '+m[1]],
    [/^Finish every quest in (.+)$/i,m=>'ធ្វើបេសកកម្មទាំងអស់ក្នុង '+m[1]+' ឱ្យរួច'],
    [/^Finish a (\w+) and a (\w+) challenge$/i,m=>'ធ្វើការប្រកួតផ្នែក '+(core(m[1])??m[1])+' និង '+(core(m[2])??m[2])+' ឱ្យរួច'],
    [/^(\d+)\s+(?:completed|done)$/i,m=>m[1]+' រួចរាល់'],
    [/^(\d+)\s+pending$/i,m=>m[1]+' នៅសល់'],
    [/^(\d+)\s+selected$/i,m=>m[1]+' បានជ្រើស'],
    [/^(\d+) rerolls left$/i,m=>'នៅប្តូរថ្មីបាន '+m[1]+' ដង'],
    [/^reroll (\d+)g$/i,m=>'ប្តូរថ្មី '+m[1]+' កាក់'],
    [/^(\d+)\s+cards?$/i,m=>m[1]+' សន្លឹក'],
    [/^(\d+)\s+days?$/i,m=>m[1]+' ថ្ងៃ'],
    [/^(\d+)\s+hours?$/i,m=>m[1]+' ម៉ោង'],
    [/^(\d+)\s+minutes?$/i,m=>m[1]+' នាទី'],
    [/^(\d+)\s+seconds?$/i,m=>m[1]+' វិនាទី'],
    [/^(\d+)\s+day streak$/i,m=>'Streak '+m[1]+' ថ្ងៃ'],
    [/^(\d+(?:\.\d+)?%)\s+this month$/i,m=>m[1]+' ខែនេះ'],
    [/^(\d+)\s*\/\s*(\d+)\s+(unlocked|done|steps)$/i,m=>m[1]+' / '+m[2]+' '+({unlocked:'បានដោះសោ',done:'រួចរាល់',steps:'ជំហាន'}[m[3].toLowerCase()])],
    [/^(\d+)\s*\/\s*(\d+)\s+done today$/i,m=>m[1]+' / '+m[2]+' រួចរាល់ថ្ងៃនេះ'],
    [/^(?:Lv|Level)\s*(\d+)$/i,m=>'Level '+m[1]],
    [/^every\s+(\d+)(m|h)$/i,m=>'រាល់ '+m[1]+(m[2]==='m'?' នាទី':' ម៉ោង')],
    [/^(\d+)(m|h|d)$/i,m=>m[1]+({m:' នាទី',h:' ម៉ោង',d:' ថ្ងៃ'}[m[2]])],
    [/^(\d+)\s+to\s+(.+)$/i,m=>m[1]+' ទៀត ដល់ '+(core(m[2])??m[2])],
    [/^reroll\s*[—·-]\s*(\d+) free left$/i,m=>'ប្តូរថ្មី — ឥតគិតថ្លៃ '+m[1]+' ដងទៀត'],
    [/^reroll\s*[—·-]\s*(\d+)\s*(?:gold|coins?)$/i,m=>'ប្តូរថ្មី — '+m[1]+' កាក់'],
    [/^Closes in (\d+) seconds · hover or press Tab to pause$/i,m=>'បិទក្នុង '+m[1]+' វិនាទី · ដាក់ម៉ៅស៍លើ ឬចុច Tab ដើម្បីផ្អាក'],
    [/^Selected:\s*(.*)$/is,m=>'បានជ្រើស៖ '+m[1]],
    [/^Good (morning|afternoon|evening|night),\s*(.*)$/i,m=>(core('good '+m[1])??m[1])+', '+m[2]],
    [/^Signed in as (.+) · syncing across devices$/i,m=>'ចូលជា '+m[1]+' · ធ្វើឱ្យទិន្នន័យត្រូវគ្នាលើគ្រប់ឧបករណ៍'],
    [/^Move (.+) list (left|right)$/i,m=>'ផ្លាស់បញ្ជី '+m[1]+(m[2].toLowerCase()==='left'?' ទៅឆ្វេង':' ទៅស្តាំ')],
    [/^Remove (.+) list$/i,m=>'ដកបញ្ជី '+m[1]],
    [/^(Morning|Noon|Afternoon|Evening|Night|Midnight) checkpoint$/i,m=>'ចំណុចសម្រាក'+(core(m[1])??m[1])],
    [/^Wallpaper blend:\s*(on|off)$/i,m=>'ស្រទាប់ផ្ទៃក្រោយ៖ '+(m[1].toLowerCase()==='on'?'បើក':'បិទ')],
    [/^turns on by itself at (\d+)% or lower$/i,m=>'បើកដោយខ្លួនឯងពេលថ្ម '+m[1]+'% ឬតិចជាងនេះ'],
    [/^battery (\d+)%\s*(charging)?$/i,m=>'ថ្ម '+m[1]+'%'+(m[2]?' កំពុងសាក':'')],
    [/^Lofi shuffle · (\d+) tracks$/i,m=>'Lofi ចាក់ចៃដន្យ · '+m[1]+' បទ'],
    [/^(.+)\s+mode$/i,m=>lookup(m[1])!==undefined?(lookup(m[1])+' ម៉ូដ'):m[0]],
    [/^(Complete|Reopen|Select) (.+)$/is,m=>({Complete:'ធ្វើរួច៖ ',Reopen:'បើកវិញ៖ ',Select:'ជ្រើស៖ '}[m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()])+m[2]],
    [/^\+(\d+) in Market$/i,m=>'+'+m[1]+' ក្នុងផ្សារ']
  ];
  function reconcile(current,record,language){
    const source=record&&current===record.output?record.source:current;
    return {source,output:translate(source,language)};
  }
  function skipElement(el){if(el.closest?.('script,style,code,pre,svg,textarea,[contenteditable="true"],[translate="no"],[data-i18n="off"]')||el.closest?.('.ttl')?._typing)return true;if(el.closest?.('[data-i18n="app"]'))return false;return !!el.closest?.(SKIP);}
  function apply(scope,language=getLanguage(),fallback){
    if(fallback)base=fallback;if(!scope)return;
    const doc=scope.ownerDocument||scope,body=doc.body;if(!body)return;
    if(scope===body||scope===doc){doc.documentElement.lang=language==='km'?'km':'en';body.classList.toggle('km',language==='km');}
    observer?.disconnect();
    const visit=n=>{const p=n.parentElement;if(!p||skipElement(p)||!n.nodeValue?.trim())return;const r=p.dataset?.l10nSource&&!p.children.length?{source:p.dataset.l10nSource,output:translate(p.dataset.l10nSource,language)}:reconcile(n.nodeValue,textRecords.get(n),language);if(language==='km'&&p.closest?.('#eType'))r.output=r.source.trim().toLowerCase()==='type'?r.source.replace(r.source.trim(),'ប្រភេទ'):r.output;if(language==='km'&&p.closest?.('#fxRow')&&r.source.trim()==='notes')r.output='ណោតភ្លេង';textRecords.set(n,r);if(n.nodeValue!==r.output)n.nodeValue=r.output;};
    if(scope.nodeType===3)visit(scope);else{
      const walker=doc.createTreeWalker(scope,4);let n;while((n=walker.nextNode()))visit(n);
    }
    const elements=scope.nodeType===1?[scope,...scope.querySelectorAll('[placeholder],[data-ph],[title],[aria-label],[data-tooltip],[alt]')]:[];
    for(const el of elements){if(el.closest?.('script,style,code,pre,[contenteditable="true"],[translate="no"],[data-i18n="off"]'))continue;let records=attrRecords.get(el);if(!records){records={};attrRecords.set(el,records);}for(const attr of attributes){if(!el.hasAttribute(attr)||attr==='aria-label'&&el.matches?.('.task,.ncard'))continue;const r=reconcile(el.getAttribute(attr),records[attr],language);records[attr]=r;if(el.getAttribute(attr)!==r.output)el.setAttribute(attr,r.output);}}
    observe(body);
  }
  function observe(body){observer?.observe(body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});}
  function init(language,fallback){getLanguage=language;base=fallback||{};const doc=typeof document==='undefined'?null:document;if(!doc)return;
    observer?.disconnect();observer=new MutationObserver(records=>{if(getLanguage()!=='km')return;for(const r of records){if(r.type==='childList')r.addedNodes.forEach(n=>{if(n.nodeType===1||n.nodeType===3)pending.add(n);});else pending.add(r.target);}if(!scheduled&&pending.size){scheduled=true;queueMicrotask(()=>{scheduled=false;const roots=[...pending];pending.clear();for(const n of roots)if(n.isConnected&&!roots.some(p=>p!==n&&p.contains?.(n)))apply(n,getLanguage());});}});observe(doc.body);apply(doc.body,getLanguage());
  }
  function restore(scope){apply(scope,'en');}
  // Only app-authored template seeds use this helper; never pass saved note HTML.
  function template(markup,language){return language==='km'?String(markup).split(/(<(?:code|pre)\b[^>]*>[\s\S]*?<\/(?:code|pre)>)/gi).map(part=>/^<(?:code|pre)\b/i.test(part)?part:part.replace(/(^|>)([^<>]+)(?=<|$)/g,(_,prefix,text)=>prefix+translate(text,language))).join(''):markup;}
  function date(value,options={},language='en',englishLocale='en-GB'){
    const d=value instanceof Date?value:new Date(value);if(language!=='km')return d.toLocaleDateString(englishLocale,options);
    if(!Number.isFinite(d.getTime()))return '';
    const days=['អាទិត្យ','ច័ន្ទ','អង្គារ','ពុធ','ព្រហស្បតិ៍','សុក្រ','សៅរ៍'],months=['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
    return [options.weekday?days[d.getDay()]:'',options.day?String(d.getDate()):'',options.month?months[d.getMonth()]:'',options.year?String(d.getFullYear()):''].filter(Boolean).join(' ');
  }
  function missing(scope){const doc=scope.ownerDocument,rows=new Set(),w=doc.createTreeWalker(scope,4);let n;while((n=w.nextNode())){if(skipElement(n.parentElement))continue;const s=(textRecords.get(n)?.source??n.nodeValue).trim();if(/[a-z]{3}/i.test(s)&&translate(s)===s)rows.add(s);}return [...rows];}
  return {messages,add,translate,apply,init,restore,missing,reconcile,date,template};
});
