/* Tiny synthesized scores: no downloaded audio, buffers, timers or audio context. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeSFX=api;})(typeof globalThis==='undefined'?this:globalThis,function(){'use strict';
  // Semitone, start seconds, length seconds, optional glide destination.
  const SCORES={
    'brand-type':[[19,0,.035,26]],
    'quest-appear':[[12,0,.045,19],[19,.045,.065,24]],
    'quest-open':[[0,0,.1,7],[12,.07,.12,19]],
    'quest-water':[[19,0,.1,7],[12,.1,.12,0],[24,.23,.12,12]],
    'quest-breathe':[[-12,0,.2,0],[0,.21,.3,-12]],
    'quest-read':[[0,0,.065],[7,.08,.07],[12,.17,.14]],
    'quest-exercise':[[0,0,.075],[0,.1,.075],[12,.2,.16]],
    'quest-work':[[7,0,.07],[12,.09,.08],[19,.18,.16]],
    'quest-rest':[[12,0,.18],[7,.17,.23],[0,.36,.25]],
    'quest-food':[[4,0,.08],[9,.09,.1],[16,.2,.15]],
    'quest-clean':[[12,0,.06],[24,.08,.1],[31,.18,.16]],
    'pixel-hover-in':[[12,0,.045],[19,.035,.055]],
    'pixel-hover-out':[[19,0,.035],[12,.03,.045]],
    'pixel-complete':[[12,0,.08],[19,.075,.09],[24,.16,.16]],
    cat:[[7,0,.08,12],[12,.08,.15,5]],
    purchase:[[12,0,.055],[19,.06,.07],[12,.13,.12]],
    tap:[[12,0,.05,7],[19,.035,.065]],
    navigate:[[0,0,.07],[7,.055,.1]],
    on:[[0,0,.07],[12,.06,.13]],off:[[12,0,.07],[0,.06,.11]],
    confirm:[[0,0,.075],[4,.055,.09],[7,.11,.14]],
    dismiss:[[7,0,.08],[0,.055,.12,-5]],danger:[[0,0,.07,-5],[-7,.08,.15,-12]],
    adjust:[[7,0,.055,12]],key:[[12,0,.035,7]],
    create:[[0,0,.08],[7,.06,.09],[12,.13,.18]],
    complete:[[0,0,.1],[4,.08,.1],[7,.16,.12],[12,.25,.28]],
    loot:[[-12,0,.18,-5],[0,.1,.1],[4,.18,.1],[7,.26,.1],[12,.34,.12],[16,.42,.12],[19,.52,.36],[24,.6,.45]],
    claim:[[7,0,.1],[12,.07,.13],[19,.15,.3]],
    levelup:[[0,0,.1],[4,.08,.1],[7,.16,.12],[12,.26,.13],[7,.39,.12],[16,.5,.4]],
    achievement:[[7,0,.12],[12,.1,.12],[16,.2,.14],[19,.32,.38]],
    timer:[[12,0,.16],[7,.2,.16],[12,.4,.16],[19,.6,.3]],
    charge:[[-24,0,.4,-12],[-12,.15,.4,0],[0,.35,.35,12]],
    whoosh:[[12,0,.18,-12],[7,.04,.16,-17]]
  };
  const aliases={tick:'tap',pop:'create',success:'complete',ach:'achievement',pomo:'timer'};
  const ICON_SCORES={coin:[[12,0,.055],[19,.06,.09],[24,.13,.1]],leaf:[[7,0,.09],[12,.08,.13]],gem:[[19,0,.08],[24,.065,.12],[31,.14,.15]],gear:[[0,0,.045],[3,.045,.045],[7,.09,.07]],heart:[[0,0,.08],[0,.12,.12]],flame:[[-7,0,.07,7],[12,.065,.12,19]],rocket:[[-12,0,.16,19],[24,.12,.09]],music:[[0,0,.07],[4,.065,.08],[7,.13,.12]],hop:[[7,0,.07,12],[19,.075,.09]],nod:[[0,0,.055],[7,.06,.08]]};
  function score(kind,style='pixel',preset){
    kind=aliases[kind]||kind;const icon=/^icon:(\w+):(\d+)$/.exec(kind),rows=icon?(ICON_SCORES[icon[1]]||ICON_SCORES.nod):SCORES[kind]||SCORES.tap;
    const night=style==='pixel-night',base=(night?330:392)*(icon?2**((Number(icon[2])%12-5)/24):1);
    const presets={laser:[523,'sawtooth'],bubble:[660,'sine'],soft:[440,'triangle'],thock:[165,'triangle'],typewriter:[262,'square'],clicky:[784,'square']};
    const selected=kind==='key'&&presets[preset];
    return rows.map(([note,at,ms,end],i)=>({hz:(selected?selected[0]:base)*2**(note/12),end:end==null?0:(selected?selected[0]:base)*2**(end/12),at,ms,wave:selected?selected[1]:kind==='cat'||kind.startsWith('quest-')?'sine':night?(i%2?'sine':'triangle'):(i%2?'triangle':'square'),gain:kind==='key'?.1:kind==='loot'?.16:.12}));
  }
  function questSound(title){const text=String(title||'').toLocaleLowerCase();for(const [kind,pattern] of [['water',/\b(water|hydrate|hydration|drink)\b|ផឹកទឹក/],['breathe',/\b(breaths?|breathe|breathing|meditat\w*)\b|ដកដង្ហើម/],['read',/\b(read(?:s|ing)?|book|study|learn\w*)\b|អាន|សិក្សា/],['exercise',/\b(exercise|workout|walk\w*|run|runs|running|jogging|yoga|stretch\w*)\b|ហាត់ប្រាណ/],['rest',/\b(sleep|rest|nap|bedtime)\b|គេង/],['food',/\b(cook\w*|eat|meal|breakfast|lunch|dinner)\b|ញ៉ាំ/],['clean',/\b(clean\w*|tidy|wash\w*|laundry)\b|សម្អាត/],['work',/\b(work|project|build\w*|code|coding|write|writing)\b|ការងារ/]])if(pattern.test(text))return 'quest-'+kind;return '';}
  return {SCORES,ICON_SCORES,score,questSound};
});
