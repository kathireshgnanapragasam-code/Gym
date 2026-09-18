import '../core.js';

/* ===== TODAY TAB (workout logging, set editing, session save/edit/skip) ===== */

/* Free-session picker state. On globalThis (not `let`) so progress.js's
   startFreeSessionTargeting can reassign _freeExPickerMode / _freeExSelectedTags
   via bare-identifier writes without needing an import. */
globalThis._freeExPickerMode = 'search';
globalThis._freeExSelectedTags = [];
globalThis._freeDiagCharts = {front:null,back:null};
function setFreeExPickerMode(mode){
  _freeExPickerMode=mode;
  if(mode==='search')_freeExSelectedTags=[];
  renderToday();
}
function renderFreeMuscleExList(){
  if(!_freeExSelectedTags.length)return `<div class="cs" style="text-align:center;padding:10px 0">Tap a highlighted region above to see exercises for it.</div>`;
  const showSecondary=_freeExSelectedTags.length===1;
  const row=(e,dim)=>`<div class="free-ex-row"${dim?' style="opacity:.6"':''} onclick="addToFreeSession('${e.n.replace(/'/g,"\\'")}')">
      <span>${e.n}${e.subOf?`<span style="color:var(--dim);font-size:11px"> &middot; sub for ${e.subOf}</span>`:''}</span><span style="color:var(--cyan);font-size:18px">+</span>
    </div>`;
  const sections=_freeExSelectedTags.map(tag=>{
    const matches=getExercisesForMuscleTag(tag);
    const primary=matches.filter(e=>(e.primaryMuscles||[]).includes(tag));
    const secondary=showSecondary?matches.filter(e=>!(e.primaryMuscles||[]).includes(tag)):[];
    if(!primary.length&&!secondary.length)return `<div style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:14px 0 6px">${tag}</div><div class="cs">No exercises tagged for this yet.</div>`;
    return `<div style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:14px 0 6px">${tag}</div>`+
      primary.map(e=>row(e,false)).join('')+
      (secondary.length?`<div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">Also works this, secondarily</div>`+secondary.map(e=>row(e,true)).join(''):'');
  });
  return (_freeExSelectedTags.length>1?`<div class="cs" style="margin-bottom:6px">This spot covers more than one muscle in the diagram \u2014 showing what actually targets each, not secondary mentions, to keep this readable.</div>`:'')+sections.join('');
}
function mountFreeMuscleDiagram(){
  const volList=Coach.getWeeklyMuscleVolume();
  const state=volumeToBodyState(volList);
  _freeExSelectedTags.forEach(tag=>{
    (MUSCLE_TAG_TO_LIB_IDS[tag]||[]).forEach(id=>{
      state[id]={...(state[id]||{intensity:1}),selected:true};
    });
  });
  _freeDiagCharts=mountBodyDiagram('freediag-front','freediag-back',state,(id)=>{
    const resolved=resolveClickedTagsAll(id);
    if(!resolved.length)return;
    _freeExSelectedTags=resolved;
    renderToday();
  },_freeDiagCharts);
}

let _miniExCharts={front:null,back:null};
function mountMiniExerciseDiagram(orig){
  const state={};
  (orig.primaryMuscles||[]).forEach(tag=>{
    (MUSCLE_TAG_TO_LIB_IDS[tag]||[]).forEach(id=>{state[id]={intensity:8,selected:false};});
  });
  (orig.secondaryMuscles||[]).forEach(tag=>{
    (MUSCLE_TAG_TO_LIB_IDS[tag]||[]).forEach(id=>{if(!state[id])state[id]={intensity:3,selected:false};});
  });
  _miniExCharts=mountBodyDiagram('miniex-front','miniex-back',state,()=>{},_miniExCharts);
}

/* ===== WORKOUT STATE ===== */
/* WS, adHocDay, adHocSeqIdx, _forcePickerOnce, _logDateKey are declared on globalThis
   at the top of core.js — bare identifier references in any module resolve to those
   properties, so cross-module reads and writes stay consistent without explicit imports. */

function initWS(dl,def){
  const pSubs=lsG('persisted_subs')||{};
  if(!WS[dl]){
    WS[dl]={
      ex:def.ex.map(e=>{
        const prefill=getPrefillSets(e,pSubs[e.n]||e.n,e.s);
        return{
          name:pSubs[e.n]||e.n,origName:e.n,chosenType:null,
          sets:Array.from({length:e.s},(_,si)=>({w:prefill?.[si]?.w||'',r:prefill?.[si]?.r||'',done:false,isDrop:false}))
        };
      }),
      subOpen:null,note:'',painNote:'',startAt:null,lastSetAt:null
    };
    return;
  }
  /* Reconcile a possibly-stale draft (e.g. loaded from before a source-code update) against
     the current exercise array, matching by origName so in-progress sets are preserved for
     exercises that still exist, instead of crashing on index misalignment for new ones. */
  const old=WS[dl].ex||[];
  WS[dl].ex=def.ex.map(e=>old.find(o=>o&&o.origName===e.n)||(()=>{
    const prefill=getPrefillSets(e,pSubs[e.n]||e.n,e.s);
    return{
      name:pSubs[e.n]||e.n,origName:e.n,chosenType:null,
      sets:Array.from({length:e.s},(_,si)=>({w:prefill?.[si]?.w||'',r:prefill?.[si]?.r||'',done:false,isDrop:false}))
    };
  })());
  if(WS[dl].painNote===undefined)WS[dl].painNote='';
}
function updSet(dl,ei,si,f,v){if(!WS[dl])return;WS[dl].ex[ei].sets[si][f]=v;if(WS[dl].infoOpen===ei)WS[dl].infoOpen=null;saveDraft(dl);}
function togDone(dl,ei,si){
  if(!WS[dl])return;
  const set=WS[dl].ex[ei].sets[si];
  set.done=!set.done;
  if(set.done){
    WS[dl].lastSetAt=Date.now();
    if(!WS[dl].startAt)WS[dl].startAt=Date.now();
  }
  if(WS[dl].infoOpen===ei)WS[dl].infoOpen=null;
  saveDraft(dl);renderToday();
}
function addSet(dl,ei){
  if(!WS[dl])return;
  WS[dl].ex[ei].sets.push({w:'',r:'',done:false,isDrop:false});
  saveDraft(dl);renderToday();
}
function removeSet(dl,ei,si){
  if(!WS[dl])return;
  WS[dl].ex[ei].sets.splice(si,1);
  saveDraft(dl);renderToday();
}
function addDropSet(dl,ei){
  if(!WS[dl])return;
  const last=WS[dl].ex[ei].sets[WS[dl].ex[ei].sets.length-1];
  const dw=last.w?String(Math.round(parseFloat(last.w)*0.8/5)*5):'';
  WS[dl].ex[ei].sets.push({w:dw,r:'',done:false,isDrop:true,dropHint:'20% drop &#x2014; aim 10&#x2013;12 reps'});
  saveDraft(dl);renderToday();
}
function chooseExType(dl,ei,choice){
  if(!WS[dl])return;
  WS[dl].ex[ei].chosenType=choice;
  saveDraft(dl);renderToday();
}
function togSub(dl,ei){if(!WS[dl])return;WS[dl].subOpen=WS[dl].subOpen===ei?null:ei;renderToday();}
function togInfo(dl,ei){if(!WS[dl])return;WS[dl].infoOpen=WS[dl].infoOpen===ei?null:ei;renderToday();}
function renderExInfoPanel(ex,orig,ei){
  const searchQ=encodeURIComponent(ex.name+' form');
  const ytUrl=`https://www.youtube.com/results?search_query=${searchQ}`;
  return `<div class="exinfo">
    ${orig.tip?`<div style="font-size:13px;color:var(--txt);margin-bottom:8px">${orig.tip}</div>`:''}
    <a href="${ytUrl}" target="_blank" rel="noopener" style="font-size:12px;color:var(--cyan);text-decoration:underline">Watch form video &#x2197;</a>
    <div style="display:flex;gap:14px;justify-content:center;margin-top:10px">
      <div id="miniex-front" style="width:130px"></div>
      <div id="miniex-back" style="width:130px"></div>
    </div>
  </div>`;
}
function pickSub(dl,ei,name){
  if(!WS[dl])return;
  WS[dl].ex[ei].name=name;WS[dl].subOpen=null;
  const subs=lsG('persisted_subs')||{};
  subs[WS[dl].ex[ei].origName]=name;
  lsS('persisted_subs',subs);
  saveDraft(dl);renderToday();
}
function resetSub(dl,ei){
  if(!WS[dl])return;
  const orig=WS[dl].ex[ei].origName;
  WS[dl].ex[ei].name=orig;WS[dl].subOpen=null;
  const subs=lsG('persisted_subs')||{};
  delete subs[orig];lsS('persisted_subs',subs);
  saveDraft(dl);renderToday();
}
function applyCSub(dl,ei,id){
  const v=document.getElementById(id)?.value?.trim();if(!v||!WS[dl])return;
  WS[dl].ex[ei].name=v;WS[dl].subOpen=null;saveDraft(dl);renderToday();
}

