/* tests.js — Gym assertion harness. Run: node tests.js [path-to-html]
   Exit 0 = all pass. */
const fs = require('fs');
const path = process.argv[2] || 'index.html';
const src = fs.readFileSync(path, 'utf8');

let pass = 0, fail = 0;
function T(name, cond) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('X FAIL  ' + name); }
}

/* Branding / personalization */
T('branded Gym v1.0', /Gym v1\.0/.test(src) && src.includes('<div class="ht">Gym</div>'));
T('no Roshan branding', !/Roshan Fitness/.test(src));
T('no Crohn / seton / infliximab medical copy', !/Crohn|Seton|infliximab|gastroenterologist/i.test(src));
T('no wife app references in UI copy', !/your wife/i.test(src));
T('no must/optional exercise tiers in UI', !src.includes('MUST') && !src.includes('Must do') && !src.includes("priority:'must'"));
T('workout date picker for catch-up logging', src.includes('function setLogDate') && src.includes('function activeDateKey') && src.includes('id="log-date"'));
T('run log with optional Strava link', src.includes('function saveRunLog') && src.includes('function parseStravaActivityId') && src.includes('run-strava'));
T('photo recipe save pipeline exists', src.includes('function saveRecipeFromPhoto') && src.includes('function onRecipePhotoSelected') && src.includes('compressImageFile'));

/* Program */
T('sequence is Push / Pull / Legs / Cardio', src.includes("const SEQ=['Push day','Pull day','Legs day','Cardio + core']"));
T('no flat bench press programmed', !/n:'Bench press'/.test(src));
T('no squat or deadlift programmed as primary lifts', !/n:'(Back )?Squat'|n:'Deadlift'/.test(src));
T('legs day emphasized', src.includes("label:'Legs day'") && src.includes("n:'Leg press'") && src.includes("n:'Machine hip thrust'") && src.includes("n:'Walking lunges'"));
T('cardio day present', src.includes("label:'Cardio + core'") && src.includes("n:'Steady cardio'") && src.includes("Incline treadmill walk"));

/* Profile targets for recomp */
T('default targets suited to ~71kg recomp', src.includes('protein:140,kcal:2200,carbs:220,fat:65') && src.includes('weight:71'));

/* Foods starter + HelloFresh path */
T('starter foods include staples + whey + HelloFresh placeholder', [
  'Chicken breast (grilled)', 'Whey protein (generic scoop)', 'HelloFresh meal (placeholder)', 'Creatine monohydrate'
].every(n => src.includes(n)));
T('no fibreRisk medical flags', !src.includes('fibreRisk'));

/* Core engine still intact */
T('Coach namespace present', src.includes('const Coach={') && ['getDailyStatus','getWeeklyMuscleVolume','getMuscleFreshness','getDeloadSignal'].every(m => src.includes(m)));
T('PR / session Data layer present', src.includes('const Data={') && src.includes('function checkPR') && src.includes('function saveSession'));
T('custom foods merge into allFoods', src.includes('function allFoods') && src.includes("lsG('custom_foods')"));

/* Surrogate scan */
let surrogates = 0;
for (let i = 0; i < src.length; i++) {
  const c = src.charCodeAt(i);
  if (c >= 0xD800 && c <= 0xDBFF) { const n = src.charCodeAt(i + 1); if (!(n >= 0xDC00 && n <= 0xDFFF)) surrogates++; else i++; }
  else if (c >= 0xDC00 && c <= 0xDFFF) surrogates++;
}
T('surrogate scan clean', surrogates === 0);

/* Behavioural eval */
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
  key: i => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; }
};
const elStub = () => ({ style: {}, innerHTML: '', textContent: '', value: '', addEventListener: () => {}, appendChild: () => {}, querySelector: () => null, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, closest: () => null, insertAdjacentHTML: () => {}, click: () => {} });
const document = new Proxy({}, { get: (t, p) => {
  if (p === 'getElementById' || p === 'querySelector') return () => elStub();
  if (p === 'querySelectorAll') return () => [];
  if (p === 'body') return elStub();
  if (p === 'addEventListener' || p === 'createElement') return p === 'createElement' ? () => elStub() : () => {};
  return () => {};
}});
const window = { addEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }), location: { reload: () => {} } };
const navigator = { onLine: false, share: undefined, canShare: undefined };
const scriptBlocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const script = scriptBlocks[scriptBlocks.length - 1][1];
try {
  const run = new Function('localStorage', 'document', 'window', 'navigator', 'fetch', 'File', 'URL', 'Blob', 'alert', 'confirm', 'Image',
    script + '\n;return {bestSetOf, checkPR, todayKey, getProfile, Coach, FOODS, DAYS, SEQ, findExDef, fibreWarnHTML, isSymptomDay, APP_VERSION};');
  const ImageStub = function(){ this.onload=null; this.onerror=null; Object.defineProperty(this,'src',{set(){}}); };
  const app = run(localStorage, document, window, navigator, () => Promise.reject(new Error('offline')), function(){}, { createObjectURL: () => '', revokeObjectURL: () => {} }, function(){}, () => {}, () => true, ImageStub);

  T('APP_VERSION is v1.0', app.APP_VERSION === 'v1.0');
  T('SEQ length 4', app.SEQ.length === 4 && app.SEQ[3] === 'Cardio + core');
  T('DAYS match SEQ labels', app.DAYS.map(d => d.label).join('|') === app.SEQ.join('|'));
  T('profile defaults', (() => {
    const p = app.getProfile();
    return p.targets.protein === 140 && p.targets.kcal === 2200 && p.weight === 71;
  })());
  T('FOODS all have macros', app.FOODS.every(f => f.per100 && ['k','p','c','f'].every(x => typeof f.per100[x] === 'number')));
  T('no bench / squat / deadlift defs', !app.findExDef('Bench press') && !app.findExDef('Squat') && !app.findExDef('Deadlift'));
  T('leg press + cardio defs resolve', !!app.findExDef('Leg press') && !!app.findExDef('Incline treadmill walk'));
  T('fibreWarn always empty', app.fibreWarnHTML('anything') === '');
  T('bodyweight best-set by reps', (() => {
    const b = app.bestSetOf([{ w: '70', r: '8' }, { w: '70', r: '11' }], 'bodyweight');
    return b && b.r === '11';
  })());
  T('Coach daily status uses profile targets', (() => {
    app.lsS = null;
    localStorage.setItem('food:' + app.todayKey(), JSON.stringify([{ p: 40, k: 800, c: 90, f: 20 }]));
    const d = app.Coach.getDailyStatus();
    return d.proteinGap === 100 && d.kcalGap === 1400;
  })());
} catch (e) {
  fail++; console.log('X FAIL  script eval crashed: ' + e.message + '\n' + e.stack);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
