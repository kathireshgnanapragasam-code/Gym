/* Entrypoint — loads core (data + shared helpers + Coach + body diagram) plus every
   tab module. Each tab module puts its handlers on globalThis so inline onclick=
   handlers in generated HTML can reach them; nothing here has to enumerate them. */
import './core.js';
import './tabs/today.js';
import './tabs/cardio.js';
import './tabs/new.js';
import './tabs/sleep.js';
import './tabs/progress.js';
import './tabs/profile.js';
import './tabs/food.js';
import './tabs/history.js';

/* ===== TAB SWITCHING ===== */
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const t=parseInt(btn.dataset.t);
    document.querySelectorAll('.pnl').forEach((p,i)=>p.classList.toggle('on',i===t));
    stopTimerTick();
    if(t===0){renderToday();}else{showStickyBtn(false);}
    if(t===1)renderCardioTab();
    if(t===2)renderNewTab();
    if(t===3)renderSleepTab();
    if(t===4)renderProgress();
    if(t===5)renderProfile();
    if(t===6)renderFood();
    if(t===7)renderHistory();
  });
});

/* Delegate clicks on history recent-session dates (elements with class "date-link") */
try{
  const p4 = document.getElementById('p4');
  if(p4 && p4.addEventListener){
    p4.addEventListener('click', function(e){
      const target = e.target.closest ? e.target.closest('.date-link') : null;
      if(!target) return;
      const date = target.dataset && target.dataset.date;
      if(!date) return;
      setLogDate(date);
      const tab0 = document.querySelector('.tab[data-t=\"0\"]');
      if(tab0 && tab0.click) tab0.click();
    });
  }
}catch(e){}

/* ===== INIT ===== */
runMigration();
handleStravaOAuthReturn();
(()=>{const bw=lsG('bar_weights')||{};if(!bw.smith){bw.smith='15';lsS('bar_weights',bw);}})();
checkStorage();
checkUpdate();
if(!Data.session.get(activeDateKey())){
  const d=Data.draft.findAny();
  if(d&&d.dl&&d.state){
    if(d.date&&d.date<=todayKey())_logDateKey=d.date===todayKey()?null:d.date;
    if(!Data.session.get(activeDateKey())){
      WS[d.dl]=d.state;
      if(d.dl==='Free session'){
        adHocDay={label:'Free session',focus:'Your combo today',time:'',ex:d.state.ex.map(e=>({n:e.origName,...(findExDef(e.origName)||{}),priority:'normal'}))};
        adHocSeqIdx=null;
      }else{
        const _idx=SEQ.indexOf(d.dl);
        if(_idx>=0){adHocDay=DAYS[_idx];adHocSeqIdx=_idx;}
      }
    }
  }
}
document.getElementById('hsub').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long'})+' · Recomp: set your bio in Profile / Progress';
if(navigator.storage&&navigator.storage.persist){
  (async()=>{try{const granted=await navigator.storage.persist();lsS('storage_persisted',granted);}catch{lsS('storage_persisted',false);}})();
}
clearLegacyAuth();
updateHeader();
updateHeaderSub();
renderToday();
renderRecipes();
