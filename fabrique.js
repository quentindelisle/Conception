/* =====================================================================
   Fabrique N'EPS — concevoir sa propre appli de suivi EPS, sans programmer
   Quentin Delisle · N'EPS numérique
   L'enseignant décrit son activité (leçon unique ou cycle, saisies, rôles,
   outils de séance, barème), la teste dans l'aperçu, puis exporte une PWA
   autonome (.zip) à publier sur GitHub Pages ou La Forge. Même socle que
   Biathlon et Musculation : QR codes tablette enseignant ↔ tablettes élèves.
   ===================================================================== */
'use strict';
const FAB_VERSION = '2.0.0';
const FAB_KEY = 'fabrique_neps_v1';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rnd(n){ const a='abcdefghijkmnpqrstuvwxyz23456789'; let s=''; for(let i=0;i<n;i++) s+=a[Math.floor(Math.random()*a.length)]; return s; }
const slug = s => String(s||'appli').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0, 24) || 'appli';
const clone = o => JSON.parse(JSON.stringify(o));
const fmt = v => String(Math.round(v * 100) / 100).replace('.', ',');
function toast(msg, ms=2400){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'), ms); }
function modal(html, wide){ $('#modal-root').innerHTML = `<div class="modal-bg"><div class="modal ${wide?'wide':''}">${html}</div></div>`; return $('#modal-root .modal'); }
function closeModal(){ $('#modal-root').innerHTML = ''; }
function confirmBox(title, text, ok='Valider', danger=false){
  return new Promise(res => { const m = modal(`<h2>${title}</h2><p>${text}</p><div class="btn-row spread"><button class="btn ghost" data-c="0">Annuler</button><button class="btn ${danger?'red':'primary'}" data-c="1">${ok}</button></div>`);
    m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { closeModal(); res(b.dataset.c === '1'); }); });
}
const tip = t => `<div class="tip">💡 ${t}</div>`;
const isSeance = () => P && P.mode === 'seance';
const LE = () => isSeance() ? 'la séance' : 'la leçon';

/* ---------------------------------------------------------------------
   Types de saisie (avec un exemple concret pour chaque)
   --------------------------------------------------------------------- */
const TYPES = {
  dial:   { n:'Molette', ico:'🎡', d:'Une roue crantée : l\'élève tourne jusqu\'à la bonne valeur.', ex:'Plot atteint (0 à 11), points marqués, répétitions.' },
  counter:{ n:'Compteur', ico:'➕', d:'Deux gros boutons − et +.', ex:'Nombre de réussites, de tours, de passes.' },
  scale:  { n:'Échelle', ico:'🌡️', d:'Une rangée de boutons colorés, du rouge au vert.', ex:'Ressenti de l\'effort de 1 à 10, niveau de 1 à 4.' },
  choice: { n:'Choix', ico:'🔘', d:'Quelques réponses colorées, chacune vaut des points.', ex:'Jamais / Parfois / Souvent / Toujours ; Oui / Non.' },
  number: { n:'Nombre', ico:'🔢', d:'L\'élève tape une valeur au clavier.', ex:'Distance en mètres, charge en kg, temps relevé.' },
  chrono: { n:'Chrono', ico:'⏱️', d:'Un chronomètre départ / stop dans la saisie.', ex:'Temps sur 500 m, temps de gainage.' },
  calc:   { n:'Calcul', ico:'🧮', d:'Une valeur calculée toute seule à partir des autres saisies.', ex:'Total des points, vitesse en km/h, % de réussite.' },
};
const AGG = { best:'Le meilleur essai', mean:'La moyenne des essais', last:'Le dernier essai', first:'Le premier essai', sum:'Le total des essais' };
const FROM_C = { best:'Sa meilleure leçon', mean:'La moyenne de ses leçons', last:'Sa dernière leçon', prog:'Son progrès (dernière − première leçon)', cible:'Le % de leçons où sa cible est atteinte' };
const FROM_S = { best:'Son résultat de la séance', cible:'Cible atteinte (oui = 100, non = 0)' };
const fromList = () => isSeance() ? FROM_S : FROM_C;
const STEPS = [ ['ident','Identité'], ['orga','Organisation'], ['saisies','Saisies'], ['roles','Rôles'], ['outils','Outils'], ['bareme','Note'], ['export','Exporter'] ];

/* ---------------------------------------------------------------------
   Banque de rôles (par familles d'activités)
   --------------------------------------------------------------------- */
const ROLE_BANK = [
  ['Pour toutes les activités', [['Pratiquant','Je réalise l\'exercice'],['Observateur','J\'observe et je saisis sur la tablette'],['Coach','Je conseille mon partenaire'],['Secrétaire','Je note les résultats'],
    ['Échauffeur','Je dirige l\'échauffement du groupe'],['Responsable matériel','J\'installe et je range le matériel'],['Capitaine','J\'organise mon équipe'],['Responsable sécurité','Je vérifie que l\'espace est sûr'],['Vidéaste','Je filme pour l\'analyse'],['Chronométreur','Je gère le temps']]],
  ['Athlétisme', [['Starter','Je donne le départ'],['Juge de mesure','Je mesure la performance'],['Juge de faute','Je surveille la planche, la ligne, le cercle'],['Lièvre','J\'impose l\'allure'],['Compteur de tours','Je compte les tours de mon coureur']]],
  ['Sports collectifs', [['Joueur',''],['Arbitre','Je fais respecter les règles'],['Juge de touche','Je signale les sorties'],['Marqueur','Je tiens le score'],['Statisticien','Je relève tirs, passes, pertes de balle'],['Remplaçant','Je me prépare à entrer']]],
  ['Raquettes', [['Arbitre de chaise','J\'annonce le score'],['Relanceur','Je renvoie le volant / la balle'],['Compteur de points','Je compte les points gagnés']]],
  ['Combat', [['Attaquant',''],['Défenseur',''],['Juge-arbitre','Je compte les touches et j\'arrête l\'assaut'],['Chronométreur de reprise','Je gère reprises et repos']]],
  ['Gym, acrosport, cirque, danse', [['Porteur',''],['Voltigeur',''],['Pareur','Je sécurise la figure'],['Juge','J\'évalue la réalisation'],['Chorégraphe','Je guide la composition'],['Spectateur averti','J\'apprécie selon les critères']]],
  ['Escalade', [['Grimpeur',''],['Assureur','J\'assure mon grimpeur'],['Contre-assureur','Je tiens la corde derrière l\'assureur'],['Vérificateur','Je contrôle nœud et baudrier']]],
  ['Natation', [['Nageur',''],['Compteur de longueurs','Je compte les longueurs'],['Sauveteur','Je surveille le nageur']]],
  ['Musculation, course en durée, yoga', [['Coach santé','Je vérifie postures et respiration'],['Observateur de ressenti','Je relève les sensations']]],
];

/* ---------------------------------------------------------------------
   Outils de séance proposés dans l'appli
   --------------------------------------------------------------------- */
const TOOLS = {
  timer:   { n:'Minuteur', ico:'⏳', d:'Compte à rebours grand format, bips à 3-2-1 et à la fin.', el:true },
  chrono:  { n:'Chronomètre à tours', ico:'⏱️', d:'Temps total et temps de chaque tour.', el:true },
  interval:{ n:'Intervalles', ico:'🔁', d:'Travail / récupération × séries (fractionné, Tabata, gainage).', el:true },
  rotation:{ n:'Rotation d\'ateliers', ico:'🔄', d:'Chaque groupe sait à quel atelier il est ; signal sonore au changement.', el:false },
  tirage:  { n:'Tirage au sort', ico:'🎲', d:'Un élève présent au hasard (passage, démonstration).', el:false },
  equipes: { n:'Équipes', ico:'👥', d:'Équipes au hasard ou équilibrées selon une saisie ; peuvent devenir les groupes.', el:false },
  score:   { n:'Tableau de score', ico:'🏆', d:'Score de deux équipes en grand, avec chrono de match.', el:true },
  tours:   { n:'Compteur de tours', ico:'🏃', d:'On touche l\'élève à chaque tour ; le résultat peut remplir une saisie.', el:true },
};
function defaultTools(){ return { timer:{ on:true, el:true, presets:'30, 60, 120, 300' }, chrono:{ on:false, el:true }, interval:{ on:false, el:true, work:30, rest:15, rounds:8 },
  rotation:{ on:false, el:false, ateliers:'Atelier 1\nAtelier 2\nAtelier 3\nAtelier 4', duree:6, trans:30 }, tirage:{ on:false, el:false }, equipes:{ on:false, el:false, n:4 },
  score:{ on:false, el:true, a:'Équipe A', b:'Équipe B' }, tours:{ on:false, el:true, field:'' } }; }

/* ---------------------------------------------------------------------
   État de la Fabrique : plusieurs projets d'applis
   --------------------------------------------------------------------- */
