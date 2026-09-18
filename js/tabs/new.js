import '../core.js';

/* ===== NEW TAB ===== */

function collectExercisesByType(){
  const map={Push:[],Pull:[],Legs:[],Core:[]};
  try{
    for(const d of DAYS){
      const key=(d.label||'').toLowerCase();
      let t=null;
      if(key.includes('push'))t='Push';
      if(key.includes('pull'))t='Pull';
      if(key.includes('leg'))t='Legs';
      if(key.includes('core'))t='Core';
      if(t){
        (d.ex||[]).forEach(e=>{
          const name=e.n||e;
          if(!map[t].includes(name))map[t].push(name);
          if(e.choiceOptions) e.choiceOptions.forEach(o=>{ if(!map[t].includes(o.name)) map[t].push(o.name);});
        });
      }
    }
  }catch(e){}
  return map;
}

function renderNewTab(){
  const map=collectExercisesByType();
  const types=Object.keys(map);
  let html=`<div class="card"><div class="cl">Add new session</div><div class="ct" style="margin-bottom:8px">Create a quick custom session by number of exercises</div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input class="sinput" id="new-ex-count" type="number" min="1" max="20" value="5" style="width:120px" placeholder="Exercises">
      <button class="btn btn-amb btn-sm" onclick="startCustomLog()">Start custom log</button>
    </div>
    <div id="new-ex-list"></div>
  </div>`;
  // Add exercise definition panel
  html += `<div class="card" style="margin-top:12px"><div class="cl">Add exercise</div><div class="ct" style="margin-bottom:8px">Define a new exercise and tag primary/secondary muscles</div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input class="sinput" id="add-ex-name" type="text" placeholder="Exercise name (e.g. Seated cable row)" style="flex:1" oninput="renderExercisePreview()">
      <button class="btn btn-amb btn-sm" onclick="renderExercisePreview()">Preview</button>
    </div>
    <div style="display:flex;gap:12px">
      <div style="flex:1">
        <div style="font-size:12px;color:var(--mut);margin-bottom:6px;font-weight:700">Tap muscle groups to tag (primary)</div>
        <div id="add-ex-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>
        <div style="font-size:12px;color:var(--mut);margin-bottom:6px;font-weight:700">Secondary muscles (optional)</div>
        <div id="add-ex-tags-sec" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>
      </div>
      <div style="width:46%">
        <div id="miniex-front" style="width:100%;height:140px"></div>
        <div id="miniex-back" style="width:100%;height:140px;margin-top:8px"></div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-grn" onclick="saveExerciseDef()" style="flex:1">Save exercise</button>
      <button class="btn btn-ghost" onclick="renderNewTab()" style="flex:1">Cancel</button>
    </div>
    <div id="add-ex-conf" class="confbox">Exercise saved &#x2713;</div>
  </div>`;
  document.getElementById('p2').innerHTML=html;
  window._newExMap = map; // cache for selects
  renderExerciseTags();
  // render saved templates
  const templates = lsG('custom_routines')||[];
  if(templates.length){
    const tplHtml = templates.map(t=>`<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px;border:1px solid var(--c3);border-radius:10px"><div style="flex:1"><div style="font-weight:800">${escHtml(t.name)}</div><div style="font-size:12px;color:var(--mut)">${t.exercises.length} exercises · ${t.created}</div></div><div style="display:flex;gap:6px"><button class="btn btn-ghost btn-sm" onclick="loadTemplate('${escHtml(t.name).replace(/'/g,"\\'")}')">Load</button><button class="btn btn-ghost btn-sm" onclick="deleteTemplate('${escHtml(t.name).replace(/'/g,"\\'")}')">Delete</button></div></div>`).join('');
    const container = document.getElementById('p2');
    container.insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:12px"><div class="cl">Saved templates</div>${tplHtml}</div>`);
  }
}

