import '../core.js';

/* ===== PROGRESS TAB (charts + body diagram + volume/freshness) ===== */

let _progressCharts={front:null,back:null},_progressDiagMode='volume',_progressSelectedTags=[];
let _liftChartState={
  push:{ex:null,range:'week'},
  pull:{ex:null,range:'week'},
  legs:{ex:null,range:'week'}
};
let _bodyChartState={metric:'wt',range:'week'};
/* _profileBodyCharts lives in profile.js — was accidentally in the progress-chart block
   and only used by profile.js's renderProfileBodyCharts. */
const LIFT_CHART_DAYS={push:'Push day',pull:'Pull day',legs:'Legs day'};
function setProgressDiagMode(mode){
  _progressDiagMode=mode;
  _progressSelectedTags=[];
  renderProgress();
}
function renderBodyDiagram(){
  const state=_progressDiagMode==='freshness'
    ?freshnessToBodyState(Coach.getMuscleFreshness())
    :volumeToBodyState(Coach.getWeeklyMuscleVolume());
  _progressSelectedTags.forEach(tag=>{
    (MUSCLE_TAG_TO_LIB_IDS[tag]||[]).forEach(id=>{
      state[id]={...(state[id]||{intensity:1}),selected:true};
    });
  });
  _progressCharts=mountBodyDiagram('bodydiag-front','bodydiag-back',state,(id)=>{
    const resolved=resolveClickedTagsAll(id);
    if(!resolved.length)return;
    _progressSelectedTags=resolved;
    renderProgress();
  },_progressCharts);
}
function renderProgressMuscleExList(){
  if(!_progressSelectedTags.length)return `<div class="cs" style="text-align:center;padding:10px 0">Tap a region above to see exercises for it.</div>`;
  const showSecondary=_progressSelectedTags.length===1;
  const row=e=>`<div style="padding:8px 0;border-bottom:1px solid var(--c3);font-size:13px;color:var(--txt)">${e.n}${e.subOf?`<span style="color:var(--dim);font-size:11px"> &middot; sub for ${e.subOf}</span>`:''}</div>`;
  const sections=_progressSelectedTags.map(tag=>{
    const matches=getExercisesForMuscleTag(tag);
    const primary=matches.filter(e=>(e.primaryMuscles||[]).includes(tag));
    const secondary=showSecondary?matches.filter(e=>!(e.primaryMuscles||[]).includes(tag)):[];
    return `<div style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:14px 0 6px">${tag}</div>`+
      (primary.length?primary.map(row).join(''):`<div class="cs">Nothing targets this directly yet.</div>`)+
      (secondary.length?`<div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">Also works this, secondarily</div>`+secondary.map(row).join(''):'')+
      `<button class="btn btn-grn btn-sm" style="width:100%;margin-top:8px" onclick="startFreeSessionTargeting('${tag.replace(/'/g,"\\'")}')">Start free session targeting ${tag} &#x203A;</button>`;
  });
  return (_progressSelectedTags.length>1?`<div class="cs" style="margin-top:10px">This spot covers more than one muscle in the diagram \u2014 showing what actually targets each, not secondary mentions, to keep this readable.</div>`:'')+sections.join('');
}
function startFreeSessionTargeting(tag){
  startFreeSession();
  _freeExPickerMode='muscle';
  _freeExSelectedTags=[tag];
  document.querySelector('.tab[data-t="0"]').click();
}