let FAB, P;
function loadFab(){
  try { FAB = JSON.parse(localStorage.getItem(FAB_KEY)); } catch(e){ FAB = null; }
  if (!FAB || !FAB.projects) FAB = { projects:{}, active:null, step:'ident' };
  Object.values(FAB.projects).forEach(migrate);
  if (!FAB.projects[FAB.active]) FAB.active = Object.keys(FAB.projects)[0] || null;
  P = FAB.active ? FAB.projects[FAB.active] : null;
}
/* anciennes versions : formules écrites avec des codes (A + B) → références aux saisies */
function migrate(c){
  c.mode = c.mode || 'cycle'; c.tools = { ...defaultTools(), ...(c.tools || {}) }; c.roles = c.roles || []; c.grade = c.grade || { on:false, total:20, items:[] };
  (c.fields || []).forEach(f => { if (f.type === 'calc' && f.formula && !/\{/.test(f.formula)) {
    f.formula = f.formula.replace(/[A-Za-z_]\w*/g, w => { const x = c.fields.find(y => (y.code || '').toUpperCase() === w.toUpperCase()); return x ? `{${x.id}}` : w; }); } delete f.code; });
  if (c.icon && !c.icon.mode) c.icon.mode = 'text';
}
function saveFab(){
  try { localStorage.setItem(FAB_KEY, JSON.stringify(FAB)); }
  catch(e){ toast('⚠️ Stockage plein : l\'image de l\'icône est peut-être trop lourde'); }
  schedulePreview();
}
function newProject(model, mode, name){
  const c = clone(model.cfg);
  c.mode = mode || c.mode || 'cycle'; if (name) { c.name = name; c.short = name.slice(0, 14); }
  c.id = slug(c.short || c.name) + '-' + rnd(4); c.version = '1.0.0';
  c.color = c.color || '#0062C4'; c.accent = c.accent || '#F59A1B'; c.maxGroups = c.maxGroups || 8;
  c.tools = { ...defaultTools(), ...(c.tools || {}) };
  c.fields.forEach(f => fixField(f)); c.created = Date.now();
  if (c.mode === 'seance') { c.grade.items.forEach(it => { if (!FROM_S[it.from]) it.from = 'best'; }); }
  FAB.projects[c.id] = c; FAB.active = c.id; P = c; FAB.step = 'ident'; saveFab();
}
function fixField(f){
  if (!f.id) f.id = 'f' + rnd(5);
  if (f.min == null) f.min = f.type === 'scale' ? 1 : 0; if (f.max == null) f.max = f.type === 'scale' ? 5 : 10; if (!f.step) f.step = 1;
  if (!f.per) f.per = 'try'; if (!f.agg) f.agg = 'best'; if (!f.better) f.better = f.type === 'chrono' ? 'low' : 'high';
  if (f.type === 'choice' && !(f.opts || []).length) f.opts = clone(OPT_PRESETS.yn);
  if (f.dec == null) f.dec = f.type === 'chrono' ? 2 : 1;
  if (f.show == null) f.show = true; if (f.formula == null) f.formula = '';
}

/* ---------------------------------------------------------------------
   Formules : les saisies sont désignées par {identifiant} et affichées par leur nom.
   Le moteur reçoit {identifiant} et le remplace lui-même.
   --------------------------------------------------------------------- */
const FN = { MIN:Math.min, MAX:Math.max, ABS:Math.abs, RACINE:Math.sqrt, MOY:(...a) => a.reduce((p,q)=>p+q,0)/a.length, ARRONDI:(x, d=0) => Math.round(x * 10**d) / 10**d, SI:(c, a, b) => c ? a : b };
const FN_N = { MIN:'le plus petit de', MAX:'le plus grand de', MOY:'la moyenne de', ARRONDI:'arrondi de', ABS:'valeur absolue de', RACINE:'racine de', SI:'si' };
const TOK_RX = /\{[^}]+\}|\d+(?:[.,]\d+)?|[A-Za-z_]\w*|>=|<=|[-+*/^();<>=]/g;
const tokens = s => String(s || '').match(TOK_RX) || [];
const fieldOf = id => P.fields.find(f => f.id === id);
function tokLabel(t){
  if (t[0] === '{') { const f = fieldOf(t.slice(1, -1)); return f ? f.label : '⚠️ saisie supprimée'; }
  return { '*':'×', '/':'÷', '-':'−', ';':' ; ', '>=':'≥', '<=':'≤' }[t] || FN_N[t.toUpperCase()] || t.replace('.', ',');
}
function formulaHTML(s){ const T = tokens(s); if (!T.length) return '<span class="muted">(vide : touchez les boutons ci-dessous)</span>';
  return T.map(t => t[0] === '{' ? `<span class="ftok fld-tok">${esc(tokLabel(t))}</span>` : /^[A-Za-z]/.test(t) ? `<span class="ftok fn-tok">${esc(tokLabel(t))}</span>` : /^\d/.test(t) ? `<span class="ftok num-tok">${esc(tokLabel(t))}</span>` : `<span class="ftok op-tok">${esc(tokLabel(t))}</span>`).join(''); }
const formulaText = s => tokens(s).map(tokLabel).join(' ');
function compileF(src){
  const T = tokens(src); let i = 0; const pk = () => T[i], nx = () => T[i++], refs = new Set();
  const CMP = { '>':(a,b)=>+(a>b), '<':(a,b)=>+(a<b), '>=':(a,b)=>+(a>=b), '<=':(a,b)=>+(a<=b), '=':(a,b)=>+(a===b) };
  function C(){ let a = E(); while (CMP[pk()]) { const f = CMP[nx()], b = E(), x = a; a = s => f(x(s), b(s)); } return a; }
  function E(){ let a = Tm(); while (pk() === '+' || pk() === '-') { const o = nx(), b = Tm(), x = a; a = o === '+' ? s => x(s) + b(s) : s => x(s) - b(s); } return a; }
  function Tm(){ let a = Pw(); while (pk() === '*' || pk() === '/') { const o = nx(), b = Pw(), x = a; a = o === '*' ? s => x(s) * b(s) : s => x(s) / b(s); } return a; }
  function Pw(){ const a = U(); if (pk() === '^') { nx(); const b = Pw(); return s => a(s) ** b(s); } return a; }
  function U(){ if (pk() === '-') { nx(); const a = U(); return s => -a(s); } if (pk() === '+') { nx(); return U(); } return A(); }
  function A(){
    const t = nx(); if (t == null) throw new Error('le calcul n\'est pas terminé');
    if (t === '(') { const e = C(); if (nx() !== ')') throw new Error('il manque une parenthèse fermante « ) »'); return e; }
    if (t[0] === '{') { const id = t.slice(1, -1); refs.add(id); return s => (s[id] == null ? NaN : s[id]); }
    if (/^\d/.test(t)) { const v = parseFloat(t.replace(',', '.')); return () => v; }
    if (/^[A-Za-z_]/.test(t)) { const u = t.toUpperCase(), f = FN[u]; if (!f || pk() !== '(') throw new Error('mot inconnu : ' + t); nx();
      const args = []; if (pk() !== ')') { args.push(C()); while (pk() === ';') { nx(); args.push(C()); } }
      if (nx() !== ')') throw new Error('il manque une parenthèse fermante « ) »'); return s => f(...args.map(g => g(s))); }
    throw new Error(`« ${tokLabel(t)} » mal placé`);
  }
  if (!T.length) throw new Error('le calcul est vide');
  const f = C(); if (i < T.length) throw new Error(`« ${tokLabel(T[i])} » mal placé`);
  return { f, refs:[...refs] };
}
function checkFormula(fl){
  try {
    const { f, refs } = compileF(fl.formula), idx = P.fields.indexOf(fl);
    for (const r of refs) { const x = fieldOf(r); if (!x) return { ok:false, msg:'Une saisie utilisée a été supprimée' }; if (x === fl) return { ok:false, msg:'Le calcul ne peut pas s\'utiliser lui-même' };
      if (x.type === 'calc' && P.fields.indexOf(x) > idx) return { ok:false, msg:`Placez « ${x.label} » au-dessus de ce calcul` }; }
    const sample = {}; refs.forEach(r => sample[r] = exampleVal(fieldOf(r)));
    const v = f(sample);
    return { ok:true, msg:`Exemple : ${refs.map(r => `${fieldOf(r).label} = ${fmt(sample[r])}`).join(' · ') || '—'} → résultat ${isFinite(v) ? fmt(v) : 'impossible (division par zéro ?)'}` };
  } catch(e){ return { ok:false, msg:e.message }; }
}
function exampleVal(x){
  if (!x) return 1; if (x.type === 'chrono') return 95.4;
  if (x.type === 'choice') return (x.opts || [])[Math.max(0, (x.opts || []).length - 1)]?.v ?? 1;
  if (x.type === 'calc') return 10; if (x.type === 'number' && !(x.max > x.min)) return 12;
  return Math.round(((+x.min || 0) + (+x.max || 10)) / 2 / (x.step || 1)) * (x.step || 1);
}
/* Calculs tout prêts */
const PRESETS = [
  { n:'Somme de deux saisies', d:'ex. points au sprint + points au lancer', a:[['a','f','Première saisie'],['b','f','Deuxième saisie']], f:x => `{${x.a}} + {${x.b}}` },
  { n:'Moyenne de deux saisies', d:'ex. note de l\'observateur 1 et de l\'observateur 2', a:[['a','f','Première saisie'],['b','f','Deuxième saisie']], f:x => `( {${x.a}} + {${x.b}} ) / 2` },
  { n:'Écart entre deux saisies', d:'ex. temps prévu − temps réalisé', a:[['a','f','Saisie'],['b','f','moins la saisie']], f:x => `{${x.a}} - {${x.b}}` },
  { n:'Pourcentage de réussite', d:'réussites ÷ tentatives × 100', a:[['a','f','Réussites'],['b','f','Tentatives']], f:x => `{${x.a}} / {${x.b}} * 100`, unit:'%' },
  { n:'Vitesse (km/h) sur une distance fixe', d:'distance ÷ temps × 3,6', a:[['d','n','Distance en mètres', 500],['t','f','Temps (chrono, en secondes)']], f:x => `ARRONDI( ${String(x.d).replace('.', ',')} / {${x.t}} * 3,6 ; 1 )`, unit:'km/h' },
  { n:'Vitesse (km/h) distance et temps saisis', d:'distance saisie ÷ temps saisi × 3,6', a:[['d','f','Distance (m)'],['t','f','Temps (s)']], f:x => `ARRONDI( {${x.d}} / {${x.t}} * 3,6 ; 1 )`, unit:'km/h' },
  { n:'Points si un seuil est atteint', d:'ex. 2 points si 8 réussites ou plus', a:[['a','f','Saisie'],['s','n','Seuil', 8],['p','n','Points gagnés', 2]], f:x => `SI( {${x.a}} >= ${x.s} ; ${x.p} ; 0 )` },
  { n:'Multiplier par un coefficient', d:'ex. nombre de tours × 200 m', a:[['a','f','Saisie'],['k','n','Coefficient', 2]], f:x => `{${x.a}} * ${String(x.k).replace('.', ',')}` },
  { n:'Le meilleur de deux saisies', d:'ex. meilleur des deux sauts', a:[['a','f','Première saisie'],['b','f','Deuxième saisie']], f:x => `MAX( {${x.a}} ; {${x.b}} )` },
];

/* ---------------------------------------------------------------------
   Configuration transmise au moteur
   --------------------------------------------------------------------- */
function runtimeConfig(c){
  const r = clone(c); delete r.icon; delete r.created; delete r.exported;
  r.fields.forEach(f => { if (f.type !== 'scale') delete f.labels; if (f.type !== 'choice') delete f.opts; if (f.type !== 'calc') delete f.formula; delete f.code; });
  if (r.mode === 'seance') { r.lessons = 1; r.grade.items.forEach(it => { if (!FROM_S[it.from]) it.from = 'best'; }); }
  Object.keys(r.tools || {}).forEach(k => { if (!r.tools[k].on) delete r.tools[k]; });
  return r;
}

/* ---------------------------------------------------------------------
   Icônes : banque APSA, pictos, texte / emoji, image
   --------------------------------------------------------------------- */
const imgCache = {};
function loadImg(src){ if (imgCache[src]) return imgCache[src];
  return imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
const pictoURL = (k, bg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">${PICTOS[k].s.replace(/var\(--bgc,#0062C4\)/g, bg)}</svg>`);
async function drawIcon(ic, size, maskable=false){
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const ctx = cv.getContext('2d');
  const bg = ic.bg || '#0062C4'; ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
  const pad = maskable ? size * 0.12 : 0, inner = size - 2 * pad;
  const ring = () => { if (ic.ring === false) return; ctx.strokeStyle = P?.accent || '#F59A1B'; ctx.lineWidth = size * 0.035; const m = pad + size * 0.06; roundRect(ctx, m, m, size - 2 * m, size - 2 * m, size * 0.16); ctx.stroke(); };
  if (ic.mode === 'image' && ic.img) {
    const im = await loadImg(ic.img), k = (ic.fit === 'contain' ? Math.min : Math.max)(inner / im.width, inner / im.height), w = im.width * k, h = im.height * k;
    ctx.save(); ctx.beginPath(); ctx.rect(pad, pad, inner, inner); ctx.clip(); ctx.drawImage(im, (size - w) / 2, (size - h) / 2, w, h); ctx.restore();
  } else if (ic.mode === 'apsa' && ic.apsa) {
    const im = await loadImg(`banque/apsa/${ic.apsa}.png`); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(size / 2, size / 2, inner * 0.4, 0, Math.PI * 2); ctx.fill();
    const w = inner * 0.66; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, (size - w) / 2, (size - w) / 2, w, w); ring();
  } else if (ic.mode === 'picto' && PICTOS[ic.picto]) {
    const im = await loadImg(pictoURL(ic.picto, bg)), w = inner * 0.62; ctx.drawImage(im, (size - w) / 2, (size - w) / 2, w, w); ring();
  } else {
    const t = String(ic.text || 'EPS').slice(0, 6); ctx.fillStyle = ic.fg || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = inner * ([...t].length <= 2 ? 0.55 : [...t].length <= 3 ? 0.42 : 0.3);
    ctx.font = `900 ${fs}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    const mw = ctx.measureText(t).width; if (mw > inner * 0.82) { fs *= inner * 0.82 / mw; ctx.font = `900 ${fs}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; }
    ctx.fillText(t, size / 2, size / 2 + fs * 0.04); ring();
  }
  return cv;
}
function roundRect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const canvasBlob = cv => new Promise(res => cv.toBlob(res, 'image/png'));