/* ===== SAVE SESSION ===== */
function setHasData(st,inputType){
  if(!st)return false;
  if(inputType==='seconds'||inputType==='reps_each')return !!(st.w&&parseFloat(st.w)>0);
  if(inputType==='bodyweight')return !!(st.r&&parseInt(st.r)>0);
  return !!(st.w&&st.r&&parseFloat(st.w)>0);
}
function markFilledSetsDone(s,gd){
  if(!s||!gd)return 0;
  let n=0;
  s.ex.forEach((ex,ei)=>{
    const orig=gd.ex[ei]||{};
    const chosenOpt=orig.inputType==='choice'&&ex.chosenType?orig.choiceOptions?.find(o=>o.name===ex.chosenType):null;
    const subOverride=(!chosenOpt&&ex.name!==ex.origName)?SUB_TYPE_OVERRIDE[ex.name]:null;
    const effType=chosenOpt?chosenOpt.inputType:(subOverride?subOverride.inputType:(orig.inputType||'weight'));
    (ex.sets||[]).forEach(st=>{
      if(setHasData(st,effType)){st.done=true;n++;}
      else if(!st.isDrop)st.done=false;
    });
  });
  return n;
}


function bestSetOf(workingSets,inputType){
  const singleField=inputType==='seconds'||inputType==='reps_each';
  const repsFirst=inputType==='bodyweight';
  const metric=st=>repsFirst?parseInt(st.r||0):parseFloat(st.w||0);
  return workingSets.reduce((b,st)=>{
    const valid=singleField?(st.w&&parseFloat(st.w)>0):repsFirst?(st.r&&parseInt(st.r)>0):(st.w&&st.r&&parseFloat(st.w)>0);
    if(valid&&(!b||metric(st)>metric(b)))return{w:st.w,r:st.r};
    return b;
  },null);
}
function saveSession(dl,seqIdx){
  const gd=DAYS[seqIdx]||adHocDay||DAYS.find(d=>d.label===dl);
  const s=WS[dl];if(!s||!gd)return;
  const filled=markFilledSetsDone(s,gd);
  const newPRs=[];
  /* End-of-day logging: no live timer required. Assume ~2.5 min per working set (set + 2–3 min rest). */
  const duration=s.startAt?Math.round((Date.now()-s.startAt)/60000):(filled?Math.max(1,Math.round(filled*2.5)):null);
  const exercises=s.ex.map((ex,ei)=>{
    const orig=gd.ex[ei]||gd.ex[0];
    const isChoiceEx=orig.inputType==='choice';
    const chosenOpt=isChoiceEx&&ex.chosenType?orig.choiceOptions?.find(o=>o.name===ex.chosenType):null;
    const subOverride=(!chosenOpt&&ex.name!==ex.origName)?SUB_TYPE_OVERRIDE[ex.name]:null;
    const effOrig=chosenOpt?{...orig,...chosenOpt,noweight:true}:(subOverride?{...orig,...subOverride}:orig);
    const effName=chosenOpt?ex.chosenType:ex.name;
    const effOrigName=chosenOpt?ex.chosenType:ex.origName;
    const workingSets=ex.sets.filter(st=>!st.isDrop);
    const best=bestSetOf(workingSets,effOrig.inputType);
    const isPR=checkPR(effName,best,effOrig.inputType);
    if(isPR)newPRs.push(effName);
    const exVolume=workingSets.reduce((v,st)=>{
      if(effOrig.inputType==='bodyweight')return v+(parseInt(st.r)||0);
      if(effOrig.inputType==='seconds')return v+(parseFloat(st.w)||0);
      if(effOrig.inputType==='reps_each')return v+(parseInt(st.r)||0)*2;
      return v+(parseFloat(st.w)||0)*(parseInt(st.r)||0);
    },0);
    return{name:effName,origName:effOrigName,best,sets:ex.sets,chosenType:ex.chosenType,suggestion:getSuggestion(effOrig,best,effName),isPR,inputType:effOrig.inputType,exVolume};
  });
  const totalVolume=exercises.reduce((v,e)=>v+(e.exVolume||0),0);
  const isFree=seqIdx==='free';
  const dk=activeDateKey();
  const session={date:dk,dl,seqIdx:isFree?null:seqIdx,exercises,note:s.note,painNote:s.painNote||'',skipped:false,duration,newPRs,totalVolume};
  Data.session.set(session,dk);
  Data.session.setLast(dl,{date:dk,exercises});
  /* Only advance the Push/Pull/Legs/Cardio sequence when logging for today. */
  if(!isFree&&isLoggingToday())lsS('last_seq_idx',seqIdx);
  lsS('last_dl',dl);
  const mk=monthKeyFor(dk);
  const mlog=lsG('mlog:'+mk)||{};
  mlog[dk]={type:'done',dl,seqIdx:isFree?undefined:seqIdx};
  lsS('mlog:'+mk,mlog);
  clearDraft();showStickyBtn(false);stopTimerTick();
  renderToday();
  const toast=document.getElementById('save-toast');
  if(toast){
    const prTxt=newPRs.length?' &#x2605; NEW PR: '+newPRs.join(', ')+'!':'';
    const when=isLoggingToday()?'':' for '+fmtLogDateLabel(dk);
    toast.innerHTML='&#x2713; Session saved'+when+(duration?' ('+duration+' min)':'')+'.'+prTxt;
    toast.style.display='block';
    setTimeout(()=>{toast.style.display='none';},3000);
  }
}

