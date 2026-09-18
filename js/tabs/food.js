import '../core.js';

/* ===== FOOD TAB + RECIPES ===== */

/* ===== FOOD ===== */
function allFoods(){const c=lsG('custom_foods')||[];return[...FOODS,...c.map(f=>({...f,cat:'My foods'}))];}
function foodOptsHtml(){
  const cats={};allFoods().forEach(f=>{if(!cats[f.cat])cats[f.cat]=[];cats[f.cat].push(f);});
  return Object.entries(cats).map(([cat,items])=>`<optgroup label="${cat}">${items.map(f=>`<option value="${f.name}">${f.name}${f.lbl?' ('+f.lbl+')':''}</option>`).join('')}</optgroup>`).join('');
}
/* Unit-aware amount handling. 'g' and 'ml' foods are entered as a direct amount
   (prefilled to the food's typical serving, editable). 'piece'/'tsp'/'scoop' foods
   are entered as a count (prefilled to 1, editable), and typ on that food record
   stores grams-per-unit so the count can be converted into real macros. */
const COUNT_UNITS={piece:'pieces',tsp:'tsp',scoop:'scoops'};
function isCountUnit(u){return!!COUNT_UNITS[u];}
function unitWord(u){return COUNT_UNITS[u]||u||'g';}
function defaultAmt(food){return isCountUnit(food.unit)?1:(food.typ||100);}
function amtFieldLabel(food){return isCountUnit(food.unit)?'Quantity ('+unitWord(food.unit)+')':'Amount ('+(food.unit||'g')+')';}
function foodMacros(food,amt){
  if(!food||!amt)return{k:0,p:0,c:0,f:0};
  const grams=isCountUnit(food.unit)?amt*(food.typ||100):amt;
  return{k:food.per100.k*grams/100,p:food.per100.p*grams/100,c:food.per100.c*grams/100,f:food.per100.f*grams/100};
}

