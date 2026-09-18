import '../core.js';

/* ===== CARDIO TAB (Strava + run logging) ===== */

/* ===== RUN + STRAVA METRICS ===== */
function parseStravaActivityId(url){
  const m=String(url||'').match(/strava\.com\/activities\/(\d+)/i);
  return m?m[1]:null;
}
function getStravaAuth(){return lsG('strava_auth')||null;}
function saveStravaAuth(a){lsS('strava_auth',a);}
function stravaRedirectUri(){
  return (location.origin+location.pathname).replace(/index\.html$/i,'').replace(/\/?$/,'/');
}
function stravaConnected(){
  const a=getStravaAuth();
  return !!(a&&a.accessToken&&a.refreshToken&&a.clientId&&a.clientSecret);
}
function saveStravaCredentials(){
  const clientId=(document.getElementById('strava-client-id')?.value||'').trim();
  const clientSecret=(document.getElementById('strava-client-secret')?.value||'').trim();
  if(!clientId||!clientSecret){alert('Enter both Client ID and Client Secret from Strava API settings.');return;}
  const prev=getStravaAuth()||{};
  saveStravaAuth({...prev,clientId,clientSecret});
  const c=document.getElementById('strava-conf');if(c){c.style.display='block';setTimeout(()=>c.style.display='none',1500);}
  renderToday();
}
function disconnectStrava(){
  if(!confirm('Disconnect Strava? Autofill from links will stop until you connect again.'))return;
  const a=getStravaAuth()||{};
  saveStravaAuth({clientId:a.clientId||'',clientSecret:a.clientSecret||''});
  renderToday();
}
function startStravaConnect(){
  const a=getStravaAuth();
  if(!a?.clientId||!a?.clientSecret){alert('Save your Strava Client ID and Client Secret first.');return;}
  const redirect=encodeURIComponent(stravaRedirectUri());
  const url=`https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(a.clientId)}&response_type=code&redirect_uri=${redirect}&approval_prompt=auto&scope=${encodeURIComponent('read,activity:read_all')}`;
  location.href=url;
}
async function exchangeStravaToken(body){
  const res=await fetch('https://www.strava.com/oauth/token',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.message||data?.error||('Token exchange failed ('+res.status+')'));
  return data;
}
async function ensureStravaAccessToken(){
  const a=getStravaAuth();
  if(!a?.clientId||!a?.clientSecret)throw new Error('Connect Strava below first (Client ID + Secret + Connect).');
  if(!a.refreshToken&&!a.accessToken)throw new Error('Connect Strava below first.');
  const skew=120000;
  if(a.accessToken&&a.expiresAt&&Date.now()<a.expiresAt-skew)return a.accessToken;
  if(!a.refreshToken)throw new Error('Strava session expired — reconnect below.');
  const data=await exchangeStravaToken({
    client_id:a.clientId,
    client_secret:a.clientSecret,
    grant_type:'refresh_token',
    refresh_token:a.refreshToken
  });
  saveStravaAuth({
    ...a,
    accessToken:data.access_token,
    refreshToken:data.refresh_token||a.refreshToken,
    expiresAt:Date.now()+(data.expires_in||21600)*1000,
    athleteId:data.athlete?.id||a.athleteId
  });
  return data.access_token;
}
async function handleStravaOAuthReturn(){
  const params=new URLSearchParams(location.search);
  const code=params.get('code');
  const err=params.get('error');
  if(!code&&!err)return;
  history.replaceState({},'',location.pathname+location.hash);
  if(err){alert('Strava connect was cancelled.');return;}
  const a=getStravaAuth();
  if(!a?.clientId||!a?.clientSecret){alert('Save Client ID and Secret in Progress, then Connect again.');return;}
  try{
    const data=await exchangeStravaToken({
      client_id:a.clientId,
      client_secret:a.clientSecret,
      code,
      grant_type:'authorization_code'
    });
    saveStravaAuth({
      ...a,
      accessToken:data.access_token,
      refreshToken:data.refresh_token,
      expiresAt:Date.now()+(data.expires_in||21600)*1000,
      athleteId:data.athlete?.id||null,
      connectedAt:new Date().toISOString()
    });
    alert('Strava connected. On your next Cardio day, paste an activity link to autofill.');
  }catch(e){
    alert('Strava connect failed: '+(e.message||e));
  }
}
function setRunStravaStatus(msg,tone){
  const el=document.getElementById('run-strava-status');if(!el)return;
  const col=tone==='ok'?'var(--grn)':tone==='err'?'var(--red)':'var(--mut)';
  el.innerHTML=msg?`<div style="font-size:12px;color:${col};margin-top:6px">${msg}</div>`:'';
}
function applyStravaActivityToForm(act){
  const km=Math.round((act.distance||0)/10)/100; /* m → km, 2dp */
  const mins=Math.round((act.moving_time||0)/6)/10; /* s → min, 1dp */
  const elevGain=Math.round(act.total_elevation_gain||0);
  const kmEl=document.getElementById('run-km');
  const minsEl=document.getElementById('run-mins');
  const paceEl=document.getElementById('run-pace');
  const gainEl=document.getElementById('run-elev-gain');
  const noteEl=document.getElementById('run-note');
  if(kmEl&&km>0)kmEl.value=String(km);
  if(minsEl&&mins>0)minsEl.value=String(mins);
  if(paceEl){
    delete paceEl.dataset.touched;
    const p=paceFromKmMins(km,mins);
    if(p)paceEl.value=String(p);
  }
  if(gainEl&&elevGain>0)gainEl.value=String(elevGain);
  if(noteEl&&!noteEl.value&&act.name)noteEl.value=act.name;
  updateRunCalPreview();
}
async function fetchAndFillFromStravaLink(force){
  const url=(document.getElementById('run-strava')?.value||'').trim();
  const id=parseStravaActivityId(url);
  if(!id){
    if(force)setRunStravaStatus('Paste a full Strava activity link (…/activities/12345).','err');
    return;
  }
  if(!stravaConnected()){
    setRunStravaStatus('Link saved for reference — connect Strava below to autofill stats.','err');
    return;
  }
  setRunStravaStatus('Fetching activity from Strava…','');
  try{
    const token=await ensureStravaAccessToken();
    const res=await fetch('https://www.strava.com/api/v3/activities/'+id,{
      headers:{Authorization:'Bearer '+token}
    });
    const act=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(act?.message||('Strava error '+res.status));
    applyStravaActivityToForm(act);
    const bits=[
      act.distance?((Math.round(act.distance/10)/100)+' km'):null,
      act.moving_time?(Math.round(act.moving_time/6)/10)+' min':null,
      act.total_elevation_gain!=null?('↑'+Math.round(act.total_elevation_gain)+'m'):null
    ].filter(Boolean).join(' · ');
    setRunStravaStatus('Autofilled from Strava'+(bits?': '+bits:'')+'. Elev loss isn\u2019t in Strava\u2019s summary — add it manually if you want.','ok');
  }catch(e){
    setRunStravaStatus('Couldn\u2019t autofill: '+(e.message||e)+'. Enter numbers manually.','err');
  }
}
let _stravaLinkTimer=null;
function onStravaLinkInput(){
  clearTimeout(_stravaLinkTimer);
  _stravaLinkTimer=setTimeout(()=>fetchAndFillFromStravaLink(false),600);
}
function getRun(dateKey){return lsG('run:'+(dateKey||activeDateKey()));}
function deleteRun(){
  if(!confirm('Delete this run log?'))return;
  lsDel('run:'+activeDateKey());
  renderToday();
}
/* ACSM running equation (gross):
   VO2 ml/kg/min = 0.2*S + 0.9*S*G + 3.5
   S = speed m/min, G = grade as decimal (elev gain / distance).
   kcal = VO2 * bodyMassKg / 1000 * 5 * minutes
   Body fat is not in ACSM directly — we use total body weight (standard). Lean mass is shown for context. */
