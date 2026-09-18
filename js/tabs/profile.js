import '../core.js';

/* ===== PROFILE TAB ===== */
let _profileBodyCharts={wt:'week',bf:'week'};

function rangeBucketWord(range){
  return range==='month'?'months':(range==='day'?'days':'weeks');
}
function buildProfileBodyChartInner(metric){
  const range=_profileBodyCharts[metric]||'week';
  const hist=getBodyMetricHistory(metric);
  const unit=metric==='bf'?'%':'kg';
  const label=metric==='bf'?'Body fat':'Weight';
  const asHist=hist.map(h=>({date:h.date,avg:h.avg,unit,metric:label,isPR:false}));
  const agg=aggregateLiftHistory(asHist,range);
  const need=2;
  if(agg.points.length<need){
    return`<div style="color:var(--dim);font-size:13px;padding:20px;text-align:center">${hist.length?`Need at least 2 ${rangeBucketWord(range)} of ${label.toLowerCase()} logs`:`Log ${label.toLowerCase()} at least twice to see a trend`}</div>
      <div class="lift-chart-meta">${hist.length} log${hist.length===1?'':'s'} · ${range} view</div>`;
  }
  const last=agg.points[agg.points.length-1],first=agg.points[0];
  const delta=Math.round((last.y-first.y)*10)/10;
  return`<div class="chart-wrap"><div class="chart-label">${label} (${unit})</div>${buildSVG(agg.points,metric==='bf'?'var(--amb)':'var(--cyan)',unit)}</div>
    <div class="lift-chart-meta">Latest ${last.y}${unit} · change ${delta>0?'+':''}${delta}${unit} · ${hist.length} logs · by ${range}</div>`;
}
function refreshProfileBodyChart(metric){
  const el=document.getElementById('profile-chart-'+metric);if(!el)return;
  el.innerHTML=buildProfileBodyChartInner(metric);
}
function onProfileBodyRangeChange(metric,range){
  _profileBodyCharts[metric]=range;
  refreshProfileBodyChart(metric);
}
function renderProfileBodyCharts(){
  return['wt','bf'].map(metric=>{
    const title=metric==='bf'?'Body fat trend':'Weight trend';
    const unit=metric==='bf'?'%':'kg';
    const st=_profileBodyCharts[metric]||'week';
    return`<div class="card" style="margin-bottom:12px">
      <div class="cl">${title}</div>
      <div class="ct" style="margin-bottom:8px">${metric==='bf'?'Body fat % over time':'Weight in kg over time'}</div>
      <div class="lift-chart-row">
        <select class="foodsel" aria-label="${title} time range" onchange="onProfileBodyRangeChange('${metric}',this.value)">
          <option value="day"${st==='day'?' selected':''}>By day</option>
          <option value="week"${st==='week'?' selected':''}>By week</option>
          <option value="month"${st==='month'?' selected':''}>By month</option>
        </select>
      </div>
      <div id="profile-chart-${metric}">${buildProfileBodyChartInner(metric)}</div>
      <div class="cs" style="margin-top:8px">Vertical = ${unit} · Horizontal = day / week / month</div>
    </div>`;
  }).join('');
}
function saveProfileBodyStats(){
  const date=(document.getElementById('pb_date')?.value||todayKey());
  if(date>todayKey()){alert('Cannot log body stats in the future.');return;}
  const entry={date};
  const wt=document.getElementById('pb_wt')?.value;
  const bf=document.getElementById('pb_bf')?.value;
  if(wt!==''&&wt!=null)entry.wt=parseFloat(wt);
  if(bf!==''&&bf!=null)entry.bf=parseFloat(bf);
  if(entry.wt==null&&entry.bf==null){alert('Enter at least weight or body fat.');return;}
  if(entry.wt!=null&&entry.bf!=null)entry.fm=Math.round(entry.wt*entry.bf/100*10)/10;
  let all=lsG('bstats')||[];
  const idx=all.findIndex(s=>s.date===date);
  if(idx>=0)all[idx]={...all[idx],...entry};
  else all.push(entry);
  all.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  lsS('bstats',all.slice(-400));
  const c=document.getElementById('pb-conf');
  if(c){c.style.display='block';setTimeout(()=>c.style.display='none',1200);}
  updateHeader();
  renderProfile();
}
function renderProfile(){
  const prof=getProfile();
  const t=prof.targets||{};
  const body=getBodyForCalcs();
  let html='';

  html+=`<div class="card" style="margin-bottom:12px">
    <div class="cl">Your bio</div>
    <div class="ct" style="margin-bottom:4px">Personal profile</div>
    <div class="cs" style="margin-bottom:12px">Update weight and body fat any day. Height and goals stay here; nothing is locked forever.</div>
    ${body.available?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
      <div style="background:var(--c2);border:1px solid var(--c3);border-radius:12px;padding:10px;text-align:center;flex:1;min-width:70px"><div style="font-size:18px;font-weight:800;font-family:'Barlow',sans-serif;color:var(--cyan)">${body.weightKg}kg</div><div style="font-size:10px;color:var(--mut);margin-top:2px;font-weight:600">Latest weight</div></div>
      <div style="background:var(--c2);border:1px solid var(--c3);border-radius:12px;padding:10px;text-align:center;flex:1;min-width:70px"><div style="font-size:18px;font-weight:800;font-family:'Barlow',sans-serif;color:var(--cyan)">${body.bodyFatPct!=null?body.bodyFatPct+'%':'—'}</div><div style="font-size:10px;color:var(--mut);margin-top:2px;font-weight:600">Latest BF</div></div>
    </div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:10px">From ${escHtml(body.source)}</div>`:`<div class="nt na" style="margin-bottom:12px">No weight logged yet \u2014 add it below.</div>`}
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Log date</div>
      <input class="sinput" type="date" id="pb_date" max="${todayKey()}" value="${todayKey()}" style="width:150px;text-align:center"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Weight (kg)</div>
      <input class="sinput" type="number" inputmode="decimal" id="pb_wt" step="0.1" placeholder="e.g. 71" style="width:90px;text-align:center"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Body fat (%)</div>
      <input class="sinput" type="number" inputmode="decimal" id="pb_bf" step="0.1" placeholder="e.g. 20" style="width:90px;text-align:center"></div>
    <button class="btn btn-amb btn-sm" style="width:100%;margin-top:4px" onclick="saveProfileBodyStats()">Save weight / BF</button>
    <div id="pb-conf" class="confbox">Body stats saved &#x2713;</div>
    <div class="sep"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Height (cm)</div>
      <input class="sinput" type="number" inputmode="decimal" id="bio-height" step="0.1" value="${prof.heightCm??''}" placeholder="175" style="width:90px;text-align:center"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Goal weight (kg)</div>
      <input class="sinput" type="number" inputmode="decimal" id="bio-goal-wt" step="0.1" value="${prof.goalWeight??''}" placeholder="70" style="width:90px;text-align:center"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Goal body fat (%)</div>
      <input class="sinput" type="number" inputmode="decimal" id="bio-goal-bf" step="0.1" value="${prof.goalBF??''}" placeholder="14" style="width:90px;text-align:center"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:140px;font-weight:500">Training days / week</div>
      <input class="sinput" type="number" inputmode="numeric" id="bio-days" step="1" min="1" max="7" value="${prof.trainingDaysPerWeek??4}" style="width:90px;text-align:center"></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-grn btn-sm" style="flex:1" onclick="saveBioProfile()">Save bio</button>
      <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--red);border-color:var(--rbr)" onclick="deleteProfile()">Delete profile</button>
    </div>
    <div id="bio-conf" class="confbox">Bio saved &#x2713;</div>
    ${body.available?`<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" style="width:100%;color:var(--red);border-color:var(--rbr)" onclick="deleteLatestBodyLog()">Delete latest body log</button></div>`:''}
  </div>`;

  html+=renderProfileBodyCharts();

  html+=`<div class="card" style="margin-bottom:12px">
    <div class="cl">Daily targets</div>
    <div class="ct" style="margin-bottom:8px">Used on the Food tab</div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Protein (g)</div><input class="sinput" type="number" id="prof-protein" value="${t.protein||140}" style="width:80px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Kcal</div><input class="sinput" type="number" id="prof-kcal" value="${t.kcal||2200}" style="width:80px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Carbs (g)</div><input class="sinput" type="number" id="prof-carbs" value="${t.carbs||220}" style="width:80px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Fat (g)</div><input class="sinput" type="number" id="prof-fat" value="${t.fat||65}" style="width:80px"></div>
    <button class="btn btn-grn btn-sm" style="width:100%;margin-top:10px" onclick="saveTargets()">Save targets</button>
  </div>`;

  document.getElementById('p2').innerHTML=html;
}

Object.assign(globalThis, {
  rangeBucketWord, buildProfileBodyChartInner, refreshProfileBodyChart,
  onProfileBodyRangeChange, renderProfileBodyCharts, saveProfileBodyStats,
  renderProfile,
});