/* ===== LIFT PROGRESS CHARTS (Push / Pull / Legs) ===== */
function getLiftChartExercises(dayLabel){
  const day=DAYS.find(d=>d.label===dayLabel);
  if(!day)return[];
  const names=[];
  day.ex.forEach(e=>{
    if(e.inputType==='choice'&&e.choiceOptions){
      e.choiceOptions.forEach(o=>{
        if(o.inputType!=='seconds')names.push(o.name);
      });
    }else if(e.inputType!=='seconds'){
      names.push(e.n);
    }
    (SUBS[e.n]||[]).forEach(s=>{
      const def=findExDef(s);
      if(!def||def.inputType!=='seconds')names.push(s);
    });
  });
  return[...new Set(names)];
}
function sessionAvgLoad(ex){
  if(!ex)return null;
  const itype=ex.inputType||'weight';
  const sets=(ex.sets||[]).filter(s=>!s.isDrop);
  if(itype==='seconds')return null;
  if(itype==='bodyweight'){
    const reps=sets.map(s=>parseInt(s.r)||0).filter(r=>r>0);
    if(reps.length)return{avg:Math.round(reps.reduce((a,b)=>a+b,0)/reps.length*10)/10,unit:'reps',metric:'Avg reps'};
    if(ex.best&&ex.best.r)return{avg:parseFloat(ex.best.r),unit:'reps',metric:'Best reps'};
    return null;
  }
  if(itype==='reps_each'){
    const reps=sets.map(s=>parseInt(s.r)||parseInt(s.w)||0).filter(r=>r>0);
    if(reps.length)return{avg:Math.round(reps.reduce((a,b)=>a+b,0)/reps.length*10)/10,unit:'/side',metric:'Avg reps/side'};
    if(ex.best&&(ex.best.r||ex.best.w))return{avg:parseFloat(ex.best.r||ex.best.w),unit:'/side',metric:'Best reps/side'};
    return null;
  }
  /* Volume-weighted average weight across working sets: Σ(w×r) / Σ(r) */
  let tw=0,tr=0;
  const plain=[];
  sets.forEach(s=>{
    const w=parseFloat(s.w)||0,r=parseInt(s.r)||0;
    if(w<=0)return;
    if(r>0){tw+=w*r;tr+=r;}
    else plain.push(w);
  });
  if(tr>0)return{avg:Math.round((tw/tr)*10)/10,unit:'kg',metric:'Avg weight'};
  if(plain.length)return{avg:Math.round((plain.reduce((a,b)=>a+b,0)/plain.length)*10)/10,unit:'kg',metric:'Avg weight'};
  if(ex.best&&parseFloat(ex.best.w)>0)return{avg:parseFloat(ex.best.w),unit:'kg',metric:'Best weight'};
  return null;
}
function weekStartKey(dateStr){
  const d=new Date(dateStr+'T12:00:00');
  const day=(d.getDay()+6)%7;
  d.setDate(d.getDate()-day);
  return formatDateKey(d);
}
function weekBucketLabel(weekStart){
  const d=new Date(weekStart+'T12:00:00');
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
function monthBucketLabel(ym){
  const[y,m]=ym.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('en-GB',{month:'short',year:'2-digit'});
}
function getExAvgLoadHistory(exerciseName){
  const results=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('sess:'))continue;
    const sess=lsG(k);
    if(!sess||sess.skipped||!sess.exercises||sess.cardio)continue;
    const ex=sess.exercises.find(e=>e.name===exerciseName||e.origName===exerciseName);
    if(!ex)continue;
    const load=sessionAvgLoad(ex);
    if(!load)continue;
    results.push({date:sess.date,avg:load.avg,unit:load.unit,metric:load.metric,isPR:!!ex.isPR});
  }
  return results.sort((a,b)=>a.date.localeCompare(b.date));
}
function dayBucketLabel(dateStr){
  const d=new Date(dateStr+'T12:00:00');
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
function aggregateLiftHistory(history,range){
  if(!history.length)return{points:[],unit:'kg',metric:'Avg weight'};
  const unit=history[history.length-1].unit;
  const metric=history[history.length-1].metric;
  if(range==='day'){
    const sorted=[...history].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const sliced=sorted.slice(-40);
    const points=sliced.map(h=>({
      y:Math.round(h.avg*10)/10,
      date:h.date,
      label:dayBucketLabel(h.date),
      pr:!!h.isPR
    }));
    return{points,unit,metric};
  }
  const buckets={};
  history.forEach(h=>{
    const key=range==='month'?h.date.slice(0,7):weekStartKey(h.date);
    if(!buckets[key])buckets[key]={sum:0,n:0,pr:false,date:key};
    buckets[key].sum+=h.avg;
    buckets[key].n+=1;
    if(h.isPR)buckets[key].pr=true;
  });
  const keys=Object.keys(buckets).sort();
  const maxBuckets=range==='month'?18:16;
  const sliced=keys.slice(-maxBuckets);
  const points=sliced.map(key=>{
    const b=buckets[key];
    return{
      y:Math.round((b.sum/b.n)*10)/10,
      date:key,
      label:range==='month'?monthBucketLabel(key):weekBucketLabel(key),
      pr:b.pr
    };
  });
  return{points,unit,metric};
}
function buildLiftChartInner(dayKey){
  const dayLabel=LIFT_CHART_DAYS[dayKey];
  const opts=getLiftChartExercises(dayLabel);
  const st=_liftChartState[dayKey];
  if(!opts.length)return'<div style="color:var(--dim);font-size:13px;padding:16px;text-align:center">No exercises in this category</div>';
  if(!st.ex||!opts.includes(st.ex))st.ex=opts[0];
  const hist=getExAvgLoadHistory(st.ex);
  const agg=aggregateLiftHistory(hist,st.range||'week');
  if(agg.points.length<2){
    return`<div style="color:var(--dim);font-size:13px;padding:20px;text-align:center">${hist.length?`Need at least 2 ${st.range==='month'?'months':'weeks'} of logs for ${escHtml(st.ex)}`:`Log ${escHtml(st.ex)} at least twice to see a trend`}</div>
      <div class="lift-chart-meta">${agg.metric} · ${st.range==='month'?'Monthly':'Weekly'} average · ${hist.length} session${hist.length===1?'':'s'} logged</div>`;
  }
  const last=agg.points[agg.points.length-1];
  const first=agg.points[0];
  const delta=Math.round((last.y-first.y)*10)/10;
  const deltaTxt=delta>0?`+${delta}`:String(delta);
  return`<div class="chart-wrap"><div class="chart-label">${agg.metric} (${agg.unit})</div>${buildSVG(agg.points,'var(--cyan)',agg.unit)}</div>
    <div class="lift-chart-meta">Latest ${last.y}${agg.unit} · change over range ${deltaTxt}${agg.unit} · ${hist.length} sessions · ${st.range==='month'?'monthly':'weekly'} buckets</div>`;
}
function refreshLiftChart(dayKey){
  const el=document.getElementById('lift-chart-'+dayKey);if(!el)return;
  el.innerHTML=buildLiftChartInner(dayKey);
}
function onLiftChartExChange(dayKey,value){
  _liftChartState[dayKey].ex=value;
  refreshLiftChart(dayKey);
}
function onLiftChartRangeChange(dayKey,value){
  _liftChartState[dayKey].range=value;
  refreshLiftChart(dayKey);
}
function renderLiftProgressCharts(){
  const cards=['push','pull','legs'].map(key=>{
    const dayLabel=LIFT_CHART_DAYS[key];
    const opts=getLiftChartExercises(dayLabel);
    const st=_liftChartState[key];
    if(!st.ex||!opts.includes(st.ex))st.ex=opts[0]||'';
    const title=dayLabel.replace(' day','');
    return`<div class="card" style="margin-bottom:12px">
      <div class="cl">${title} progress</div>
      <div class="ct" style="margin-bottom:8px">Average load across sets (weight × reps)</div>
      <div class="lift-chart-row">
        <select class="foodsel" aria-label="${title} exercise" onchange="onLiftChartExChange('${key}',this.value)">
          ${opts.map(n=>`<option value="${escHtml(n)}"${n===st.ex?' selected':''}>${escHtml(n)}</option>`).join('')}
        </select>
        <select class="foodsel" style="flex:0 0 120px" aria-label="${title} time range" onchange="onLiftChartRangeChange('${key}',this.value)">
          <option value="week"${st.range==='week'?' selected':''}>By week</option>
          <option value="month"${st.range==='month'?' selected':''}>By month</option>
        </select>
      </div>
      <div id="lift-chart-${key}">${buildLiftChartInner(key)}</div>
    </div>`;
  }).join('');
  return`<div id="lift-charts" class="card" style="margin-bottom:12px;border-color:var(--cbr)">
      <div class="cl">Lift trends</div>
      <div class="cs">Pick an exercise per day type. Y-axis = session average weight (volume-weighted by reps). X-axis = week or month averages. Running / cardio is excluded.</div>
    </div>`+cards;
}

/* ===== BODY COMPOSITION CHART ===== */
function getBodyMetricHistory(metric){
  const stats=lsG('bstats')||[];
  return stats
    .filter(s=>s[metric]!=null&&s[metric]!==''&&!Number.isNaN(parseFloat(s[metric])))
    .map(s=>({date:s.date,avg:parseFloat(s[metric])}))
    .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function buildBodyStatsChartInner(){
  const metric=_bodyChartState.metric||'wt';
  const range=_bodyChartState.range||'week';
  const hist=getBodyMetricHistory(metric);
  const unit=metric==='bf'?'%':'kg';
  const label=metric==='bf'?'Body fat':'Weight';
  const asHist=hist.map(h=>({date:h.date,avg:h.avg,unit,metric:label,isPR:false}));
  const agg=aggregateLiftHistory(asHist,range);
  if(agg.points.length<2){
    return`<div style="color:var(--dim);font-size:13px;padding:20px;text-align:center">${hist.length?`Need at least 2 ${range==='month'?'months':(range==='day'?'days':'weeks')} of ${label.toLowerCase()} logs`:`Log ${label.toLowerCase()} at least twice to see a trend`}</div>
      <div class="lift-chart-meta">${hist.length} log${hist.length===1?'':'s'} · ${range} view</div>`;
  }
  const last=agg.points[agg.points.length-1],first=agg.points[0];
  const delta=Math.round((last.y-first.y)*10)/10;
  return`<div class="chart-wrap"><div class="chart-label">${label} (${unit})</div>${buildSVG(agg.points,metric==='bf'?'var(--amb)':'var(--cyan)',unit)}</div>
    <div class="lift-chart-meta">Latest ${last.y}${unit} · change ${delta>0?'+':''}${delta}${unit} · ${hist.length} logs · by ${range}</div>`;
}
function refreshBodyStatsChart(){
  const el=document.getElementById('body-comp-chart');if(!el)return;
  el.innerHTML=buildBodyStatsChartInner();
}
function onBodyChartMetricChange(v){_bodyChartState.metric=v;refreshBodyStatsChart();}
function onBodyChartRangeChange(v){_bodyChartState.range=v;refreshBodyStatsChart();}
function renderBodyStatsChart(){
  const st=_bodyChartState;
  return`<div class="card" style="margin-bottom:12px">
    <div class="cl">Body composition trend</div>
    <div class="ct" style="margin-bottom:8px">Weight or body fat over time</div>
    <div class="lift-chart-row">
      <select class="foodsel" aria-label="Body metric" onchange="onBodyChartMetricChange(this.value)">
        <option value="wt"${st.metric==='wt'?' selected':''}>Weight (kg)</option>
        <option value="bf"${st.metric==='bf'?' selected':''}>Body fat (%)</option>
      </select>
      <select class="foodsel" style="flex:0 0 120px" aria-label="Body time range" onchange="onBodyChartRangeChange(this.value)">
        <option value="day"${st.range==='day'?' selected':''}>By day</option>
        <option value="week"${st.range==='week'?' selected':''}>By week</option>
        <option value="month"${st.range==='month'?' selected':''}>By month</option>
      </select>
    </div>
    <div id="body-comp-chart">${buildBodyStatsChartInner()}</div>
  </div>`;
}

/* ===== RENDER PROGRESS ===== */
function renderProgress(){
  const cutoff=(()=>{const d=new Date();d.setDate(d.getDate()-28);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
  const entries=Object.entries(mergedMlog()).filter(([k])=>k>=cutoff).map(e=>e[1]);
  const done=entries.filter(e=>e.type==='done').length;
  const flare=entries.filter(e=>e.type==='skip'&&e.reason==='flare').length;
  const miss=entries.filter(e=>e.type==='skip'&&e.reason!=='flare').length;
  const total=done+flare+miss;
  const score=total>0?Math.round((done+flare*0.5)/total*100):0;
  const scoreCol=score>=80?'var(--grn)':score>=60?'var(--amb)':'var(--red)';
  const stats=lsG('bstats')||[];
  const latest=[...stats].filter(s=>s.wt!=null||s.bf!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date))).reverse()[0];
  const measurements=lsG('measurements')||[];const latestM=measurements[measurements.length-1];
  const lastExport=lsG('last_export');
  const nextIdx=getNextIdx();
  const deload=Coach.getDeloadSignal();

  let html='';
  if(deload.available&&deload.suggestDeload){
    html+=`<div class="card warm" style="margin-bottom:12px">
      <div class="cl">Consider a lighter session</div>
      <div class="cs" style="margin-bottom:6px">${deload.fatiguedCount} of ${deload.totalMuscles} muscles you\u2019ve trained recently (${deload.ratioPercent}%) are still running meaningfully harder than their own normal \u2014 not just one muscle sore from yesterday, a pattern across the week.</div>
      <div class="cs">${deload.fatiguedMuscles.join(', ')}</div>
    </div>`;
  }
  if(nextIdx!==null){
    html+=`<div class="card" style="margin-bottom:12px">
      <div class="cl">Training sequence</div>
      <div class="ct" style="margin-bottom:8px">Next: <span style="color:var(--cyan)">${SEQ[nextIdx]}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${SEQ.map((s,i)=>`<div style="padding:7px 12px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid ${i===nextIdx?'var(--cbr)':'var(--c3)'};background:${i===nextIdx?'var(--cbg)':'var(--c1)'};color:${i===nextIdx?'var(--cyan)':'var(--mut)'}">${s}</div>`).join('')}
      </div>
    </div>`;
  }

  html+=`<div class="pgrid">
    <div class="pstat"><div class="pval">${done}</div><div class="plbl">sessions done</div></div>
    <div class="pstat"><div class="pval" style="color:${scoreCol}">${score}%</div><div class="plbl">consistency (28d)</div></div>
    <div class="pstat"><div class="pval" style="color:var(--grn)">${flare}</div><div class="plbl">flare days</div></div>
    <div class="pstat"><div class="pval" style="color:${miss>0?'var(--red)':'var(--cyan)'}">${miss}</div><div class="plbl">missed</div></div>
  </div>`;
  html+=`<button class="btn btn-ghost btn-sm" style="width:100%;margin-bottom:12px" onclick="document.getElementById('lift-charts')?.scrollIntoView({behavior:'smooth',block:'start'})">Jump to Push / Pull / Legs charts &#x2193;</button>`;

  html+=`<div class="card"><div class="cl">Body stats</div><div class="ct" style="margin-bottom:4px">Log any day \u2014 not just weekly</div>
    <div class="cs" style="margin-bottom:12px">Weight + body fat feed run calories and your profile. Log today, tomorrow, or catch up any past day.</div>
    ${latest?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
      ${[['Weight',latest.wt,'kg'],['Body fat',latest.bf,'%'],['Muscle',latest.mm,'kg'],['Fat mass',latest.fm,'kg'],['Body water',latest.bw,latest.bwUnit||'%']].filter(([,v])=>v!=null&&v!=='').map(([l,v,u])=>`<div style="background:var(--c2);border:1px solid var(--c3);border-radius:12px;padding:10px;text-align:center;flex:1;min-width:70px"><div style="font-size:18px;font-weight:800;font-family:'Barlow',sans-serif;color:var(--cyan)">${v}${u}</div><div style="font-size:10px;color:var(--mut);margin-top:2px;font-weight:600">${l}</div></div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:10px">Latest log: ${latest.date}</div>`:`<div class="nt na" style="margin-bottom:12px">No body logs yet \u2014 add your weight (and BF if you have it).</div>`}
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Log date</div>
      <input class="sinput" type="date" id="st_date" max="${todayKey()}" value="${todayKey()}" style="width:150px;text-align:center"></div>
    ${[['Weight (kg)','wt','e.g. 71'],['Body fat (%)','bf','e.g. 20'],['Skeletal muscle (kg)','mm','optional'],['Body water (kg)','bw','optional']].map(([l,id,ph])=>`<div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">${l}</div><input class="sinput" type="number" inputmode="decimal" id="st_${id}" placeholder="${ph}" step="0.1" style="width:90px;text-align:center"></div>`).join('')}
    <button class="btn btn-amb" onclick="saveStats()">Save body stats</button>
    <div id="stconf" class="confbox">Stats saved &#x2713;</div>
  </div>`;

  html+=renderBodyStatsChart();

  html+=`<div class="card"><div class="cl">Body measurements &mdash; tape measure</div><div class="ct" style="margin-bottom:4px">Track love handles here</div>
    <div class="cs" style="margin-bottom:12px">Waist is your love handle metric. Measure weekly at same time.</div>
    ${latestM?`<div class="meas-grid">
      ${[['Waist',latestM.waist,'cm'],['Chest',latestM.chest,'cm'],['Left arm',latestM.lArm,'cm'],['Right arm',latestM.rArm,'cm']].filter(([,v])=>v).map(([l,v,u])=>`<div class="meas-stat"><div class="meas-val">${v}${u}</div><div class="meas-lbl">${l}</div></div>`).join('')}
    </div><div style="font-size:11px;color:var(--dim);margin-bottom:10px">Last: ${latestM.date}</div>`:''}
    ${[['Waist (cm)','mw','80'],['Chest (cm)','mc','100'],['Left arm (cm)','mla','35'],['Right arm (cm)','mra','35']].map(([l,id,ph])=>`<div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">${l}</div><input class="sinput" type="number" inputmode="decimal" id="${id}" placeholder="${ph}" step="0.5" style="width:90px;text-align:center"></div>`).join('')}
    <button class="btn btn-ghost" onclick="saveMeasurements()">Save measurements</button>
    <div id="mconf" class="confbox">Measurements saved &#x2713;</div>
  </div>`;

  const now=new Date();

  const muscleVol=Coach.getWeeklyMuscleVolume();
  html+=`<div class="card"><div class="cl">Weekly Sets Per Muscle</div><div class="ct" style="margin-bottom:4px">Last 7 days</div>
    <div class="cs" style="margin-bottom:10px">Primary work counts as a full set, secondary (incidental) work counts as half a set. Roughly 10\u201320 sets a week per muscle is the commonly-cited range for growth \u2014 not a hard rule, just a reference point.</div>
    ${muscleVol.length?muscleVol.map(m=>`
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--txt);margin-bottom:2px"><span>${m.muscle}</span><span style="color:var(--mut)">${m.volume} set${m.volume===1?'':'s'}</span></div>
        <div class="prog-bar"><div class="prog-fill" style="width:${Math.min(100,Math.round(m.volume/20*100))}%;background:${m.volume<8?'var(--amb)':'var(--cyan)'}"></div></div>
      </div>`).join(''):`<div class="cs">No sessions logged in the last 7 days yet.</div>`}
  </div>`;

  html+=`<div class="card"><div class="cl">Body Map</div><div class="ct" style="margin-bottom:8px">Tap a muscle</div>
    <div class="cs" style="margin-bottom:10px"><b style="color:var(--txt)">Volume</b> = what you've trained this week, looking back. <b style="color:var(--txt)">Freshness</b> = what's actually recovered and ready right now, looking forward \u2014 check this before picking today's session, not after.</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="btn ${_progressDiagMode==='volume'?'btn-grn':'btn-ghost'} btn-sm" style="flex:1" onclick="setProgressDiagMode('volume')">Volume</button>
      <button class="btn ${_progressDiagMode==='freshness'?'btn-grn':'btn-ghost'} btn-sm" style="flex:1" onclick="setProgressDiagMode('freshness')">Freshness</button>
    </div>
    <div class="cs" style="margin-bottom:10px">${_progressDiagMode==='freshness'
      ?'Deeper red means trained harder and more recently, relative to that muscle\u2019s own normal \u2014 fading toward grey as it recovers. Not a literal green light yet, the color scale available doesn\u2019t support that.'
      :'Brighter means more volume this week, relative to your busiest muscle.'}</div>
    <div style="display:flex;gap:12px;justify-content:center">
      <div id="bodydiag-front" style="width:45%"></div>
      <div id="bodydiag-back" style="width:45%"></div>
    </div>
    <div id="bodydiag-exlist">${renderProgressMuscleExList()}</div>
  </div>`;

  html+=renderLiftProgressCharts();

  const correlation=getFoodSymptomCorrelation();
  if(correlation.available){
    const diff=correlation.avgEnergyHighProteinDays-correlation.avgEnergyLowProteinDays;
    html+=`<div class="card"><div class="cl">Food &amp; how you felt</div>
      <div class="cs" style="margin-bottom:10px">Comparing your ${correlation.lowProteinDayCount} lower-protein days against your ${correlation.highProteinDayCount} higher-protein days, across ${correlation.sampleSize} days with both logged</div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span>Lower-protein days: avg energy <b>${correlation.avgEnergyLowProteinDays}/5</b></span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">
        <span>Higher-protein days: avg energy <b>${correlation.avgEnergyHighProteinDays}/5</b></span>
      </div>
      ${Math.abs(diff)>=0.5?`<div class="cs" style="margin-top:8px;color:var(--cyan)">${diff>0?'Higher-protein days ran meaningfully better on energy in your own logs.':'Lower-protein days actually ran better here \u2014 worth noticing, not what you\u2019d expect.'}</div>`:`<div class="cs" style="margin-top:8px">No real difference either way in your own data so far.</div>`}
    </div>`;
  }

  const expDays=lastExport?Math.floor((new Date()-new Date(lastExport))/86400000):null;
  const expCol=expDays===null?'var(--red)':expDays<=7?'var(--grn)':expDays<=14?'var(--amb)':'var(--red)';
  const expTxt=expDays===null?'&#x26A0; Never exported &mdash; data at risk':expDays===0?'&#x2713; Exported today':expDays<=7?'&#x2713; Last export: '+expDays+'d ago':'&#x26A0; Last export: '+expDays+'d ago &mdash; export now';
  const notPersisted=lsG('storage_persisted')===false;
  html+=`<div class="card"><div class="cl">Data backup</div><div class="ct" style="margin-bottom:4px">Export &amp; Import</div>
    <div class="cs" style="margin-bottom:10px">Export monthly and after every few sessions.</div>
    ${notPersisted?`<div class="nt na" style="margin-bottom:10px">&#x26A0; Your browser has not granted persistent storage \u2014 data could be cleared if your phone runs low on space. Export regularly, and consider installing this as an app (Add to Home Screen) to reduce that risk.</div>`:''}
    <div style="font-size:13px;color:${expCol};margin-bottom:10px;font-weight:600">${expTxt}</div>
    <button class="btn btn-grn btn-sm" style="width:100%;margin-bottom:8px" onclick="exportData()">Export all data (JSON)</button>
    <button class="btn btn-ghost btn-sm" style="width:100%;margin-bottom:8px" onclick="shareBackup()">Share backup (WhatsApp / Drive)</button>
    <button class="btn btn-ghost btn-sm" style="width:100%" onclick="document.getElementById('import-input').click()">Import from backup</button>
  </div>`;

  document.getElementById('p4').innerHTML=html;
  renderBodyDiagram();
}

function saveStats(){
  const date=(document.getElementById('st_date')?.value||todayKey());
  if(date>todayKey()){alert('Cannot log body stats in the future.');return;}
  const entry={date};
  ['wt','bf','mm','bw'].forEach(f=>{const v=document.getElementById('st_'+f)?.value;if(v!==''&&v!=null)entry[f]=parseFloat(v);});
  if(entry.wt==null&&entry.bf==null){alert('Enter at least weight or body fat.');return;}
  if(entry.wt!=null&&entry.bf!=null)entry.fm=Math.round(entry.wt*entry.bf/100*10)/10;
  if(entry.bw!=null)entry.bwUnit='kg';
  let all=lsG('bstats')||[];
  const idx=all.findIndex(s=>s.date===date);
  if(idx>=0)all[idx]={...all[idx],...entry};
  else all.push(entry);
  all.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  lsS('bstats',all.slice(-400));
  updateHeader();
  const c=document.getElementById('stconf');
  if(c){c.style.display='block';setTimeout(()=>{c.style.display='none';renderProgress();},1200);}
  else renderProgress();
}
function saveMeasurements(){
  const entry={date:todayKey()};
  const map={mw:'waist',mc:'chest',mla:'lArm',mra:'rArm'};
  Object.entries(map).forEach(([id,key])=>{const v=document.getElementById(id)?.value;if(v)entry[key]=parseFloat(v);});
  if(!entry.waist&&!entry.chest)return;
  const all=lsG('measurements')||[];all.push(entry);lsS('measurements',all.slice(-260));
  const c=document.getElementById('mconf');if(c){c.style.display='block';setTimeout(()=>{c.style.display='none';renderProgress();},2000);}
}

Object.assign(globalThis, {
  setProgressDiagMode, renderBodyDiagram, renderProgressMuscleExList, startFreeSessionTargeting,
  getLiftChartExercises, sessionAvgLoad, weekStartKey, weekBucketLabel, monthBucketLabel,
  getExAvgLoadHistory, dayBucketLabel, aggregateLiftHistory, buildLiftChartInner,
  refreshLiftChart, onLiftChartExChange, onLiftChartRangeChange, renderLiftProgressCharts,
  getBodyMetricHistory, buildBodyStatsChartInner, refreshBodyStatsChart,
  onBodyChartMetricChange, onBodyChartRangeChange, renderBodyStatsChart,
  renderProgress, saveStats, saveMeasurements,
});