/* ---------------------------------------------------------------------
   Aperçu
   --------------------------------------------------------------------- */
let prevTimer = null;
function schedulePreview(){ clearTimeout(prevTimer); prevTimer = setTimeout(refreshPreview, 700); }
async function refreshPreview(){
  if (!P) return;
  try { localStorage.setItem('fabrique_preview', JSON.stringify(runtimeConfig(P)));
    localStorage.setItem('fabrique_preview_icon', (await drawIcon(P.icon || {}, 256)).toDataURL('image/png')); } catch(e){}
  const fr = $('#preview'); if (fr) fr.src = 'moteur/index.html?preview=1&t=' + Date.now();
}
const previewKey = () => 'neps_prev_' + P.id;
function demoData(){
  const C = runtimeConfig(P), F = C.fields, seance = C.mode === 'seance';
  const noms = [['MARTIN','Léa'],['BERNARD','Hugo'],['DUBOIS','Inès'],['THOMAS','Nathan'],['ROBERT','Jade'],['RICHARD','Louis'],['PETIT','Chloé'],['DURAND','Gabin'],['LEROY','Manon'],
    ['MOREAU','Ethan'],['SIMON','Zoé'],['LAURENT','Noah'],['LEFEBVRE','Lina'],['MICHEL','Tom'],['GARCIA','Emma'],['DAVID','Rayan'],['BERTRAND','Lou'],['ROUX','Adam']];
  const cid = rnd(4), students = noms.map(([nom, prenom], i) => ({ id:rnd(4), nom, prenom, grp: i % 3 })), lessons = {}, results = {}, targets = {};
  const nt = +C.attempts || 1, lvl = {}; students.forEach(s => lvl[s.id] = Math.random());
  const val = (f, s, l) => { const q = Math.min(1, Math.max(0, lvl[s.id] * 0.75 + l * 0.05 + (Math.random() - .5) * 0.25));
    if (f.type === 'chrono') return Math.round((130 - q * 50) * 100) / 100;
    if (f.type === 'choice') { const o = f.opts || []; return o.length ? o[Math.min(o.length - 1, Math.floor(q * o.length))].v : null; }
    const mn = +f.min || 0, mx = f.max > mn ? +f.max : mn + 20, st = +f.step || 1; let v = Math.round((mn + q * (mx - mn)) / st) * st;
    if (f.type === 'scale' && f.better === 'low') v = Math.round((mx - q * (mx - mn)) / st) * st; return Math.round(v * 100) / 100; };
  const nL = seance ? 1 : 3;
  for (let l = 1; l <= nL; l++) { lessons[l] = { att:{}, role:{}, shift:0, tries:nt, title:'', ev:false }; results[l] = {};
    students.forEach((s, i) => { if (i % 9 === 4) { lessons[l].att[s.id] = 1; return; } if (i % 9 === 7) lessons[l].att[s.id] = 3;
      const v = {}; F.filter(f => f.type !== 'calc').forEach(f => { v[f.id] = (f.per || 'try') === 'try' ? Array.from({ length:nt }, () => val(f, s, l)) : val(f, s, l); });
      results[l][s.id] = { v, ts:Date.now(), d:'demo' }; }); }
  F.filter(f => f.target && f.type !== 'calc').forEach(f => students.forEach(s => { const a = results[1][s.id]?.v[f.id]; const arr = [].concat(a ?? []).filter(x => x != null); if (!arr.length) return;
    (targets[s.id] = targets[s.id] || {})[f.id] = f.better === 'low' ? Math.min(...arr) : Math.max(...arr); }));
  const root = { v:1, deviceId:'demo', pin:'0000', role:'prof', active:cid, grp:null,
    classes:{ [cid]:{ id:cid, settings:{ className:'2nde Démo', nbLessons: seance ? 1 : (+C.lessons || 8), current: seance ? 1 : 3, nbGroups:3 }, students, lessons, results, targets, hist:{}, notes:{} } } };
  localStorage.setItem(previewKey(), JSON.stringify(root)); refreshPreview(); toast('✓ Classe de démonstration chargée dans l\'aperçu');
}

/* =====================================================================
   Affichage
   ===================================================================== */
function render(){
  const m = $('#main');
  $('#proj-bar').innerHTML = projBar();
  if (!P) { $('#steps').innerHTML = ''; m.innerHTML = viewStart(); return; }
  const i = STEPS.findIndex(s => s[0] === FAB.step);
  $('#steps').innerHTML = STEPS.map(([k, n], j) => `<button class="step ${FAB.step === k ? 'on' : ''}" data-a="step" data-s="${k}"><span class="sn">${j + 1}</span>${n}</button>`).join('');
  const fn = { ident:vIdent, orga:vOrga, saisies:vSaisies, roles:vRoles, outils:vOutils, bareme:vBareme, export:vExport }[FAB.step] || vIdent;
  m.innerHTML = fn() + `<div class="btn-row spread step-nav">${i > 0 ? `<button class="btn ghost" data-a="step" data-s="${STEPS[i-1][0]}">← ${STEPS[i-1][1]}</button>` : '<span></span>'}
    ${i < STEPS.length - 1 ? `<button class="btn primary" data-a="step" data-s="${STEPS[i+1][0]}">${STEPS[i+1][1]} →</button>` : ''}</div>`;
  after();
}
function projBar(){
  const list = Object.values(FAB.projects).sort((a, b) => (b.created || 0) - (a.created || 0));
  return `${list.length ? `<span class="muted">Mes applis :</span><select id="proj-sel" aria-label="Appli en cours">${list.map(c => `<option value="${c.id}" ${c.id === FAB.active ? 'selected' : ''}>${esc(c.name)} ${c.mode === 'seance' ? '(séance)' : '(cycle)'}</option>`).join('')}</select>` : ''}
    <button class="btn small primary" data-a="new">＋ Nouvelle appli</button>${P ? `<button class="btn small ghost" data-a="dup">⧉ Dupliquer</button><button class="btn small ghost" data-a="del">🗑 Supprimer</button>` : ''}
    <label class="btn small ghost">📂 Ouvrir un modèle reçu (.json)<input type="file" id="imp-proj" accept=".json,application/json" hidden></label>`;
}
function viewStart(){
  return `<div class="start"><img src="icons/logo-fabrique.jpg" alt="Fabrique N'EPS" class="start-logo"><div>
    <h1>Bienvenue dans la Fabrique N'EPS</h1>
    <p class="lead">Créez l'appli de vos leçons d'EPS, <b>sans programmer</b>. Vous décidez ce que les élèves notent sur les tablettes ; la tablette enseignant envoie la leçon par QR code et récupère les résultats de la même façon. Aucun compte, aucun serveur : tout reste sur les tablettes.</p>
    <ol class="how"><li><b>Je décris</b> mon activité en 7 petites étapes.</li><li><b>Je teste</b> dans l'aperçu à droite (comme sur une tablette).</li><li><b>Je télécharge</b> mon appli et je la mets en ligne.</li></ol>
    <button class="btn primary big" data-a="new">＋ Créer ma première appli</button></div></div>`;
}
/* Assistant de création : leçon ou cycle → modèle → nom */
function wizard(step=1, st={}){
  if (step === 1) { const m = modal(`<h2>Nouvelle appli · 1/3</h2><p class="lead2">Votre appli servira pour…</p><div class="models two">
      <button class="model big" data-w="seance"><span class="mi">⏱️</span><b>Une seule leçon</b><span>Un test, une évaluation, une séance d'ateliers. L'appli resservira avec chaque classe.</span></button>
      <button class="model big" data-w="cycle"><span class="mi">📅</span><b>Tout un cycle</b><span>Plusieurs leçons : progrès de chaque élève, cibles qui évoluent, bilan de fin de cycle.</span></button></div>
      <div class="btn-row spread" style="margin-top:12px"><span></span><button class="btn ghost" data-c>Annuler</button></div>`, true);
    m.querySelector('[data-c]').onclick = closeModal; m.querySelectorAll('[data-w]').forEach(b => b.onclick = () => wizard(2, { mode:b.dataset.w })); return; }
  if (step === 2) { const list = MODELES.filter(x => !x.mode || x.mode === st.mode || x.both);
    const m = modal(`<h2>Nouvelle appli · 2/3</h2><p class="lead2">Partir d'un exemple (tout reste modifiable) :</p><div class="models">${list.map(x => `<button class="model" data-k="${x.key}"><span class="mi">${x.ico || '📋'}</span><b>${esc(x.n)}</b><span>${esc(x.d)}</span></button>`).join('')}</div>
      <div class="btn-row spread" style="margin-top:12px"><button class="btn ghost" data-b>← Retour</button><button class="btn ghost" data-c>Annuler</button></div>`, true);
    m.querySelector('[data-c]').onclick = closeModal; m.querySelector('[data-b]').onclick = () => wizard(1);
    m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => wizard(3, { ...st, key:b.dataset.k })); return; }
  const mo = MODELES.find(x => x.key === st.key);
  const m = modal(`<h2>Nouvelle appli · 3/3</h2><label class="fld"><span>Nom de votre appli</span><input type="text" id="wz-name" value="${esc(mo.key === 'vierge' ? '' : mo.cfg.name)}" placeholder="ex. Biathlon 5 s – Seconde"></label>
    <div class="btn-row spread"><button class="btn ghost" data-b>← Retour</button><button class="btn primary" data-ok>Créer l'appli</button></div>`);
  const inp = m.querySelector('#wz-name'); setTimeout(() => inp.focus(), 50);
  m.querySelector('[data-b]').onclick = () => wizard(2, st);
  m.querySelector('[data-ok]').onclick = () => { closeModal(); newProject(mo, st.mode, inp.value.trim() || mo.cfg.name); render(); toast('✓ Appli créée : suivez les étapes de haut en bas'); };
}