/* ===== EDIT / SKIP / UNSKIP ===== */
function editSession(){
  if(!confirm('Unlock this session for editing? Current save will be removed.'))return;
  const dk=activeDateKey();
  const ex=Data.session.get(dk);if(!ex||ex.skipped)return;
  const isFree=ex.dl==='Free session';
  const seqIdx=isFree?null:(ex.seqIdx!==undefined&&ex.seqIdx!==null?ex.seqIdx:SEQ.indexOf(ex.dl));
  const gd=isFree?{label:'Free session',focus:'Your combo today',time:'',ex:ex.exercises.map(e=>({n:e.origName,...(findExDef(e.origName)||{}),priority:'normal'}))}:(DAYS[seqIdx]||DAYS.find(d=>d.label===ex.dl));
  if(!gd)return;
  WS[ex.dl]={
    ex:ex.exercises.map((e,ei)=>({
      name:e.name,origName:e.origName,chosenType:e.chosenType||null,
      sets:e.sets||[{w:e.best?.w||'',r:e.best?.r||'',done:true,isDrop:false}]
    })),
    subOpen:null,note:ex.note||'',painNote:ex.painNote||'',startAt:Date.now(),lastSetAt:null
  };
  Data.session.delete(dk);
  const mk=monthKeyFor(dk);
  const mlog=lsG('mlog:'+mk)||{};delete mlog[dk];lsS('mlog:'+mk,mlog);
  if(!isFree&&isLoggingToday())lsS('last_seq_idx',(seqIdx+3)%4);
  adHocDay=gd;adHocSeqIdx=seqIdx;
  saveDraft(ex.dl);
  renderToday();
}
function deleteSession(){
  const dk=activeDateKey();
  const ex=Data.session.get(dk);
  if(!ex){alert('No session saved for this date.');return;}
  const label=ex.dl||'session';
  if(!confirm('Delete "'+label+'" for '+dk+'?\n\nThis removes the saved session'+(ex.cardio||getRun(dk)?' and any run log for that day':'')+'. This cannot be undone.'))return;
  const isFree=ex.dl==='Free session';
  const seqIdx=isFree?null:(ex.seqIdx!==undefined&&ex.seqIdx!==null?ex.seqIdx:SEQ.indexOf(ex.dl));
  Data.session.delete(dk);
  const mk=monthKeyFor(dk);
  const mlog=lsG('mlog:'+mk)||{};delete mlog[dk];lsS('mlog:'+mk,mlog);
  lsDel('run:'+dk);
  if(!isFree&&!ex.skipped&&isLoggingToday()&&seqIdx!==null&&seqIdx>=0)lsS('last_seq_idx',(seqIdx+3)%4);
  clearDraft();
  adHocDay=null;adHocSeqIdx=null;
  showStickyBtn(false);stopTimerTick();
  renderToday();
}
function showSkipSheet(){
  // Works from picker (no gd yet) and active workout (gd set)
  // Build an inline sheet appended to p0 if skipsheet doesn't exist yet
  let s=document.getElementById('skipsheet');
  if(s){s.style.display=s.style.display==='block'?'none':'block';return;}
  const sheet=document.createElement('div');
  sheet.id='skipsheet';sheet.className='skipsheet';sheet.style.cssText='position:fixed;bottom:0;left:0;right:0;background:var(--c1);border-top:1px solid var(--c3);padding:20px;z-index:999';
  sheet.innerHTML=`<div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--mut)">Why skipping?</div>
    <button class="skipopt" onclick="skipSession('sick');this.closest('#skipsheet').remove()">Sick / injured</button>
    <button class="skipopt" onclick="skipSession('tired');this.closest('#skipsheet').remove()">Too tired</button>
    <button class="skipopt" onclick="skipSession('busy');this.closest('#skipsheet').remove()">Too busy</button>
    <button class="skipopt" style="color:var(--mut);font-weight:500" onclick="this.closest('#skipsheet').remove()">Cancel</button>`;
  document.body.appendChild(sheet);
}
function unskipSession(){
  if(!confirm('Remove skip and show workout?'))return;
  const dk=activeDateKey();
  Data.session.delete(dk);
  const mk=monthKeyFor(dk);
  const mlog=lsG('mlog:'+mk)||{};delete mlog[dk];lsS('mlog:'+mk,mlog);
  renderToday();
}
function skipSession(reason){
  const nextIdx=getNextIdx();
  const gd=adHocDay||(nextIdx!==null?DAYS[nextIdx]:null);
  const dl=gd?gd.label:'Rest day';
  const dk=activeDateKey();
  Data.session.set({date:dk,dl,skipped:true,skipReason:reason},dk);
  const mk=monthKeyFor(dk);
  const mlog=lsG('mlog:'+mk)||{};
  mlog[dk]={type:'skip',reason,dl};
  lsS('mlog:'+mk,mlog);
  clearDraft();showStickyBtn(false);stopTimerTick();
  const ss=document.getElementById('skipsheet');if(ss)ss.style.display='none';
  renderToday();
}