function estimateRunCalories({km,mins,elevGainM,weightKg}){
  km=parseFloat(km)||0;mins=parseFloat(mins)||0;elevGainM=parseFloat(elevGainM)||0;weightKg=parseFloat(weightKg)||0;
  if(km<=0||mins<=0||weightKg<=0)return{available:false,reason:!weightKg?'Log your body weight in Progress or Profile first':'Need distance, moving time, and body weight'};
  const distM=km*1000;
  const speedMPerMin=distM/mins; /* m/min */
  const grade=Math.max(0,elevGainM)/distM; /* fractional; downhill not modelled by ACSM */
  const vo2=0.2*speedMPerMin+0.9*speedMPerMin*grade+3.5;
  const kcalPerMin=vo2*weightKg/1000*5;
  const gross=Math.round(kcalPerMin*mins);
  const net=Math.round(Math.max(0,(vo2-3.5)*weightKg/1000*5*mins));
  const ruleOfThumb=Math.round(km*weightKg*1.036); /* ~1 kcal/kg/km common heuristic */
  return{
    available:true,
    grossKcal:gross,
    netKcal:net,
    ruleOfThumbKcal:ruleOfThumb,
    vo2:Math.round(vo2*10)/10,
    speedKmH:Math.round((km/(mins/60))*100)/100,
    gradePct:Math.round(grade*1000)/10,
    formula:'ACSM running VO\u2082'
  };
}
function paceFromKmMins(km,mins){
  km=parseFloat(km);mins=parseFloat(mins);
  if(!(km>0&&mins>0))return null;
  return Math.round((mins/km)*100)/100;
}
function fmtPace(minPerKm){
  if(minPerKm==null||!(minPerKm>0))return'\u2014';
  const m=Math.floor(minPerKm);
  const s=Math.round((minPerKm-m)*60);
  return m+':'+String(s).padStart(2,'0')+'/km';
}
function readRunFormFields(){
  const km=parseFloat(document.getElementById('run-km')?.value);
  const mins=parseFloat(document.getElementById('run-mins')?.value);
  let pace=parseFloat(document.getElementById('run-pace')?.value);
  const elevGain=parseFloat(document.getElementById('run-elev-gain')?.value);
  const elevLoss=parseFloat(document.getElementById('run-elev-loss')?.value);
  const url=(document.getElementById('run-strava')?.value||'').trim();
  const note=(document.getElementById('run-note')?.value||'').trim();
  if(!(pace>0)&&km>0&&mins>0)pace=paceFromKmMins(km,mins);
  return{km,mins,pace,elevGain,elevLoss,url,note};
}
function updateRunCalPreview(){
  const f=readRunFormFields();
  const body=getBodyForCalcs();
  const est=estimateRunCalories({km:f.km,mins:f.mins,elevGainM:f.elevGain,weightKg:body.weightKg});
  const paceEl=document.getElementById('run-pace');
  if(paceEl&&!(parseFloat(paceEl.value)>0)&&f.km>0&&f.mins>0){
    /* don't fight manual pace edits — only autofill when empty */
  }
  if(paceEl&&!paceEl.dataset.touched&&f.km>0&&f.mins>0){
    paceEl.value=String(paceFromKmMins(f.km,f.mins));
  }
  const el=document.getElementById('run-cal-preview');if(!el)return;
  if(!est.available){
    el.innerHTML=`<div style="font-size:12px;color:var(--dim)">${!body.available?'Log body weight in Progress/Profile to estimate calories':'Enter distance + moving time to estimate calories'} · ${body.available?`${body.weightKg}kg (${body.bodyFatPct!=null?body.bodyFatPct+'% BF':'\u2014'} BF)`:'no weight yet'} · ${body.source}</div>`;
    return;
  }
  el.innerHTML=`<div style="font-size:13px;color:var(--txt);line-height:1.5">
      <b style="color:var(--cyan)">${est.grossKcal} kcal</b> estimated (ACSM) · net ~${est.netKcal} kcal above rest<br>
      <span style="color:var(--mut);font-size:11px">${body.weightKg}kg · ${body.bodyFatPct!=null?body.bodyFatPct+'% BF':'BF n/a'} · ${est.speedKmH} km/h · grade ~${est.gradePct}% from elev gain · ${body.source}</span>
    </div>`;
}
function onRunPaceTouched(){
  const el=document.getElementById('run-pace');if(el)el.dataset.touched='1';
  updateRunCalPreview();
}
function buildRunFromForm(){
  const f=readRunFormFields();
  if(!f.km&&!f.mins&&!f.url)return{error:'Enter distance, moving time, or a Strava link.'};
  const body=getBodyForCalcs();
  const pace=f.pace||paceFromKmMins(f.km,f.mins);
  const est=estimateRunCalories({km:f.km,mins:f.mins,elevGainM:f.elevGain,weightKg:body.weightKg});
  const dk=activeDateKey();
  return{run:{
    date:dk,
    km:f.km||null,
    mins:f.mins||null,
    movingTimeMin:f.mins||null,
    paceMinPerKm:pace||null,
    elevGainM:f.elevGain||0,
    elevLossM:f.elevLoss||0,
    elevNetM:(f.elevGain||0)-(f.elevLoss||0),
    calories:est.available?est.grossKcal:null,
    caloriesNet:est.available?est.netKcal:null,
    caloriesMeta:est.available?{formula:est.formula,vo2:est.vo2,speedKmH:est.speedKmH,gradePct:est.gradePct,weightKg:body.weightKg,bodyFatPct:body.bodyFatPct,leanMassKg:body.leanMassKg}:null,
    stravaUrl:f.url||null,
    stravaId:parseStravaActivityId(f.url),
    note:f.note||null,
    savedAt:new Date().toISOString()
  }};
}
function saveRunLog(){
  const built=buildRunFromForm();
  if(built.error){alert(built.error);return;}
  lsS('run:'+activeDateKey(),built.run);
  const conf=document.getElementById('run-conf');
  if(conf){conf.style.display='block';setTimeout(()=>{conf.style.display='none';},2000);}
  renderToday();
}
function saveCardioDay(seqIdx){
  const built=buildRunFromForm();
  if(built.error){alert(built.error);return;}
  const run=built.run;
  const dk=activeDateKey();
  lsS('run:'+dk,run);
  const dl='Cardio + core';
  const duration=run.mins!=null?Math.round(run.mins):null;
  const summary=[
    run.km!=null?run.km+' km':null,
    run.mins!=null?run.mins+' min':null,
    run.paceMinPerKm!=null?fmtPace(run.paceMinPerKm):null,
    run.calories!=null?run.calories+' kcal':null
  ].filter(Boolean).join(' · ');
  const exercises=[{
    name:'Outdoor run / Strava',
    origName:'Steady cardio',
    best:run.mins!=null?{w:String(run.mins),r:''}:null,
    sets:[{w:String(run.mins||''),r:'',done:true,isDrop:false}],
    suggestion:summary||'Strava cardio logged',
    isPR:false,
    inputType:'seconds',
    exVolume:parseFloat(run.mins)||0
  }];
  const noteEl=document.getElementById('run-session-note');
  const sessionNote=(noteEl?.value||run.note||'').trim();
  const session={date:dk,dl,seqIdx:seqIdx===undefined||seqIdx===null?3:seqIdx,exercises,note:sessionNote,painNote:'',skipped:false,duration,newPRs:[],totalVolume:exercises[0].exVolume,cardio:true};
  Data.session.set(session,dk);
  Data.session.setLast(dl,{date:dk,exercises});
  if(isLoggingToday())lsS('last_seq_idx',session.seqIdx);
  lsS('last_dl',dl);
  const mk=monthKeyFor(dk);
  const mlog=lsG('mlog:'+mk)||{};
  mlog[dk]={type:'done',dl,seqIdx:session.seqIdx};
  lsS('mlog:'+mk,mlog);
  clearDraft();showStickyBtn(false);stopTimerTick();
  adHocDay=null;adHocSeqIdx=null;
  renderToday();
  const toast=document.getElementById('save-toast');
  if(toast){
    const when=isLoggingToday()?'':' for '+fmtLogDateLabel(dk);
    toast.innerHTML='&#x2713; Cardio day saved'+when+(duration?' ('+duration+' min)':'')+(run.calories!=null?' · '+run.calories+' kcal':'')+'.';
    toast.style.display='block';
    setTimeout(()=>{toast.style.display='none';},3000);
  }
}
function openStrava(){
  window.open('https://www.strava.com/athlete/training','_blank','noopener');
}
function renderStravaConnectBlock(){
  const sAuth=getStravaAuth()||{};
  const sOk=stravaConnected();
  return `<div class="card" style="margin-bottom:10px">
    <div class="cl">Strava connect</div>
    <div class="ct" style="margin-bottom:4px">${sOk?'Connected \u2014 one-time setup done':'One-time setup for link autofill'}</div>
    <div class="cs" style="margin-bottom:10px">Connect once. After that, paste an activity link and distance, moving time, pace, and elev gain fill in. Credentials stay on this device.</div>
    <div class="cs" style="margin-bottom:10px">1. Open <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener" style="color:var(--cyan)">strava.com/settings/api</a><br>
      2. Create an app (any name)<br>
      3. Set <b style="color:var(--txt)">Authorization Callback Domain</b> to <code style="color:var(--cyan)">${escHtml(location.hostname||'your-github-pages-host')}</code><br>
      4. Paste Client ID + Client Secret, Save, then Connect</div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:120px;font-weight:500">Client ID</div>
      <input class="sinput" id="strava-client-id" type="text" inputmode="numeric" value="${escHtml(sAuth.clientId||'')}" style="width:140px;flex:1"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:120px;font-weight:500">Client Secret</div>
      <input class="sinput" id="strava-client-secret" type="password" value="${escHtml(sAuth.clientSecret||'')}" style="width:140px;flex:1" autocomplete="off"></div>
    <div style="font-size:12px;color:${sOk?'var(--grn)':'var(--amb)'};margin:8px 0 10px;font-weight:600">${sOk?'&#x2713; Connected':'Not connected yet'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-amb btn-sm" style="flex:1" onclick="saveStravaCredentials()">Save credentials</button>
      <button class="btn btn-grn btn-sm" style="flex:1" onclick="startStravaConnect()">${sOk?'Reconnect':'Connect Strava'}</button>
    </div>
    ${sOk?`<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;color:var(--red)" onclick="disconnectStrava()">Disconnect</button>`:''}
    <div style="font-size:11px;color:var(--dim);margin-top:8px">Redirect URI: ${escHtml(stravaRedirectUri())}</div>
    <div id="strava-conf" class="confbox">Credentials saved &#x2713;</div>
  </div>`;
}
function renderRecentRunsBlock(){
  const now=new Date();
  const recentRuns=[];
  for(let d=0;d<14;d++){
    const dt=new Date(now);dt.setDate(dt.getDate()-d);
    const rk=formatDateKey(dt);const r=getRun(rk);if(r)recentRuns.push(r);
  }
  if(!recentRuns.length)return`<div class="card" style="margin-bottom:10px"><div class="cl">Recent runs</div><div class="cs">No runs logged in the last 14 days yet.</div></div>`;
  return `<div class="card" style="margin-bottom:10px"><div class="cl">Recent runs</div><div class="ct" style="margin-bottom:10px">Last 14 days</div>
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
function renderRunSummaryCard(run){
  if(!run)return'';
  const bits=[
    run.km!=null?`${run.km} km`:null,
    run.mins!=null?`${run.mins} min moving`:null,
    run.paceMinPerKm!=null?fmtPace(run.paceMinPerKm):null,
    run.calories!=null?`${run.calories} kcal`:null
  ].filter(Boolean).join(' · ');
  const elev=[
    run.elevGainM?`+${run.elevGainM}m`:null,
    run.elevLossM?`\u2212${run.elevLossM}m`:null
  ].filter(Boolean).join(' / ');
  return `<div class="card success" style="margin-bottom:10px">
    <div class="cl">Run metrics</div>
    <div class="ct" style="color:var(--grn);margin-bottom:4px">${bits||'Run'}</div>
    ${elev?`<div style="font-size:13px;color:var(--mut);margin-bottom:6px">Elevation ${elev}${run.elevNetM!=null?` · net ${run.elevNetM>0?'+':''}${run.elevNetM}m`:''}</div>`:''}
    ${run.caloriesMeta?`<div style="font-size:11px;color:var(--dim);margin-bottom:6px">${run.caloriesMeta.formula} · ${run.caloriesMeta.weightKg}kg${run.caloriesMeta.bodyFatPct!=null?' @ '+run.caloriesMeta.bodyFatPct+'% BF':''}</div>`:''}
    ${run.stravaUrl?`<a href="${escHtml(run.stravaUrl)}" target="_blank" rel="noopener" style="font-size:13px;color:var(--cyan);font-weight:600">Open on Strava &#x2197;</a>`:''}
    ${run.note?`<div style="font-size:12px;color:var(--mut);margin-top:8px;font-style:italic">"${escHtml(run.note)}"</div>`:''}
  </div>`;
}
function renderCardioDaySection(gd,seqIdx){
  const dk=activeDateKey();
  const run=getRun(dk);
  const body=getBodyForCalcs();
  const hasDraft=!!lsG('ws_draft:'+dk);
  let html=`<div class="card" style="margin-bottom:10px;border-color:var(--cbr)">
      <div class="sess-hd">
        <div><div class="cl">${gd.time}${hasDraft?' &middot; <span style="color:var(--cyan)">In progress</span>':''}</div>
          <div class="ct">${gd.label}</div><div class="cs">${gd.focus}</div>
          <button style="font-size:12px;color:var(--mut);background:none;border:none;cursor:pointer;padding:4px 0;font-family:inherit" onclick="startSession(-1)">&#x21C4; Change session</button>
        </div>
        <div style="text-align:right;font-size:11px;color:var(--mut);font-weight:600;max-width:120px">Strava / outdoor run</div>
      </div>
    </div>`;
  html+=`<div class="card cyan" style="margin-bottom:10px">
    <div class="cl">How it works</div>
    <div style="font-size:13px;color:var(--txt);line-height:1.55;margin-top:4px">
      1. Connect Strava once (below)<br>
      2. Finish your run on Strava / Xiaomi<br>
      3. Paste the activity link \u2014 distance, moving time, pace, elev gain autofill<br>
      4. Calories are estimated from your weight + body fat (ACSM)<br>
      5. Tap <b>Log cardio day</b> to save and advance the sequence
    </div>
  </div>`;
  html+=renderStravaConnectBlock();
  html+=`<div class="card" id="run-card" style="margin-bottom:10px">
    <div class="cl">Today\u2019s run</div>
    <div class="ct" style="margin-bottom:4px">${fmtLogDateLabel(dk)}</div>
    <div class="cs" style="margin-bottom:12px">${body.available?`Using ${body.weightKg}kg · ${body.bodyFatPct!=null?body.bodyFatPct+'% BF':'BF n/a'} (${body.source}) for calorie estimate.`:'No body weight logged yet \u2014 add it in Progress or Profile so calories can be estimated.'}</div>
    ${!stravaConnected()?`<div class="nt na" style="margin-bottom:12px">Connect Strava above once, then paste a link to autofill.</div>`:`<div class="nt ni" style="margin-bottom:12px">Strava connected. Paste a link and stats fill in automatically.</div>`}
    ${renderRunForm(run)}
    <div class="statrow" style="margin-top:8px"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Session note</div>
      <input class="sinput" id="run-session-note" type="text" placeholder="felt easy / windy / hills..." value="${escHtml(run?.note||'')}" style="width:160px;flex:1"></div>
    <button class="btn btn-amb" style="width:100%;margin-top:14px" onclick="saveCardioDay(${seqIdx===undefined||seqIdx===null?3:seqIdx})">Log cardio day</button>
  </div>`;
  html+=renderRecentRunsBlock();
  html+=`<button class="btn btn-ghost" onclick="document.getElementById('skipsheet').style.display='block'" style="margin-top:6px">Skip today</button>
    <div class="skipsheet" id="skipsheet">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--mut)">Why skipping?</div>
      <button class="skipopt" onclick="skipSession('sick')">Sick / injured</button>
      <button class="skipopt" onclick="skipSession('tired')">Too tired</button>
      <button class="skipopt" onclick="skipSession('busy')">Too busy</button>
      <button class="skipopt" style="color:var(--mut);font-weight:500" onclick="document.getElementById('skipsheet').style.display='none'">Cancel</button>
    </div>`;
  return html;
}
function renderRunForm(run){
  run=run||{};
  return `<div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Distance (km)</div>
      <input class="sinput" id="run-km" type="number" inputmode="decimal" step="0.01" placeholder="5.20" value="${run.km??''}" style="width:110px" oninput="updateRunCalPreview()"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Moving time (min)</div>
      <input class="sinput" id="run-mins" type="number" inputmode="decimal" step="0.1" placeholder="28.5" value="${run.mins??run.movingTimeMin??''}" style="width:110px" oninput="updateRunCalPreview()"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Avg pace (decimal min/km)</div>
      <input class="sinput" id="run-pace" type="number" inputmode="decimal" step="0.01" placeholder="5.5 = 5:30" value="${run.paceMinPerKm??''}" style="width:110px" oninput="onRunPaceTouched()"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Elev gain (m)</div>
      <input class="sinput" id="run-elev-gain" type="number" inputmode="decimal" step="1" placeholder="45" value="${run.elevGainM??''}" style="width:110px" oninput="updateRunCalPreview()"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Elev loss (m)</div>
      <input class="sinput" id="run-elev-loss" type="number" inputmode="decimal" step="1" placeholder="40" value="${run.elevLossM??''}" style="width:110px" oninput="updateRunCalPreview()"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Strava link</div>
      <input class="sinput" id="run-strava" type="url" placeholder="https://www.strava.com/activities/..." value="${escHtml(run.stravaUrl||'')}" style="width:160px;flex:1" oninput="onStravaLinkInput()" onchange="fetchAndFillFromStravaLink(true)"></div>
    <div id="run-strava-status"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Run note</div>
      <input class="sinput" id="run-note" type="text" placeholder="easy / intervals..." value="${escHtml(run.note||'')}" style="width:160px;flex:1"></div>
    <div id="run-cal-preview" style="margin:10px 0;padding:10px 12px;background:var(--c2);border-radius:10px;border:1px solid var(--c3)"></div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="fetchAndFillFromStravaLink(true)">Fetch Strava</button>
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openStrava()">Open Strava</button>
    </div>
    <div id="run-conf" class="confbox">Run saved &#x2713;</div>`;
}

function findCardioDay(){const gd=DAYS.find(d=>d.label&&d.label.toLowerCase().includes('cardio'));return gd||{label:'Cardio + core',focus:'Cardio & core',time:''};}
function renderCardioTab(){document.getElementById('p1').innerHTML=renderCardioDaySection(findCardioDay(),SEQ.indexOf(findCardioDay()?.label)||3);}

Object.assign(globalThis, {
  parseStravaActivityId, getStravaAuth, saveStravaAuth, stravaRedirectUri, stravaConnected,
  saveStravaCredentials, disconnectStrava, startStravaConnect,
  exchangeStravaToken, ensureStravaAccessToken, handleStravaOAuthReturn,
  setRunStravaStatus, applyStravaActivityToForm, fetchAndFillFromStravaLink, onStravaLinkInput,
  getRun, deleteRun, estimateRunCalories, paceFromKmMins, fmtPace,
  readRunFormFields, updateRunCalPreview, onRunPaceTouched, buildRunFromForm,
  saveRunLog, saveCardioDay, openStrava,
  renderStravaConnectBlock, renderRecentRunsBlock, renderRunSummaryCard,
  renderCardioDaySection, renderRunForm,
  findCardioDay, renderCardioTab,
});