/* --- 1. Identité --- */
function vIdent(){
  const ic = P.icon || (P.icon = { mode:'apsa', apsa:'', bg:P.color });
  return `<div class="card"><h2>Identité de l'appli</h2>${tip('Le nom court s\'affiche sous l\'icône sur l\'écran d\'accueil de la tablette.')}
    ${inp('Nom de l\'appli', 'name', P.name, 'ex. Biathlon 5 s')}
    ${inp('Nom court (14 caractères maximum)', 'short', P.short, '', 'maxlength="14"')}
    ${inp('Sous-titre (champ d\'apprentissage, APSA, niveau…)', 'sub', P.sub, 'ex. CA1 · Seconde')}
    ${inp('Auteur(s), affiché(s) en signature', 'author', P.author, 'ex. Quentin Delisle et Gwilherm Rocher')}
    <div class="grid2"><label class="fld"><span>Couleur principale</span><input type="color" data-k="color" value="${esc(P.color)}"></label>
    <label class="fld"><span>Couleur d'accent (liserés, cadre)</span><input type="color" data-k="accent" value="${esc(P.accent)}"></label></div></div>
  <div class="card"><h2>Icône de l'appli</h2><div class="icon-ed"><canvas id="icon-prev" width="160" height="160"></canvas><div class="icon-f">
    <div class="seg">${[['apsa','🏅 Activités'],['picto','✏️ Pictos'],['text','Aa Texte / emoji'],['image','🖼 Mon image']].map(([k, n]) => `<button class="${ic.mode === k ? 'on' : ''}" data-a="iconMode" data-m="${k}">${n}</button>`).join('')}</div>
    ${ic.mode === 'apsa' ? `<div class="bank">${['CA1','CA2','CA3','CA4','CA5'].map(ca => `<div class="bank-ca"><b>${ca}</b>${APSA_ICONS.filter(x => x[1] === ca).map(([k, , n]) => `<button class="bank-it ${ic.apsa === k ? 'on' : ''}" data-a="pickApsa" data-k="${k}" title="${esc(n)}"><img src="banque/apsa/${k}.png" alt="${esc(n)}" loading="lazy"></button>`).join('')}</div>`).join('')}</div>` :
      ic.mode === 'picto' ? `<div class="bank picto-bank">${Object.entries(PICTOS).map(([k, p]) => `<button class="bank-it ${ic.picto === k ? 'on' : ''}" data-a="pickPicto" data-k="${k}" title="${esc(p.n)}" style="background:${esc(ic.bg || P.color)}"><svg viewBox="0 0 100 100">${p.s.replace(/var\(--bgc,#0062C4\)/g, esc(ic.bg || P.color))}</svg></button>`).join('')}</div>` :
      ic.mode === 'image' ? `<label class="btn small">🖼 Choisir une image (logo, photo)<input type="file" id="icon-file" accept="image/*" hidden></label>
        <label class="fld inline"><input type="checkbox" data-ik="fit" ${ic.fit === 'contain' ? 'checked' : ''}> Montrer l'image entière (sans la recadrer)</label>` :
      `<label class="fld"><span>Texte (1 à 4 caractères) ou emoji</span><input type="text" data-ik="text" value="${esc(ic.text || '')}" maxlength="6"></label>
       <label class="fld"><span>Couleur du texte</span><input type="color" data-ik="fg" value="${esc(ic.fg || '#FFFFFF')}"></label>`}
    <div class="row"><label class="fld"><span>Fond</span><input type="color" data-ik="bg" value="${esc(ic.bg || P.color)}"></label>
    ${ic.mode !== 'image' ? `<label class="fld inline"><input type="checkbox" data-ik="ring" ${ic.ring !== false ? 'checked' : ''}> Cadre couleur d'accent</label>` : ''}</div></div></div></div>`;
}
function inp(label, k, v, ph='', extra=''){ return `<label class="fld"><span>${label}</span><input type="text" data-k="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph)}" ${extra}></label>`; }

/* --- 2. Organisation --- */
function vOrga(){
  const tries = P.fields.some(f => f.per === 'try'), s = isSeance();
  return `<div class="card"><h2>Pour une leçon ou pour un cycle ?</h2><div class="models two">
      <button class="model big ${s ? 'sel' : ''}" data-a="setMode" data-m="seance"><span class="mi">⏱️</span><b>Une seule leçon</b><span>Test, évaluation, séance d'ateliers… On la rejoue avec chaque classe (bouton « Nouvelle séance »).</span></button>
      <button class="model big ${!s ? 'sel' : ''}" data-a="setMode" data-m="cycle"><span class="mi">📅</span><b>Tout un cycle</b><span>Plusieurs leçons, progrès de chaque élève, cibles qui évoluent, évolution et bilan.</span></button></div></div>
    <div class="card"><h2>${s ? 'La séance' : 'Le cycle'}</h2>
    <div class="grid3">${s ? '' : `<label class="fld"><span>Nombre de leçons</span><input type="number" min="1" max="40" data-k="lessons" value="${P.lessons}"></label>`}
    <label class="fld"><span>Nombre d'essais par élève${s ? '' : ' et par leçon'}</span><input type="number" min="1" max="20" data-k="attempts" value="${P.attempts}" ${tries ? '' : 'disabled'}></label>
    <label class="fld"><span>Nombre maximum de groupes (= tablettes)</span><input type="number" min="1" max="12" data-k="maxGroups" value="${P.maxGroups || 8}"></label></div>
    ${tries ? '' : tip('Aucune saisie n\'est faite « à chaque essai » : le nombre d\'essais ne sert pas.')}
    ${tip(s ? 'Les essais et les groupes restent modifiables par l\'enseignant dans son appli.' : 'Ce sont des valeurs de départ : dans son appli, l\'enseignant peut changer le nombre de leçons et le nombre d\'essais leçon par leçon.')}</div>
  <div class="card"><h2>Ce que fera votre appli</h2><ul class="recap">
    <li>🧑‍🏫 <b>Tablette enseignant</b> (code 0000) : classes, import des élèves (Pronote, Excel, liste collée), groupes de couleur = tablettes, appel (absent, dispensé, inapte partiel, sans tenue), remarques sur chaque élève.</li>
    <li>📲 <b>QR de ${s ? 'la séance' : 'la leçon'}</b> → tablettes élèves : élèves du groupe, présence${P.fields.some(f => f.target) ? ', cibles' : ''}${(P.roles || []).length ? ', rôles' : ''}${s ? '' : ', résultats des leçons précédentes'}.</li>
    <li>📋 <b>Tablettes élèves</b> : une tuile par élève, ${P.fields.filter(f => f.type !== 'calc').length} saisie(s)${tries ? ` × ${P.attempts} essai(s)` : ''}${P.fields.some(f => f.type === 'calc') ? ', calculs automatiques' : ''}${Object.values(P.tools || {}).some(t => t.on && t.el) ? ', outils (minuteur…)' : ''}.</li>
    <li>📤 <b>QR des saisies</b> → 📥 tablette enseignant : fusion automatique.</li>
    <li>📊 Résultats${s ? '' : ', évolution'}, classement, bilan, fiche élève imprimable${P.grade?.on ? ', note' : ''}, export Excel.</li></ul></div>`;
}

/* --- 3. Saisies --- */
function vSaisies(){
  return `<div class="card"><h2>Que notent les élèves sur la tablette ?</h2>
    ${tip(`Chaque bloc ci-dessous est une <b>saisie</b>, c'est-à-dire une information notée pour chaque élève pendant ${LE()}. L'aperçu à droite se met à jour tout seul : ouvrez « Saisie directe » pour voir le résultat.`)}
    <div class="add-types">${Object.entries(TYPES).map(([k, t]) => `<button class="type-btn" data-a="addField" data-t="${k}"><span class="ti">${t.ico}</span><b>${t.n}</b><small>${esc(t.ex)}</small></button>`).join('')}</div></div>
    ${P.fields.map((f, i) => fieldCard(f, i)).join('') || '<div class="card muted">Touchez un type ci-dessus pour ajouter votre première saisie.</div>'}`;
}
function sel(i, k, opts, v){ return `<select data-f="${i}" data-fk="${k}">${Object.entries(opts).map(([a, b]) => `<option value="${a}" ${v === a ? 'selected' : ''}>${b}</option>`).join('')}</select>`; }
function fieldCard(f, i){
  const t = TYPES[f.type], n = P.fields.length, num = ['dial','counter','scale','number'].includes(f.type), L = isSeance() ? 'la séance' : 'la leçon';
  let h = `<div class="card fcard" data-i="${i}"><div class="fc-top"><span class="fnum">${i + 1}</span><span class="ftype">${t.ico} ${t.n}</span>
    <input type="text" class="flabel" data-f="${i}" data-fk="label" value="${esc(f.label)}" placeholder="Nom de la saisie (ex. Distance du lancer)">
    <div class="fc-btns"><button class="btn small ghost" data-a="mvField" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'} title="Monter">↑</button><button class="btn small ghost" data-a="mvField" data-i="${i}" data-d="1" ${i < n - 1 ? '' : 'disabled'} title="Descendre">↓</button>
    <button class="btn small ghost" data-a="delField" data-i="${i}" title="Supprimer">🗑</button></div></div>
    <p class="muted small type-d">${esc(t.d)}</p><div class="fgrid">`;
  if (f.type !== 'calc' || true) h += `<label class="fld"><span>Combien de fois par élève ?</span>${sel(i, 'per', { try:'À chaque essai', lesson:`Une seule fois dans ${L}` }, f.per)}</label>`;
  if (f.per === 'try') h += `<label class="fld"><span>Avec plusieurs essais, on retient…</span>${sel(i, 'agg', AGG, f.agg)}</label>`;
  if (f.type !== 'choice') h += `<label class="fld"><span>Une meilleure performance, c'est…</span>${sel(i, 'better', { high:'un nombre plus grand (distance, points…)', low:'un nombre plus petit (temps, fautes…)' }, f.better)}</label>`;
  if (num) h += `<label class="fld"><span>Valeur la plus petite</span><input type="number" step="any" data-f="${i}" data-fk="min" value="${f.min}"></label>
    <label class="fld"><span>Valeur la plus grande${f.type === 'number' ? ' (0 = pas de limite)' : ''}</span><input type="number" step="any" data-f="${i}" data-fk="max" value="${f.max}"></label>
    <label class="fld"><span>${f.type === 'number' ? 'Précision (ex. 0,01)' : 'De combien on avance à chaque cran'}</span><input type="number" step="any" min="0" data-f="${i}" data-fk="step" value="${f.step}"></label>`;
  if (f.type !== 'chrono' && f.type !== 'choice') h += `<label class="fld"><span>Unité (facultatif)</span><input type="text" data-f="${i}" data-fk="unit" value="${esc(f.unit || '')}" placeholder="m, km/h, kg, pts…" maxlength="8"></label>`;
  if (['number','calc'].includes(f.type)) h += `<label class="fld"><span>Chiffres après la virgule</span><input type="number" min="0" max="3" data-f="${i}" data-fk="dec" value="${f.dec ?? 1}"></label>`;
  h += `</div><div class="checks"><label class="fld inline"><input type="checkbox" data-f="${i}" data-fk="target" ${f.target ? 'checked' : ''}> 🎯 L'enseignant fixe un objectif (une « cible ») à chaque élève</label>`;
  if (f.type === 'calc') h += `<label class="fld inline"><input type="checkbox" data-f="${i}" data-fk="show" ${f.show !== false ? 'checked' : ''}> Les élèves voient ce résultat sur leur tablette</label>`;
  h += `</div>`;
  if (f.type === 'dial' && (f.max - f.min) / (f.step || 1) > 40) h += `<p class="warn">Plus de 40 crans : la molette sera remplacée par un compteur − / +.</p>`;
  if (f.type === 'scale') { const nb = Math.round((f.max - f.min) / (f.step || 1)) + 1;
    h += `<div class="sub"><b>Un mot sous chaque bouton</b> <span class="muted">(facultatif)</span> <button class="btn small ghost" data-a="borg" data-i="${i}">Échelle de ressenti 1 → 10</button><div class="lbl-grid">${Array.from({ length:Math.min(nb, 21) }, (_, k) => `<label><small>${fmt(+f.min + k * f.step)}</small><input type="text" data-lab="${i}" data-k="${k}" value="${esc((f.labels || [])[k] || '')}"></label>`).join('')}</div></div>`; }
  if (f.type === 'choice') h += `<div class="sub"><b>Les réponses proposées</b> <span class="muted">— les points servent aux calculs, à la note et aux cibles</span>
    ${(f.opts || []).map((o, k) => `<div class="opt-row"><input type="color" data-opt="${i}" data-k="${k}" data-ok="c" value="${esc(o.c)}" title="Couleur"><input type="text" data-opt="${i}" data-k="${k}" data-ok="l" value="${esc(o.l)}" placeholder="Réponse">
      <label class="row">vaut <input type="number" step="any" data-opt="${i}" data-k="${k}" data-ok="v" value="${o.v}" class="pts"> point(s)</label><button class="btn small ghost" data-a="delOpt" data-i="${i}" data-k="${k}">✕</button></div>`).join('')}
    <div class="btn-row"><button class="btn small" data-a="addOpt" data-i="${i}">＋ Réponse</button><span class="muted">Listes toutes faites :</span>${Object.entries(OPT_PRESETS).map(([k, o]) => `<button class="btn small ghost" data-a="presetOpt" data-i="${i}" data-p="${k}">${o.map(x => x.l).slice(0, 2).join(' / ')}…</button>`).join('')}</div></div>`;
  if (f.type === 'calc') { const ck = checkFormula(f), others = P.fields.filter(x => x !== f && (x.type !== 'calc' || P.fields.indexOf(x) < i));
    h += `<div class="sub calc-ed"><div class="row spread"><b>Le calcul</b><button class="btn small orange" data-a="presets" data-i="${i}">✨ Calculs tout prêts</button></div>
      <div class="feq">${formulaHTML(f.formula)}</div>
      <div class="f-check ${ck.ok ? 'ok' : 'ko'}">${ck.ok ? '✓' : '⚠️'} ${esc(ck.msg)}</div>
      <div class="kb"><span class="kb-l">Saisies</span>${others.map(x => `<button class="ftok fld-tok" data-a="fTok" data-i="${i}" data-t="{${x.id}}">${esc(x.label)}</button>`).join('') || '<span class="muted">Ajoutez d\'abord d\'autres saisies.</span>'}</div>
      <div class="kb"><span class="kb-l">Opérations</span>${[['+','+'],['-','−'],['*','×'],['/','÷'],['(','('],[')',')']].map(([t, l]) => `<button class="ftok op-tok" data-a="fTok" data-i="${i}" data-t="${t}">${l}</button>`).join('')}
        <input type="text" inputmode="decimal" class="num-add" id="num-${i}" placeholder="nombre"><button class="ftok num-tok" data-a="fNum" data-i="${i}">＋ nombre</button></div>
      <div class="kb"><span class="kb-l">Fonctions</span>${[['MAX','le plus grand de'],['MIN','le plus petit de'],['MOY','la moyenne de'],['ARRONDI','arrondi de']].map(([t, l]) => `<button class="ftok fn-tok" data-a="fFn" data-i="${i}" data-t="${t}">${l} ( )</button>`).join('')}
        <button class="ftok op-tok" data-a="fTok" data-i="${i}" data-t=";" title="sépare deux valeurs dans une fonction">;</button></div>
      <div class="btn-row"><button class="btn small ghost" data-a="fBack" data-i="${i}">⌫ Effacer le dernier bloc</button><button class="btn small ghost" data-a="fClear" data-i="${i}">Tout effacer</button></div>
      <p class="muted small">Exemple : « Sprint » + « Lancer » ; pour une fonction : « le plus grand de ( Saut 1 ; Saut 2 ) ».</p></div>`; }
  h += `<label class="fld"><span>Consigne affichée aux élèves au-dessus de la saisie (facultatif)</span><input type="text" data-f="${i}" data-fk="help" value="${esc(f.help || '')}" placeholder="ex. Plot 1 à 4 m, puis un plot tous les 2 m"></label></div>`;
  return h;
}