function startCustomLog(){
  const n=parseInt(document.getElementById('new-ex-count')?.value||0);
  if(!n||n<1){alert('Enter number of exercises');return;}
  const map=window._newExMap||collectExercisesByType();
  const types=Object.keys(map);
  let html='';
  for(let i=0;i<n;i++){
    html+=`<div class="card" style="margin-bottom:8px" id="new-ex-${i}">
      <div style="display:flex;gap:8px;align-items:center">
        <select class="foodsel" id="new-ex-type-${i}" onchange="populateNewExOptions(${i})">${types.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
        <select class="foodsel" id="new-ex-name-${i}"></select>
        <div style="display:flex;gap:6px">
          <input class="sinput" id="new-ex-w-${i}" placeholder="kg" style="width:70px">
          <input class="sinput" id="new-ex-r-${i}" placeholder="reps" style="width:70px">
        </div>
      </div>
      <div id="new-ex-sets-${i}" style="margin-top:8px"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost btn-sm" onclick="addSetToNew(${i})">+ Set</button>
        <button class="btn btn-ghost btn-sm" onclick="addDropSetToNew(${i})">+ Drop set</button>
      </div>
    </div>`;
  }
  html += `<div style="display:flex;gap:8px"><button class="btn btn-grn" onclick="saveCustomSession(${n})" style="flex:1">Save session</button><button class="btn btn-ghost" onclick="renderNewTab()" style="flex:1">Cancel</button></div>`;
  document.getElementById('new-ex-list').innerHTML=html;
  for(let i=0;i<n;i++)populateNewExOptions(i);
  // If a template was requested to load, prefill fields
  if(window._templateToLoad){
    const tpl=window._templateToLoad; window._templateToLoad=null;
    tpl.exercises.forEach((ex,idx)=>{
      const nameEl=document.getElementById('new-ex-name-'+idx);
      if(nameEl) nameEl.value = ex.name || ex.origName || '';
      const wEl=document.getElementById('new-ex-w-'+idx);
      const rEl=document.getElementById('new-ex-r-'+idx);
      if(wEl && ex.sets && ex.sets[0]) wEl.value = ex.sets[0].w||'';
      if(rEl && ex.sets && ex.sets[0]) rEl.value = ex.sets[0].r||'';
      const setsContainer=document.getElementById('new-ex-sets-'+idx);
      if(setsContainer && ex.sets && ex.sets.length>1){
        for(let si=1; si<ex.sets.length; si++){
          const s=ex.sets[si]; const row=document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.marginTop='6px'; row.innerHTML=`<input class=\"sinput\" placeholder=\"kg\" style=\"width:70px\" value=\"${s.w||''}\"><input class=\"sinput\" placeholder=\"reps\" style=\"width:70px\" value=\"${s.r||''}\"><button class=\"btn btn-ghost btn-sm\" onclick=\"this.parentNode.remove()\">Remove</button>`; setsContainer.appendChild(row);
        }
      }
    });
  }
}

function populateNewExOptions(i){
  const type=document.getElementById('new-ex-type-'+i).value;
  const sel=document.getElementById('new-ex-name-'+i);
  const opts=(window._newExMap&&window._newExMap[type])||[];
  sel.innerHTML=opts.map(o=>`<option value="${o}">${o}</option>`).join('')||'<option value="">No exercises</option>';
}

function renderExerciseTags(){
  const tags = Object.keys(MUSCLE_TAG_TO_LIB_IDS||{}).sort();
  const container = document.getElementById('add-ex-tags');
  const containerSec = document.getElementById('add-ex-tags-sec');
  if(!container) return;
  container.innerHTML = tags.map(t=>`<button class="subbtn" onclick="toggleMuscleTag('${t}',true)" id="tagp-${t.replace(/\\s+/g,'_')}">${t}</button>`).join('');
  containerSec.innerHTML = tags.map(t=>`<button class="subbtn" onclick="toggleMuscleTag('${t}',false)" id="tags-${t.replace(/\\s+/g,'_')}">${t}</button>`).join('');
}

function toggleMuscleTag(tag,primary){
  const pbtn = document.getElementById('tagp-'+tag.replace(/\\s+/g,'_'));
  const sbtn = document.getElementById('tags-'+tag.replace(/\\s+/g,'_'));
  const selP = window._addExPrimary = window._addExPrimary||new Set();
  const selS = window._addExSecondary = window._addExSecondary||new Set();
  if(primary){
    if(selP.has(tag)){ selP.delete(tag); if(pbtn) pbtn.classList.remove('dbtn.dk'); }
    else { selP.add(tag); if(pbtn) pbtn.classList.add('dbtn.dk'); }
  } else {
    if(selS.has(tag)){ selS.delete(tag); if(sbtn) sbtn.classList.remove('dbtn.dk'); }
    else { selS.add(tag); if(sbtn) sbtn.classList.add('dbtn.dk'); }
  }
  mountAddExerciseDiagram({primaryMuscles:[...selP], secondaryMuscles:[...selS]});
}

function renderExercisePreview(){
  const name = (document.getElementById('add-ex-name')?.value||'').trim();
  const primary = window._addExPrimary? [...window._addExPrimary]: [];
  const secondary = window._addExSecondary? [...window._addExSecondary]: [];
  mountAddExerciseDiagram({primaryMuscles:primary, secondaryMuscles:secondary});
}

function saveExerciseDef(){
  const name = (document.getElementById('add-ex-name')?.value||'').trim();
  if(!name){alert('Enter an exercise name');return;}
  const primary = window._addExPrimary? [...window._addExPrimary]: [];
  const secondary = window._addExSecondary? [...window._addExSecondary]: [];
  const customs = lsG('custom_exs')||[];
  const existingIdx = customs.findIndex(c=>c.n===name);
  const def = {n:name, primaryMuscles:primary, secondaryMuscles:secondary, s:3, r:'10–12', inputType:'weight'};
  if(existingIdx>=0) customs[existingIdx]=def; else customs.push(def);
  lsS('custom_exs',customs);
  const c=document.getElementById('add-ex-conf'); if(c){ c.style.display='block'; setTimeout(()=>c.style.display='none',1400); }
  renderNewTab();
}