function renderToday(){
  const dk=activeDateKey();
  const nextIdx=getNextIdx();
  const gd=adHocDay||(nextIdx!==null?DAYS[nextIdx]:null);
  const existing=Data.session.get(dk);
  const sym=lsG('sym:'+dk)||{};
  const water=lsG('water:'+dk)||0;
  const _freshList=Coach.getMuscleFreshness();
  let html='';

  /* -- Workout date (catch-up logging) -- */
  html+=`<div class="card" style="margin-bottom:10px">
    <div class="cl">Logging for</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
      <button class="btn btn-ghost btn-sm" style="width:44px;padding:10px" onclick="shiftLogDate(-1)" title="Previous day">&#x2039;</button>
      <input class="genin" type="date" id="log-date" max="${todayKey()}" value="${dk}" onchange="setLogDate(this.value)" style="text-align:center;font-weight:700">
      <button class="btn btn-ghost btn-sm" style="width:44px;padding:10px${dk>=todayKey()?';opacity:.35':''}" onclick="shiftLogDate(1)" title="Next day" ${dk>=todayKey()?'disabled':''}>&#x203A;</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <div style="font-size:13px;color:var(--cyan);font-weight:700">${fmtLogDateLabel(dk)}${!isLoggingToday()?' · catch-up':''}</div>
      ${!isLoggingToday()?`<button class="btn btn-ghost btn-sm" style="width:auto;margin:0;padding:8px 12px" onclick="setLogDate(todayKey())">Back to today</button>`:''}
    </div>
  </div>`;

  /* -- Energy check-in -- */
  if(sym.energy){
    const eCol=sym.energy>=4?'var(--grn)':sym.energy>=3?'var(--amb)':'var(--red)';
    html+=`<div class="card" style="padding:11px 14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--mut);font-weight:700;letter-spacing:1px;text-transform:uppercase">Energy &#x2713;</span>
        <span style="font-size:14px;font-weight:700">Energy <span style="color:${eCol}">${sym.energy}/5</span></span>
      </div>
    </div>`;
  }else{
  const sleep = lsG('sleep:'+dk)||null;
  html+=`<div class="card warm" style="margin-bottom:10px">
      <div class="cl">Quick check</div><div class="ct" style="margin-bottom:12px">How’s your energy today?</div>
      <div style="display:flex;gap:5px">${[1,2,3,4,5].map(n=>{const c=n>=4?'var(--grn)':n===3?'var(--amb)':'var(--red)';return`<button class="sym-val-btn" onclick="logSym('energy',${n})" style="background:var(--c2);color:var(--mut);border-color:var(--c3)">${n}</button>`;}).join('')}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:3px"><span>Wrecked</span><span>Full power</span></div>
      <div class="sep" style="margin-top:10px;margin-bottom:8px"></div>
      <div style="font-size:12px;color:var(--mut);margin-bottom:8px;font-weight:700;letter-spacing:0.04em">Sleep (from watch)</div>
      ${sleep?`<div style="display:flex;gap:8px;margin-bottom:8px">
          <div style="flex:1;background:var(--c2);border:1px solid var(--c3);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:18px;font-weight:800;color:var(--txt)">${sleep.hours!=null?sleep.hours+'h':'—'}</div><div style="font-size:11px;color:var(--mut);margin-top:4px">Hours</div>
          </div>
          <div style="flex:1;background:var(--c2);border:1px solid var(--c3);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:18px;font-weight:800;color:var(--txt)">${sleep.score!=null?sleep.score:'—'}</div><div style="font-size:11px;color:var(--mut);margin-top:4px">Score</div>
          </div>
          <div style="flex:1;background:var(--c2);border:1px solid var(--c3);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:18px;font-weight:800;color:var(--txt)">${sleep.eff!=null?sleep.eff+'%':'—'}</div><div style="font-size:11px;color:var(--mut);margin-top:4px">Efficiency</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="document.getElementById('sleep-hours').value='${sleep.hours??''}';document.getElementById('sleep-score').value='${sleep.score??''}';document.getElementById('sleep-eff').value='${sleep.eff??''}';document.getElementById('sleep-form').scrollIntoView({behavior:'smooth'})">Edit sleep</button>
          <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--red);border-color:var(--rbr)" onclick="deleteSleep()">Delete sleep</button>
        </div>`:`
        <div id="sleep-form" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          <div style="display:flex;gap:8px">
            <input class="sinput" id="sleep-hours" type="number" inputmode="decimal" placeholder="Hours (e.g. 7.5)" step="0.1" style="flex:1">
            <input class="sinput" id="sleep-score" type="number" inputmode="numeric" placeholder="Score (0-100)" step="1" style="flex:1">
            <input class="sinput" id="sleep-eff" type="number" inputmode="decimal" placeholder="Eff % (e.g. 85)" step="0.1" style="flex:1">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-amb btn-sm" style="flex:1" onclick="saveSleep()">Save sleep</button>
            <button class="btn btn-ghost btn-sm" style="flex:1" onclick=\"document.getElementById('sleep-hours').value='';document.getElementById('sleep-score').value='';document.getElementById('sleep-eff').value='';\">Clear</button>
          </div>
          <div id="sleep-conf" class="confbox">Sleep saved &#x2713;</div>
        </div>`}
    </div>`;
  }
  // Quick custom log prompt (after quick check)
  html+=`<div class="card" style="margin-bottom:10px">
    <div class="cl">Quick log</div>
    <div class="ct" style="margin-bottom:8px">How many exercises did you do today?</div>
    <div style="display:flex;gap:8px">
      <input class="sinput" id="quick-log-count" type="number" min="1" max="20" value="5" style="width:120px">
      <button class="btn btn-amb btn-sm" onclick="startCustomLogFromToday()">Start log</button>
      <button class="btn btn-ghost btn-sm" onclick="document.querySelector('.tab[data-t=2]')?.click()">Open New</button>
    </div>
  </div>`;

  /* -- Skip warnings -- */
  const warnings=getSkipWarnings();
  if(warnings&&warnings.length){
    html+=`<div class="card danger" style="margin-bottom:10px"><div class="cl">Balance warning</div>
      <div style="font-size:14px;font-weight:700;color:var(--red);margin-bottom:6px">&#x26A0; ${warnings.join(' and ')} not done recently</div>
      <div style="font-size:13px;color:var(--mut)">Consider doing ${warnings[0]} today to keep training balanced.</div>
    </div>`;
  }

  /* -- Completed session -- */
  if(existing&&!existing.skipped&&existing.exercises&&!(adHocDay&&adHocDay.label==='Free session')){
    function getExInputType(origName){
      for(const d of DAYS){for(const e of d.ex){
        if(e.n===origName)return e.inputType||'weight';
        if(e.inputType==='choice'&&e.choiceOptions){const o=e.choiceOptions.find(o=>o.name===origName);if(o)return o.inputType;}
      }}return 'weight';
    }
    function fmtCompletedBest(e){
      if(!e.best||!e.best.w)return '';
      const it=getExInputType(e.name||e.origName);
      if(it==='bodyweight')return e.best.r+' reps';
      if(it==='seconds')return e.best.w+'s';
      if(it==='reps_each')return e.best.w+' each side';
      return e.best.w+'kg \u00d7 '+(e.best.r||'');
    }
    html+=`<div class="card success">
      <div class="cl">${existing.date}${existing.duration?' &middot; '+existing.duration+' min':''}</div>
      <div class="ct" style="color:var(--grn);margin-bottom:4px">&#x2713; ${existing.dl} complete</div>
      ${existing.newPRs&&existing.newPRs.length?`<div style="margin-bottom:10px"><span class="pill-pr">&#x2605; PR: ${existing.newPRs.join(', ')}</span></div>`:''}
      ${existing.dl==='Cardio + core'?renderRunSummaryCard(getRun(dk)):''}
      ${existing.dl!=='Cardio + core'?`<div style="font-size:13px;color:var(--mut);margin-bottom:12px">Next week targets:</div>
      ${existing.exercises.map(e=>`<div style="padding:9px 0;border-bottom:1px solid var(--c3)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:15px;font-weight:700;font-family:'Barlow',sans-serif">${e.name}${e.isPR?' <span style="font-size:11px;color:var(--cyan)">PR&#x2191;</span>':''}</div>
          ${e.best?`<div style="font-size:12px;color:var(--dim)">${fmtCompletedBest(e)}</div>`:''}
        </div>
        <div style="font-size:12px;color:var(--cyan);margin-top:3px;font-weight:600">${e.suggestion||''}</div>
      </div>`).join('')}`:`${existing.exercises?.[0]?.suggestion?`<div style="font-size:13px;color:var(--cyan);font-weight:600;margin-bottom:8px">${existing.exercises[0].suggestion}</div>`:''}`}
      ${existing.note?`<div style="margin-top:10px;font-size:13px;color:var(--mut);font-style:italic">"${existing.note}"</div>`:''}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-ghost btn-sm" style="flex:1;margin-top:0" onclick="editSession()">&#x270F; Edit session</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;margin-top:0;color:var(--red);border-color:var(--rbr)" onclick="deleteSession()">&#x2715; Delete session</button>
      </div>
    </div>`;
    showStickyBtn(false);
  }
  /* -- Skipped -- */
  else if(existing&&existing.skipped){
    html+=`<div class="card"><div class="ct" style="margin-bottom:8px">Skipped \u2014 ${existing.dl}</div>
      <div class="nt ${existing.skipReason==='sick'?'ng':'na'}">${existing.skipReason==='sick'?'Sick day \u2014 rest up. Not counted against your score.':existing.skipReason==='tired'?'Tired skip noted.':'Busy day.'}</div>
      <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:10px" onclick="unskipSession()">Remove skip</button>
    </div>`;
    showStickyBtn(false);
  }
  /* -- Session picker (first time or rest day with no choice made) -- */
  else if(!gd||_forcePickerOnce){
    _forcePickerOnce=false;
    const isFirstTime=nextIdx===null;
    html+=`<div class="card cyan">
      <div class="cl">${isFirstTime?'First session \u2014 choose where to start':'Choose your session today'}</div>
      <div class="ct" style="margin-bottom:4px">${isFirstTime?'Pick any session. The app tracks the sequence from here.':'What are you training today?'}</div>
      <div class="cs" style="margin-bottom:14px">${isFirstTime?'Push \u2192 Pull \u2192 Legs \u2192 Cardio \u2192 repeat':'Override the sequence any time. App remembers what you pick.'}</div>
      ${DAYS.map((d,i)=>`<div class="sess-option${nextIdx!==null&&i===nextIdx?' suggested':''}" onclick="startSession(${i})">
        <div>
          <div style="font-size:17px;font-weight:700;font-family:'Barlow',sans-serif">${d.label}${nextIdx!==null&&i===nextIdx?' <span style="font-size:11px;color:var(--cyan)">\u2190 suggested</span>':''}</div>
          <div style="font-size:12px;color:var(--mut);margin-top:2px">${d.focus}</div>
        </div>
        <div style="color:var(--cyan);font-size:22px">&#x203A;</div>
      </div>`).join('')}
      <div class="sess-option" style="border-top:1px dashed var(--c3);margin-top:6px;padding-top:14px" onclick="startFreeSession()">
        <div>
          <div style="font-size:17px;font-weight:700;font-family:'Barlow',sans-serif">Free session</div>
          <div style="font-size:12px;color:var(--mut);margin-top:2px">Build your own combo \u2014 doesn't affect your Push/Pull/Legs/Cardio sequence</div>
        </div>
        <div style="color:var(--cyan);font-size:22px">&#x203A;</div>
      </div>
      <div style="text-align:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--c3)">
        <button onclick="showSkipSheet()" style="background:none;border:none;font-size:13px;color:var(--mut);cursor:pointer;font-family:inherit;padding:4px 8px">Not training today \u2014 skip this day</button>
      </div>
    </div>`;
    showStickyBtn(false);
  }
  /* -- Active workout -- */
  else{
    const last=Data.session.getLast(gd.label);
    const seqIdx=gd.label==='Free session'?'free':(adHocSeqIdx!==null?adHocSeqIdx:(nextIdx!==null?nextIdx:0));
    if(gd.label==='Cardio + core'){
      html+=renderCardioDaySection(gd,seqIdx);
      showStickyBtn(false);
      stopTimerTick();
    }else{
    initWS(gd.label,gd);
    const ws=WS[gd.label];
    const hasDraft=!!lsG('ws_draft:'+activeDateKey());
    if(sym.energy&&sym.energy<=2){
      html+=`<div class="card na" style="margin-bottom:10px;border-left:3px solid var(--amb)">
        <div class="cl" style="color:var(--amb)">Energy ${sym.energy}/5 \u2014 take it easier today</div>
        <div style="font-size:13px;line-height:1.5;margin-top:4px">Drop load ~20%, cut a set if needed, longer rests. Or switch to Cardio + core.</div>
      </div>`;
    }

    html+=`<div class="card" style="margin-bottom:10px;border-color:var(--cbr)">
      <div class="cl">End-of-day log</div>
      <div style="font-size:13px;color:var(--txt);line-height:1.5;margin-top:4px">Fill in what you did whenever you\u2019re ready \u2014 no need to tap after every set. Rest between sets is assumed <b>2\u20133 minutes</b>.</div>
    </div>`;

    html+=`<div class="card gym">
      <div class="sess-hd">
        <div><div class="cl">${gd.time}${hasDraft?' &middot; <span style="color:var(--cyan)">Draft saved</span>':''}</div>
          <div class="ct">${gd.label}</div><div class="cs">${gd.focus}</div>
          <button style="font-size:12px;color:var(--mut);background:none;border:none;cursor:pointer;padding:4px 0;font-family:inherit" onclick="startSession(-1)">&#x21C4; Change session</button>
        </div>
        <div style="text-align:right;font-size:11px;color:var(--mut);font-weight:600;max-width:110px">Rest 2\u20133 min between sets</div>
      </div>`;

    // Render exercises grouped by must/optional
    function renderEx(ex,ei){
      const orig=gd.ex[ei];
      const isChoice=orig.inputType==='choice';
      const chosenOpt=isChoice&&ex.chosenType?orig.choiceOptions?.find(o=>o.name===ex.chosenType):null;
      const trackName=chosenOpt?ex.chosenType:ex.name;
      const lx=last?.exercises?.find(l=>l.name===trackName);
      const subOverride=(!chosenOpt&&ex.name!==ex.origName)?SUB_TYPE_OVERRIDE[ex.name]:null;
      const subWlabel=subOverride?.wlabel||((!chosenOpt&&ex.name!==ex.origName)?inferSubWlabel(ex.name):null);
      const effType=chosenOpt?chosenOpt.inputType:(subOverride?subOverride.inputType:(orig.inputType||'weight'));
      const effR=chosenOpt?chosenOpt.r:orig.r;
      const fmtBest=(b)=>!b?'':(effType==='seconds'?b.w+((subWlabel||orig.wlabel||'').toLowerCase().includes('min')?' min':'s'):effType==='reps_each'?b.w+' each side':b.w+'kg \u00d7 '+b.r);
      const histFall=(!lx?.best)?(getExHistory(trackName).slice(-1)[0]||null):null;
      const lstr=lx?.best?'Last: '+fmtBest(lx.best):histFall?'Last ('+histFall.date.slice(5)+'): '+fmtBest(histFall.best):'First time';
      const effOrigLike=chosenOpt?{...orig,...chosenOpt,noweight:true}:(subOverride?{...orig,...subOverride}:orig);
      const bestForSugg=lx?.best||histFall?.best||null;
      const sugg=bestForSugg?getSuggestion(effOrigLike,bestForSugg,trackName):'';
      const allDone=ex.sets.filter(s=>!s.isDrop).length>0&&ex.sets.filter(s=>!s.isDrop).every(s=>setHasData(s,effType));
      const isSubbed=ex.name!==ex.origName;
      const subOpen=ws.subOpen===ei;
      const subs=SUBS[ex.origName]||[];
      const cid='ci'+ei;
      const prData=Data.pr.get(trackName);
      const contextParts=[];
      if(prData)contextParts.push(`&#x2605; ${fmtBest(prData)}`);
      contextParts.push(lstr);
      if(sugg)contextParts.push(sugg);
      const freshTag=(effOrigLike.primaryMuscles||[])[0];
      const freshEntry=freshTag?_freshList.find(f=>f.muscle===freshTag):null;
      const freshNote=(freshEntry&&freshEntry.freshness<0.4)
        ?`${freshTag} is still recovering \u2014 trained ${freshEntry.daysSince===0?'today':freshEntry.daysSince===1?'yesterday':freshEntry.daysSince+' days ago'}. Everything else on this day is unaffected; sub this one if you want a different angle.`
        :null;
      let h=`<div class="exb">
        <div class="exhd">
          <div style="flex:1">
            <div class="exn${allDone?' done':''}">${ex.name}${allDone?' &#x2713;':''}
              <button class="infobtn" onclick="togInfo('${gd.label}',${ei})" title="Form tips">&#x24D8;</button>
            </div>
            ${isSubbed?`<div class="subbed">SUB for ${ex.origName}</div>`:''}
            <div style="font-size:12px;color:var(--mut);margin-top:3px">${contextParts.join(' &middot; ')}</div>
            <div style="font-size:12px;color:var(--txt);margin-top:2px">${orig.s} sets &times; ${effR||orig.r}${(subWlabel||orig.wlabel)?` &middot; ${subWlabel||orig.wlabel}`:''}</div>
            ${orig.nt?`<div style="font-size:11px;color:var(--amb);font-style:italic;margin-top:3px">${orig.nt}</div>`:''}
            ${freshNote?`<div style="font-size:11px;color:var(--cyan);margin-top:4px;padding:6px 8px;background:var(--c2);border-radius:8px">&#x21BB; ${freshNote}</div>`:''}
          </div>
          ${gd.label==='Free session'?`<button class="ex-del" onclick="removeFromFreeSession(${ei})" title="Remove exercise" aria-label="Remove ${escHtml(ex.name)}">&#x2715;</button>`:''}
        </div>
        ${ws.infoOpen===ei?renderExInfoPanel(ex,orig,ei):''}`;
      // Choice picker
      if(isChoice&&!ex.chosenType){
        h+=`<div class="choice-pick">${orig.choiceOptions.map(o=>`<button class="choice-btn" onclick="chooseExType('${gd.label}',${ei},'${o.name}')">${o.name}<div style="font-size:11px;margin-top:4px;color:var(--mut)">${o.r}</div></button>`).join('')}</div>`;
      }
      if(!isChoice||ex.chosenType){
        ex.sets.forEach((set,si)=>{
          const isDrop=set.isDrop;
          const filled=setHasData(set,effType);
          const isExtra=isDrop||si>=(orig.s||3);
          h+=`<div class="srow${filled?' setdone':''}${isDrop?' droprow':''}"${si===ex.sets.length-1&&!subOpen?' style="border-bottom:none"':''}>
            <div class="snum">${isDrop?`S${si+1}<span class="dbadge">DROP</span>`:`S${si+1}`}${isExtra?`<button class="setdel" onclick="removeSet('${gd.label}',${ei},${si})" title="Remove this set">&#x2715;</button>`:''}</div>
            <div style="text-align:center;flex:1">
              <input class="nin" type="number" inputmode="decimal" placeholder="${effType==='seconds'?((subWlabel||orig.wlabel||'').toLowerCase().includes('min')?'min':'sec'):effType==='reps_each'?'reps':'kg'}" min="0" step="${effType==='weight'?0.5:1}" value="${set.w}" oninput="updSet('${gd.label}',${ei},${si},'w',this.value)">
              <div class="nin-lbl">${effType==='seconds'?((subWlabel||orig.wlabel||'').toLowerCase().includes('min')?'min':'sec'):effType==='reps_each'?'/side':'kg'}</div>
            </div>
            ${(effType!=='seconds'&&effType!=='reps_each')?`<span class="tx">&times;</span><div style="text-align:center;flex:1"><input class="nin" type="number" inputmode="numeric" placeholder="reps" min="0" step="1" value="${set.r}" oninput="updSet('${gd.label}',${ei},${si},'r',this.value)"><div class="nin-lbl">reps</div></div>`:''}
          </div>`;
        });
      }
      h+=`<div class="set-actions">
        <button class="subbtn" onclick="togSub('${gd.label}',${ei})">${subOpen?'&#x2715; Close':'&#x21C4; Sub'}</button>
        ${isSubbed?`<button class="subbtn" onclick="resetSub('${gd.label}',${ei})">&#x21A9; Original</button>`:''}
        <button class="addbtn" onclick="addSet('${gd.label}',${ei})">+ Set</button>
        <button class="dropbtn" onclick="addDropSet('${gd.label}',${ei})">&#x2193; Drop</button>
        ${gd.label==='Free session'?`<button class="subbtn danger" onclick="removeFromFreeSession(${ei})">&#x2715; Remove exercise</button>`:''}
      </div>`;
      if(subOpen){
        h+=`<div class="subpanel">
          <div style="font-size:11px;color:var(--mut);margin-bottom:8px;font-weight:700">Subs for ${ex.origName}:</div>
          ${subs.map(s=>`<button class="subopt" onclick="pickSub('${gd.label}',${ei},'${s.replace(/'/g,"\\'")}')">&#x2192; ${s}</button>`).join('')}
          <div style="font-size:11px;color:var(--mut);margin:8px 0 4px;font-weight:700">Type your own:</div>
          <input class="genin" type="text" id="${cid}" placeholder="Custom exercise..."
            onkeydown="if(event.key==='Enter'){applyCSub('${gd.label}',${ei},'${cid}');event.preventDefault()}">
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:6px" onclick="applyCSub('${gd.label}',${ei},'${cid}')">Use this</button>
        </div>`;
      }
      h+=`</div>`;
      return h;
    }

    if(gd.label==='Free session'){
      const exList=getFreeSessionExerciseList();
      const mode=_freeExPickerMode||'search';
      html+=`<div class="card" style="margin-bottom:12px">
        <div class="cl">Add an exercise</div>
        <div style="display:flex;gap:8px;margin:8px 0">
          <button class="btn ${mode==='search'?'btn-grn':'btn-ghost'} btn-sm" style="flex:1" onclick="setFreeExPickerMode('search')">Search</button>
          <button class="btn ${mode==='muscle'?'btn-grn':'btn-ghost'} btn-sm" style="flex:1" onclick="setFreeExPickerMode('muscle')">By muscle</button>
        </div>
        ${mode==='search'?`
        <input class="genin" id="free-ex-search" placeholder="Search exercises..." oninput="filterFreeExList(this.value)" style="margin:8px 0">
        <div id="free-ex-list" style="max-height:180px;overflow-y:auto">
          ${exList.map(e=>`<div class="free-ex-row" data-name="${e.n.toLowerCase()}" onclick="addToFreeSession('${e.n.replace(/'/g,"\\'")}')">
            <span>${e.n}${e.subOf?`<span style="color:var(--dim);font-size:11px"> &middot; sub for ${e.subOf}</span>`:''}</span><span style="color:var(--cyan);font-size:18px">+</span>
          </div>`).join('')}
        </div>`:`
        <div style="font-size:12px;color:var(--mut);margin-bottom:8px">Tap a muscle to see exercises that train it</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <div id="freediag-front" style="width:46%"></div>
          <div id="freediag-back" style="width:46%"></div>
        </div>
        <div id="free-muscle-exlist" style="margin-top:10px">${renderFreeMuscleExList()}</div>
        `}
      </div>`;
      if(!gd.ex.length){
        html+=`<div class="cs" style="text-align:center;padding:20px 0">No exercises added yet \u2014 search above to build today's session.</div>`;
      }
      gd.ex.forEach((e,ei)=>{
        html+=renderEx(ws.ex[ei],ei);
      });
    }else{
      gd.ex.forEach((e,ei)=>{html+=renderEx(ws.ex[ei],ei);});
    }

    const loggedCount=ws.ex.filter((e,i)=>{
      const orig=gd.ex[i]||{};
      const chosenOpt=orig.inputType==='choice'&&e.chosenType?orig.choiceOptions?.find(o=>o.name===e.chosenType):null;
      const subOverride=(!chosenOpt&&e.name!==e.origName)?SUB_TYPE_OVERRIDE[e.name]:null;
      const effType=chosenOpt?chosenOpt.inputType:(subOverride?subOverride.inputType:(orig.inputType||'weight'));
      return (e.sets||[]).some(s=>!s.isDrop&&setHasData(s,effType));
    }).length;
    html+=`<div class="sep"></div>
      <div style="font-size:11px;color:var(--mut);margin-bottom:6px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Session notes</div>
      <textarea class="genin" rows="2" placeholder="e.g. felt strong, good energy..." oninput="if(WS['${gd.label}']){WS['${gd.label}'].note=this.value;saveDraft('${gd.label}')}">${escHtml(ws.note)}</textarea>
      <div style="font-size:11px;color:var(--mut);margin:10px 0 6px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Pain / joint (optional)</div>
      <textarea class="genin" rows="1" placeholder="e.g. shoulder twinge, left knee..." oninput="if(WS['${gd.label}']){WS['${gd.label}'].painNote=this.value;saveDraft('${gd.label}')}">${escHtml(ws.painNote)}</textarea>
      <div style="display:flex;justify-content:space-between;margin:12px 0 5px">
        <div style="font-size:13px;color:var(--cyan);font-weight:700">${loggedCount}/${ws.ex.length} exercises filled</div>
        <div style="font-size:12px;color:var(--mut);font-weight:600">Rest assumed 2\u20133 min</div>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${ws.ex.length?Math.round(loggedCount/ws.ex.length*100):0}%;background:var(--cyan)"></div></div>
    </div>
    <button class="btn btn-ghost" onclick="document.getElementById('skipsheet').style.display='block'" style="margin-top:6px">Skip today</button>
    <div class="skipsheet" id="skipsheet">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--mut)">Why skipping?</div>
      <button class="skipopt" onclick="skipSession('sick')">Sick / injured</button>
      <button class="skipopt" onclick="skipSession('tired')">Too tired</button>
      <button class="skipopt" onclick="skipSession('busy')">Too busy</button>
      <button class="skipopt" style="color:var(--mut);font-weight:500" onclick="document.getElementById('skipsheet').style.display='none'">Cancel</button>
    </div>`;
    showStickyBtn(true,gd.label,seqIdx);
    stopTimerTick();
    }
  }

  /* -- Weather placeholder (filled async after DOM write) -- */
  html+=`<div id="wx-slot"></div>`;

  /* -- Water -- */
  const wp=Math.min(water/8*100,100);
  html+=`<div class="card" style="margin-top:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div><div class="cl">Water</div><div style="font-size:13px;color:var(--mut)">8 glasses target</div></div>
      ${water>=8?`<span class="pill pg">&#x2713; Done</span>`:''}
    </div>
    <div class="water-row">
      <button class="water-btn" onclick="adjWater(-1)">&minus;</button>
      <div style="text-align:center"><div id="water-num" class="water-count${water>=8?' full':''}">${water}</div><div style="font-size:10px;color:var(--mut);font-weight:600">glasses</div></div>
      <button class="water-btn" onclick="adjWater(1)">+</button>
    </div>
    <div class="prog-bar" style="margin-top:8px"><div id="water-bar" class="prog-fill" style="width:${wp}%;background:var(--cyan)"></div></div>
  </div>`;

  const barWts=lsG('bar_weights')||{};
  if(!(gd&&gd.label==='Cardio + core')){
  html+=`<div class="card" style="margin-top:12px"><div class="cl">Bar Weight Reference</div><div class="ct" style="margin-bottom:10px">For when the gym's labels are worn off</div>
    <div class="statrow"><div style="font-size:13px;color:var(--txt)">Olympic barbell</div><div style="font-size:13px;color:var(--grn);font-weight:700">20kg &middot; confirmed standard</div></div>
    <div class="statrow"><div style="font-size:13px;color:var(--txt)">Standard EZ curl bar</div><div style="font-size:13px;color:var(--grn);font-weight:700">10kg &middot; confirmed at your gym</div></div>
    <div class="statrow"><div style="font-size:13px;color:var(--txt)">Smith machine bar</div><input class="sinput" type="text" id="bar-smith" placeholder="not confirmed yet" value="${barWts.smith}" style="width:130px;text-align:right"></div>
    <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:10px" onclick="saveBarWeight()">Save Smith machine weight</button>
    <div class="cs" style="margin-top:8px">No universal standard for Smith machines &mdash; counterweighting varies by model. Check a stamped weight on the bar, ask staff, or the bathroom-scale method, then save it here once.</div>
  </div>`;
  }

  document.getElementById('p0').innerHTML=html;
  updateRunCalPreview();
  injectWeather();
  if(gd&&gd.label==='Free session'&&_freeExPickerMode==='muscle')mountFreeMuscleDiagram();
  const curWs=gd?WS[gd.label]:null;
  if(curWs&&curWs.infoOpen!=null&&gd.ex[curWs.infoOpen])mountMiniExerciseDiagram(gd.ex[curWs.infoOpen]);
}

function startSession(dayIndex){
  if(dayIndex===-1){_forcePickerOnce=true;adHocDay=null;adHocSeqIdx=null;renderToday();return;}
  _forcePickerOnce=false;
  adHocDay=DAYS[dayIndex];adHocSeqIdx=dayIndex;
  initWS(adHocDay.label,adHocDay);
  renderToday();
}
function startFreeSession(){
  _forcePickerOnce=false;
  adHocDay={label:'Free session',focus:'Your combo today',time:'',ex:[]};
  adHocSeqIdx=null;
  WS['Free session']={ex:[],subOpen:null,note:'',painNote:'',startAt:Date.now(),lastSetAt:null};
  _freeExPickerMode='search';_freeExSelectedTags=[];
  saveDraft('Free session');
  renderToday();
}
function getFreeSessionExerciseList(){
  const seen=new Set();const list=[];
  for(const d of DAYS){for(const e of d.ex){
    if(e.inputType==='choice'&&e.choiceOptions){
      for(const o of e.choiceOptions){
        if(!seen.has(o.name)){seen.add(o.name);list.push({...e,...o,n:o.name});}
      }
    }else if(!seen.has(e.n)){seen.add(e.n);list.push(e);}
  }}
  for(const origName in SUBS){
    for(const subName of SUBS[origName]){
      if(seen.has(subName))continue;
      seen.add(subName);
      const def=findExDef(subName);
      if(def)list.push(def);
    }
  }
  // Include any custom exercises created by the user
  try{
    const customs = lsG('custom_exs')||[];
    for(const c of customs){
      if(!seen.has(c.n)){seen.add(c.n);list.push({...c});}
    }
  }catch(e){}
  return list.sort((a,b)=>a.n.localeCompare(b.n));
}
function addToFreeSession(name){
  if(!adHocDay||adHocDay.label!=='Free session')return;
  const def=getFreeSessionExerciseList().find(e=>e.n===name);
  if(!def)return;
  adHocDay.ex.push({...def,priority:'normal'});
  const pSubs=lsG('persisted_subs')||{};
  const trackN=pSubs[def.n]||def.n;
  const prefill=getPrefillSets(def,trackN,def.s||3);
  WS['Free session'].ex.push({
    name:trackN,origName:def.n,chosenType:null,
    sets:Array.from({length:def.s||3},(_,si)=>({w:prefill?.[si]?.w||'',r:prefill?.[si]?.r||'',done:false,isDrop:false}))
  });
  saveDraft('Free session');
  renderToday();
}
function filterFreeExList(q){
  const query=q.toLowerCase();
  document.querySelectorAll('.free-ex-row').forEach(row=>{
    row.style.display=row.dataset.name.includes(query)?'flex':'none';
  });
}
function removeFromFreeSession(ei){
  if(!adHocDay||adHocDay.label!=='Free session')return;
  const name=WS['Free session']?.ex?.[ei]?.name||adHocDay.ex[ei]?.n||'this exercise';
  if(!confirm('Remove "'+name+'" from today\'s session?'))return;
  adHocDay.ex.splice(ei,1);
  if(WS['Free session']){
    WS['Free session'].ex.splice(ei,1);
    if(WS['Free session'].subOpen===ei)WS['Free session'].subOpen=null;
    if(WS['Free session'].infoOpen===ei)WS['Free session'].infoOpen=null;
    if(typeof WS['Free session'].subOpen==='number'&&WS['Free session'].subOpen>ei)WS['Free session'].subOpen--;
    if(typeof WS['Free session'].infoOpen==='number'&&WS['Free session'].infoOpen>ei)WS['Free session'].infoOpen--;
  }
  saveDraft('Free session');
  renderToday();
}

Object.assign(globalThis, {
  setFreeExPickerMode, renderFreeMuscleExList, mountFreeMuscleDiagram,
  mountMiniExerciseDiagram,
  initWS, updSet, togDone, addSet, removeSet, addDropSet, chooseExType,
  togSub, togInfo, renderExInfoPanel, pickSub, resetSub, applyCSub,
  setHasData, markFilledSetsDone, bestSetOf, saveSession,
  editSession, deleteSession, showSkipSheet, unskipSession, skipSession,
  renderToday, startSession, startFreeSession, getFreeSessionExerciseList,
  addToFreeSession, filterFreeExList, removeFromFreeSession,
});