/* --- 4. Rôles --- */
function vRoles(){
  const R = P.roles || (P.roles = []), has = n => R.some(r => r.n === n);
  return `<div class="card"><h2>Les rôles des élèves</h2>${tip('Facultatif. Les rôles <b>tournent tout seuls</b> dans chaque groupe d\'une leçon à l\'autre ; l\'enseignant peut aussi les décaler ou les changer élève par élève. Ils s\'affichent sur les tuiles des élèves.')}
    ${R.map((r, k) => `<div class="opt-row"><span class="fnum">${k + 1}</span><input type="text" data-role="${k}" data-rk="n" value="${esc(r.n)}" placeholder="Nom du rôle"><input type="text" data-role="${k}" data-rk="d" value="${esc(r.d || '')}" placeholder="Ce que fait l'élève (facultatif)" class="grow">
      <button class="btn small ghost" data-a="mvRole" data-k="${k}" ${k ? '' : 'disabled'}>↑</button><button class="btn small ghost" data-a="delRole" data-k="${k}">✕</button></div>`).join('') || '<p class="muted">Aucun rôle pour l\'instant : touchez des rôles dans la banque ci-dessous.</p>'}
    <div class="btn-row"><button class="btn small" data-a="addRole">＋ Rôle personnalisé</button>${R.length ? '<button class="btn small ghost" data-a="clearRoles">Tout retirer</button>' : ''}</div>
    <label class="fld inline" style="margin-top:12px"><input type="checkbox" data-k="rotate" ${P.rotate !== false ? 'checked' : ''}> Les rôles changent automatiquement à chaque leçon</label></div>
  <div class="card"><h2>Banque de rôles</h2><p class="muted">Touchez un rôle pour l'ajouter.</p>
    ${ROLE_BANK.map(([g, list]) => `<div class="rb-g"><b>${g}</b><div class="rb">${list.map(([n, d]) => `<button class="rchip ${has(n) ? 'on' : ''}" data-a="bankRole" data-n="${esc(n)}" data-d="${esc(d || '')}" title="${esc(d || '')}">${has(n) ? '✓ ' : '＋ '}${esc(n)}</button>`).join('')}</div></div>`).join('')}</div>`;
}