function addSetToNew(i){
  const el=document.getElementById('new-ex-sets-'+i);
  const id=Date.now()+Math.random().toString(36).slice(2,7);
  const row=document.createElement('div');
  row.style.display='flex';row.style.gap='8px';row.style.marginTop='6px';
  row.innerHTML=`<input class="sinput" placeholder="kg" style="width:70px"><input class="sinput" placeholder="reps" style="width:70px"><button class="btn btn-ghost btn-sm" onclick="this.parentNode.remove()">Remove</button>`;
  el.appendChild(row);
}

function addDropSetToNew(i){
  addSetToNew(i); // mark not distinguished for now
}

function saveCustomSession(n){
  const dk=activeDateKey();
  const exercises=[];
  for(let i=0;i<n;i++){
    const name=document.getElementById('new-ex-name-'+i)?.value||'';
    const sets=[];
    const w=document.getElementById('new-ex-w-'+i)?.value;
    const r=document.getElementById('new-ex-r-'+i)?.value;
    if(w||r)sets.push({w:w||'',r:r||'',done:false,isDrop:false});
    const extra=document.getElementById('new-ex-sets-'+i);
    if(extra)for(const child of extra.children){
      const inputs=child.querySelectorAll('input');
      if(inputs.length>=2)sets.push({w:inputs[0].value||'',r:inputs[1].value||'',done:false,isDrop:false});
    }
    if(!name)continue;
    exercises.push({name,origName:name,chosenType:null,sets,exVolume:0});
  }
  if(!exercises.length){alert('No exercises entered');return;}
  const session={date:dk,dl:'Custom session',seqIdx:null,exercises,note:'',painNote:'',skipped:false,duration:null,newPRs:[],totalVolume:0,cardio:false};
  Data.session.set(session,dk);
  Data.session.setLast(session.dl,{date:dk,exercises});
  const mk=monthKeyFor(dk);const mlog=lsG('mlog:'+mk)||{};mlog[dk]={type:'done',dl:session.dl,seqIdx:session.seqIdx};lsS('mlog:'+mk,mlog);
  clearDraft();showStickyBtn(false);stopTimerTick();
  renderToday();
  // offer to save as reusable template
  if(confirm('Save this session as a reusable template?')){
    const name=prompt('Template name (unique):');
    if(name&&name.trim()){const r=lsG('custom_routines')||[];const tpl={name:name.trim(),created:todayKey(),exercises};const idx=r.findIndex(x=>x.name===tpl.name);if(idx>=0)r[idx]=tpl;else r.push(tpl);lsS('custom_routines',r);alert('Template saved: '+tpl.name);}else{alert('Template not saved.');}
  }
  alert('Custom session saved');
}

function startCustomLogFromToday(){
  const n=parseInt(document.getElementById('quick-log-count')?.value||0);
  if(!n||n<1){alert('Enter number of exercises');return;}
  // switch to New tab then start
  const tab = document.querySelector('.tab[data-t=\"2\"]');
  if(tab && tab.click) tab.click();
  setTimeout(()=>{ const inp=document.getElementById('new-ex-count'); if(inp){ inp.value=n; startCustomLog(); }},120);
}

function loadTemplate(name){
  const r=lsG('custom_routines')||[]; const tpl = r.find(x=>x.name===name);
  if(!tpl){alert('Template not found'); return;}
  // open New tab and start with template
  const tab = document.querySelector('.tab[data-t=\"2\"]'); if(tab && tab.click) tab.click();
  setTimeout(()=>{ document.getElementById('new-ex-count').value = tpl.exercises.length; window._templateToLoad = tpl; startCustomLog(); }, 120);
}

function deleteTemplate(name){
  if(!confirm('Delete template '+name+'?')) return;
  const r=lsG('custom_routines')||[]; const idx=r.findIndex(x=>x.name===name);
  if(idx>=0){ r.splice(idx,1); lsS('custom_routines',r); alert('Template deleted'); renderNewTab(); }
}

let _addExCharts={front:null,back:null};
function mountAddExerciseDiagram(orig){
  const state={};
  (orig.primaryMuscles||[]).forEach(tag=>{
    (MUSCLE_TAG_TO_LIB_IDS[tag]||[]).forEach(id=>{state[id]={intensity:8,selected:true};});
  });
  (orig.secondaryMuscles||[]).forEach(tag=>{
    (MUSCLE_TAG_TO_LIB_IDS[tag]||[]).forEach(id=>{if(!state[id])state[id]={intensity:3,selected:false};});
  });
  _addExCharts=mountBodyDiagram('miniex-front','miniex-back',state,(id)=>{
    const resolved=resolveClickedTagsAll(id);
    if(!resolved.length) return;
    const mode = (window._addExModePrimary===undefined)?true:!!window._addExModePrimary;
    resolved.forEach(tag=>toggleMuscleTag(tag, mode));
    renderExercisePreview();
  },_addExCharts);
}

Object.assign(globalThis, {
  collectExercisesByType, renderNewTab, startCustomLog, populateNewExOptions,
  renderExerciseTags, toggleMuscleTag, renderExercisePreview, saveExerciseDef,
  addSetToNew, addDropSetToNew, saveCustomSession, startCustomLogFromToday,
  loadTemplate, deleteTemplate, mountAddExerciseDiagram,
});