function renderFood(){
  const log=lsG('food:'+foodKey())||[];
  const t=getProfile().targets;
  const totalK=Math.round(log.reduce((s,i)=>s+(i.k||0),0));
  const totalP=Math.round(log.reduce((s,i)=>s+(i.p||0),0));
  const totalC=Math.round(log.reduce((s,i)=>s+(i.c||0),0));
  const totalF=Math.round(log.reduce((s,i)=>s+(i.f||0),0));
  const remP=Math.max(0,t.protein-totalP);
  const remK=Math.max(0,t.kcal-totalK);
  const isYesterday=_foodDay==='yesterday';
  const opts=foodOptsHtml();
  const mealGap=_foodDay==='today'?getMealGapSuggestion():null;
  const swaps=_foodDay==='today'?getSwapSuggestions():[];

  document.getElementById('p3').innerHTML=`
  ${mealGap&&mealGap.needed?`<div class="card warm" style="margin-bottom:10px">
    <div class="cl">Close today's gap</div>
    <div class="cs" style="margin-bottom:10px">${mealGap.proteinGap}g protein short, ${mealGap.kcalRemaining} kcal left in today's budget</div>
    ${mealGap.options.map(o=>`<div style="padding:8px 0;border-bottom:1px solid var(--c3);font-size:13px">
      <div style="display:flex;justify-content:space-between"><span style="font-weight:700">${o.name}</span><span style="color:var(--mut)">${o.grams}g</span></div>
      <div style="color:var(--cyan);font-size:12px">${o.protein}g protein &middot; ${o.kcal} kcal &middot; closes ${o.closesGapPercent}% of the gap</div>
    </div>`).join('')}
  </div>`:''}
  ${swaps.length?`<div class="card" style="margin-bottom:10px">
    <div class="cl">Worth a swap?</div>
    ${swaps.map(s=>`<div style="padding:8px 0;border-bottom:1px solid var(--c3);font-size:13px">
      <div>${s.logged} <span style="color:var(--mut)">(${s.loggedProtein}g protein &middot; ${s.loggedKcal} kcal)</span></div>
      <div style="color:var(--cyan);margin-top:2px">Try: ${s.alternative}</div>
      <div style="color:var(--dim);font-size:11px;margin-top:2px">${s.note}</div>
    </div>`).join('')}
  </div>`:''}
  <div class="card" style="margin-bottom:10px"><div class="cl">Daily targets</div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Protein (g)</div><input class="sinput" type="number" id="prof-protein" value="${t.protein}" style="width:80px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Kcal</div><input class="sinput" type="number" id="prof-kcal" value="${t.kcal}" style="width:80px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Carbs (g)</div><input class="sinput" type="number" id="prof-carbs" value="${t.carbs}" style="width:80px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut)">Fat (g)</div><input class="sinput" type="number" id="prof-fat" value="${t.fat}" style="width:80px"></div>
    <button class="btn btn-grn btn-sm" style="width:100%;margin-top:10px" onclick="saveTargets()">Save targets</button>
  </div>
  <div class="seg">
    <button class="segb" id="fsb-c" onclick="showFS('c')">Cook</button>
    <button class="segb" id="fsb-pl" onclick="showFS('pl')">Plate</button>
    <button class="segb on" id="fsb-l" onclick="showFS('l')">Ate</button>
    <button class="segb" id="fsb-f" onclick="showFS('f')">Foods</button>
  </div>

  <!-- COOK: portion calculator -->
  <div id="fs-c" style="display:none">
    <div class="card"><div class="cl">Plan what to cook</div><div class="ct" style="margin-bottom:4px">How much to buy + macros per plate</div>
      <div class="cs" style="margin-bottom:12px">Meal prep across multiple portions</div>
      <select class="foodsel" id="pg-food">${opts}</select>
      <div class="statrow"><div style="font-size:13px;color:var(--mut);font-weight:500">Number of meals</div>
        <select class="sinput" id="pg-meals" style="width:64px">${[1,2,3,4,5].map(n=>`<option${n===3?' selected':''}>${n}</option>`).join('')}</select>
      </div>
      <div class="statrow"><div style="font-size:13px;color:var(--mut);font-weight:500">Your portion</div>
        <select class="sinput" id="pg-you" style="width:140px">
          <option value="100">Small (~100g)</option><option value="150" selected>Medium (~150g)</option>
          <option value="200">Large (~200g)</option><option value="250">XL (~250g)</option>
        </select>
      </div>
      <div class="statrow"><div style="font-size:13px;color:var(--mut);font-weight:500">Extra plate (optional)</div>
        <select class="sinput" id="pg-wife" style="width:140px">
          <option value="0" selected>Just mine</option><option value="100">Small (~100g)</option>
          <option value="150">Medium (~150g)</option><option value="200">Large (~200g)</option>
        </select>
      </div>
      <button class="btn btn-amb" onclick="calcPortions()">Calculate</button>
      <div id="pg-result"></div>
    </div>

    <!-- BATCH SHARE TOOL -->
    <div class="card" style="margin-top:12px">
      <div class="cl">Batch share calculator</div>
      <div class="ct" style="margin-bottom:4px">Cooked for two? Split the macros.</div>
      <div class="cs" style="margin-bottom:12px">Made a big batch? Enter total cooked weight and your share.</div>
      <select class="foodsel" id="bs-food">${opts}</select>
      <div class="statrow" style="margin-top:8px">
        <div style="font-size:13px;color:var(--mut);font-weight:500">Total batch (g)</div>
        <input class="sinput" id="bs-total" type="number" inputmode="decimal" placeholder="900" value="900" step="10" style="width:90px;text-align:center">
      </div>
      <div class="statrow">
        <div style="font-size:13px;color:var(--mut);font-weight:500">Your share (%)</div>
        <input class="sinput" id="bs-pct" type="number" inputmode="decimal" placeholder="60" value="100" min="1" max="100" style="width:90px;text-align:center">
      </div>
      <button class="btn btn-amb" onclick="calcBatchShare()">Calculate my portion</button>
      <div id="bs-result"></div>
      <div style="font-size:11px;color:var(--dim);margin-top:12px">Full recipe builder with per-ingredient breakdown coming in v2.3.</div>
    </div>
  </div>

  <!-- PLATE BUILDER -->
  <div id="fs-pl" style="display:none">
    <div class="card"><div class="cl">Build a plate</div><div class="ct" style="margin-bottom:4px">Base + sauce + protein + side</div>
      <div class="cs" style="margin-bottom:14px">Pick each component. Combined macros calculated instantly.</div>
      <div style="font-size:12px;color:var(--mut);margin-bottom:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase">Meal type</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        ${MEAL_TYPES.map(m=>`<button id="mt-${m}" onclick="selMeal('${m}')" style="padding:9px 16px;border:1px solid var(--c3);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:var(--c2);color:var(--mut);font-family:inherit;min-height:44px;transition:all .2s">${m}</button>`).join('')}
      </div>
      <div class="plate-comp"><div class="plate-comp-lbl">Base (rice)</div>
        <div class="plate-row">
          <select class="foodsel" id="pc-base" style="flex:1;margin-bottom:0" onchange="pcPrefill('base')">${foodOptsHtml().match(/Carbs[\s\S]*?<\/optgroup>/)?.[0]||opts}</select>
          <input class="sinput" id="pc-base-amt" type="number" inputmode="decimal" value="150" placeholder="150" step="0.5" style="width:70px;text-align:center" oninput="buildPlate()">
          <div style="font-size:12px;color:var(--mut);font-weight:600" id="pc-base-u">g</div>
        </div>
      </div>
      <div class="plate-comp"><div class="plate-comp-lbl">Sauce / liquid</div>
        <div class="plate-row">
          <select class="foodsel" id="pc-liq" style="flex:1;margin-bottom:0" onchange="pcPrefill('liq')">${opts}</select>
          <input class="sinput" id="pc-liq-amt" type="number" inputmode="decimal" value="200" placeholder="200" step="0.5" style="width:70px;text-align:center" oninput="buildPlate()">
          <div style="font-size:12px;color:var(--mut);font-weight:600" id="pc-liq-u">ml</div>
        </div>
      </div>
      <div class="plate-comp"><div class="plate-comp-lbl">Protein (fish / chicken / egg)</div>
        <div class="plate-row">
          <select class="foodsel" id="pc-pro" style="flex:1;margin-bottom:0" onchange="pcPrefill('pro')"><option value="">None</option>${opts}</select>
          <input class="sinput" id="pc-pro-amt" type="number" inputmode="decimal" value="150" placeholder="150" step="0.5" style="width:70px;text-align:center" oninput="buildPlate()">
          <div style="font-size:12px;color:var(--mut);font-weight:600" id="pc-pro-u">g</div>
        </div>
      </div>
      <div class="plate-comp"><div class="plate-comp-lbl">Side / veg</div>
        <div class="plate-row">
          <select class="foodsel" id="pc-side" style="flex:1;margin-bottom:0" onchange="pcPrefill('side')"><option value="">None</option>${opts}</select>
          <input class="sinput" id="pc-side-amt" type="number" inputmode="decimal" value="100" placeholder="100" step="0.5" style="width:70px;text-align:center" oninput="buildPlate()">
          <div style="font-size:12px;color:var(--mut);font-weight:600" id="pc-side-u">g</div>
        </div>
      </div>
      <div id="plate-result"></div>
      <button class="btn btn-amb" onclick="addPlateToLog()">Add plate to Ate</button>
    </div>
  </div>

  <!-- ATE LOG - meal table -->
  <div id="fs-l">
    <div class="card">
      <!-- Date toggle -->
      <div style="display:flex;gap:6px;margin-bottom:12px">
        <button onclick="selFoodDay('today')" style="flex:1;padding:7px;border-radius:8px;border:1px solid var(--c3);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;background:${!isYesterday?'var(--cyan)':'var(--c2)'};color:${!isYesterday?'#000':'var(--mut)'}">Today</button>
        <button onclick="selFoodDay('yesterday')" style="flex:1;padding:7px;border-radius:8px;border:1px solid var(--c3);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;background:${isYesterday?'var(--amb)':'var(--c2)'};color:${isYesterday?'#000':'var(--mut)'}">Yesterday</button>
      </div>
      <!-- Macro progress -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--mut);letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px">Protein</div>
          <div style="font-size:26px;font-weight:900;font-family:'Barlow',sans-serif;color:${totalP>=t.protein?'var(--grn)':totalP>=t.protein*0.67?'var(--cyan)':'var(--red)'}">${totalP}<span style="font-size:13px;font-weight:400;color:var(--mut)">g / ${t.protein}\u2013${Math.round(t.protein*1.15)}g</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:700;color:var(--mut);letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px">Kcal</div>
          <div style="font-size:20px;font-weight:800;font-family:'Barlow',sans-serif;color:var(--cyan)">${totalK}<span style="font-size:11px;font-weight:400;color:var(--mut)"> / ${t.kcal}</span></div>
        </div>
      </div>
      <div class="prog-bar" style="margin-bottom:4px"><div class="prog-fill" style="width:${Math.min(totalP/t.protein*100,100)}%;background:${totalP>=t.protein?'var(--grn)':totalP>=t.protein*0.67?'var(--cyan)':'var(--red)'}"></div></div>
      <div class="prog-bar" style="margin-bottom:8px"><div class="prog-fill" style="width:${Math.min(totalK/t.kcal*100,100)}%;background:var(--amb)"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mut);margin-bottom:2px"><span>Carbs</span><span>${totalC}g / ${t.carbs}\u2013${Math.round(t.carbs*1.15)}g</span></div>
      <div class="prog-bar" style="margin-bottom:6px"><div class="prog-fill" style="width:${Math.min(totalC/t.carbs*100,100)}%;background:var(--cyan)"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mut);margin-bottom:2px"><span>Fat</span><span>${totalF}g / ${t.fat}\u2013${Math.round(t.fat*1.15)}g</span></div>
      <div class="prog-bar" style="margin-bottom:${remP>0&&!isYesterday?8:12}px"><div class="prog-fill" style="width:${Math.min(totalF/t.fat*100,100)}%;background:var(--purple)"></div></div>
      ${remP>0&&!isYesterday?`<div style="font-size:12px;color:var(--mut);margin-bottom:12px">&#x25BA; Need <strong style="color:var(--cyan)">${remP}g protein</strong> and <strong>${remK} kcal</strong> more today${totalC>0?` &middot; ${totalC}g carbs &middot; ${totalF}g fat so far`:''}</div>`:''}
      ${totalP>=t.protein&&!isYesterday?`<div style="font-size:12px;color:var(--grn);margin-bottom:12px;font-weight:700">&#x2713; Protein target hit &middot; ${totalC}g carbs &middot; ${totalF}g fat</div>`:''}
      <div class="sep"></div>
      <!-- Quick add -->
      <div style="font-size:12px;color:var(--mut);margin-bottom:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Quick add</div>
      <div style="font-size:12px;color:var(--mut);margin-bottom:6px;font-weight:600">Meal</div>
      <div style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap">
        ${MEAL_TYPES.map(m=>`<button id="ql-mt-${m}" onclick="selQuickMeal('${m}')" style="padding:8px 12px;border:1px solid var(--c3);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:var(--c2);color:var(--mut);font-family:inherit;min-height:36px;transition:all .2s">${m}</button>`).join('')}
      </div>
      <input class="genin" type="text" id="ml-food-search" placeholder="Search foods..." autocomplete="off" oninput="filterMealFoodList(this.value)" onfocus="filterMealFoodList(this.value)">
      <input type="hidden" id="ml-food">
      <div id="ml-food-list" style="max-height:180px;overflow-y:auto;display:none;background:var(--c2);border:1px solid var(--c3);border-radius:10px;margin-top:4px">
        ${allFoods().map(f=>`<div class="free-ex-row" data-name="${f.name.toLowerCase()}" onclick="pickMealFood('${f.name.replace(/'/g,"\\'")}')"><span>${f.name}${f.lbl?` <span style="color:var(--dim);font-size:11px">(${f.lbl})</span>`:''}</span></div>`).join('')}
      </div>
      <div class="statrow" style="margin-bottom:4px">
        <div style="font-size:13px;color:var(--mut);font-weight:500" id="ml-amt-lbl">Amount (g)</div>
        <input class="sinput" type="number" inputmode="decimal" id="ml-amt" placeholder="150" step="0.5" style="width:80px;text-align:center" oninput="updMealPreview()">
      </div>
      <div id="ml-preview" style="font-size:12px;color:var(--cyan);margin-bottom:8px;min-height:16px"></div>
      <button class="btn btn-amb btn-sm" style="width:100%;margin-bottom:16px" onclick="logMeal()">+ Add</button>
      <!-- Meal groups -->
      ${renderMealGroups(log)}
    </div>
  </div>

  <!-- FOODS DB -->
  <div id="fs-f" style="display:none">
    <div class="card"><div class="cl">Manage food list</div><div class="ct" style="margin-bottom:4px">Add foods you eat regularly</div>
      <div class="cs" style="margin-bottom:12px">Appears in all tabs permanently</div>
      <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Food name</div><input class="sinput" id="cf-n" type="text" placeholder="HF Chicken Pasta" style="width:110px"></div>
      <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Logged as</div>
        <select class="sinput" id="cf-unit" style="width:110px" onchange="cfUnitChanged()">
          <option value="g">Grams</option>
          <option value="ml">Millilitres</option>
          <option value="piece">Pieces / count</option>
          <option value="tsp">Teaspoons</option>
          <option value="scoop">Scoops</option>
        </select>
      </div>
      ${[['Calories per 100g','cf-k','decimal','200'],['Protein per 100g','cf-p','decimal','15'],['Carbs per 100g','cf-c','decimal','20'],['Fat per 100g','cf-f','decimal','5']].map(([l,id,mode,ph])=>`<div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">${l}</div><input class="sinput" id="${id}" type="number" inputmode="${mode}" placeholder="${ph}" style="width:110px"></div>`).join('')}
      <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500" id="cf-t-lbl">Typical serving (g)</div><input class="sinput" id="cf-t" type="number" inputmode="decimal" placeholder="150" style="width:110px"></div>
      <button class="btn btn-amb" onclick="addCustomFood()">Save to my foods</button>
      <div id="cf-conf" class="confbox">Food added &#x2713;</div>
    </div>
    <div id="cf-list"></div>
  </div>`;

  // Restore meal type selection (preserve user's choice, apply time-based default only on first tab open)
  const _mt=curQuickMeal||defaultMealType();
  const _pt=curPlateMeal||defaultMealType();
  selQuickMeal(_mt);
  selMeal(_pt);
  renderCustomFoodList();
  prefillAmt();
  buildPlate();
}

function renderMealGroups(log){
  if(!log.length)return`<div style="font-size:14px;color:var(--dim);text-align:center;padding:16px">No meals logged yet</div>`;
  const groups={};
  MEAL_TYPES.forEach(m=>groups[m]=[]);
  groups['Other']=[];
  log.forEach((item,i)=>{
    const g=MEAL_TYPES.includes(item.mealType)?item.mealType:'Other';
    groups[g].push({...item,i});
  });
  let html='';
  [...MEAL_TYPES,'Other'].forEach(mealType=>{
    const items=groups[mealType];
    if(!items.length)return;
    const mK=Math.round(items.reduce((s,i)=>s+(i.k||0),0));
    const mP=Math.round(items.reduce((s,i)=>s+(i.p||0),0));
    html+=`<div class="meal-group">
      <div class="meal-hd">
        <div class="meal-hd-name">${mealType}</div>
        <div class="meal-hd-totals">${mK} kcal &middot; ${mP}g protein</div>
      </div>
      ${items.map(item=>`<div class="meal-item">
        <div style="flex:1">
          <div class="meal-item-name">${item.name}</div>
          <div class="meal-item-meta">${item.amt?item.amt+' '+(item.unit||'g')+' &middot; ':''} ${Math.round(item.k||0)} kcal &middot; ${Math.round(item.p||0)}g${item.time?' &middot; '+item.time:''}</div>
        </div>
        <button onclick="removeMeal(${item.i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:22px;padding:6px;min-width:44px;min-height:44px">&times;</button>
      </div>`).join('')}
    </div>`;
  });
  return html;
}

function defaultMealType(){const h=new Date().getHours();return h<11?'Breakfast':h<15?'Lunch':h<20?'Dinner':'Snack';}
let curQuickMeal=defaultMealType();let curPlateMeal=defaultMealType();
let _foodDay='today';
function foodKey(){return _foodDay==='yesterday'?yesterdayKey():todayKey();}
function selFoodDay(d){_foodDay=d;renderFood();showFS('l');}
function selQuickMeal(m){
  curQuickMeal=m;
  MEAL_TYPES.forEach(t=>{const b=document.getElementById('ql-mt-'+t);if(b){b.style.background=t===m?'var(--cbg)':'var(--c2)';b.style.color=t===m?'var(--cyan)':'var(--mut)';b.style.borderColor=t===m?'var(--cbr)':'var(--c3)';}});
}
function selMeal(m){
  curPlateMeal=m;
  MEAL_TYPES.forEach(t=>{const b=document.getElementById('mt-'+t);if(b){b.style.background=t===m?'var(--cbg)':'var(--c2)';b.style.color=t===m?'var(--cyan)':'var(--mut)';b.style.borderColor=t===m?'var(--cbr)':'var(--c3)';}});
}

function showFS(s){
  ['c','pl','l','f'].forEach(x=>{
    const b=document.getElementById('fsb-'+x),c=document.getElementById('fs-'+x);
    if(b)b.classList.toggle('on',x===s);if(c)c.style.display=x===s?'block':'none';
  });
}

function computePlate(){
  const foods=allFoods();
  const components=[{id:'base',amtId:'pc-base-amt'},{id:'liq',amtId:'pc-liq-amt'},{id:'pro',amtId:'pc-pro-amt'},{id:'side',amtId:'pc-side-amt'}];
  let totalK=0,totalP=0,totalC=0,totalF=0,names=[];const breakdown=[];
  components.forEach(c=>{
    const sel=document.getElementById('pc-'+c.id);const amt=parseFloat(document.getElementById(c.amtId)?.value)||0;
    if(!sel||!sel.value||!amt)return;
    const food=foods.find(f=>f.name===sel.value);if(!food)return;
    const m=foodMacros(food,amt);
    totalK+=m.k;totalP+=m.p;totalC+=m.c;totalF+=m.f;names.push(food.name);
    const unitTxt=isCountUnit(food.unit)?(amt+' '+unitWord(food.unit)):(amt+(food.unit||'g'));
    breakdown.push(`<div class="macrow"><span style="color:var(--mut)">${food.name} ${unitTxt}</span><span class="macval">${Math.round(m.k)} kcal &middot; ${m.p.toFixed(1)}g</span></div>`);
  });
  return{totalK,totalP,totalC,totalF,names,breakdown};
}
function buildPlate(){
  const r=computePlate();
  const resultEl=document.getElementById('plate-result');if(!resultEl)return;
  if(!r.names.length){resultEl.innerHTML='';return;}
  resultEl.innerHTML=`<div class="plate-total" style="margin-bottom:10px">
    <div style="font-size:11px;color:var(--cyan);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">${curPlateMeal}</div>
    <div style="font-size:28px;font-family:'Barlow',sans-serif;font-weight:900;color:var(--cyan)">${Math.round(r.totalK)} kcal</div>
    <div style="font-size:16px;font-weight:700;color:var(--grn);margin-top:4px">${r.totalP.toFixed(1)}g protein</div>
  </div><div style="background:var(--c2);border-radius:12px;padding:12px">${r.breakdown.join('')}</div>`;
}
function pcPrefill(comp){
  const sel=document.getElementById('pc-'+comp);if(!sel)return;
  const amtEl=document.getElementById('pc-'+comp+'-amt');
  const uEl=document.getElementById('pc-'+comp+'-u');
  if(!sel.value){if(uEl)uEl.textContent='g';buildPlate();return;}
  const food=allFoods().find(f=>f.name===sel.value);if(!food)return;
  if(amtEl)amtEl.value=defaultAmt(food);
  if(uEl)uEl.textContent=isCountUnit(food.unit)?unitWord(food.unit):(food.unit||'g');
  buildPlate();
}
function isSymptomDay(){const sym=lsG('sym:'+todayKey())||{};return !!(sym.energy&&sym.energy<=2);}
function fibreWarnHTML(names){return '';}
function addPlateToLog(){
  const r=computePlate();
  if(!r.names.length)return;
  const now=new Date();const time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const log=lsG('food:'+foodKey())||[];
  log.push({name:r.names.join(' + '),mealType:curPlateMeal,k:r.totalK,p:r.totalP,c:r.totalC,f:r.totalF,time,isPlate:true});
  lsS('food:'+foodKey(),log);updateHeader();
  renderFood();showFS('l');
  const res=document.getElementById('plate-result');
  if(res)res.innerHTML=`<div class="nt ng" style="margin-top:10px">&#x2713; Plate logged (${Math.round(r.totalK)} kcal &middot; ${r.totalP.toFixed(1)}g protein)</div>`+fibreWarnHTML(r.names);
}