/* --- 5. Outils --- */
function vOutils(){
  const T = P.tools, cnt = P.fields.filter(f => ['counter','number','dial'].includes(f.type));
  return `<div class="card"><h2>Les outils de séance</h2>${tip('Cochez les outils à mettre dans l\'appli. Ils s\'ouvrent en plein écran depuis le bouton « 🧰 Outils ». Les bips sonores marchent même tablette en silencieux sur la plupart des appareils (montez le volume).')}</div>
    ${Object.entries(TOOLS).map(([k, t]) => { const c = T[k]; return `<div class="card tool-card ${c.on ? 'on' : ''}"><div class="tool-top"><label class="tool-on"><input type="checkbox" data-tool="${k}" data-tk="on" ${c.on ? 'checked' : ''}><span class="ti">${t.ico}</span><span><b>${t.n}</b><small>${t.d}</small></span></label></div>
      ${c.on ? `<div class="tool-p"><label class="fld inline"><input type="checkbox" data-tool="${k}" data-tk="el" ${c.el ? 'checked' : ''}> Aussi sur les tablettes élèves</label>
        ${k === 'timer' ? `<label class="fld"><span>Durées proposées (en secondes, séparées par des virgules)</span><input type="text" data-tool="timer" data-tk="presets" value="${esc(c.presets)}"></label>` : ''}
        ${k === 'interval' ? `<div class="grid3"><label class="fld"><span>Travail (s)</span><input type="number" min="1" data-tool="interval" data-tk="work" value="${c.work}"></label><label class="fld"><span>Récupération (s)</span><input type="number" min="0" data-tool="interval" data-tk="rest" value="${c.rest}"></label><label class="fld"><span>Séries</span><input type="number" min="1" data-tool="interval" data-tk="rounds" value="${c.rounds}"></label></div>` : ''}
        ${k === 'rotation' ? `<div class="grid2"><label class="fld"><span>Ateliers (un par ligne)</span><textarea rows="5" data-tool="rotation" data-tk="ateliers">${esc(c.ateliers)}</textarea></label><div><label class="fld"><span>Durée d'un atelier (minutes)</span><input type="number" min="1" step="0.5" data-tool="rotation" data-tk="duree" value="${c.duree}"></label><label class="fld"><span>Temps pour changer d'atelier (secondes)</span><input type="number" min="0" data-tool="rotation" data-tk="trans" value="${c.trans}"></label></div></div>` : ''}
        ${k === 'equipes' ? `<label class="fld"><span>Nombre d'équipes proposé</span><input type="number" min="2" max="12" data-tool="equipes" data-tk="n" value="${c.n}"></label>` : ''}
        ${k === 'score' ? `<div class="grid2"><label class="fld"><span>Équipe 1</span><input type="text" data-tool="score" data-tk="a" value="${esc(c.a)}"></label><label class="fld"><span>Équipe 2</span><input type="text" data-tool="score" data-tk="b" value="${esc(c.b)}"></label></div>` : ''}
        ${k === 'tours' ? `<label class="fld"><span>Reporter le nombre de tours dans la saisie…</span><select data-tool="tours" data-tk="field"><option value="">— ne pas reporter —</option>${cnt.map(f => `<option value="${f.id}" ${c.field === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select></label>` : ''}</div>` : ''}</div>`; }).join('')}`;
}

/* --- 6. Note --- */
function vBareme(){
  const G = P.grade || (P.grade = { on:false, total:20, items:[] }), F = P.fields, sum = G.items.reduce((s, it) => s + (+it.pts || 0), 0), FR = fromList();
  return `<div class="card"><h2>Calculer une note</h2>
    <label class="fld inline big-check"><input type="checkbox" data-gk="on" ${G.on ? 'checked' : ''}> Oui, l'appli calcule une note pour chaque élève</label>
    ${G.on ? `<div class="grid3"><label class="fld"><span>Note sur</span><input type="number" min="1" data-gk="total" value="${G.total}"></label></div>
    ${tip(`La note est faite de plusieurs <b>éléments</b>. Pour chacun, on choisit une saisie et un tableau <b>« résultat → points »</b>. Exemple : plot 0 → 0 point, plot 11 → 6 points ; entre les deux, les points sont proportionnels (plot 5,5 → 3 points).${isSeance() ? '' : ' Seules les leçons marquées « évaluation » comptent (toutes si aucune).'}`)}
    ${sum !== +G.total && G.items.length ? `<p class="warn">Total des éléments : ${fmt(sum)} points. La note sera ramenée sur ${G.total}.</p>` : ''}` : ''}</div>
    ${G.on ? G.items.map((it, k) => { const f = F.find(x => x.id === it.field); const ex = (it.table || []).length >= 2 ? interpEx(it.table) : null;
      return `<div class="card"><div class="fc-top"><span class="fnum">${k + 1}</span><b>Élément de la note</b><div class="fc-btns"><button class="btn small ghost" data-a="delItem" data-k="${k}">🗑</button></div></div>
        <div class="grid3"><label class="fld"><span>Saisie utilisée</span><select data-gi="${k}" data-ik="field">${F.map(x => `<option value="${x.id}" ${x.id === it.field ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
        <label class="fld"><span>On regarde…</span><select data-gi="${k}" data-ik="from">${Object.entries(FR).map(([a, b]) => `<option value="${a}" ${it.from === a ? 'selected' : ''} ${a === 'cible' && f && !f.target ? 'disabled' : ''}>${b}${a === 'cible' && f && !f.target ? ' (cible non activée)' : ''}</option>`).join('')}</select></label>
        <label class="fld"><span>Sur combien de points ?</span><input type="number" step="any" min="0" data-gi="${k}" data-ik="pts" value="${it.pts}"></label></div>
        <div class="sub"><b>Tableau résultat → points</b>
        <table class="ttable"><tr><th>Si le résultat vaut…</th><th>…l'élève a</th><th></th></tr>${(it.table || []).map((r, j) => `<tr><td><input type="number" step="any" data-tr="${k}" data-j="${j}" data-c="0" value="${r[0]}"> ${it.from === 'cible' ? '%' : esc(f?.unit || '')}</td><td><input type="number" step="any" data-tr="${k}" data-j="${j}" data-c="1" value="${r[1]}"> pts</td><td><button class="btn small ghost" data-a="delRow" data-k="${k}" data-j="${j}">✕</button></td></tr>`).join('')}</table>
        <div class="btn-row"><button class="btn small" data-a="addRow" data-k="${k}">＋ Ligne</button><button class="btn small ghost" data-a="autoTable" data-k="${k}">↗ Remplir automatiquement (du plus faible au meilleur)</button></div>
        ${ex ? `<p class="muted small">${ex}</p>` : ''}</div></div>`; }).join('') + `<div class="btn-row"><button class="btn" data-a="addItem">＋ Ajouter un élément à la note</button></div>` : ''}`;
}
function interpEx(t){ const s = [...t].sort((a, b) => a[0] - b[0]), a = s[0], b = s[s.length - 1], m = (a[0] + b[0]) / 2; let y = a[1];
  for (let i = 1; i < s.length; i++) if (m <= s[i][0]) { const [x0, y0] = s[i-1], [x1, y1] = s[i]; y = x1 === x0 ? y1 : y0 + (y1 - y0) * (m - x0) / (x1 - x0); break; }
  return `Vérification : résultat ${fmt(a[0])} → ${fmt(a[1])} pt · résultat ${fmt(m)} → ${fmt(y)} pt · résultat ${fmt(b[0])} → ${fmt(b[1])} pt`; }

/* --- 7. Export --- */
function vExport(){
  const pb = problems();
  return `<div class="card"><h2>Télécharger l'appli</h2>
    ${pb.length ? `<div class="problems"><b>À vérifier avant de télécharger :</b><ul>${pb.map(p => `<li>${p}</li>`).join('')}</ul></div>` : '<div class="okbox">✓ Tout est prêt.</div>'}
    <div class="btn-row"><button class="btn primary big" data-a="exportZip">📦 Télécharger mon appli (.zip)</button><button class="btn" data-a="exportCfg">💾 Enregistrer le modèle pour un collègue (.json)</button></div>
    <p class="muted small">Version ${esc(P.version)} — elle augmente toute seule à chaque téléchargement, ce qui force les tablettes à recharger l'appli.</p></div>
  <div class="card"><h2>Mettre l'appli en ligne (une seule fois)</h2><ol class="recap">
    <li>Dézippez le fichier téléchargé : vous obtenez un dossier.</li>
    <li><b>La Forge des communs numériques éducatifs</b> (conseillé) : créez un projet, déposez le contenu du dossier. Le fichier fourni <code>.gitlab-ci.yml</code> met l'appli en ligne tout seul.<br>
        <b>ou GitHub Pages</b> : créez un dépôt, déposez le contenu du dossier, puis Settings → Pages → branche <i>main</i>.</li>
    <li>Ouvrez l'adresse obtenue sur chaque tablette. iPad : Safari → Partager → « Sur l'écran d'accueil ». Android : Chrome → « Installer l'application ».</li>
    <li>Pour une mise à jour : modifiez ici, retéléchargez, remplacez les fichiers en ligne. Les données des tablettes sont conservées.</li></ol></div>
  <div class="card"><h2>Partager avec un collègue</h2><p class="muted">Le fichier <b>modèle (.json)</b> s'ouvre dans la Fabrique avec « 📂 Ouvrir un modèle reçu » pour être adapté. Il est aussi dans le .zip (fabrique-config.json).</p>
    <details><summary>Détails techniques</summary><p class="muted small">Identifiant de l'appli : <code>${esc(P.id)}</code>. Il ne change jamais : il sépare les données de cette appli des autres sur une même tablette et empêche de scanner le QR d'une autre appli.</p>
    <label class="fld"><span>Version</span><input type="text" data-k="version" value="${esc(P.version)}"></label></details></div>`;
}
function problems(){
  const out = [];
  if (!P.name.trim()) out.push('Donnez un nom à l\'appli (étape Identité).');
  if (!P.fields.length) out.push('Ajoutez au moins une saisie.');
  P.fields.forEach(f => { const L = `« ${esc(f.label || 'saisie sans nom')} »`;
    if (!f.label.trim()) out.push('Une saisie n\'a pas de nom.');
    if (['dial','counter','scale'].includes(f.type) && !(+f.max > +f.min)) out.push(`${L} : la valeur la plus grande doit dépasser la plus petite.`);
    if (['dial','counter','scale'].includes(f.type) && !(+f.step > 0)) out.push(`${L} : le pas doit être positif.`);
    if (f.type === 'choice' && (f.opts || []).length < 2) out.push(`${L} : il faut au moins deux réponses.`);
    if (f.type === 'calc') { const c = checkFormula(f); if (!c.ok) out.push(`Calcul ${L} : ${esc(c.msg)}`); } });
  if (P.grade?.on) { if (!P.grade.items.length) out.push('Note activée sans élément.');
    P.grade.items.forEach((it, k) => { if (!P.fields.some(f => f.id === it.field)) out.push(`Note, élément ${k + 1} : la saisie a été supprimée.`); if ((it.table || []).length < 2) out.push(`Note, élément ${k + 1} : il faut au moins deux lignes dans le tableau.`); }); }
  if (P.tools?.tours?.on && P.tools.tours.field && !P.fields.some(f => f.id === P.tools.tours.field)) out.push('Compteur de tours : la saisie choisie a été supprimée.');
  return out;
}

/* ---------------------------------------------------------------------
   Liaisons des champs
   --------------------------------------------------------------------- */
function after(){
  $$('input[data-k],select[data-k],textarea[data-k]').forEach(el => { if (el.closest('.lbl-grid') || el.dataset.opt != null || el.dataset.lab != null) return;
    el.oninput = el.onchange = e => { const k = el.dataset.k; let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value;
      if (['lessons','attempts','maxGroups'].includes(k)) v = Math.max(1, Math.min(k === 'maxGroups' ? 12 : 40, Math.round(v) || 1));
      P[k] = v; if (k === 'accent' || k === 'color') drawIconPrev();
      if (k === 'name') { const o = $('#proj-sel option:checked'); if (o) o.textContent = v; }
      saveFab(); if (e.type === 'change' && el.type !== 'text' && el.type !== 'color') rerender(); }; });
  $$('[data-ik]').forEach(el => { el.oninput = el.onchange = e => { P.icon[el.dataset.ik] = el.type === 'checkbox' ? (el.dataset.ik === 'fit' ? (el.checked ? 'contain' : 'cover') : el.checked) : el.value; saveFab(); drawIconPrev();
    if (e.type === 'change' && el.dataset.ik === 'bg' && P.icon.mode === 'picto') rerender(); }; });
  const icf = $('#icon-file'); if (icf) icf.onchange = async e => { const f = e.target.files[0]; if (!f) return;
    const im = await loadImg(URL.createObjectURL(f)), k = Math.min(1, 512 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
    cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
    P.icon.img = cv.toDataURL('image/png'); saveFab(); render(); };
  $$('[data-fk]').forEach(el => { el.oninput = el.onchange = e => { const f = P.fields[+el.dataset.f], k = el.dataset.fk;
      f[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value; saveFab();
      if (e.type === 'change' && (el.tagName === 'SELECT' || el.type === 'checkbox' || ['min','max','step','label'].includes(k))) rerender(); }; });
  $$('[data-lab]').forEach(el => el.oninput = () => { const f = P.fields[+el.dataset.lab]; f.labels = f.labels || []; f.labels[+el.dataset.k] = el.value; saveFab(); });
  $$('[data-opt]').forEach(el => el.oninput = () => { const o = P.fields[+el.dataset.opt].opts[+el.dataset.k]; o[el.dataset.ok] = el.dataset.ok === 'v' ? +el.value : el.value; saveFab(); });
  $$('[data-role]').forEach(el => el.oninput = () => { P.roles[+el.dataset.role][el.dataset.rk] = el.value; saveFab(); });
  $$('[data-tool]').forEach(el => el.oninput = el.onchange = e => { const c = P.tools[el.dataset.tool], k = el.dataset.tk; c[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value; saveFab();
    if (e.type === 'change' && (el.type === 'checkbox' || el.tagName === 'SELECT')) rerender(); });
  $$('[data-gk]').forEach(el => el.onchange = () => { P.grade[el.dataset.gk] = el.type === 'checkbox' ? el.checked : +el.value;
    if (el.dataset.gk === 'on' && el.checked && !P.grade.items.length && P.fields.length) ACT.addItem(); saveFab(); rerender(); });
  $$('[data-gi]').forEach(el => el.onchange = () => { const it = P.grade.items[+el.dataset.gi]; it[el.dataset.ik] = el.dataset.ik === 'pts' ? +el.value : el.value;
    if (el.dataset.ik !== 'pts' || !it.table.length) autoTable(it); else { const mx = Math.max(...it.table.map(r => r[1])); if (mx > 0) it.table.forEach(r => r[1] = Math.round(r[1] / mx * it.pts * 100) / 100); }
    saveFab(); rerender(); });
  $$('[data-tr]').forEach(el => el.onchange = () => { const r = P.grade.items[+el.dataset.tr].table[+el.dataset.j]; r[+el.dataset.c] = +el.value; saveFab(); rerender(); });
  $$('.num-add').forEach(el => el.onkeydown = e => { if (e.key === 'Enter') ACT.fNum({ i: el.id.slice(4) }); });
  drawIconPrev();
}
function rerender(){ const y = window.scrollY; render(); window.scrollTo(0, y); }
async function drawIconPrev(){ const c = $('#icon-prev'); if (!c || !P.icon) return; const cv = await drawIcon(P.icon, 320); const ctx = c.getContext('2d'); ctx.clearRect(0, 0, 160, 160);
  ctx.save(); roundRect(ctx, 0, 0, 160, 160, 34); ctx.clip(); ctx.drawImage(cv, 0, 0, 160, 160); ctx.restore(); }

/* ---------------------------------------------------------------------
   Actions
   --------------------------------------------------------------------- */
const OPT_PRESETS = {
  freq:[ { l:'Jamais', v:0, c:'#D0161B' }, { l:'Parfois', v:1, c:'#F07000' }, { l:'Souvent', v:2, c:'#FFD000' }, { l:'Toujours', v:3, c:'#1E8E3E' } ],
  yn:[ { l:'Non', v:0, c:'#D0161B' }, { l:'Oui', v:1, c:'#1E8E3E' } ],
  acq:[ { l:'Non acquis', v:0, c:'#D0161B' }, { l:'En cours', v:1, c:'#F07000' }, { l:'Acquis', v:2, c:'#3FB65C' }, { l:'Expert', v:3, c:'#0B4F1C' } ],
  deg:[ { l:'Degré 1', v:1, c:'#D0161B' }, { l:'Degré 2', v:2, c:'#F07000' }, { l:'Degré 3', v:3, c:'#3FB65C' }, { l:'Degré 4', v:4, c:'#0B4F1C' } ],
  reu:[ { l:'Échec', v:0, c:'#D0161B' }, { l:'Réussite partielle', v:1, c:'#FFD000' }, { l:'Réussite', v:2, c:'#1E8E3E' } ] };
const BORG = ['Repos','Très très facile','Très facile','Facile','Moyen','Un peu dur','Dur','Très dur','Très très dur','Épuisant','Maximal'];
function setFormula(i, s){ const f = P.fields[+i]; f.formula = s.trim(); saveFab(); rerender(); }
const ACT = {
  step: d => { FAB.step = d.s; saveFab(); render(); window.scrollTo(0, 0); },
  new: () => wizard(1),
  dup: () => { const c = clone(P); c.id = slug(c.short || c.name) + '-' + rnd(4); c.name += ' (copie)'; c.version = '1.0.0'; c.created = Date.now(); FAB.projects[c.id] = c; FAB.active = c.id; P = c; saveFab(); render(); },
  del: async () => { if (!(await confirmBox('Supprimer « ' + esc(P.name) + ' » de la Fabrique ?', 'Les applis déjà téléchargées et mises en ligne ne sont pas touchées.', 'Supprimer', true))) return;
    try { localStorage.removeItem(previewKey()); } catch(e){}
    delete FAB.projects[P.id]; FAB.active = Object.keys(FAB.projects)[0] || null; P = FAB.active ? FAB.projects[FAB.active] : null; saveFab(); render(); },
  setMode: d => { if (P.mode === d.m) return; P.mode = d.m; if (d.m === 'seance') P.grade.items.forEach(it => { if (!FROM_S[it.from]) { it.from = 'best'; } });
    try { localStorage.removeItem(previewKey()); } catch(e){} saveFab(); rerender(); toast(d.m === 'seance' ? 'Appli pour une seule leçon' : 'Appli pour un cycle'); },
  iconMode: d => { P.icon.mode = d.m; if (d.m === 'apsa' && !P.icon.apsa) P.icon.apsa = APSA_ICONS[1][0]; if (d.m === 'picto' && !P.icon.picto) P.icon.picto = 'coureur'; saveFab(); rerender(); },
  pickApsa: d => { P.icon.apsa = d.k; saveFab(); rerender(); },
  pickPicto: d => { P.icon.picto = d.k; saveFab(); rerender(); },
  addField: d => { const f = { id:'f' + rnd(5), type:d.t, label:'', target:false, formula:'' };
    if (d.t === 'scale') { f.min = 1; f.max = 5; } if (d.t === 'number') { f.min = 0; f.max = 0; f.step = 0.01; } if (d.t === 'chrono') f.unit = 's';
    if (d.t === 'calc') { f.per = P.fields.some(x => x.per === 'try') ? 'try' : 'lesson'; f.dec = 1; }
    P.fields.push(f); fixField(f); saveFab(); render();
    setTimeout(() => { const c = $$('.fcard').pop(); if (c) { c.scrollIntoView({ behavior:'smooth', block:'center' }); c.querySelector('.flabel')?.focus(); } }, 60); },
  delField: async d => { const f = P.fields[+d.i]; if (!(await confirmBox('Supprimer « ' + esc(f.label || 'cette saisie') + ' » ?', 'Les éléments de la note qui l\'utilisent seront aussi retirés.', 'Supprimer', true))) return;
    P.fields.splice(+d.i, 1); P.grade.items = P.grade.items.filter(it => it.field !== f.id); saveFab(); rerender(); },
  mvField: d => { const i = +d.i, j = i + +d.d; [P.fields[i], P.fields[j]] = [P.fields[j], P.fields[i]]; saveFab(); rerender(); },
  addOpt: d => { const f = P.fields[+d.i]; f.opts.push({ l:'Réponse ' + (f.opts.length + 1), v:f.opts.length, c:'#0062C4' }); saveFab(); rerender(); },
  delOpt: d => { P.fields[+d.i].opts.splice(+d.k, 1); saveFab(); rerender(); },
  presetOpt: d => { P.fields[+d.i].opts = clone(OPT_PRESETS[d.p]); saveFab(); rerender(); },
  borg: d => { const f = P.fields[+d.i]; f.min = 0; f.max = 10; f.step = 1; f.better = 'low'; f.labels = [...BORG]; if (!f.label) f.label = 'Ressenti de l\'effort'; saveFab(); rerender(); },
  fTok: d => { const f = P.fields[+d.i]; setFormula(d.i, (f.formula + ' ' + d.t)); },
  fFn: d => { const f = P.fields[+d.i]; setFormula(d.i, (f.formula + ' ' + d.t + ' (')); toast('Ajoutez les valeurs séparées par « ; » puis fermez avec « ) »', 3500); },
  fNum: d => { const el = $('#num-' + d.i), v = parseFloat(String(el?.value || '').replace(',', '.')); if (!isFinite(v)) return toast('Tapez un nombre dans la case « nombre »');
    setFormula(d.i, P.fields[+d.i].formula + ' ' + String(v).replace('.', ',')); },
  fBack: d => { const T = tokens(P.fields[+d.i].formula); T.pop(); setFormula(d.i, T.join(' ')); },
  fClear: d => setFormula(d.i, ''),
  presets: d => {
    const i = +d.i, others = P.fields.filter((x, j) => j !== i && (x.type !== 'calc' || j < i));
    const fsel = (k, l) => `<label class="fld"><span>${l}</span><select data-pa="${k}">${others.map(x => `<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label>`;
    const m = modal(`<h2>✨ Calculs tout prêts</h2><p class="muted">Choisissez un calcul, indiquez les saisies, c'est fait.</p>
      ${PRESETS.map((p, k) => `<details class="preset"><summary><b>${esc(p.n)}</b> <span class="muted">— ${esc(p.d)}</span></summary><div class="grid3" data-pk="${k}">
        ${p.a.map(([key, t, l, def]) => t === 'f' ? fsel(key, l) : `<label class="fld"><span>${l}</span><input type="number" step="any" data-pa="${key}" value="${def}"></label>`).join('')}</div>
        <button class="btn small primary" data-use="${k}">Utiliser ce calcul</button></details>`).join('')}
      <div class="btn-row spread" style="margin-top:12px"><span></span><button class="btn ghost" data-c>Fermer</button></div>`, true);
    m.querySelector('[data-c]').onclick = closeModal;
    m.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const p = PRESETS[+b.dataset.use], box = m.querySelector(`[data-pk="${b.dataset.use}"]`), x = {};
      box.querySelectorAll('[data-pa]').forEach(el => x[el.dataset.pa] = el.value);
      if (p.a.some(a => a[1] === 'f') && !others.length) return toast('Ajoutez d\'abord des saisies');
      const f = P.fields[i]; f.formula = p.f(x); if (p.unit) f.unit = p.unit; if (!f.label) f.label = p.n; closeModal(); saveFab(); rerender(); toast('✓ Calcul ajouté'); });
  },
  addRole: () => { P.roles.push({ n:'', d:'' }); saveFab(); rerender(); },
  delRole: d => { P.roles.splice(+d.k, 1); saveFab(); rerender(); },
  clearRoles: () => { P.roles = []; saveFab(); rerender(); },
  mvRole: d => { const i = +d.k, j = i - 1; [P.roles[i], P.roles[j]] = [P.roles[j], P.roles[i]]; saveFab(); rerender(); },
  bankRole: d => { const i = P.roles.findIndex(r => r.n === d.n); if (i >= 0) P.roles.splice(i, 1); else P.roles.push({ n:d.n, d:d.d }); saveFab(); rerender(); },
  addItem: () => { const f = P.fields.find(x => x.target) || P.fields[0]; if (!f) return toast('Ajoutez d\'abord une saisie');
    const it = { field:f.id, from:'best', pts:Math.max(1, (+P.grade.total || 20) - P.grade.items.reduce((s, x) => s + (+x.pts || 0), 0)), table:[] }; P.grade.items.push(it); autoTable(it); saveFab(); rerender(); },
  delItem: d => { P.grade.items.splice(+d.k, 1); saveFab(); rerender(); },
  addRow: d => { const t = P.grade.items[+d.k].table; const last = t[t.length - 1] || [0, 0]; t.push([last[0] + 1, last[1]]); saveFab(); rerender(); },
  delRow: d => { P.grade.items[+d.k].table.splice(+d.j, 1); saveFab(); rerender(); },
  autoTable: d => { autoTable(P.grade.items[+d.k]); saveFab(); rerender(); },
  exportZip: () => exportZip(),
  exportCfg: () => download(new Blob([JSON.stringify({ fabrique:FAB_VERSION, ...P }, null, 1)], { type:'application/json' }), `${slug(P.short || P.name)}-modele.json`),
  demo: () => demoData(),
  resetPrev: async () => { if (await confirmBox('Vider l\'aperçu ?', 'Les classes et saisies de test de l\'aperçu sont effacées.', 'Vider', true)) { localStorage.removeItem(previewKey()); refreshPreview(); } },
  reloadPrev: () => refreshPreview(),
  togglePrev: () => document.body.classList.toggle('prev-open'),
};
function autoTable(it){
  const f = P.fields.find(x => x.id === it.field), pts = +it.pts || 0;
  if (it.from === 'cible') { it.table = [[0, 0], [100, pts]]; return; }
  if (it.from === 'prog') { const r = f && f.max > f.min ? (f.max - f.min) / 4 : 5; it.table = [[0, 0], [Math.round(r * 100) / 100, pts]]; return; }
  if (!f) { it.table = [[0, 0], [10, pts]]; return; }
  let lo = +f.min, hi = +f.max;
  if (f.type === 'choice') { const v = (f.opts || []).map(o => +o.v); lo = Math.min(...v); hi = Math.max(...v); }
  if (f.type === 'chrono') { lo = 60; hi = 180; }
  if (f.type === 'calc' || !(hi > lo)) { lo = 0; hi = 10; }
  if (f.per === 'try' && f.agg === 'sum') hi = hi * (+P.attempts || 1);
  it.table = f.better === 'low' && f.type !== 'choice' ? [[lo, pts], [hi, 0]] : [[lo, 0], [hi, pts]];
}
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || el.disabled) return; const fn = ACT[el.dataset.a]; if (fn) { e.preventDefault(); fn(el.dataset, el); } });
document.addEventListener('change', async e => {
  if (e.target.id === 'proj-sel') { FAB.active = e.target.value; P = FAB.projects[FAB.active]; saveFab(); render(); }
  if (e.target.id === 'imp-proj' && e.target.files[0]) { const f = e.target.files[0]; e.target.value = '';
    try { const c = JSON.parse(await f.text()); if (!c.fields || !c.name) throw new Error('Ce fichier n\'est pas un modèle de la Fabrique');
      delete c.fabrique; const exists = FAB.projects[c.id];
      if (exists && !(await confirmBox('Remplacer « ' + esc(exists.name) + ' » ?', 'C\'est la même appli (même identifiant) dans une autre version. La remplacer garde la compatibilité avec les tablettes ; sinon une copie indépendante est créée.', 'Remplacer'))) { c.id = slug(c.short || c.name) + '-' + rnd(4); c.name += ' (import)'; }
      if (!c.id) c.id = slug(c.short || c.name) + '-' + rnd(4);
      migrate(c); c.fields.forEach(fixField); c.icon = c.icon || { mode:'text', text:'EPS', bg:c.color || '#0062C4', fg:'#FFFFFF' };
      c.created = Date.now(); FAB.projects[c.id] = c; FAB.active = c.id; P = c; saveFab(); render(); toast('✓ Modèle ouvert'); }
    catch(err){ toast('⚠️ ' + err.message, 3500); } }
});

