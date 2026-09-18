import BodyMuscles from './body-muscles.js';

/* NOTE: index.html hosts the DOM shell (header, tab buttons, empty panel divs).
   This module renders into those panels and wires up interactivity. All inline
   onclick=/onchange= handlers in generated HTML strings call functions on window,
   so the block at the end of this file exposes them via Object.assign(window, ...).*/

/* ===== DATA ===== */
const SEQ=['Push day','Pull day','Legs day','Cardio + core'];
const DAYS=[
  {label:'Push day',focus:'Chest \u00b7 Shoulders \u00b7 Triceps (no bench)',time:'Gym',ex:[
    {n:'Incline DB press',s:4,r:'8\u201310',nt:'Main chest press \u2014 no flat bench needed',priority:'normal',compound:true,inputType:'weight',wlabel:'Per dumbbell (each hand)',primaryMuscles:['Upper chest'],secondaryMuscles:['Front delts','Triceps'],tip:'Elbows at roughly 45 degrees, not flared to 90 \u2014 that angle shifts work to upper chest.'},
    {n:'Machine chest press',s:3,r:'10\u201312',nt:'Stable pressing without a barbell bench',priority:'normal',compound:true,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Chest'],secondaryMuscles:['Triceps','Front delts'],tip:'Drive handles forward without locking out hard \u2014 keep tension on the chest.'},
    {n:'Machine chest fly',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Chest'],secondaryMuscles:[],tip:'Squeeze at the peak, control the return \u2014 don\u2019t let the stack slam.'},
    {n:'Seated DB shoulder press',s:3,r:'8\u201310',nt:'',priority:'normal',compound:true,inputType:'weight',wlabel:'Per dumbbell (each hand)',primaryMuscles:['Front delts'],secondaryMuscles:['Triceps','Side delts'],tip:'Press slightly forward, not straight overhead \u2014 easier on the shoulder joint.'},
    {n:'Lateral raises',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Per dumbbell (each hand)',primaryMuscles:['Side delts'],secondaryMuscles:[],tip:'Lead with elbows, stop at shoulder height \u2014 no swinging.'},
    {n:'Cable tricep pushdown',s:3,r:'10\u201312',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Triceps (lateral/medial)'],secondaryMuscles:[],tip:'Elbows pinned at your sides \u2014 if they drift forward you\u2019re using shoulders.'},
    {n:'Overhead tricep extension',s:3,r:'10\u201312',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'DB weight (one hand)',primaryMuscles:['Triceps (long head)'],secondaryMuscles:[],tip:'Elbows point forward, not flared \u2014 keeps tension on the long head.'}
  ]},
  {label:'Pull day',focus:'Back \u00b7 Biceps \u00b7 Rear delts',time:'Gym',ex:[
    {n:'Pull-ups or lat pulldown',s:4,r:'\u2014',nt:'Pick one below',priority:'normal',noweight:true,inputType:'choice',primaryMuscles:['Lats'],secondaryMuscles:['Biceps','Mid-back'],
     choiceOptions:[{name:'Pull-ups (unassisted)',r:'Max reps',inputType:'bodyweight',primaryMuscles:['Lats'],secondaryMuscles:['Biceps','Mid-back']},{name:'Lat pulldown',r:'8\u201312',inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Lats'],secondaryMuscles:['Biceps']}]},
    {n:'Seated cable row',s:4,r:'8\u201312',nt:'',priority:'normal',compound:true,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Mid-back'],secondaryMuscles:['Lats','Biceps','Traps'],tip:'Chest up, pull to lower ribs \u2014 if lower back rounds, drop the weight.'},
    {n:'Single arm DB row',s:3,r:'10\u201312',nt:'',priority:'normal',compound:true,inputType:'weight',wlabel:'Dumbbell weight (one hand)',primaryMuscles:['Mid-back'],secondaryMuscles:['Lats','Biceps'],tip:'Brace free hand, keep torso still \u2014 don\u2019t twist the weight up.'},
    {n:'Face pulls',s:3,r:'12\u201315',nt:'Never skip \u2014 balances all the pressing',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Rear delts','Traps'],secondaryMuscles:['Rotator cuff'],tip:'Pull to eye level and rotate hands outward at the end.'},
    {n:'Dumbbell curl (alternating)',s:3,r:'10\u201312',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Per dumbbell (each hand)',primaryMuscles:['Biceps (long head)'],secondaryMuscles:[],tip:'Full supination at the top \u2014 rotate palm up as you curl.'},
    {n:'Hammer curls',s:3,r:'10\u201312',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Per dumbbell (each hand)',primaryMuscles:['Brachialis'],secondaryMuscles:['Biceps','Forearms'],tip:'Neutral grip the whole rep \u2014 thumbs up.'},
    {n:'Dumbbell shrugs',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Per dumbbell (each hand)',primaryMuscles:['Traps'],secondaryMuscles:[],tip:'Straight up and down \u2014 no rolling the shoulders.'}
  ]},
  {label:'Legs day',focus:'Quads \u00b7 Hamstrings \u00b7 Glutes \u00b7 Calves (no squats / deadlifts)',time:'Gym',ex:[
    {n:'Leg press',s:4,r:'10\u201315',nt:'Main lower-body compound without a squat',priority:'normal',compound:true,inputType:'weight',wlabel:'Stack / sled weight',primaryMuscles:['Quads'],secondaryMuscles:['Glutes','Hamstrings'],tip:'Knees track over toes, soft lockout at the top \u2014 no bouncing out of the hole.'},
    {n:'Walking lunges',s:3,r:'10 each',nt:'Extra leg volume without a back squat',priority:'normal',compound:true,inputType:'weight',wlabel:'Per dumbbell (each hand) \u2014 or 0 for bodyweight',primaryMuscles:['Quads'],secondaryMuscles:['Glutes','Hamstrings'],tip:'Long strides, torso upright \u2014 front knee tracks over the mid-foot.'},
    {n:'Leg extension (machine)',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Quads'],secondaryMuscles:[],tip:'Controlled tempo, brief pause at the top.'},
    {n:'Seated leg curl',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Hamstrings'],secondaryMuscles:[],tip:'Full range, no bouncing out of the stretch.'},
    {n:'Machine hip thrust',s:3,r:'10\u201312',nt:'Glute focus without a barbell hinge',priority:'normal',compound:true,inputType:'weight',wlabel:'Stack / plate weight',primaryMuscles:['Glutes'],secondaryMuscles:['Hamstrings'],tip:'Drive through heels, squeeze at the top, don\u2019t overarch the lower back.'},
    {n:'Calf raises',s:4,r:'12\u201320',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Add kg if weighted',primaryMuscles:['Calves'],secondaryMuscles:[],tip:'Pause at the top, full stretch at the bottom.'},
    {n:'Hip abduction machine',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Glute medius/minimus'],secondaryMuscles:[],tip:'Controlled push out and return.'},
    {n:'Hip adduction machine',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Adductors'],secondaryMuscles:[],tip:'Same machine as abduction, opposite direction.'},
    {n:'Cable pull-through',s:3,r:'10\u201312',nt:'Hip hinge pattern without a deadlift bar',priority:'normal',compound:true,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Lower back'],secondaryMuscles:['Glutes','Hamstrings'],tip:'Hips back, not down \u2014 this is a hinge, not a squat.'}
  ]},
  {label:'Cardio + core',focus:'Strava run day \u00b7 distance, pace, elev, calories',time:'Outdoors / Strava',ex:[
    {n:'Steady cardio',s:1,r:'20\u201340 min',nt:'Logged via Strava section',priority:'normal',noweight:true,inputType:'seconds',wlabel:'Minutes',primaryMuscles:['Cardio'],secondaryMuscles:['Calves','Quads']}
  ]},
];
/* legacy cardio exercise catalog kept for history lookups */
const CARDIO_DAY_EX=[
    {n:'Steady cardio',s:1,r:'20\u201340 min',nt:'Log minutes in the time field',priority:'normal',noweight:true,inputType:'choice',primaryMuscles:['Cardio'],secondaryMuscles:[],
     choiceOptions:[
       {name:'Incline treadmill walk',r:'25\u201340 min',inputType:'seconds',wlabel:'Minutes',primaryMuscles:['Cardio'],secondaryMuscles:['Calves','Glutes']},
       {name:'Exercise bike',r:'20\u201335 min',inputType:'seconds',wlabel:'Minutes',primaryMuscles:['Cardio'],secondaryMuscles:['Quads']},
       {name:'Rowing machine',r:'15\u201325 min',inputType:'seconds',wlabel:'Minutes',primaryMuscles:['Cardio'],secondaryMuscles:['Lats','Mid-back']},
       {name:'Outdoor run / jog',r:'20\u201330 min',inputType:'seconds',wlabel:'Minutes',primaryMuscles:['Cardio'],secondaryMuscles:['Calves','Quads']}
     ]},
    {n:'Intervals (optional finisher)',s:1,r:'10\u201315 min',nt:'Work hard / easy repeats',priority:'normal',noweight:true,inputType:'seconds',wlabel:'Minutes',primaryMuscles:['Cardio'],secondaryMuscles:[],tip:'Example: 1 min hard, 1 min easy \u00d7 8\u201310. Log total minutes.'},
    {n:'Plank',s:3,r:'30\u201360s',nt:'',priority:'normal',noweight:true,inputType:'seconds',wlabel:'Seconds held',primaryMuscles:['Core'],secondaryMuscles:[],tip:'Hips level \u2014 not sagging, not piked. Breathe normally.'},
    {n:'Dead bug',s:3,r:'10 each',nt:'',priority:'normal',noweight:true,inputType:'reps_each',wlabel:'Reps per side',primaryMuscles:['Core'],secondaryMuscles:[],tip:'Lower back stays pressed into the floor.'},
    {n:'Cable crunch',s:3,r:'12\u201315',nt:'',priority:'normal',compound:false,inputType:'weight',wlabel:'Stack weight',primaryMuscles:['Abs'],secondaryMuscles:[],tip:'Round through the spine \u2014 crunch at the waist, not just arm pull.'},
    {n:'Hanging knee raises',s:3,r:'8\u201312',nt:'',priority:'normal',noweight:true,inputType:'bodyweight',wlabel:'Bodyweight',primaryMuscles:['Abs'],secondaryMuscles:['Hip flexors'],tip:'Control the swing \u2014 raise knees with the abs, not momentum.'}
];
const SUBS={
  'Incline DB press':['Incline machine press','Incline press (Smith machine)','High-to-low cable fly'],
  'Machine chest press':['DB flat chest press','Pec deck'],
  'Machine chest fly':['Cable fly','DB fly','Pec deck'],
  'Seated DB shoulder press':['Machine shoulder press','Arnold press','Smith machine shoulder press'],
  'Lateral raises':['Cable lateral raise','Machine lateral raise'],
  'Cable tricep pushdown':['Rope pushdown','DB kickback','Machine tricep dip'],
  'Overhead tricep extension':['Cable overhead extension','Skull crushers'],
  'Pull-ups or lat pulldown':['Assisted pull-ups (machine)','Band-assisted pull-ups','Lat pulldown','Pull-ups (unassisted)'],
  'Seated cable row':['DB row','Machine row','T-bar row','Smith machine row'],
  'Single arm DB row':['Cable single arm row','Machine row'],
  'Face pulls':['Reverse cable fly','Rear delt machine fly','Band pull-apart'],
  'Dumbbell curl (alternating)':['EZ bar curl','Cable curl','Barbell curl','Reverse EZ bar curl'],
  'Hammer curls':['Cable hammer curl','Cross-body curl'],
  'Dumbbell shrugs':['Barbell shrug','Smith machine shrug'],
  'Leg press':['Hack squat machine (light)','Step-ups (bodyweight)','Wall sit (hold 60s)'],
  'Walking lunges':['Reverse lunges','Bulgarian split squat (light DBs)','Step-ups (bodyweight)'],
  'Leg extension (machine)':['TKE \u2014 terminal knee extension'],
  'Seated leg curl':['Lying leg curl','Nordic curl'],
  'Machine hip thrust':['Cable kickback','Glute bridge (bodyweight)'],
  'Calf raises':['Seated calf raise','Single-leg calf raise'],
  'Hip abduction machine':['Cable kickback','Band side walk'],
  'Hip adduction machine':['Copenhagen plank (short holds)'],
  'Cable pull-through':['45\u00b0 back extension','Bird dog'],
  'Steady cardio':['Jump rope','Stair climber','Elliptical'],
  'Intervals (optional finisher)':['Jump rope intervals','Assault bike intervals'],
  'Plank':['Dead bug','Bear crawl hold','Pallof press'],
  'Dead bug':['Bird-dog','Pallof press'],
  'Cable crunch':['Ab wheel (kneeling)','Lying crunch'],
  'Hanging knee raises':['Captain\u2019s chair knee raises','Lying leg raises']
};
/* Substitutes whose measurement type differs from the slot they replace. */
const SUB_TYPE_OVERRIDE={
  'Lat pulldown':{inputType:'weight',wlabel:'Stack weight'},
  'Assisted pull-ups (machine)':{inputType:'weight',wlabel:'Assist stack weight (lighter assist = harder)'},
  'Pull-ups (unassisted)':{inputType:'bodyweight',wlabel:'Bodyweight (add kg if weighted)',noweight:true},
  'Step-ups (bodyweight)':{inputType:'bodyweight',wlabel:'Bodyweight (add kg if weighted)',noweight:true},
  'Wall sit (hold 60s)':{inputType:'seconds',wlabel:'Seconds held',noweight:true},
  'Pallof press':{inputType:'weight',wlabel:'Stack weight'},
  'Hack squat machine (light)':{nt:'Light to moderate \u2014 stop if knees or back complain'},
  'Bulgarian split squat (light DBs)':{nt:'Short range is fine \u2014 balance first, load second'},
  'Glute bridge (bodyweight)':{inputType:'bodyweight',wlabel:'Bodyweight (add plate to hips if weighted)',noweight:true},
  'Reverse cable fly':{nt:'Shoulder health \u2014 keep elbows soft'},
  'Rear delt machine fly':{nt:'Shoulder health'},
  'Band pull-apart':{nt:'Shoulder health'},
  'Reverse EZ bar curl':{primaryMuscles:['Forearms'],secondaryMuscles:['Brachialis'],nt:'Pronated grip \u2014 lighter than your normal curl'},
  '45\u00b0 back extension':{inputType:'bodyweight',wlabel:'Bodyweight (add plate to chest if weighted)',noweight:true,nt:'Slow and controlled \u2014 don\u2019t overarch'},
  'Bird dog':{inputType:'bodyweight',wlabel:'Bodyweight',noweight:true},
  'Jump rope':{inputType:'seconds',wlabel:'Minutes',noweight:true},
  'Stair climber':{inputType:'seconds',wlabel:'Minutes',noweight:true},
  'Elliptical':{inputType:'seconds',wlabel:'Minutes',noweight:true},
  'Jump rope intervals':{inputType:'seconds',wlabel:'Minutes',noweight:true},
  'Assault bike intervals':{inputType:'seconds',wlabel:'Minutes',noweight:true}
};
function findExDef(name){
  const catalogs=[...DAYS.map(d=>d.ex),CARDIO_DAY_EX];
  for(const exList of catalogs){for(const e of exList){
    if(e.n===name)return e;
    if(e.inputType==='choice'&&e.choiceOptions){const o=e.choiceOptions.find(o=>o.name===name);if(o)return{...e,...o};}
  }}
  // Check custom exercises saved locally
  try{
    const customs = lsG('custom_exs') || [];
    const c = customs.find(x => x.n === name);
    if(c) return {...c, s:c.s||3, r:c.r||'10–12', inputType:c.inputType||'weight', wlabel:c.wlabel||'kg'};
  }catch(e){}
  for(const origName in SUBS){
    if(SUBS[origName].includes(name)){
      const origDef=[...DAYS.flatMap(d=>d.ex),...CARDIO_DAY_EX].find(x=>x.n===origName);
      const override=SUB_TYPE_OVERRIDE[name];
      return{
        n:name,s:origDef?.s||3,r:origDef?.r||'10\u201312',
        inputType:override?.inputType||origDef?.inputType||'weight',
        wlabel:override?.wlabel||inferSubWlabel(name)||origDef?.wlabel||'kg',
        nt:override?.nt!==undefined?override.nt:(origDef?.nt||''),
        noweight:override?.noweight||false,compound:origDef?.compound||false,
        primaryMuscles:override?.primaryMuscles||origDef?.primaryMuscles||[],
        secondaryMuscles:override?.secondaryMuscles||origDef?.secondaryMuscles||[],
        subOf:origName
      };
    }
  }
  return null;
}
function inferSubWlabel(name){
  const n=name.toLowerCase();
  if(/smith machine/.test(n)){
    const sw=(lsG('bar_weights')||{}).smith;
    return sw?'Total kg incl. bar (Smith bar confirmed: '+sw+'kg)':'Total kg incl. bar (Smith bar weight varies by machine \u2014 check yours)';
  }
  if(/ez bar|ez curl/.test(n))return 'Total kg incl. bar (10kg EZ bar, confirmed)';
  if(/cable|machine|stack|pulldown|pec deck|dip/.test(n))return 'Stack weight';
  if(/single arm|one arm|one hand/.test(n))return 'Dumbbell weight (one hand)';
  if(/db |dumbbell/.test(n))return 'Per dumbbell (each hand)';
  if(/barbell|\bbb\b/.test(n))return 'Total kg incl. bar (\u2248 20kg Olympic bar)';
  return null;
}
const FOODS=[
  /* Starter staples — add HelloFresh meals & supplements via Recipes (photo → save). */
  {name:'Chicken breast (grilled)',cat:'Protein',per100:{k:165,p:31,c:0,f:3.6},typ:150},
  {name:'Chicken thigh (skinless, cooked)',cat:'Protein',per100:{k:179,p:25,c:0,f:8},typ:150},
  {name:'Salmon (baked)',cat:'Protein',per100:{k:208,p:22,c:0,f:13},typ:120},
  {name:'Tuna (tinned in brine, drained)',cat:'Protein',per100:{k:86,p:19,c:0,f:1},typ:100},
  {name:'Lean beef mince (5%, cooked)',cat:'Protein',per100:{k:176,p:27,c:0,f:8},typ:150},
  {name:'Egg (boiled, medium)',cat:'Eggs',per100:{k:155,p:13,c:1,f:11},typ:58,unit:'piece',lbl:'per egg'},
  {name:'Egg fry / omelette (per egg)',cat:'Eggs',per100:{k:190,p:12,c:1,f:15},typ:55,unit:'piece',lbl:'per egg, oil-inclusive',oilInclusive:true},
  {name:'Greek yogurt (0% fat)',cat:'Protein',per100:{k:59,p:10,c:3.6,f:0.4},typ:170},
  {name:'Cottage cheese',cat:'Protein',per100:{k:98,p:11,c:3.4,f:4.3},typ:150},
  {name:'Tofu (firm)',cat:'Protein',per100:{k:144,p:17,c:3,f:9},typ:150},
  {name:'White rice (cooked)',cat:'Carbs',per100:{k:130,p:2.7,c:28,f:0.3},typ:150},
  {name:'Brown rice (cooked)',cat:'Carbs',per100:{k:112,p:2.6,c:24,f:0.9},typ:150},
  {name:'Pasta (cooked)',cat:'Carbs',per100:{k:131,p:5,c:25,f:1.1},typ:180},
  {name:'Potato (boiled)',cat:'Carbs',per100:{k:87,p:1.9,c:20,f:0.1},typ:200},
  {name:'Sweet potato (baked)',cat:'Carbs',per100:{k:90,p:2,c:21,f:0.2},typ:200},
  {name:'Oats (dry)',cat:'Carbs',per100:{k:389,p:17,c:66,f:7},typ:40},
  {name:'Wholemeal bread',cat:'Carbs',per100:{k:247,p:13,c:41,f:4.2},typ:40,unit:'piece',lbl:'per slice (~40g)'},
  {name:'Banana',cat:'Carbs',per100:{k:89,p:1.1,c:23,f:0.3},typ:120,unit:'piece',lbl:'per medium banana'},
  {name:'Apple',cat:'Carbs',per100:{k:52,p:0.3,c:14,f:0.2},typ:180,unit:'piece'},
  {name:'Broccoli (cooked)',cat:'Greens',per100:{k:35,p:2.4,c:7,f:0.4},typ:100},
  {name:'Mixed salad (no dressing)',cat:'Greens',per100:{k:20,p:1.2,c:3,f:0.2},typ:100},
  {name:'Spinach (fresh)',cat:'Greens',per100:{k:23,p:2.9,c:3.6,f:0.4},typ:100},
  {name:'Avocado',cat:'Extras',per100:{k:160,p:2,c:9,f:15},typ:70},
  {name:'Olive oil',cat:'Extras',per100:{k:884,p:0,c:0,f:100},typ:5,unit:'tsp',lbl:'per tsp (5ml)'},
  {name:'Cooking oil',cat:'Extras',per100:{k:884,p:0,c:0,f:100},typ:5,unit:'tsp',lbl:'per tsp \u2014 only if not already in dish'},
  {name:'Whey protein (generic scoop)',cat:'Supplements',per100:{k:400,p:80,c:8,f:5},typ:30,unit:'scoop',lbl:'per scoop (~30g) \u2014 edit macros to match your tub'},
  {name:'Creatine monohydrate',cat:'Supplements',per100:{k:0,p:0,c:0,f:0},typ:5,unit:'scoop',lbl:'5g daily \u2014 negligible macros'},
  {name:'Milk (semi-skimmed)',cat:'Extras',per100:{k:47,p:3.5,c:4.8,f:1.7},typ:250,unit:'ml'},
  {name:'HelloFresh meal (placeholder)',cat:'Mains',per100:{k:150,p:12,c:15,f:5},typ:400,lbl:'Replace with a photo recipe from your pack label'}
];
const DNAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MEAL_TYPES=['Breakfast','Lunch','Dinner','Snack'];
/* ===== SHARED MUTABLE STATE (globalThis-hosted) =====
   These four are read and written across multiple modules. Declaring them as globalThis
   properties lets any module do `foo = ...` (bare-identifier writes fall back to
   globalThis when the property already exists) and `foo` reads (bare-identifier reads
   walk the scope chain and find globalThis last). Keeping them off `let` bindings avoids
   the module-scope-vs-globalThis divergence you'd otherwise hit. */
globalThis.WS = {};
globalThis.adHocDay = null;
globalThis.adHocSeqIdx = null;
globalThis._forcePickerOnce = false;

/* ===== STORAGE ===== */
function escHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function lsG(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}}
function lsS(k,v){
  try{
    localStorage.setItem(k,JSON.stringify(v));
    return true;
  }catch(e){
    showStorageFailWarning();
    return false;
  }
}
function showStorageFailWarning(){
  if(document.getElementById('storage-fail-banner'))return;
  document.body.insertAdjacentHTML('afterbegin','<div id="storage-fail-banner" style="position:relative;z-index:998;background:var(--rbg);color:var(--red);font-size:13px;font-weight:700;padding:9px 14px;text-align:center">&#x26A0; Your device is out of storage space \u2014 this change may NOT have saved. Free up space or export/share your data now.</div>');
}
function getProfile(){
  const p=lsG('user_profile')||{targets:{protein:140,kcal:2200,carbs:220,fat:65},heightCm:null,goalWeight:null,goalBF:null,trainingDaysPerWeek:4};
  if(!p.targets)p.targets={protein:140,kcal:2200,carbs:220,fat:65};
  return p;
}
function clearLegacyAuth(){try{localStorage.removeItem('auth_user');localStorage.removeItem('google_client_id');}catch(e){}}
function getBodyForCalcs(){
  const prof=getProfile();
  const stats=lsG('bstats')||[];
  const latest=[...stats].filter(s=>s.wt||s.bf).sort((a,b)=>String(a.date).localeCompare(String(b.date))).reverse()[0];
  const weightKg=parseFloat(latest?.wt)||null;
  const bodyFatPct=parseFloat(latest?.bf)||null;
  const heightCm=parseFloat(prof.heightCm)||null;
  const leanMassKg=(weightKg&&bodyFatPct!=null)?Math.round(weightKg*(1-bodyFatPct/100)*10)/10:null;
  return{
    weightKg,
    bodyFatPct,
    heightCm,
    leanMassKg,
    available:!!(weightKg>0),
    source:latest?(latest.date+' body log'):'no body log yet'
  };
}
function saveProfile(p){lsS('user_profile',p);}
function saveBioProfile(){
  const prof=getProfile();
  const h=parseFloat(document.getElementById('bio-height')?.value);
  const gw=parseFloat(document.getElementById('bio-goal-wt')?.value);
  const gbf=parseFloat(document.getElementById('bio-goal-bf')?.value);
  const days=parseInt(document.getElementById('bio-days')?.value);
  if(h>0)prof.heightCm=h; else if(document.getElementById('bio-height')?.value==='')prof.heightCm=null;
  if(gw>0)prof.goalWeight=gw; else if(document.getElementById('bio-goal-wt')?.value==='')prof.goalWeight=null;
  if(gbf>=0&&!Number.isNaN(gbf)&&document.getElementById('bio-goal-bf')?.value!=='')prof.goalBF=gbf;
  else if(document.getElementById('bio-goal-bf')?.value==='')prof.goalBF=null;
  if(days>0)prof.trainingDaysPerWeek=days;
  delete prof.weight;
  delete prof.bodyFat;
  saveProfile(prof);
  const c=document.getElementById('bio-conf');if(c){c.style.display='block';setTimeout(()=>c.style.display='none',1500);}
  updateHeader();
  updateHeaderSub();
}

function deleteProfile(){
  if(!confirm('Delete your saved profile (height, goals, training days)?'))return;
  try{localStorage.removeItem('user_profile');}catch(e){}
  updateHeader();updateHeaderSub();renderProfile();alert('Profile cleared.');
}

function deleteLatestBodyLog(){
  const stats=lsG('bstats')||[];
  if(!stats.length){alert('No body logs to delete.');return;}
  const latestIdx=[...stats].filter(s=>s.wt||s.bf).sort((a,b)=>String(a.date).localeCompare(String(b.date))).reverse()[0];
  if(!latestIdx){alert('No body logs to delete.');return;}
  const dateToRemove=latestIdx.date;
  if(!confirm('Delete body log for '+dateToRemove+'? This cannot be undone.'))return;
  const all=lsG('bstats')||[];
  const idx=all.findIndex(s=>s.date===dateToRemove);
  if(idx>=0){all.splice(idx,1);lsS('bstats',all.slice(-400));}
  updateHeader();updateHeaderSub();renderProfile();alert('Deleted body log: '+dateToRemove);
}
function saveTargets(){
  const prof=getProfile();
  const gv=id=>parseFloat(document.getElementById(id)?.value);
  const protein=gv('prof-protein'),kcal=gv('prof-kcal'),carbs=gv('prof-carbs'),fat=gv('prof-fat');
  if(!protein||!kcal||!carbs||!fat){alert('All four targets must be positive numbers.');return;}
  prof.targets={protein,kcal,carbs,fat};
  saveProfile(prof);
  updateHeader();renderFood();renderProgress();renderProfile();
  alert('Targets saved.');
}
function saveBarWeight(){
  const v=document.getElementById('bar-smith')?.value.trim();
  lsS('bar_weights',{smith:v||''});
  renderProgress();
  if(v)alert('Smith machine bar weight saved: '+v+'kg');
}
function lsDel(k){try{localStorage.removeItem(k);}catch{}}
function todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function yesterdayKey(){const d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function formatDateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function parseDateKey(k){const p=(k||todayKey()).split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function monthKeyFor(dateKey){return(dateKey||todayKey()).slice(0,7);}
function monthKey(){return monthKeyFor(todayKey());}
function prevMonthKey(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function mergedMlog(){return{...(lsG('mlog:'+prevMonthKey())||{}),...(lsG('mlog:'+monthKey())||{})};}
/* Workout log date — can be today or a past day when catching up. Declared on
   globalThis so tab modules can reassign it via bare identifier writes without
   needing an explicit import. */
globalThis._logDateKey=null;
function activeDateKey(){return _logDateKey||todayKey();}
function isLoggingToday(){return activeDateKey()===todayKey();}
function setLogDate(key){
  if(!key)return;
  const max=todayKey();
  if(key>max)key=max;
  if(key===activeDateKey())return;
  _logDateKey=key===max?null:key;
  Object.keys(WS).forEach(k=>delete WS[k]);adHocDay=null;adHocSeqIdx=null;_forcePickerOnce=false;
  showStickyBtn(false);stopTimerTick();
  renderToday();
}
function shiftLogDate(delta){
  const d=parseDateKey(activeDateKey());
  d.setDate(d.getDate()+delta);
  setLogDate(formatDateKey(d));
}
function fmtLogDateLabel(key){
  const d=parseDateKey(key);
  const today=todayKey();
  const y=yesterdayKey();
  if(key===today)return'Today';
  if(key===y)return'Yesterday';
  return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
}
function checkStorage(){try{localStorage.setItem('__t__','1');localStorage.removeItem('__t__');}catch{document.getElementById('warn-banner').style.display='block';}}

/* ===== BODY DIAGRAM (body-muscles library integration) =====
   Maps our existing muscle tag taxonomy onto the library's real region IDs.
   Library splits every region by left/right; ours doesn't, so both sides always
   get the same value. A few mappings are honest approximations, not exact 1:1 matches,
   since the library's regional split doesn't perfectly mirror ours everywhere \u2014
   marked inline where that's true. */
const MUSCLE_TAG_TO_LIB_IDS={
  'Cardio':['quads-left','quads-right','calves-gastroc-medial-left','calves-gastroc-medial-right'],
  'Hip flexors':['hip-flexor-left','hip-flexor-right'],
  'Glutes':['gluteus-maximus-left','gluteus-maximus-right'],
  'Abs':['abs-upper-left','abs-upper-right','abs-lower-left','abs-lower-right'],
  'Chest':['chest-lower-left','chest-lower-right'],
  'Upper chest':['chest-upper-left','chest-upper-right'],
  'Lower chest':['chest-lower-left','chest-lower-right'],
  'Front delts':['shoulder-front-left','shoulder-front-right'],
  'Side delts':['shoulder-side-left','shoulder-side-right'],
  'Rear delts':['deltoid-rear-left','deltoid-rear-right'],
  'Biceps':['biceps-left','biceps-right'],
  'Biceps (long head)':['biceps-left','biceps-right'],
  'Brachialis':['biceps-left','biceps-right'], /* approximation: library has no separate brachialis region */
  'Triceps':['triceps-long-left','triceps-long-right','triceps-lateral-left','triceps-lateral-right'],
  'Triceps (long head)':['triceps-long-left','triceps-long-right'],
  'Triceps (lateral/medial)':['triceps-lateral-left','triceps-lateral-right'],
  'Forearms':['forearm-left','forearm-right','forearm-flexors-left','forearm-flexors-right','forearm-extensors-left','forearm-extensors-right'],
  'Abs':['abs-upper-left','abs-upper-right','abs-lower-left','abs-lower-right'],
  'Obliques':['obliques-left','obliques-right'],
  'Traps':['traps-upper-left','traps-upper-right','traps-mid-left','traps-mid-right','traps-lower-left','traps-lower-right'],
  'Lats':['lats-upper-left','lats-upper-right','lats-mid-left','lats-mid-right','lats-lower-left','lats-lower-right'],
  'Mid-back':['lats-upper-left','lats-upper-right','traps-lower-left','traps-lower-right'], /* approximation: no distinct rhomboid region */
  'Lower back':['lower-back-erectors-left','lower-back-erectors-right','lower-back-ql-left','lower-back-ql-right'],
  'Quads':['quads-left','quads-right'],
  'Adductors':['adductors-left','adductors-right'],
  'Glutes':['gluteus-maximus-left','gluteus-maximus-right'],
  'Glute medius/minimus':['gluteus-medius-left','gluteus-medius-right'],
  'Hamstrings':['hamstrings-medial-left','hamstrings-medial-right','hamstrings-lateral-left','hamstrings-lateral-right'],
  'Calves':['calves-gastroc-medial-left','calves-gastroc-medial-right','calves-gastroc-lateral-left','calves-gastroc-lateral-right','calves-soleus-left','calves-soleus-right'],
  'Core':['abs-upper-left','abs-upper-right','abs-lower-left','abs-lower-right'], /* approximation: stabilizer work, no distinct library region */
  'Rotator cuff':['deltoid-rear-left','deltoid-rear-right'] /* approximation: no distinct region, trained alongside rear delts */
};
function volumeToBodyState(volumeList){
  const maxVol=volumeList.length?Math.max(...volumeList.map(v=>v.volume)):1;
  const state={};
  volumeList.forEach(v=>{
    const ids=MUSCLE_TAG_TO_LIB_IDS[v.muscle];
    if(!ids)return;
    const ratio=v.volume/maxVol;
    const intensity=Math.min(10,Math.max(1,Math.round(ratio*10)));
    ids.forEach(id=>{state[id]={intensity,selected:false};});
  });
  return state;
}
function freshnessToBodyState(freshnessList){
  const state={};
  freshnessList.forEach(f=>{
    const ids=MUSCLE_TAG_TO_LIB_IDS[f.muscle];
    if(!ids)return;
    /* Inverted: freshness 0 (just trained) -> intensity 10 (deep red, "still recovering").
       freshness 1 (fully recovered) -> intensity 0 (neutral grey, nothing to flag). */
    const intensity=Math.round((1-f.freshness)*10);
    ids.forEach(id=>{state[id]={intensity,selected:false};});
  });
  return state;
}
/* Reverse lookup, built once: library region ID -> our tag name(s). */
const LIB_ID_TO_TAGS={};
Object.entries(MUSCLE_TAG_TO_LIB_IDS).forEach(([tag,ids])=>{
  ids.forEach(id=>{(LIB_ID_TO_TAGS[id]=LIB_ID_TO_TAGS[id]||[]).push(tag);});
});
/* Real bug fix: some library regions map to more than one app tag (e.g. plain 'Triceps'
   AND the more specific 'Triceps (long head)' both resolve to the same region, since the
   generic tag exists only for exercises that mention it as a minor secondary effect).
   Tapping that region always used to just take the first tag in the array, which could be
   the generic one even when zero exercises actually use it as their real target \u2014 showing
   an empty, useless exercise list. This picks whichever candidate tag has at least one real
   primary exercise, falling back to the first candidate only if none do. */
const TAGS_WITH_PRIMARY_USE=new Set(
  Object.keys(MUSCLE_TAG_TO_LIB_IDS).filter(tag=>DAYS.some(d=>d.ex.some(e=>(e.primaryMuscles||[]).includes(tag))))
);
function resolveClickedTag(id){
  const tags=LIB_ID_TO_TAGS[id]||[];
  return tags.find(t=>TAGS_WITH_PRIMARY_USE.has(t))||tags[0];
}
/* The real fix: some regions (biceps long head vs brachialis, chest vs lower chest) are
   drawn as the exact same shape in the underlying anatomy library \u2014 there's no way to
   tell which one was tapped. Picking a single "winner" tag permanently hides the other
   muscle's real exercises. This returns every candidate tag that has at least one real
   exercise attached, primary-having tags first, so the UI can show all of them clearly
   labeled instead of silently discarding one. */
function resolveClickedTagsAll(id){
  const tags=LIB_ID_TO_TAGS[id]||[];
  const withPrimary=tags.filter(t=>TAGS_WITH_PRIMARY_USE.has(t));
  const rest=tags.filter(t=>!TAGS_WITH_PRIMARY_USE.has(t)&&getExercisesForMuscleTag(t).length>0);
  const ordered=[...withPrimary,...rest];
  return ordered.length?ordered:(tags.length?[tags[0]]:[]);
}
function getExercisesForMuscleTag(tag){
  return getFreeSessionExerciseList().filter(e=>
    (e.primaryMuscles||[]).includes(tag)||(e.secondaryMuscles||[]).includes(tag)
  );
}
function mountBodyDiagram(frontElId,backElId,bodyState,onMuscleClick,prevInstances){
  if(prevInstances?.front)prevInstances.front.destroy();
  if(prevInstances?.back)prevInstances.back.destroy();
  const fEl=document.getElementById(frontElId),bEl=document.getElementById(backElId);
  if(!fEl||!bEl||typeof BodyMuscles==='undefined')return{front:null,back:null};
  const front=new BodyMuscles.BodyChart(fEl,{view:BodyMuscles.ViewSide.FRONT,bodyState,onMuscleClick});
  const back=new BodyMuscles.BodyChart(bEl,{view:BodyMuscles.ViewSide.BACK,bodyState,onMuscleClick});
  return{front,back};
}

/* ===== DATA LAYER (first slice \u2014 PR/session/draft access only, existing call sites not yet migrated) =====
   This exists so the next migration pass has a single, tested, correct place to point every
   old lsG/lsS call at, instead of each call site inventing its own key-naming convention.
   Every method here mirrors exactly what the scattered inline calls already do today, so
   swapping a call site to use this later is a safe, behavior-identical change, not a rewrite. */
const Data={
  pr:{
    get(name){return lsG('pr:'+name);},
    set(name,best){return lsS('pr:'+name,{w:best.w,r:best.r,date:activeDateKey()});},
    clearAll(){
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i);
        if(k&&k.startsWith('pr:'))localStorage.removeItem(k);
      }
    }
  },
  session:{
    get(dateKey){return lsG('sess:'+(dateKey||todayKey()));},
    set(session,dateKey){return lsS('sess:'+(dateKey||todayKey()),session);},
    delete(dateKey){return lsDel('sess:'+(dateKey||todayKey()));},
    getLast(dl){return lsG('last:'+dl);},
    setLast(dl,data){return lsS('last:'+dl,data);}
  },
  draft:{
    save(dl,state){const dk=activeDateKey();return lsS('ws_draft:'+dk,{dl,state,date:dk});},
    findAny(){
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k&&k.startsWith('ws_draft:')){
          const d=lsG(k);
          if(d&&d.dl&&d.state)return d;
        }
      }
      return null;
    },
    clearAll(){
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i);
        if(k&&k.startsWith('ws_draft:'))localStorage.removeItem(k);
      }
    }
  }
};

/* ===== HEADER ===== */
function getSmoothedWeight(stats){
  const withWt=(stats||[]).filter(s=>s.wt);
  if(!withWt.length)return null;
  const last3=withWt.slice(-3);
  const avg=last3.reduce((s,e)=>s+parseFloat(e.wt),0)/last3.length;
  return{value:avg,smoothed:last3.length>1,entriesUsed:last3.length};
}
function updateHeader(){
  const log=lsG('food:'+todayKey())||[];
  const t=getProfile().targets;
  const p=Math.round(log.reduce((s,i)=>s+(i.p||0),0));
  const k=Math.round(log.reduce((s,i)=>s+(i.k||0),0));
  const stats=lsG('bstats')||[];
  const sw=getSmoothedWeight(stats);
  const wt=sw?sw.value.toFixed(1)+'kg'+(sw.smoothed?'*':''):'\u2014';
  const ep=document.getElementById('hdr-p'),ek=document.getElementById('hdr-k'),ew=document.getElementById('hdr-wt');
  const epMv=document.getElementById('hdr-p-mv'),ekMv=document.getElementById('hdr-k-mv');
  const epl=document.getElementById('hdr-p-lbl'),ekl=document.getElementById('hdr-k-lbl');
  if(ep)ep.textContent=p+'g';
  if(epMv)epMv.className='mv'+(p<t.protein*0.53?' warn':'');
  if(epl)epl.textContent='/ '+t.protein+'\u2013'+Math.round(t.protein*1.15)+'g protein';
  if(ek)ek.textContent=k;
  if(ekMv)ekMv.className='mv'+(k>t.kcal*1.1?' warn':'');
  if(ekl)ekl.textContent='/ '+t.kcal+' kcal';
  if(ew)ew.textContent=wt;
  updateHeaderSub();
}

/* ===== SEQUENCE ===== */
function getNextIdx(){
  const l=lsG('last_seq_idx');
  return(l===null||l===undefined)?null:(parseInt(l)+1)%4;
}
function getSkipWarnings(){
  const mlog=mergedMlog();
  const recent=Object.entries(mlog).sort((a,b)=>a[0].localeCompare(b[0])).map(e=>e[1]).filter(e=>e.type==='done').slice(-8).map(e=>e.seqIdx).filter(i=>i!==undefined);
  if(recent.length<4)return null;
  const last6=recent.slice(-6);
  const missing=SEQ.filter((_,i)=>!last6.includes(i));
  return missing.length?missing:null;
}

/* ===== DRAFT ===== */
function saveDraft(dl){if(WS[dl])Data.draft.save(dl,WS[dl]);}
function clearDraft(){Data.draft.clearAll();}


/* ===== OVERLOAD ===== */
/* ===== COACH NAMESPACE ===== */
/* Pure logic, zero DOM access. v2.3's coaching cards call into this; nothing here renders anything. */
const Coach={
  getDailyStatus(dateKey){
    dateKey=dateKey||todayKey();
    const t=getProfile().targets;
    const log=lsG('food:'+dateKey)||[];
    const p=log.reduce((s,i)=>s+(i.p||0),0),k=log.reduce((s,i)=>s+(i.k||0),0),
          c=log.reduce((s,i)=>s+(i.c||0),0),f=log.reduce((s,i)=>s+(i.f||0),0);
    return{
      proteinGap:Math.max(0,t.protein-p),kcalGap:Math.max(0,t.kcal-k),
      carbsGap:Math.max(0,t.carbs-c),fatGap:Math.max(0,t.fat-f),
      onTrack:p>=t.protein&&k<=t.kcal*1.1
    };
  },
  getWeeklyStatus(){
    const cutoff=(()=>{const d=new Date();d.setDate(d.getDate()-7);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
    const entries=Object.entries(mergedMlog()).filter(([k])=>k>=cutoff).map(e=>e[1]);
    const done=entries.filter(e=>e.type==='done').length;
    let pSum=0,kSum=0,days=0;
    for(let i=0;i<7;i++){
      const d=new Date();d.setDate(d.getDate()-i);
      const dk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      const log=lsG('food:'+dk);if(!log||!log.length)continue;
      pSum+=log.reduce((s,i)=>s+(i.p||0),0);kSum+=log.reduce((s,i)=>s+(i.k||0),0);days++;
    }
    return{sessionsDone:done,avgProtein:days?Math.round(pSum/days):0,avgKcal:days?Math.round(kSum/days):0,daysLogged:days};
  },
  get3SessionTrend(exerciseName){
    const hist=getExHistory(exerciseName).slice(-3);
    if(!hist.length)return{available:false};
    const best=hist.reduce((b,h)=>{
      if(!h.best)return b;
      const w=parseFloat(h.best.w)||0;
      return(!b||w>parseFloat(b.w||0))?h.best:b;
    },null);
    return{available:true,sessionsUsed:hist.length,bestOfLast3:best,mostRecent:hist[hist.length-1].best,improving:hist.length>=2&&parseFloat(hist[hist.length-1].best?.w||0)>=parseFloat(hist[0].best?.w||0)};
  },
  getSessionFeedback(session){
    if(!session||!session.totalVolume)return{available:false};
    const prevSess=Data.session.getLast(session.dl);
    const prevVol=prevSess?.exercises?.reduce((v,e)=>v+(e.exVolume||0),0)||0;
    return{available:true,volume:session.totalVolume,prevVolume:prevVol,trend:prevVol?(session.totalVolume>=prevVol?'up':'down'):'first'};
  },
  getWeeklyMuscleVolume(){
    const cutoff=(()=>{const d=new Date();d.setDate(d.getDate()-7);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
    const sets={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||!k.startsWith('sess:'))continue;
      const sess=lsG(k);
      if(!sess||sess.skipped||!sess.exercises||sess.date<cutoff)continue;
      sess.exercises.forEach(e=>{
        const def=findExDef(e.origName);
        if(!def)return;
        const completedSets=(e.sets||[]).filter(s=>s.done&&!s.isDrop).length;
        if(!completedSets)return;
        (def.primaryMuscles||[]).forEach(m=>{sets[m]=(sets[m]||0)+completedSets;});
        (def.secondaryMuscles||[]).forEach(m=>{sets[m]=(sets[m]||0)+completedSets*0.5;});
      });
    }
    return Object.entries(sets).map(([muscle,volume])=>({muscle,volume:Math.round(volume*10)/10})).sort((a,b)=>b.volume-a.volume);
  },
  /* Real freshness: recency weighted by how hard that specific session was relative to this
     muscle's own recent normal, not just a flat days-since-trained count. A heavier-than-usual
     session needs more recovery time than a light one at the same day count. */
  getMuscleFreshness(){
    const cutoff=(()=>{const d=new Date();d.setDate(d.getDate()-60);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
    const history={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||!k.startsWith('sess:'))continue;
      const sess=lsG(k);
      if(!sess||sess.skipped||!sess.exercises||sess.date<cutoff)continue;
      sess.exercises.forEach(e=>{
        const def=findExDef(e.origName);
        if(!def)return;
        const v=e.exVolume||0;
        const add=(m,mult)=>{(history[m]=history[m]||[]).push({date:sess.date,contribution:v*mult});};
        (def.primaryMuscles||[]).forEach(m=>add(m,1));
        (def.secondaryMuscles||[]).forEach(m=>add(m,0.5));
      });
    }
    const today=new Date();
    return Object.entries(history).map(([muscle,entries])=>{
      entries.sort((a,b)=>a.date.localeCompare(b.date));
      const last=entries[entries.length-1];
      const daysSince=Math.max(0,Math.floor((today-new Date(last.date))/86400000));
      const trailing=entries.slice(-4);
      const avg=trailing.reduce((s,e)=>s+e.contribution,0)/trailing.length;
      const ratio=avg>0?last.contribution/avg:1;
      const recoveryWindow=Math.min(6,Math.max(1.5,3*ratio));
      const freshness=Math.min(1,Math.max(0,daysSince/recoveryWindow));
      return{muscle,daysSince,freshness,lastDate:last.date};
    }).sort((a,b)=>a.freshness-b.freshness);
  },
  /* Deload/overreaching signal: reuses the freshness calculation above rather than a
     separate metric. If a genuine majority of currently-tracked muscles are simultaneously
     showing meaningful fatigue relative to their own normal (not just one muscle fresh from
     yesterday's session), that's a real system-wide signal worth surfacing \u2014 not a single
     sore muscle, a broad pattern across the whole week's training. Honestly gated on having
     enough muscles with real history to say anything at all. */
  getDeloadSignal(){
    const fresh=this.getMuscleFreshness();
    if(fresh.length<4)return{available:false,reason:'Not enough muscles with recent training history yet to say anything real.'};
    const fatigued=fresh.filter(f=>f.freshness<0.3);
    const ratio=fatigued.length/fresh.length;
    return{
      available:true,
      totalMuscles:fresh.length,
      fatiguedCount:fatigued.length,
      fatiguedMuscles:fatigued.map(f=>f.muscle),
      suggestDeload:ratio>=0.5,
      ratioPercent:Math.round(ratio*100)
    };
  }
};

function getSuggestion(orig,best,prKey){
  if(!best||!best.w)return orig.noweight?'Log to get targets':'No data yet \u2014 log this session';
  if(orig.inputType==='seconds'){
    const pr=prKey?Data.pr.get(prKey):null;
    if(pr&&parseFloat(best.w)<parseFloat(pr.w))return 'Work back to PR: '+pr.w+'s (this session: '+best.w+'s)';
    return 'Add 5s next session (was '+best.w+'s)';
  }
  if(orig.inputType==='reps_each')return 'Add 1 rep per side (was '+best.w+' each side)';
  if(orig.noweight&&orig.r==='Max reps'){
    const pr=prKey?Data.pr.get(prKey):null;
    if(pr&&parseInt(best.r||0)<parseInt(pr.r||0))return 'Work back to PR: '+pr.r+' reps (got '+best.r+' today)';
    return 'Beat '+best.r+' reps \u2014 add 1 per week';
  }
  const w=parseFloat(best.w),r=parseInt(best.r);
  const pr=prKey?Data.pr.get(prKey):null;
  if(pr&&w<parseFloat(pr.w))return 'Work back to PR: '+parseFloat(pr.w).toFixed(1)+'kg (was '+w+'kg today)';
  if(orig.compound!==false){
    const{recW}=getNextTargetWeight(orig,prKey||'',w,r);
    return recW>w?'Last top set: '+w+'kg \u00d7 '+r+' \u2014 try '+recW.toFixed(1)+'kg for today\u2019s top set':'Last top set: '+w+'kg \u00d7 '+r+' \u2014 hold '+w+'kg, aim for a clean rep';
  }
  const inc=1.0;
  if(orig.r.includes('\u2013')){
    const[lo,hi]=orig.r.split('\u2013').map(Number);
    if(r>=hi)return 'Increase to '+(w+inc).toFixed(1)+'kg \u2014 maxed '+hi+' reps';
    if(r>=(lo+hi)/2)return 'Hold '+w+'kg \u2014 push for '+hi+' reps';
    return 'Hold '+w+'kg \u2014 hit '+lo+' reps first';
  }
  const target=parseInt(orig.r)||r;
  return r>=target?'Increase to '+(w+inc).toFixed(1)+'kg':'Hold '+w+'kg \u2014 aim for '+target+' reps';
}

/* ===== PR DETECTION ===== */
function checkPR(origName,best,inputType){
  if(!best)return false;
  const cur=Data.pr.get(origName);
  const isRepsFirst=inputType==='bodyweight';
  const isTimeFirst=inputType==='seconds';
  if(isRepsFirst){
    if(!best.r||parseInt(best.r)<=0)return false;
    const bw=parseFloat(best.w||0),br=parseInt(best.r||0);
    const cw=cur?parseFloat(cur.w||0):0,cr=cur?parseInt(cur.r||0):0;
    if(!cur||br>cr||bw>cw){Data.pr.set(origName,{w:best.w||'0',r:best.r});return true;}
    return false;
  }
  if(!best.w||parseFloat(best.w)<=0)return false;
  if(isTimeFirst){
    const bw=parseFloat(best.w),cw=cur?parseFloat(cur.w||0):0;
    if(!cur||bw>cw){Data.pr.set(origName,{w:best.w,r:best.r});return true;}
    return false;
  }
  if(!cur||parseFloat(best.w)>parseFloat(cur.w)||(parseFloat(best.w)===parseFloat(cur.w)&&parseInt(best.r||0)>parseInt(cur.r||0))){
    Data.pr.set(origName,{w:best.w,r:best.r});return true;
  }
  return false;
}


/* ===== BACKUP + EXPORT + IMPORT ===== */
function exportData(){
  const all={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&!k.startsWith('ws_draft:'))all[k]=lsG(k);}
  const blob=new Blob([JSON.stringify(all,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download='gym-backup-'+todayKey()+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  lsS('last_export',todayKey());renderProgress();
}
function shareBackup(){
  const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);data[k]=localStorage.getItem(k);}
  const file=new File([JSON.stringify(data)],'gym-backup-'+todayKey()+'.json',{type:'application/json'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:'Gym backup '+todayKey()}).then(()=>{lsS('last_export',todayKey());renderProgress();}).catch(()=>{});
  }else{exportData();}
}
function showTextModal(title,text){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="background:var(--c1);border-radius:14px;padding:16px;max-width:480px;width:100%;max-height:85vh;display:flex;flex-direction:column;gap:10px">'
    +'<div style="font-weight:700;font-size:15px">'+title+'</div>'
    +'<textarea readonly style="flex:1;min-height:280px;font-family:monospace;font-size:12px;background:var(--c2);color:inherit;border:1px solid var(--c3);border-radius:8px;padding:10px" onclick="this.select()">'+text+'</textarea>'
    +'<div style="display:flex;gap:8px">'
    +'<button class="btn btn-grn btn-sm" style="flex:1" id="tm-copy">Copy</button>'
    +'<button class="btn btn-ghost btn-sm" style="flex:1" id="tm-close">Close</button>'
    +'</div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#tm-close').onclick=()=>ov.remove();
  ov.querySelector('#tm-copy').onclick=()=>{
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>alert('Copied.')).catch(()=>alert('Copy failed \u2014 select the text manually.'));}
    else{alert('Select the text manually to copy.');}
  };
}
function gastroExport(){/* removed — no medical export in personal Gym build */}
const APP_VERSION='v1.0';
function checkUpdate(){/* local personal build — no remote version check */}
function importData(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    if(!confirm('REPLACE all current data with this backup?'))return;
    try{const data=JSON.parse(e.target.result);localStorage.clear();Object.entries(data).forEach(([k,v])=>lsS(k,v));alert('Restored. Reloading.');location.reload();}
    catch{alert('Could not read backup file.');}
  };
  reader.readAsText(file);input.value='';
}

/* ===== SYMPTOM + WATER ===== */
function logSym(field,val){const dk=activeDateKey();const sym=lsG('sym:'+dk)||{};sym[field]=val;sym.date=dk;lsS('sym:'+dk,sym);renderToday();}
function adjWater(n){
  const dk=activeDateKey();
  const cur=lsG('water:'+dk)||0;const next=Math.max(0,Math.min(20,cur+n));
  lsS('water:'+dk,next);
  const el=document.getElementById('water-num'),bar=document.getElementById('water-bar');
  if(el){el.textContent=next;el.className='water-count'+(next>=8?' full':'');}
  if(bar)bar.style.width=Math.min(next/8*100,100)+'%';
}

/* ===== TIMER ===== */
let timerInterval=null;
function getElapsed(ts){if(!ts)return null;const s=Math.floor((Date.now()-ts)/1000);return Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s';}
function startTimerTick(){
  stopTimerTick();
  timerInterval=setInterval(()=>{
    const gd=adHocDay||DAYS[getNextIdx()];if(!gd)return;
    const ws=WS[gd.label];if(!ws)return;
    const st=document.getElementById('sess-timer-num');if(st&&ws.startAt)st.textContent=getElapsed(ws.startAt);
    const rt=document.getElementById('rest-num');if(rt&&ws.lastSetAt)rt.textContent=getElapsed(ws.lastSetAt);
  },5000);
}
function stopTimerTick(){if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}

/* ===== WEATHER ===== */
let _wxCache={temp:null,ts:0};
async function fetchWeather(){
  if(_wxCache.temp!==null&&Date.now()-_wxCache.ts<1800000)return _wxCache.temp;
  try{
    const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m&timezone=Europe%2FLondon&forecast_days=1',{signal:AbortSignal.timeout(3000)});
    const d=await r.json();_wxCache={temp:Math.round(d.current.temperature_2m),ts:Date.now()};return _wxCache.temp;
  }catch{return _wxCache.temp;}
}
async function injectWeather(){
  const temp=await fetchWeather();
  const el=document.getElementById('wx-slot');if(!el)return;
  if(temp===null){el.remove();return;}
  let wx='';
  if(temp>=23){wx=`<div class="card cyan" style="margin-top:8px">
    <div class="cl">Outside now</div>
    <div style="font-size:20px;font-family:'Barlow',sans-serif;font-weight:900;color:var(--cyan)">${temp}&#x00B0;C Hot</div>
    <div style="font-size:13px;color:var(--mut);margin-top:6px">Hydrate extra on training days.</div></div>`;}
  else if(temp<=5){wx=`<div class="card" style="border-color:var(--cyan);margin-top:8px">
    <div class="cl">Outside now</div>
    <div style="font-size:20px;font-family:'Barlow',sans-serif;font-weight:900;color:var(--cyan)">${temp}&#x00B0;C Cold</div>
    <div style="font-size:13px;color:var(--mut);margin-top:6px">Cold can tighten joints \u2014 take a longer warm-up.</div></div>`;}
  else{wx=`<div style="font-size:12px;color:var(--mut);margin-top:4px;text-align:right">${temp}&#x00B0;C</div>`;}
  el.outerHTML=wx;
}

/* ===== STICKY BUTTON ===== */
function showStickyBtn(show,dl,seqIdx){
  const w=document.getElementById('sticky-wrap'),b=document.getElementById('sticky-btn');
  if(!w||!b)return;
  w.style.display=show?'block':'none';
  if(show&&dl!==undefined&&seqIdx!==undefined){
    b.disabled=false;b.style.opacity='';
    b.onclick=()=>{if(b.disabled)return;b.disabled=true;b.style.opacity='.6';saveSession(dl,seqIdx);};
  }
}

/* ===== HISTORY (buildSVG + shared history/e1RM helpers) ===== */
function buildSVG(points,color,unit){
  if(!points||points.length<2)return'<div style="color:var(--dim);font-size:13px;padding:20px;text-align:center">Need at least 2 entries to show a trend</div>';
  const vals=points.map(p=>p.y);
  const mn=Math.min(...vals),mx=Math.max(...vals),range=mx-mn||1;
  const W=320,H=100,pad=8;
  const biol=lsG('biologic_date');
  const px=i=>pad+(i/(points.length-1))*(W-pad*2);
  const py=y=>pad+(H-pad*2)-((y-mn)/range)*(H-pad*2);
  const polyPts=points.map((p,i)=>px(i)+','+py(p.y)).join(' ');
  let svg=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;overflow:visible">
    <polyline points="${polyPts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p,i)=>{
      const x=px(i),y=py(p.y);
      const isPR=p.pr;
      return`<circle cx="${x}" cy="${y}" r="${isPR?5:3}" fill="${isPR?'var(--gold)':color}" stroke="${isPR?color:'none'}" stroke-width="1.5"/>`;
    }).join('')}
    <text x="${pad}" y="${H}" fill="var(--dim)" font-size="9">${points[0].label}</text>
    <text x="${W-pad}" y="${H}" fill="var(--dim)" font-size="9" text-anchor="end">${points[points.length-1].label}</text>
    <text x="${pad}" y="11" fill="${color}" font-size="10" font-weight="bold">${mx.toFixed(1)}${unit}</text>
    <text x="${pad}" y="${H-10}" fill="${color}" font-size="10">${mn.toFixed(1)}${unit}</text>
    ${biol?`<line x1="${(()=>{const idx=points.findIndex(p=>p.date>=biol);return idx>=0?px(idx):px(points.length-1)})()}" y1="${pad}" x2="${(()=>{const idx=points.findIndex(p=>p.date>=biol);return idx>=0?px(idx):px(points.length-1)})()}" y2="${H-pad}" stroke="var(--amb)" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${(()=>{const idx=points.findIndex(p=>p.date>=biol);return idx>=0?px(idx)+3:px(points.length-1)+3})()}" y="${pad+10}" fill="var(--amb)" font-size="9">Biol.</text>`:''}
  </svg>`;
  return svg;
}

function getExHistory(name){
  const results=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('sess:'))continue;
    const sess=lsG(k);
    if(!sess||sess.skipped||!sess.exercises)continue;
    const ex=sess.exercises.find(e=>e.name===name);
    if(!ex||!ex.best||!ex.best.w)continue;
    results.push({date:sess.date,dl:sess.dl,best:ex.best,isPR:ex.isPR||false,suggestion:ex.suggestion||''});
  }
  return results.sort((a,b)=>a.date.localeCompare(b.date));
}
/* e1RM: average of Epley and Brzycki, the two most validated formulas, complementary at
   different rep ranges per the research (Epley better at 6-10+, Brzycki better at 1-6).
   Reliable in the 1-10 rep range; above that the estimate is noted as low-confidence
   rather than silently trusted, since the underlying formulas weren't built for it. */
function estimate1RM(weight,reps){
  const w=parseFloat(weight),r=parseInt(reps);
  if(!w||!r||r<1)return null;
  if(r===1)return{value:w,confidence:'high'};
  const epley=w*(1+r/30);
  const brzycki=r<36?w*36/(37-r):epley;
  return{value:(epley+brzycki)/2,confidence:r<=10?'high':'low'};
}
/* Real trend across the exercise's FULL history \u2014 every session ever logged for it,
   not a recent window. Analyzes everything the app has from when it was first used,
   growing as more sessions get logged, never frozen against a past snapshot. */
function getE1RMTrend(exerciseName){
  const hist=getExHistory(exerciseName);
  const points=hist.map(h=>{
    const est=estimate1RM(h.best.w,h.best.r);
    return est?{date:h.date,e1rm:est.value,confidence:est.confidence}:null;
  }).filter(Boolean);
  if(points.length<2)return{available:false,points,reason:points.length===0?'no history yet':'only one data point so far'};
  const recent=points.slice(-6);
  const first=recent[0],last=recent[recent.length-1];
  const daysSpan=Math.max(1,(new Date(last.date)-new Date(first.date))/86400000);
  const totalChange=last.e1rm-first.e1rm;
  const ratePerWeek=(totalChange/daysSpan)*7;
  return{
    available:true,
    points,
    currentE1RM:Math.round(last.e1rm*10)/10,
    ratePerWeek:Math.round(ratePerWeek*10)/10,
    trending:ratePerWeek>0.5?'up':ratePerWeek<-0.5?'down':'flat',
    lowConfidence:recent.some(p=>p.confidence==='low')
  };
}
/* Reps decline across sets at a FIXED weight (not weight declining \u2014 that's what drop sets
   already do separately). Curve is category-specific: bodyweight fatigues fastest, isolation
   holds up best, compound sits between. */
function getFatigueCurve(orig){
  if(orig.inputType==='bodyweight')return[1,0.65,0.5];
  if(orig.compound!==false)return[1,0.75,0.55];
  return[1,0.85,0.75];
}
/* Ramp to a real top set, then a drop set \u2014 matches the actual method described:
   progressively heavier sets building to a genuine near-max effort (low reps), then one
   backoff/drop set for extra volume. The generator scales to whatever set count is
   configured, always landing the top effort second-to-last (or last, if 2 sets) and the
   drop set truly last when there are 3+ sets. */
function getRampPrefill(topWeight,numSets){
  const round=v=>Math.round(v/0.5)*0.5;
  if(numSets<2)return[{w:String(round(topWeight)),r:'2'}];
  const hasDrop=numSets>=3;
  const rampSteps=hasDrop?numSets-1:numSets;
  return Array.from({length:numSets},(_,i)=>{
    if(hasDrop&&i===numSets-1)return{w:String(round(topWeight*0.55)),r:'9'};
    if(i===rampSteps-1)return{w:String(round(topWeight)),r:'2'};
    const frac=rampSteps<=1?0:i/(rampSteps-1);
    const pct=0.55+frac*0.35,reps=Math.round(12-frac*8);
    return{w:String(round(topWeight*pct)),r:String(Math.max(2,reps))};
  });
}
/* Isolation work: still progressively loaded and still finishes with a burn/drop set, but
   deliberately never chases a 1-2 rep max \u2014 stays in a moderate-to-high rep, genuinely
   close-to-failure zone throughout. Smaller joints and tendons carry a worse risk-to-benefit
   ratio at true near-max singles than compounds do, and hypertrophy tracks with weekly
   close-to-failure volume more reliably than with a strength peak. */
function getModeratePrefill(targetWeight,numSets){
  const round=v=>Math.round(v/0.5)*0.5;
  return Array.from({length:numSets},(_,i)=>{
    const isLast=i===numSets-1;
    if(isLast&&numSets>=3)return{w:String(round(targetWeight*0.65)),r:'14'};
    const frac=numSets<=1?1:i/(numSets-1);
    const pct=0.8+frac*0.2,reps=Math.round(14-frac*4);
    return{w:String(round(targetWeight*pct)),r:String(Math.max(6,reps))};
  });
}
/* The actual prefill dispatcher: real numbers written into set.w/set.r, not just advisory
   text, so accepting with one tap logs the recommended number and overwriting is just
   typing over it. Uses the existing orig.compound field \u2014 already correctly tagged across
   every exercise \u2014 to route compounds through the ramp-to-top-set model and isolation work
   through the moderate, no-1RM-chase model, rather than one flat scheme for everything. */
/* Shared by getPrefillSets and getSuggestion so the advisory text and the actual prefilled
   numbers can never disagree \u2014 both call this same function for the target weight. */
function getNextTargetWeight(orig,trackName,w,r){
  const targetR=orig.r&&orig.r.includes&&orig.r.includes('\u2013')?Number(orig.r.split('\u2013')[1]):(parseInt(orig.r)||r);
  const gotTop=r>=targetR;
  const isCompound=orig.compound!==false;
  let recW=w;
  if(gotTop||isCompound){
    const inc=isCompound?2.5:1.0;
    const trend=getE1RMTrend(trackName);
    if(trend.available&&!trend.lowConfidence&&trend.trending==='up'){
      recW=Math.round((w+Math.max(inc,Math.min(inc*2,trend.ratePerWeek*0.5)))*2)/2;
    }else if(gotTop||isCompound){
      recW=w+inc;
    }
  }
  return{recW,isCompound,gotTop,targetR};
}
/* The actual prefill dispatcher: real numbers written into set.w/set.r, not just advisory
   text, so accepting with one tap logs the recommended number and overwriting is just
   typing over it. Uses the existing orig.compound field \u2014 already correctly tagged across
   every exercise \u2014 to route compounds through the ramp-to-top-set model and isolation work
   through the moderate, no-1RM-chase model, rather than one flat scheme for everything. */
function getPrefillSets(orig,trackName,numSets){
  const hist=getExHistory(trackName);
  const lastBest=hist.length?hist[hist.length-1].best:null;
  if(!lastBest||!lastBest.w||orig.inputType==='seconds'||orig.inputType==='reps_each')return null;
  if(orig.inputType==='bodyweight'){
    const curve=getFatigueCurve(orig),r=parseInt(lastBest.r);
    return Array.from({length:numSets},(_,i)=>{
      const pct=curve[i]!==undefined?curve[i]:curve[curve.length-1];
      return{w:'',r:String(Math.max(1,Math.round(r*pct)))};
    });
  }
  const w=parseFloat(lastBest.w),r=parseInt(lastBest.r);
  const{recW,isCompound}=getNextTargetWeight(orig,trackName,w,r);
  return isCompound?getRampPrefill(recW,numSets):getModeratePrefill(recW,numSets);
}




function runMigration(){
  const sv=lsG('schema_version')||1;
  if(sv<2){
    for(let i=localStorage.length-1;i>=0;i--){
      const k=localStorage.key(i);
      if(k&&k.startsWith('pr:'))localStorage.removeItem(k);
    }
    lsS('schema_version',2);
  }
}
function updateHeaderSub(){
  const body=getBodyForCalcs();
  const bio=body.available
    ?`${body.weightKg}kg${body.bodyFatPct!=null?' \u00b7 '+body.bodyFatPct+'% BF':''}`
    :'add body stats in Profile';
  const el=document.getElementById('hsub');
  if(el)el.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long'})+' \u00b7 Recomp ('+bio+')';
}






/* ===== EXPOSE CORE TO GLOBAL SCOPE =====
   Tab modules reference these as bare identifiers; ES module scope falls through to
   globalThis for unresolved names, so putting them here makes them visible without
   requiring explicit imports in every tab file. Also makes them visible to inline
   onclick=/onchange= handlers in generated HTML. */
Object.assign(globalThis, {
  SEQ, DAYS, CARDIO_DAY_EX, SUBS, SUB_TYPE_OVERRIDE, FOODS, DNAMES, MEAL_TYPES,
  MUSCLE_TAG_TO_LIB_IDS, LIB_ID_TO_TAGS, TAGS_WITH_PRIMARY_USE, APP_VERSION,
  findExDef, inferSubWlabel,
  escHtml, lsG, lsS, lsDel, showStorageFailWarning,
  getProfile, clearLegacyAuth, getBodyForCalcs, saveProfile, saveBioProfile,
  deleteProfile, deleteLatestBodyLog, saveTargets, saveBarWeight,
  todayKey, yesterdayKey, formatDateKey, parseDateKey, monthKeyFor, monthKey,
  prevMonthKey, mergedMlog, activeDateKey, isLoggingToday, setLogDate,
  shiftLogDate, fmtLogDateLabel, checkStorage,
  volumeToBodyState, freshnessToBodyState, resolveClickedTag, resolveClickedTagsAll,
  getExercisesForMuscleTag, mountBodyDiagram,
  Data,
  getSmoothedWeight, updateHeader, getNextIdx, getSkipWarnings,
  saveDraft, clearDraft,
  Coach, getSuggestion, checkPR,
  exportData, shareBackup, showTextModal, gastroExport, checkUpdate, importData,
  logSym, adjWater,
  getElapsed, startTimerTick, stopTimerTick,
  fetchWeather, injectWeather, showStickyBtn,
  buildSVG, getExHistory, estimate1RM, getE1RMTrend, getFatigueCurve,
  getRampPrefill, getModeratePrefill, getNextTargetWeight, getPrefillSets,
  runMigration, updateHeaderSub,
});
