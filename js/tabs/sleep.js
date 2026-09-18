import '../core.js';

/* ===== SLEEP TAB (save/delete + tab render + charts) ===== */

/* ===== SLEEP LOG (quick check) ===== */
function saveSleep(){
  const dk=activeDateKey();
  const hrs=document.getElementById('sleep-hours')?.value;
  const score=document.getElementById('sleep-score')?.value;
  const eff=document.getElementById('sleep-eff')?.value;
  const entry={date:dk};
  if(hrs!==''&&hrs!=null)entry.hours=parseFloat(hrs);
  if(score!==''&&score!=null)entry.score=parseFloat(score);
  if(eff!==''&&eff!=null)entry.eff=parseFloat(eff);
  if(entry.hours==null&&entry.score==null&&entry.eff==null){alert('Enter at least one sleep value.');return;}
  lsS('sleep:'+dk,entry);
  const c=document.getElementById('sleep-conf');if(c){c.style.display='block';setTimeout(()=>c.style.display='none',1200);}
  renderToday();
}
function deleteSleep(){
  const dk=activeDateKey();
  if(!confirm('Delete sleep entry for '+dk+'?'))return;
  lsDel('sleep:'+dk);
  renderToday();
}

/* ===== SLEEP TAB ===== */
let _sleepChartState={hours:'week',score:'week',eff:'week'};
function getSleepMetricHistory(metric){
  const results=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('sleep:'))continue;
    const s=lsG(k);
    if(!s)continue;
    const v = metric==='hours'?s.hours:(metric==='score'?s.score:s.eff);
    if(v!=null&&!Number.isNaN(parseFloat(v)))results.push({date:s.date,avg:parseFloat(v)});
  }
  return results.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}

function buildSleepChartInner(metric){
  const range=_sleepChartState[metric]||'week';
  const hist=getSleepMetricHistory(metric);
  const unit = metric==='hours'?'h':(metric==='eff'?'%':'score');
  const label = metric==='hours'?'Sleep hours':(metric==='eff'?'Sleep efficiency':'Sleep score');
  const asHist=hist.map(h=>({date:h.date,avg:h.avg,unit,metric:label,isPR:false}));
  const agg=aggregateLiftHistory(asHist,range);
  if(agg.points.length<2){
    return `<div style="color:var(--dim);font-size:13px;padding:20px;text-align:center">${hist.length?`Need at least 2 ${range==='month'?'months':(range==='day'?'days':'weeks')} of ${label.toLowerCase()} logs`:`Log ${label.toLowerCase()} at least twice to see a trend`}</div>
      <div class="lift-chart-meta">${hist.length} log${hist.length===1?'':'s'} · ${range} view</div>`;
  }
  const last=agg.points[agg.points.length-1], first=agg.points[0];
  const delta=Math.round((last.y-first.y)*10)/10;
  return `<div class="chart-wrap"><div class="chart-label">${label} (${unit})</div>${buildSVG(agg.points,'var(--cyan)',unit)}</div>
    <div class="lift-chart-meta">Latest ${last.y}${unit} · change ${delta>0?'+':''}${delta}${unit} · ${hist.length} logs · by ${range}</div>`;
}

function refreshSleepChart(metric){
  const el=document.getElementById('sleep-chart-'+metric); if(!el) return;
  el.innerHTML=buildSleepChartInner(metric);
}
function onSleepChartRangeChange(metric,v){ _sleepChartState[metric]=v; refreshSleepChart(metric); }

function renderSleepTab(){
  const dk=activeDateKey();
  const s=lsG('sleep:'+dk)||{};
  let html=`<div class="card"><div class="cl">Sleep</div><div class="ct" style="margin-bottom:8px">Log sleep for ${dk}</div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input class="sinput" id="sleep-tab-hours" placeholder="Hours" value="${s.hours??''}" style="width:120px">
      <input class="sinput" id="sleep-tab-score" placeholder="Score" value="${s.score??''}" style="width:120px">
      <input class="sinput" id="sleep-tab-eff" placeholder="Efficiency %" value="${s.eff??''}" style="width:120px">
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-amb" onclick="lsS('sleep:'+activeDateKey(),{date:activeDateKey(),hours:parseFloat(document.getElementById('sleep-tab-hours')?.value||'')||null,score:parseFloat(document.getElementById('sleep-tab-score')?.value||'')||null,eff:parseFloat(document.getElementById('sleep-tab-eff')?.value||'')||null});renderSleepTab();">Save</button>
      <button class="btn btn-ghost" onclick="lsDel('sleep:'+activeDateKey());renderSleepTab();">Delete</button>
    </div>
  </div>
  <div class="card"><div class="cl">Sleep charts</div><div class="ct" style="margin-bottom:8px">Select range to view</div>`;
  const metrics=['hours','score','eff'];
  metrics.forEach(m=>{
    html+=`<div style="margin-bottom:12px">
      <div class="lift-chart-row"><select class="foodsel" onchange="onSleepChartRangeChange('${m}',this.value)"><option value="day"${_sleepChartState[m]==='day'?' selected':''}>By day</option><option value="week"${_sleepChartState[m]==='week'?' selected':''}>By week</option><option value="month"${_sleepChartState[m]==='month'?' selected':''}>By month</option></select></div>
      <div id="sleep-chart-${m}">${buildSleepChartInner(m)}</div>
    </div>`;
  });
  html+='</div>';
  document.getElementById('p3').innerHTML=html;
}

Object.assign(globalThis, {
  saveSleep, deleteSleep,
  getSleepMetricHistory, buildSleepChartInner, refreshSleepChart, onSleepChartRangeChange,
  renderSleepTab,
});