/* =====================================================================
   Démarrage
   ===================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  loadFab(); render(); if (P) refreshPreview();
  $('#fab-version').textContent = 'Fabrique v' + FAB_VERSION;
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
});
/* =====================================================================
   Export : fichier .zip d'une PWA autonome
   ===================================================================== */
const ENGINE_FILES = [ ['moteur/outils.js','outils.js'], ['moteur/app.js','app.js'], ['moteur/styles.css','styles.css'], ['moteur/lib/qrcode.js','lib/qrcode.js'], ['moteur/lib/jsQR.js','lib/jsQR.js'],
  ['moteur/lib/zxing-reader.js','lib/zxing-reader.js'], ['moteur/lib/zxing_reader.wasm','lib/zxing_reader.wasm'], ['moteur/lib/xlsx.full.min.js','lib/xlsx.full.min.js'] ];
function bumpVersion(v){ const p = String(v || '1.0.0').split('.').map(x => parseInt(x) || 0); while (p.length < 3) p.push(0); p[2]++; return p.join('.'); }
async function exportZip(){
  const pb = problems(); if (pb.length && !(await confirmBox('Configuration incomplète', `${pb.length} point(s) à vérifier (voir la liste). Exporter quand même ?`, 'Exporter'))) return;
  const btn = $('[data-a="exportZip"]'); if (btn) { btn.disabled = true; btn.textContent = '⏳ Préparation…'; }
  try {
    const files = [], enc = new TextEncoder(), C = runtimeConfig(P);
    for (const [src, dst] of ENGINE_FILES) { const r = await fetch(src, { cache:'no-cache' }); if (!r.ok) throw new Error('Fichier introuvable : ' + src); files.push([dst, new Uint8Array(await r.arrayBuffer())]); }
    let html = await (await fetch('moteur/index.html', { cache:'no-cache' })).text();
    html = html.replace(/<title>.*?<\/title>/, `<title>${esc(P.name)}</title>`).replace(/(name="description" content=")[^"]*/, `$1${esc(P.sub || P.name)}`)
      .replace(/(name="theme-color" content=")[^"]*/, `$1${esc(P.color)}`).replace(/(name="apple-mobile-web-app-title" content=")[^"]*/, `$1${esc(P.short || P.name)}`);
    files.push(['index.html', enc.encode(html)]);
    files.push(['config.js', enc.encode(`/* ${P.name} — configuration de l'activité (Fabrique N'EPS v${FAB_VERSION}, ${new Date().toLocaleDateString('fr-FR')}).
   Pour modifier l'appli : ouvrez fabrique-config.json dans la Fabrique N'EPS, puis ré-exportez. */
window.APP_CONFIG = ${JSON.stringify(C, null, 1)};\n`)]);
    files.push(['manifest.webmanifest', enc.encode(JSON.stringify({ name:P.name, short_name:P.short || P.name, description:(P.sub || P.name) + (P.author ? ' – ' + P.author : ''), lang:'fr',
      start_url:'./index.html', scope:'./', display:'standalone', orientation:'any', background_color:'#F2F9FE', theme_color:P.color,
      icons:[ { src:'icons/icon-192.png', sizes:'192x192', type:'image/png' }, { src:'icons/icon-512.png', sizes:'512x512', type:'image/png' }, { src:'icons/icon-maskable-512.png', sizes:'512x512', type:'image/png', purpose:'maskable' } ] }, null, 2))]);
    for (const [n, s, mk] of [['icon-180.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512, true]])
      files.push(['icons/' + n, new Uint8Array(await (await canvasBlob(await drawIcon(P.icon, s, mk))).arrayBuffer())]);
    const assets = ['./', './index.html', './config.js', './styles.css', './app.js', './outils.js', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
      './lib/qrcode.js', './lib/jsQR.js', './lib/zxing-reader.js', './lib/zxing_reader.wasm', './lib/xlsx.full.min.js'];
    files.push(['sw.js', enc.encode(swTemplate(P, assets))]);
    files.push(['README.md', enc.encode(readme(P))]);
    files.push(['.gitlab-ci.yml', enc.encode(GITLAB_CI)]);
    files.push(['fabrique-config.json', enc.encode(JSON.stringify({ fabrique:FAB_VERSION, ...P }, null, 1))]);
    const dir = slug(P.short || P.name) + '/';
    download(makeZip(files.map(([n, d]) => [dir + n, d])), `${slug(P.short || P.name)}-v${P.version}.zip`);
    toast(`✓ ${P.name} v${P.version} exportée`, 3500);
    P.exported = P.version; P.version = bumpVersion(P.version); saveFab(); render();
  } catch(e){ console.error(e); toast('⚠️ Export impossible : ' + e.message + (location.protocol === 'file:' ? ' (ouvrez la Fabrique depuis son adresse en ligne)' : ''), 5000); }
  finally { if (btn) { btn.disabled = false; } }
}
function swTemplate(c, assets){
  return `/* Service worker – ${c.name} – N'EPS numérique${c.author ? ' – ' + c.author : ''}
   Réseau d'abord (toujours la dernière version quand on est connecté), cache si hors-ligne.
   Mise à jour : changer CACHE (fait automatiquement à chaque export par la Fabrique). */
const CACHE = '${c.id}-v${c.version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => fetch(u, { cache:'reload' }).then(r => r.ok && c.put(u, r)).catch(()=>{})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache:'no-cache' }).then(resp => {
    if (resp.ok) { const cl = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
    return resp;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
`;
}
const GITLAB_CI = `# Publication sur les Pages de La Forge des communs numériques éducatifs (GitLab)
# À chaque envoi (push) sur la branche principale, le site est recopié dans « public » et mis en ligne.
image: alpine:latest

pages:
  stage: deploy
  script:
    - mkdir .public
    - cp -r ./* .public
    - rm -rf public
    - mv .public public
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
`;
function readme(c){
  const tr = c.fields.some(f => f.per === 'try');
  return `# ${c.name} – N'EPS numérique

${c.sub ? c.sub + '\n\n' : ''}PWA de suivi élèves${c.author ? ' — ' + c.author : ''}. Conçue avec la Fabrique N'EPS (même socle que les applis Biathlon et Musculation) :
tablette enseignant ↔ tablettes élèves par QR codes, hors-ligne, données stockées sur chaque appareil.

## Mise en ligne
Publier ce dossier sur GitHub Pages ou La Forge (HTTPS obligatoire pour la caméra et l'installation ; \`.gitlab-ci.yml\` fourni).
iPad : Safari → Partager → « Sur l'écran d'accueil ». Android : Chrome → « Installer l'application ».
Mise à jour : ré-exporter depuis la Fabrique (la version et \`CACHE\` dans \`sw.js\` changent, les tablettes rechargent l'appli).

## Saisies
${c.fields.map(f => `- **${f.label}** — ${TYPES[f.type].n}${f.type === 'calc' ? ` : ${formulaText(f.formula)}` : ['dial','counter','scale'].includes(f.type) ? ` de ${f.min} à ${f.max}` : ''}${f.unit ? ` (${f.unit})` : ''}, ${f.per === 'try' ? 'à chaque essai (on garde ' + AGG[f.agg].toLowerCase() + ')' : 'une fois par ' + (c.mode === 'seance' ? 'séance' : 'leçon')}${f.target ? ', cible par élève' : ''}.`).join('\n')}

## Déroulement d'une leçon
1. Tablette enseignant (code par défaut 0000) : classe, élèves (import Pronote / Excel), groupes de couleur (= tablettes), leçon en cours${tr ? `, tentatives (${c.attempts} par défaut)` : ''}.
2. Appel${c.fields.some(f => f.target) ? ', cibles' : ''}${(c.roles || []).length ? ', rôles (' + c.roles.map(r => r.n).join(' / ') + ')' : ''}.
3. 📲 QR de la leçon ; chaque tablette élève : Accueil → 📷 Recevoir la leçon.
4. Élèves : Saisie → tuile de l'élève → saisies.
5. Fin de leçon : chaque tablette 📤 Envoyer mes saisies ; l'enseignant 📥 Récupérer les saisies.
6. Résultats, ${c.grade?.on ? 'notes, ' : ''}export Excel, sauvegarde.

## Échange par QR
Données compressées et codées en Base45, découpées en une série de QR qui défilent. Scanner : 30–40 cm, luminosité au maximum ;
touchez un numéro manquant pour l'afficher. Secours : « Photo du QR » ou partage en fichier (AirDrop / Partage à proximité).

Identifiant de l'appli : \`${c.id}\` · version ${c.version}
`;
}
/* --- Zip (méthode « stockée », sans compression : aucune bibliothèque nécessaire) --- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8){ let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(entries){
  const enc = new TextEncoder(), chunks = [], central = []; let off = 0;
  const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  for (const [name, data] of entries) {
    const nm = enc.encode(name), crc = crc32(data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    chunks.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true);
    c.setUint32(42, off, true); central.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + data.length;
  }
  const csize = central.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(e.buffer)], { type:'application/zip' });
}
function download(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

