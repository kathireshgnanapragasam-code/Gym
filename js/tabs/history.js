import '../core.js';

/* ===== HISTORY TAB ===== */

function renderHistory(){
  const stats=lsG('bstats')||[];
  const measurements=lsG('measurements')||[];
  const biol=lsG('biologic_date')||'';
  const now=new Date();

  // Helper: local date key for a Date object
  function localKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

  // Last 7 days for week snapshot
  let weekSessions=0,weekProtein=[],weekKcal=[];
  for(let d=6;d>=0;d--){
    const dt=new Date(now);dt.setDate(dt.getDate()-d);
    const key=localKey(dt);
    const sess=Data.session.get(key);
    if(sess&&!sess.skipped)weekSessions++;
    const log=lsG('food:'+key)||[];
    if(log.length){
      weekProtein.push(Math.round(log.reduce((s,i)=>s+(i.p||0),0)));
      weekKcal.push(Math.round(log.reduce((s,i)=>s+(i.k||0),0)));
    }
  }
  const avgP=weekProtein.length?Math.round(weekProtein.reduce((a,b)=>a+b,0)/weekProtein.length):0;
  const avgK=weekKcal.length?Math.round(weekKcal.reduce((a,b)=>a+b,0)/weekKcal.length):0;
  const restDays=7-weekSessions;

  // Food 14-day data
  const foodWeek=[];
  for(let d=13;d>=0;d--){
    const dt=new Date(now);dt.setDate(dt.getDate()-d);
    const key=localKey(dt);
    const log=lsG('food:'+key)||[];
    const p=Math.round(log.reduce((s,i)=>s+(i.p||0),0));
    const k=Math.round(log.reduce((s,i)=>s+(i.k||0),0));
    const dayName=['Su','Mo','Tu','We','Th','Fr','Sa'][dt.getDay()];
    const dateNum=String(dt.getDate()).padStart(2,'0');
    foodWeek.push({key,label:dayName+'\n'+dateNum,p,k,hasData:log.length>0});
  }

  // All exercises ever done
  const allExNames=new Set();
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('sess:'))continue;
    const sess=lsG(k);
    if(!sess||sess.skipped||!sess.exercises)continue;
    sess.exercises.forEach(e=>{if(e.name)allExNames.add(e.name);if(e.origName)allExNames.add(e.origName);});
  }

  let html='';

  const recents=[];
  for(let d=0;d<14;d++){const dt=new Date(now);dt.setDate(dt.getDate()-d);const dk=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');const s=Data.session.get(dk);if(s)recents.push(s);}
  if(recents.length){
    html+=`<div class="card"><div class="cl">Recent sessions</div><div class="ct" style="margin-bottom:10px">Last 14 days</div>
      ${recents.map(s=>`<div class="hitem"><div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:15px;font-weight:700;font-family:'Barlow',sans-serif;cursor:pointer;text-decoration:underline;text-decoration-color:var(--c3)" onclick="setLogDate('${s.date}');document.querySelector('.tab[data-t=\"0\"]').click()">${s.date}${s.duration?' <span style="font-size:12px;color:var(--dim);font-family:\'IBM Plex Sans\',sans-serif;text-decoration:none">'+s.duration+'m</span>':''}</div>
        <div style="font-size:13px;color:var(--mut)">${s.dl}${s.newPRs&&s.newPRs.length?' &#x2605;':''}</div></div>
        <div class="pill ${s.skipped?(s.skipReason==='sick'?'pr':'pa'):'pg'}">${s.skipped?(s.skipReason==='sick'?'Sick':s.skipReason==='tired'?'Tired':'Busy'):'Done &#x2713;'}</div>
      </div>${s.note?`<div style="font-size:12px;color:var(--dim);margin-top:4px;font-style:italic">"${escHtml(s.note)}"</div>`:''}</div>`).join('')}
    </div>`;
  }

  const recentRuns=[];
  for(let d=0;d<14;d++){
    const dt=new Date(now);dt.setDate(dt.getDate()-d);
    const rk=formatDateKey(dt);const r=getRun(rk);if(r)recentRuns.push(r);
  }
  if(recentRuns.length){
    html+=`<div class="card"><div class="cl">Recent runs</div><div class="ct" style="margin-bottom:10px">Last 14 days</div>
      ${recentRuns.map(r=>`<div class="hitem"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div>
          <div style="font-size:15px;font-weight:700;font-family:'Barlow',sans-serif">${r.date}</div>
          <div style="font-size:13px;color:var(--mut)">${[
            r.km!=null?r.km+' km':null,
            r.mins!=null?r.mins+' min':null,
            r.paceMinPerKm!=null?fmtPace(r.paceMinPerKm):null,
            r.calories!=null?r.calories+' kcal':null,
            r.elevGainM?('↑'+r.elevGainM+'m'):null
          ].filter(Boolean).join(' · ')||'Run'}</div>
        </div>
        ${r.stravaUrl?`<a href="${escHtml(r.stravaUrl)}" target="_blank" rel="noopener" class="pill pi">Strava</a>`:'<span class="pill pd">Manual</span>'}
      </div></div>`).join('')}
    </div>`;
  }

  const symH=[];for(let d=0;d<7;d++){const dt=new Date(now);dt.setDate(dt.getDate()-d);const s=lsG('sym:'+dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'));if(s&&s.energy)symH.push(s);}
  if(symH.length){
    html+=`<div class="card"><div class="cl">Energy log &mdash; 7 days</div><div class="ct" style="margin-bottom:10px">How you felt before training</div>
      ${symH.map(s=>`<div class="hitem"><div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;color:var(--mut);font-weight:500">${s.date}</div>
        <div style="font-size:13px;font-weight:700">Energy ${s.energy||'&mdash;'}/5</div>
      </div></div>`).join('')}
    </div>`;
  }


  // 1. WEEK SNAPSHOT (top — most used)
  html+=`<div class="card" style="margin-bottom:12px">
    <div class="cl">This week</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">
      <div style="background:var(--c2);border:1px solid var(--c3);border-radius:12px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;font-family:'Barlow',sans-serif;color:${weekSessions>=3?'var(--grn)':'var(--cyan)'}">${weekSessions}<span style="font-size:12px;font-weight:400;color:var(--mut)">/4</span></div>
        <div style="font-size:10px;color:var(--mut);font-weight:600;margin-top:2px">SESSIONS</div>
      </div>
      <div style="background:var(--c2);border:1px solid var(--c3);border-radius:12px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;font-family:'Barlow',sans-serif;color:${avgP>=130?'var(--grn)':avgP>=90?'var(--amb)':'var(--red)'}">${avgP}<span style="font-size:12px;font-weight:400;color:var(--mut)">g</span></div>
        <div style="font-size:10px;color:var(--mut);font-weight:600;margin-top:2px">AVG PROTEIN</div>
      </div>
      <div style="background:var(--c2);border:1px solid var(--c3);border-radius:12px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;font-family:'Barlow',sans-serif;color:var(--cyan)">${avgK}</div>
        <div style="font-size:10px;color:var(--mut);font-weight:600;margin-top:2px">AVG KCAL</div>
      </div>
      <div style="background:var(--c2);border:1px solid var(--c3);border-radius:12px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;font-family:'Barlow',sans-serif;color:var(--mut)">${restDays}</div>
        <div style="font-size:10px;color:var(--mut);font-weight:600;margin-top:2px">REST DAYS</div>
      </div>
    </div>
    ${avgP>0&&avgP<getProfile().targets.protein*0.87?`<div style="font-size:12px;color:var(--amb);margin-top:10px">&#x25B2; Avg protein ${getProfile().targets.protein-avgP}g/day below target &mdash; prioritise protein at every meal</div>`:''}
    ${weekSessions===0?`<div style="font-size:12px;color:var(--red);margin-top:10px">No sessions logged this week yet</div>`:''}
  </div>`;

  // 2. BODY TRENDS
  if(stats.length>=2){
    const wtPts=stats.slice(-12).map(s=>({y:parseFloat(s.wt),label:s.date?.slice(5)||'',date:s.date}));
    const bfPts=stats.filter(s=>s.bf).slice(-12).map(s=>({y:parseFloat(s.bf),label:s.date?.slice(5)||'',date:s.date}));
    html+=`<div class="card">
      <div class="cl">Body trends</div>
      <div class="ct" style="margin-bottom:12px">Weight &amp; body fat over time</div>
      <div class="chart-wrap"><div class="chart-label">Weight (kg)</div>${buildSVG(wtPts,'var(--cyan)','kg')}</div>
      ${bfPts.length>=2?`<div class="chart-wrap"><div class="chart-label">Body fat (%)</div>${buildSVG(bfPts,'var(--amb)','%')}</div>`:''}
    </div>`;
  }else{
    html+=`<div class="card"><div class="cl">Body trends</div><div class="nt ni">Log body stats in Progress at least twice to see trends.</div></div>`;
  }

  // 3. FOOD 14-DAY CHART
  html+=`<div class="card">
    <div class="cl">Nutrition &mdash; last 14 days</div>
    <div class="ct" style="margin-bottom:10px">Tap a day to see the full breakdown</div>
    <div class="day-strip">
      ${foodWeek.map(d=>{
        const col=!d.hasData?'var(--dim)':d.p>=150?'var(--grn)':d.p>=100?'var(--amb)':'var(--red)';
        return`<div class="day-pill" onclick="showDayFood('${d.key}')">
          <div class="day-pill-name">${d.label.split('\n')[0]}<br>${d.label.split('\n')[1]}</div>
          <div class="day-pill-val" style="color:${col}">${d.hasData?d.p+'g':'&mdash;'}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:12px;font-size:11px;font-weight:700;margin-bottom:10px">
      <span style="color:var(--grn)">&#x2588; 150g+</span>
      <span style="color:var(--amb)">&#x2588; 100&ndash;149g</span>
      <span style="color:var(--red)">&#x2588; under 100g</span>
    </div>
    <div id="day-food-detail"></div>
  </div>`;

  // 4. EXERCISE HISTORY SEARCH
  html+=`<div class="card">
    <div class="cl">Exercise history</div>
    <div class="ct" style="margin-bottom:10px">Search any exercise &mdash; every session, best set, PRs</div>
    <input class="ex-search" type="text" id="ex-search-input" placeholder="e.g. Leg press, Pull-ups..." oninput="searchExHistory(this.value)">
    <div id="ex-history-result">
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${[...allExNames].slice(0,12).map(n=>`<button onclick="document.getElementById('ex-search-input').value='${n}';searchExHistory('${n}')" style="padding:6px 12px;border:1px solid var(--c3);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:var(--c2);color:var(--mut);font-family:inherit">${n}</button>`).join('')}
      </div>
      ${allExNames.size===0?`<div style="font-size:13px;color:var(--dim);padding:12px">No sessions logged yet.</div>`:''}
    </div>
  </div>`;

  // 5. WAIST TREND
  if(measurements.length>=2){
    const wstPts=measurements.filter(m=>m.waist).slice(-12).map(m=>({y:parseFloat(m.waist),label:m.date?.slice(5)||'',date:m.date}));
    if(wstPts.length>=2)html+=`<div class="card"><div class="cl">Waist trend (cm)</div><div class="chart-wrap">${buildSVG(wstPts,'var(--grn)','cm')}</div></div>`;
  }

  // 6. BIOLOGIC DATE — collapsed, set once
  html+=`<div class="card" style="margin-bottom:12px">
    <div class="cl">Biologic milestone</div>
    <div class="cs" style="margin-bottom:10px">Set once. Appears as a marker on all charts.</div>
    <div style="display:flex;gap:8px;align-items:center">
      <input type="date" id="biol-date" value="${biol}" class="sinput" style="flex:1" onchange="saveBiol()">
      ${biol?`<span style="font-size:12px;color:var(--grn);font-weight:700">&#x2713; Set</span>`:''}
    </div>
    ${biol?`<div class="nt ni" style="margin-top:8px">Biologics start: ${biol}</div>`:''}
  </div>`;

  document.getElementById('p4').innerHTML=html;
}

function saveBiol(){
  const val=document.getElementById('biol-date').value;
  if(val)lsS('biologic_date',val);
  renderHistory();
}

function showDayFood(dateKey){
  const log=lsG('food:'+dateKey)||[];
  const el=document.getElementById('day-food-detail');
  if(!el)return;
  if(!log.length){el.innerHTML=`<div style="font-size:13px;color:var(--dim);padding:8px">Nothing logged for ${dateKey}</div>`;return;}
  const totalK=Math.round(log.reduce((s,i)=>s+(i.k||0),0));
  const totalP=Math.round(log.reduce((s,i)=>s+(i.p||0),0));
  const totalC=Math.round(log.reduce((s,i)=>s+(i.c||0),0));
  const totalF=Math.round(log.reduce((s,i)=>s+(i.f||0),0));
  el.innerHTML=`<div style="background:var(--c2);border-radius:12px;padding:12px;border:1px solid var(--cbr)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700">${dateKey}</div>
      <div style="text-align:right"><div style="font-size:14px;font-weight:800;font-family:'Barlow',sans-serif;color:var(--cyan)">${totalP}g protein &middot; ${totalK} kcal</div>${totalC>0?`<div style="font-size:11px;color:var(--mut)">${totalC}g carbs &middot; ${totalF}g fat</div>`:''}</div>
    </div>
    ${log.map(item=>`<div class="hist-ex-row">
      <div><div class="meal-item-name">${item.name}</div><div class="meal-item-meta">${item.mealType||''}${item.amt?' &middot; '+item.amt+' '+(item.unit||'g'):''}</div></div>
      <div style="text-align:right;font-size:12px;color:var(--mut)">${Math.round(item.k||0)} kcal &middot; ${Math.round(item.p||0)}g</div>
    </div>`).join('')}
  </div>`;
}

function searchExHistory(query){
  const el=document.getElementById('ex-history-result');if(!el||!query.trim())return;
  const q=query.trim().toLowerCase();
  const allNames=new Set();
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('sess:'))continue;
    const sess=lsG(k);
    if(!sess||!sess.exercises)continue;
    sess.exercises.forEach(e=>{if(e.name&&e.name.toLowerCase().includes(q))allNames.add(e.name);if(e.origName&&e.origName.toLowerCase().includes(q))allNames.add(e.origName);});
  }
  if(!allNames.size){el.innerHTML=`<div style="font-size:13px;color:var(--dim);padding:8px">No exercise found matching "${query}"</div>`;return;}
  // Detect inputType from exercise definition
  function getInputType(name){
    for(const d of DAYS){for(const e of d.ex){
      if(e.n===name)return e.inputType||'weight';
      if(e.inputType==='choice'&&e.choiceOptions){const o=e.choiceOptions.find(o=>o.name===name);if(o)return o.inputType;}
    }}return 'weight';
  }
  function getExDef(name,itype){
    for(const d of DAYS){for(const e of d.ex){
      if(e.n===name)return e;
      if(e.inputType==='choice'&&e.choiceOptions){const o=e.choiceOptions.find(o=>o.name===name);if(o)return{...e,...o};}
    }}
    return{inputType:itype,r:'8\u201312',compound:false,noweight:itype==='bodyweight'};
  }
  function fmtBest(best,itype){
    if(!best)return '—';
    if(itype==='bodyweight')return(best.r||0)+' reps';
    if(itype==='seconds')return best.w+'s';
    if(itype==='reps_each')return best.w+' each side';
    return best.w+'kg \u00d7 '+(best.r||0);
  }
  let html='';
  for(const name of allNames){
    const itype=getInputType(name);
    const hist=getExHistory(name);
    if(!hist.length)continue;
    const isRepsFirst=itype==='bodyweight';
    const chartPts=hist.filter(h=>h.best&&(isRepsFirst?h.best.r:h.best.w)).map(h=>({
      y:isRepsFirst?parseInt(h.best.r||0):parseFloat(h.best.w),
      label:h.date.slice(5),date:h.date,pr:h.isPR
    }));
    const chartLabel=itype==='bodyweight'?'Reps per session':itype==='seconds'?'Seconds held':itype==='reps_each'?'Reps per side':'Best weight (kg)';
    const chartUnit=itype==='bodyweight'?'reps':itype==='seconds'?'s':itype==='reps_each'?'/side':'kg';
    const lastBest=hist[hist.length-1]?.best;
    const liveSugg=lastBest?getSuggestion(getExDef(name,itype),lastBest,name):'';
    html+=`<div style="font-size:15px;font-weight:700;font-family:'Barlow',sans-serif;margin-bottom:10px;color:var(--txt)">${name}</div>
    ${chartPts.length>=2?`<div class="chart-wrap"><div class="chart-label">${chartLabel}</div>${buildSVG(chartPts,'var(--cyan)',chartUnit)}<div style="font-size:11px;color:var(--dim);margin-top:4px">&#x25CF; Yellow dots = personal records</div></div>`:''}
    <div style="margin-top:12px">
      ${hist.slice().reverse().map(h=>`<div class="hist-ex-row">
        <div class="hist-date">${h.date}</div>
        <div style="font-size:11px;color:var(--mut)">${h.dl}</div>
        <div class="hist-best">${fmtBest(h.best,itype)}${h.isPR?'<span class="hist-pr">&#x2605; PR</span>':''}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:12px;color:var(--cyan);margin-top:10px;font-weight:600">${liveSugg}</div>
    <div class="sep"></div>`;
  }
  el.innerHTML=html||`<div style="font-size:13px;color:var(--dim);padding:8px">No data logged for "${query}" yet</div>`;
}

Object.assign(globalThis, {
  renderHistory, saveBiol, showDayFood, searchExHistory,
});