function logMeal(){
  const fname=document.getElementById('ml-food').value;
  const amt=parseFloat(document.getElementById('ml-amt').value);
  if(!fname||!amt){
    const prev=document.getElementById('ml-preview');
    if(prev)prev.innerHTML='<span style="color:var(--red)">Enter an amount before adding</span>';
    return;
  }
  const food=allFoods().find(f=>f.name===fname);if(!food)return;
  const now=new Date();const time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const m=foodMacros(food,amt);
  const log=lsG('food:'+foodKey())||[];
  log.push({name:food.name,amt,unit:unitWord(food.unit),k:m.k,p:m.p,c:m.c,f:m.f,mealType:curQuickMeal,time});
  lsS('food:'+foodKey(),log);updateHeader();
  document.getElementById('ml-amt').value='';
  const fw=fibreWarnHTML(food.name);
  renderFood();showFS('l');
  if(fw){const pv=document.getElementById('ml-preview');if(pv)pv.innerHTML=fw;}
}
function filterMealFoodList(q){
  const list=document.getElementById('ml-food-list');
  if(!list)return;
  const query=q.toLowerCase().trim();
  list.style.display=query?'block':'none';
  list.querySelectorAll('.free-ex-row').forEach(row=>{
    row.style.display=row.dataset.name.includes(query)?'flex':'none';
  });
}
function pickMealFood(name){
  const hidden=document.getElementById('ml-food'),search=document.getElementById('ml-food-search'),list=document.getElementById('ml-food-list');
  if(hidden)hidden.value=name;
  if(search)search.value=name;
  if(list)list.style.display='none';
  prefillAmt();
}
function prefillAmt(){
  const sel=document.getElementById('ml-food');if(!sel)return;
  const food=allFoods().find(f=>f.name===sel.value);if(!food)return;
  const amtEl=document.getElementById('ml-amt');
  const lblEl=document.getElementById('ml-amt-lbl');
  if(amtEl)amtEl.value=defaultAmt(food);
  if(lblEl)lblEl.textContent=amtFieldLabel(food);
  updMealPreview();
}
function updMealPreview(){
  const sel=document.getElementById('ml-food');const amtEl=document.getElementById('ml-amt');const prev=document.getElementById('ml-preview');
  if(!sel||!amtEl||!prev)return;
  const food=allFoods().find(f=>f.name===sel.value);
  const amt=parseFloat(amtEl.value);
  if(!food||!amt){prev.textContent='';return;}
  const m=foodMacros(food,amt);
  prev.textContent=Math.round(m.k)+' kcal \u00b7 '+m.p.toFixed(1)+'g protein';
}
function removeMeal(i){
  const log=lsG('food:'+foodKey())||[];log.splice(i,1);lsS('food:'+foodKey(),log);
  updateHeader();renderFood();showFS('l');
}
function quickLog(fname,amt){
  const food=allFoods().find(f=>f.name===fname);if(!food)return;
  if(amt==null||amt==='')amt=food.typ||100;
  const now=new Date();const time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const logAmt=isCountUnit(food.unit)?+(amt/(food.typ||100)).toFixed(2):amt;
  const m=foodMacros(food,logAmt);
  const log=lsG('food:'+todayKey())||[];
  log.push({name:food.name,amt:logAmt,unit:unitWord(food.unit),k:m.k,p:m.p,c:m.c,f:m.f,mealType:curQuickMeal,time});
  lsS('food:'+todayKey(),log);updateHeader();
  const pg=document.getElementById('pg-result');
  if(pg)pg.innerHTML+=`<div class="nt ng">Logged to Ate &#x2713;</div>`;
}
function calcBatchShare(){
  const fname=document.getElementById('bs-food').value;
  const food=allFoods().find(f=>f.name===fname);if(!food)return;
  const total=parseFloat(document.getElementById('bs-total').value)||900;
  const pct=parseFloat(document.getElementById('bs-pct').value)||60;
  const myG=Math.round(total*pct/100);
  const m=foodMacros(food,myG);
  document.getElementById('bs-result').innerHTML=`<div class="presult">
    <div style="font-size:13px;font-weight:700;color:var(--mut);margin-bottom:10px">${food.name} &middot; ${pct}% of ${total}g = ${myG}g</div>
    <div class="macrow"><span>Calories</span><span class="macval">${Math.round(m.k)} kcal</span></div>
    <div class="macrow"><span>Protein</span><span class="macval">${m.p.toFixed(1)}g</span></div>
    <div class="macrow"><span>Carbs</span><span class="macval">${m.c.toFixed(1)}g</span></div>
    <div class="macrow"><span>Fat</span><span class="macval">${m.f.toFixed(1)}g</span></div>
  </div>
  <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" onclick="quickLog('${fname.replace(/'/g,"\\'")}',${myG})">+ Log to Ate</button>`;
}
function calcPortions(){
  const fname=document.getElementById('pg-food').value;
  const food=allFoods().find(f=>f.name===fname);if(!food)return;
  const meals=parseInt(document.getElementById('pg-meals').value);
  const myG=parseInt(document.getElementById('pg-you').value);
  const wifeG=parseInt(document.getElementById('pg-wife').value);
  const total=myG*meals+(wifeG>0?wifeG*meals:0);
  const raw=food.rr?Math.ceil(total/food.rr/50)*50:null;
  const myK=food.per100.k*myG/100,myP=food.per100.p*myG/100;
  document.getElementById('pg-result').innerHTML=`<div class="presult">
    <div style="font-size:18px;font-family:'Barlow',sans-serif;font-weight:800;color:var(--cyan);margin-bottom:12px">${food.name} &middot; ${meals} meal(s)</div>
    ${raw?`<div class="macrow"><span style="color:var(--mut)">Buy raw</span><span class="macval">${raw}g</span></div>`:''}
    <div class="macrow"><span style="color:var(--mut)">Total cooked</span><span class="macval">${total}g</span></div>
    <div style="font-size:11px;color:var(--dim);margin:10px 0 5px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Your plate per meal</div>
    <div class="macrow"><span>Portion</span><span class="macval">${myG}g</span></div>
    <div class="macrow"><span>Calories</span><span class="macval">${Math.round(myK)} kcal</span></div>
    <div class="macrow"><span>Protein</span><span class="macval">${myP.toFixed(1)}g</span></div>
    ${wifeG>0?`<div style="font-size:11px;color:var(--dim);margin:10px 0 5px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Second plate per meal</div>
    <div class="macrow"><span>Portion</span><span class="macval">${wifeG}g</span></div>
    <div class="macrow"><span>Calories</span><span class="macval">${Math.round(food.per100.k*wifeG/100)} kcal</span></div>`:''}
  </div>
  <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" onclick="quickLog('${food.name.replace(/'/g,"\\'")}',${myG})">+ Log my portion to Ate</button>`;
}
function cfUnitChanged(){
  const u=document.getElementById('cf-unit')?.value||'g';
  const lbl=document.getElementById('cf-t-lbl');if(!lbl)return;
  lbl.textContent=isCountUnit(u)?'Grams per '+u:'Typical serving ('+u+')';
}
function addCustomFood(){
  const name=document.getElementById('cf-n').value.trim();
  const unit=document.getElementById('cf-unit')?.value||'g';
  const k=parseFloat(document.getElementById('cf-k').value);
  const p=parseFloat(document.getElementById('cf-p').value);
  const c=parseFloat(document.getElementById('cf-c').value)||0;
  const f=parseFloat(document.getElementById('cf-f').value)||0;
  const typ=parseFloat(document.getElementById('cf-t').value)||(isCountUnit(unit)?100:150);
  if(!name||!k||!p)return;
  const customs=lsG('custom_foods')||[];
  if(allFoods().find(x=>x.name.toLowerCase()===name.toLowerCase())){alert('A food with this name already exists \u2014 it would never be reachable. Pick a different name.');return;}
  const food={name,cat:'My foods',per100:{k,p,c,f},typ};
  if(unit!=='g')food.unit=unit;
  customs.push(food);lsS('custom_foods',customs);
  const conf=document.getElementById('cf-conf');
  if(conf){conf.style.display='block';setTimeout(()=>{conf.style.display='none';renderFood();showFS('f');},2000);}
}
function deleteCustomFood(i){
  if(!confirm('Delete this food?'))return;
  const c=lsG('custom_foods')||[];c.splice(i,1);lsS('custom_foods',c);renderFood();showFS('f');
}
function renderCustomFoodList(){
  const el=document.getElementById('cf-list');if(!el)return;
  const c=lsG('custom_foods')||[];if(!c.length){el.innerHTML='';return;}
  el.innerHTML=`<div class="card"><div class="cl">My custom foods (${c.length})</div>
    ${c.map((f,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--c3)">
      <div><div style="font-size:14px;font-weight:700;font-family:'Barlow',sans-serif">${f.name}</div><div style="font-size:12px;color:var(--mut)">${f.per100.k} kcal &middot; ${f.per100.p}g protein per 100g</div></div>
      <button onclick="deleteCustomFood(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:22px;padding:6px;min-width:44px;min-height:44px">&times;</button>
    </div>`).join('')}
  </div>`;
}

/* ===== FOOD COACHING ===== */
/* Meal gap: real foods from the actual database that would close today's specific gap,
   not generic "eat more protein" advice. Picks from genuinely protein-efficient foods
   (highest protein per kcal) so the suggestion doesn't just blow the calorie target
   to hit the protein one. Returns real gram amounts for real foods, not portions. */
function getMealGapSuggestion(){
  const log=lsG('food:'+todayKey())||[];
  const t=getProfile().targets;
  const p=log.reduce((s,i)=>s+(i.p||0),0);
  const k=log.reduce((s,i)=>s+(i.k||0),0);
  const proteinGap=t.protein-p;
  const kcalRemaining=t.kcal-k;
  if(proteinGap<8)return{needed:false,proteinGap:Math.round(proteinGap),kcalRemaining:Math.round(kcalRemaining)};
  const ranked=FOODS.map(f=>({...f,proteinPerKcal:f.per100.p/(f.per100.k||1)}))
    .filter(f=>f.per100.p>10)
    .sort((a,b)=>b.proteinPerKcal-a.proteinPerKcal);
  /* Use the food's own real typical serving size, not a back-calculated gram amount \u2014
     that avoided recommending something absurd like 168g of protein powder in one go. */
  const options=ranked.slice(0,3).map(f=>{
    const grams=f.typ||100;
    const protein=Math.round(grams/100*f.per100.p);
    const kcal=Math.round(grams/100*f.per100.k);
    return{name:f.name,grams,protein,kcal,closesGapPercent:Math.min(100,Math.round(protein/proteinGap*100))};
  });
  return{needed:true,proteinGap:Math.round(proteinGap),kcalRemaining:Math.round(kcalRemaining),options};
}
/* Swap suggestions: honestly scoped to protein-per-kcal efficiency, since sugar isn't
   a tracked field in the food database \u2014 not pretending to catch high-sugar items
   specifically, just genuinely inefficient ones (low protein for the calorie cost). */
function getSwapSuggestions(){
  const log=lsG('food:'+todayKey())||[];
  const inefficient=log.filter(item=>{
    const eff=item.k>0?item.p/item.k:1;
    return item.k>=150&&eff<0.08; // meaningful calorie cost, low protein return
  });
  if(!inefficient.length)return[];
  return inefficient.slice(0,3).map(item=>{
    const better=FOODS.filter(f=>f.per100.p/(f.per100.k||1)>0.15).sort((a,b)=>b.per100.p/b.per100.k-a.per100.p/a.per100.k)[0];
    return{logged:item.name,loggedProtein:item.p,loggedKcal:item.k,alternative:better?.name,note:'Higher protein per calorie \u2014 not a sugar comparison, that\u2019s not tracked in the food data yet'};
  });
}
/* Pattern correlation: analyzes every day that has BOTH a food log and a symptom log,
   from whenever the app was first used \u2014 no snapshot, no fixed window. Honestly gated
   on sample size: won't claim a pattern from a handful of days. */
function getFoodSymptomCorrelation(){
  const days=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('food:'))continue;
    const date=k.slice(5);
    const food=lsG(k);
    const sym=lsG('sym:'+date);
    if(!food||!food.length||!sym||!sym.energy)continue;
    const totalP=food.reduce((s,it)=>s+(it.p||0),0);
    days.push({date,protein:totalP,energy:sym.energy});
  }
  if(days.length<10)return{available:false,sampleSize:days.length,reason:'Only '+days.length+' day(s) with both food and symptom logs \u2014 need at least 10 to say anything real.'};
  const sorted=[...days].sort((a,b)=>a.protein-b.protein);
  const median=sorted[Math.floor(sorted.length/2)].protein;
  const lowP=days.filter(d=>d.protein<median),highP=days.filter(d=>d.protein>=median);
  const avg=(arr,key)=>arr.length?Math.round((arr.reduce((s,d)=>s+d[key],0)/arr.length)*10)/10:null;
  return{
    available:true,sampleSize:days.length,
    avgEnergyLowProteinDays:avg(lowP,'energy'),avgEnergyHighProteinDays:avg(highP,'energy'),
    lowProteinDayCount:lowP.length,highProteinDayCount:highP.length
  };
}

/* ===== RECIPES (photo label → saved food) ===== */
let _recipePhotoData=null;
function compressImageFile(file,maxW,quality){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const scale=Math.min(1,maxW/img.width);
      const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg',quality));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read image'));};
    img.src=url;
  });
}
async function onRecipePhotoSelected(input){
  const file=input.files&&input.files[0];if(!file)return;
  try{
    _recipePhotoData=await compressImageFile(file,900,0.72);
    const prev=document.getElementById('recipe-photo-preview');
    if(prev)prev.innerHTML=`<img src="${_recipePhotoData}" alt="Label preview" style="width:100%;border-radius:12px;border:1px solid var(--c3);margin-top:8px">`;
  }catch(e){alert('Could not load that photo.');_recipePhotoData=null;}
}
function recipeModeChanged(){
  const mode=document.getElementById('rc-mode')?.value||'serving';
  const hint=document.getElementById('rc-mode-hint');
  if(hint)hint.textContent=mode==='per100'
    ?'Enter values exactly as printed per 100g / 100ml.'
    :'Enter values for one serving / one pack, then set the serving weight below.';
  ['rc-k','rc-p','rc-c','rc-f'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const row=el.closest('.statrow');
    if(!row)return;
    const lbl=row.querySelector('div');
    if(!lbl)return;
    const base=id==='rc-k'?'Calories':id==='rc-p'?'Protein (g)':id==='rc-c'?'Carbs (g)':'Fat (g)';
    lbl.textContent=mode==='per100'?base+' / 100g':base+' / serving';
  });
}
function saveRecipeFromPhoto(){
  const name=(document.getElementById('rc-n')?.value||'').trim();
  const mode=document.getElementById('rc-mode')?.value||'serving';
  const cat=document.getElementById('rc-cat')?.value||'My recipes';
  const unit=document.getElementById('rc-unit')?.value||'g';
  let k=parseFloat(document.getElementById('rc-k')?.value);
  let p=parseFloat(document.getElementById('rc-p')?.value);
  let c=parseFloat(document.getElementById('rc-c')?.value)||0;
  let f=parseFloat(document.getElementById('rc-f')?.value)||0;
  const servingG=parseFloat(document.getElementById('rc-serving')?.value)||100;
  if(!name){alert('Give the recipe a name.');return;}
  if(!k&&k!==0||!p&&p!==0){alert('Enter calories and protein from the label.');return;}
  if(mode==='serving'){
    if(!servingG||servingG<=0){alert('Enter the serving weight in grams (or ml).');return;}
    k=k*100/servingG;p=p*100/servingG;c=c*100/servingG;f=f*100/servingG;
  }
  if(allFoods().find(x=>x.name.toLowerCase()===name.toLowerCase())){
    alert('That name already exists — pick a different name.');return;
  }
  const food={name,cat,per100:{k:Math.round(k*10)/10,p:Math.round(p*10)/10,c:Math.round(c*10)/10,f:Math.round(f*10)/10},typ:mode==='serving'?servingG:100,lbl:'Saved from label photo',fromRecipe:true};
  if(unit!=='g')food.unit=unit;
  if(_recipePhotoData)food.photo=_recipePhotoData;
  const customs=lsG('custom_foods')||[];
  customs.push(food);lsS('custom_foods',customs);
  _recipePhotoData=null;
  const conf=document.getElementById('rc-conf');
  if(conf){conf.style.display='block';setTimeout(()=>{conf.style.display='none';},2000);}
  renderRecipes();
}
function deleteRecipeFood(i){
  if(!confirm('Delete this saved recipe?'))return;
  const c=lsG('custom_foods')||[];
  c.splice(i,1);lsS('custom_foods',c);renderRecipes();
}
function renderRecipes(){
  const customs=lsG('custom_foods')||[];
  const recipes=customs.map((f,i)=>({...f,i})).filter(f=>f.fromRecipe||f.photo||f.cat==='My recipes'||f.cat==='Supplements');
  const list=customs.length?customs.map((f,i)=>`<div style="padding:12px 0;border-bottom:1px solid var(--c3)">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;font-family:'Barlow',sans-serif">${escHtml(f.name)}</div>
          <div style="font-size:12px;color:var(--mut);margin-top:3px">${f.cat||'My foods'} · ${f.per100.k} kcal · ${f.per100.p}g P / 100g</div>
          ${f.lbl?`<div style="font-size:11px;color:var(--dim);margin-top:2px">${escHtml(f.lbl)}</div>`:''}
        </div>
        <button onclick="deleteRecipeFood(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:22px;padding:6px;min-width:44px;min-height:44px">&times;</button>
      </div>
      ${f.photo?`<img src="${f.photo}" alt="" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;margin-top:8px;border:1px solid var(--c3)">`:''}
      <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="quickLog('${f.name.replace(/'/g,"\\'")}');document.querySelector('.tab[data-t=\"6\"]')?.click()">+ Log now</button>
    </div>`).join(''):`<div style="font-size:13px;color:var(--dim);padding:8px 0">No saved recipes yet — snap a HelloFresh pack or supplement label above.</div>`;

  document.getElementById('p5').innerHTML=`
  <div class="card cyan" style="margin-bottom:12px">
    <div class="cl">Photo → recipe</div>
    <div class="ct" style="margin-bottom:4px">Save a nutrition label once, reuse forever</div>
    <div class="cs" style="margin-bottom:12px">Built for HelloFresh packs, protein tubs, and anything with a macro panel. Photo is kept as a reference — you type the numbers from the label.</div>
    <input type="file" id="rc-photo" accept="image/*" capture="environment" style="display:none" onchange="onRecipePhotoSelected(this)">
    <button class="btn btn-cyan" onclick="document.getElementById('rc-photo').click()">Take / upload label photo</button>
    <div id="recipe-photo-preview"></div>
    <div class="sep"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Recipe name</div><input class="sinput" id="rc-n" type="text" placeholder="HF Chicken Pasta" style="width:140px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Category</div>
      <select class="sinput" id="rc-cat" style="width:140px">
        <option value="My recipes">My recipes</option>
        <option value="HelloFresh">HelloFresh</option>
        <option value="Supplements">Supplements</option>
        <option value="Takeaway">Takeaway</option>
      </select>
    </div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Label shows</div>
      <select class="sinput" id="rc-mode" style="width:140px" onchange="recipeModeChanged()">
        <option value="serving">Per serving / pack</option>
        <option value="per100">Per 100g / 100ml</option>
      </select>
    </div>
    <div id="rc-mode-hint" style="font-size:11px;color:var(--dim);margin:4px 0 8px">Enter values for one serving / one pack, then set the serving weight below.</div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Calories / serving</div><input class="sinput" id="rc-k" type="number" inputmode="decimal" placeholder="520" style="width:110px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Protein (g) / serving</div><input class="sinput" id="rc-p" type="number" inputmode="decimal" placeholder="35" style="width:110px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Carbs (g) / serving</div><input class="sinput" id="rc-c" type="number" inputmode="decimal" placeholder="45" style="width:110px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Fat (g) / serving</div><input class="sinput" id="rc-f" type="number" inputmode="decimal" placeholder="18" style="width:110px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Serving weight</div><input class="sinput" id="rc-serving" type="number" inputmode="decimal" placeholder="400" value="400" style="width:110px"></div>
    <div class="statrow"><div style="font-size:13px;color:var(--mut);min-width:130px;font-weight:500">Logged as</div>
      <select class="sinput" id="rc-unit" style="width:110px">
        <option value="g">Grams</option>
        <option value="ml">Millilitres</option>
        <option value="piece">Whole pack / piece</option>
        <option value="scoop">Scoop</option>
      </select>
    </div>
    <button class="btn btn-amb" onclick="saveRecipeFromPhoto()">Save recipe</button>
    <div id="rc-conf" class="confbox">Recipe saved — it now appears in Food quick-add &#x2713;</div>
  </div>
  <div class="card">
    <div class="cl">Saved recipes &amp; supplements (${customs.length})</div>
    ${list}
  </div>`;
}


Object.assign(globalThis, {
  allFoods, foodOptsHtml, COUNT_UNITS, isCountUnit, unitWord, defaultAmt, amtFieldLabel, foodMacros,
  renderFood, renderMealGroups,
  defaultMealType, foodKey, selFoodDay, selQuickMeal, selMeal, showFS,
  computePlate, buildPlate, pcPrefill, isSymptomDay, fibreWarnHTML, addPlateToLog,
  logMeal, filterMealFoodList, pickMealFood, prefillAmt, updMealPreview, removeMeal, quickLog,
  calcBatchShare, calcPortions,
  cfUnitChanged, addCustomFood, deleteCustomFood, renderCustomFoodList,
  getMealGapSuggestion, getSwapSuggestions, getFoodSymptomCorrelation,
  compressImageFile, onRecipePhotoSelected, recipeModeChanged, saveRecipeFromPhoto,
  deleteRecipeFood, renderRecipes,
});
