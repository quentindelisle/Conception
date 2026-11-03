/* Modèles de départ de la Fabrique N'EPS (exemples modifiables).
   Dans les calculs, {identifiant} désigne une saisie ; la Fabrique l'affiche par son nom. */
const MODELES = [
  { key:'vierge', both:true, ico:'📄', n:'Appli vierge', d:'Une seule saisie (compteur) à compléter.', cfg:{
    name:'Mon appli EPS', short:'Mon appli', sub:'', lessons:8, attempts:1,
    fields:[ { id:'reu', label:'Réussites', type:'counter', per:'try', min:0, max:20, step:1, agg:'best', better:'high' } ],
    roles:[], rotate:true, grade:{ on:false, total:20, items:[] }, tools:{ timer:{ on:true, el:true, presets:'30, 60, 120, 300' } },
    icon:{ mode:'picto', picto:'tablette', bg:'#0062C4' } } },

  { key:'saut', mode:'seance', ico:'📏', n:'Concours de sauts / lancers', d:'3 essais mesurés, meilleur essai retenu, note sur un barème.', cfg:{
    name:'Concours de saut en longueur', short:'Saut long', sub:'CA1 · Évaluation sur une séance', lessons:1, attempts:3, color:'#0062C4',
    fields:[ { id:'dist', label:'Distance', type:'number', per:'try', min:0, max:0, step:0.01, unit:'m', dec:2, agg:'best', better:'high', help:'Mesurer de la planche à la trace la plus proche.' },
             { id:'mord', label:'Planche respectée', type:'choice', per:'try', agg:'last', opts:[ { l:'Mordu', v:0, c:'#D0161B' }, { l:'Valide', v:1, c:'#1E8E3E' } ] } ],
    roles:[ { n:'Sauteur', d:'' }, { n:'Juge de mesure', d:'Je mesure la performance' }, { n:'Juge de faute', d:'Je surveille la planche' } ], rotate:true,
    grade:{ on:true, total:20, items:[ { field:'dist', from:'best', pts:20, table:[[2,0],[5.2,20]] } ] },
    tools:{ tirage:{ on:true, el:false } }, icon:{ mode:'apsa', apsa:'CA1-sauts', bg:'#0062C4' } } },

  { key:'circuit', mode:'seance', ico:'🔄', n:'Circuit d\'ateliers', d:'Rotation des groupes sur 4 ateliers, réussites par atelier, total automatique.', cfg:{
    name:'Circuit training', short:'Circuit', sub:'CA5 · Séance en ateliers', lessons:1, attempts:1, color:'#C2185B',
    fields:[ { id:'a1', label:'Atelier 1 – Gainage (répétitions)', type:'counter', per:'lesson', min:0, max:60 },
             { id:'a2', label:'Atelier 2 – Squats', type:'counter', per:'lesson', min:0, max:60 },
             { id:'a3', label:'Atelier 3 – Pompes', type:'counter', per:'lesson', min:0, max:60 },
             { id:'a4', label:'Atelier 4 – Corde à sauter', type:'counter', per:'lesson', min:0, max:200 },
             { id:'tot', label:'Total des répétitions', type:'calc', per:'lesson', formula:'{a1} + {a2} + {a3} + {a4}', dec:0 },
             { id:'res', label:'Ressenti de l\'effort', type:'scale', per:'lesson', min:0, max:10, better:'low', labels:['Repos','Très très facile','Très facile','Facile','Moyen','Un peu dur','Dur','Très dur','Très très dur','Épuisant','Maximal'] } ],
    roles:[ { n:'Pratiquant', d:'' }, { n:'Coach', d:'Je compte et je corrige la posture' } ], rotate:true, grade:{ on:false, total:20, items:[] },
    tools:{ rotation:{ on:true, el:false, ateliers:'Gainage\nSquats\nPompes\nCorde à sauter', duree:4, trans:30 }, interval:{ on:true, el:true, work:40, rest:20, rounds:6 }, timer:{ on:true, el:true, presets:'30, 45, 60, 120' } },
    icon:{ mode:'apsa', apsa:'CA5-cross-training', bg:'#C2185B' } } },

  { key:'biathlon', mode:'cycle', ico:'🎯', n:'Biathlon 5 s (CA1)', d:'Molettes « plot atteint », cibles par élève, rôles, note.', cfg:{
    name:'Biathlon 5 s', short:'Biathlon 5s', sub:'CA1 · Course de 5 s et lancer long', lessons:8, attempts:3,
    fields:[
      { id:'spr', label:'Sprint 5 s (plot atteint)', type:'dial', per:'try', min:0, max:11, step:1, agg:'best', better:'high', target:true, help:'Plot 1 = 15 km/h, +1 km/h par plot.' },
      { id:'lan', label:'Lancer long (plot atteint)', type:'dial', per:'try', min:0, max:8, step:1, agg:'best', better:'high', target:true, help:'Plot 1 à 4 m, un plot tous les 2 m.' },
      { id:'tot', label:'Total des points', type:'calc', per:'try', formula:'{spr} + {lan}', agg:'best', better:'high', dec:0 } ],
    roles:[ { n:'Pratiquant', d:'Je cours et je lance' }, { n:'Observateur', d:'Je repère le plot atteint' }, { n:'Starter', d:'Je donne le départ et je chronomètre 5 s' } ],
    rotate:true,
    grade:{ on:true, total:20, items:[
      { field:'spr', from:'best', pts:6, table:[[0,0],[11,6]] }, { field:'lan', from:'best', pts:6, table:[[0,0],[8,6]] },
      { field:'spr', from:'cible', pts:8, table:[[0,0],[100,8]] } ] },
    tools:{ timer:{ on:true, el:true, presets:'5, 30, 60' }, tirage:{ on:true, el:false } },
    icon:{ mode:'apsa', apsa:'CA1-biathlon', bg:'#0062C4' } } },

  { key:'demifond', mode:'cycle', ico:'⏱️', n:'Demi-fond (CA1)', d:'Chronos, vitesse calculée, ressenti, compteur de tours.', cfg:{
    name:'Demi-fond 3 × 500 m', short:'Demi-fond', sub:'CA1 · Produire et répartir un effort', lessons:8, attempts:3, color:'#1E8E3E',
    fields:[
      { id:'tps', label:'Temps au 500 m', type:'chrono', per:'try', agg:'best', better:'low', target:true },
      { id:'vit', label:'Vitesse', type:'calc', per:'try', formula:'ARRONDI( 500 / {tps} * 3,6 ; 1 )', unit:'km/h', agg:'mean', better:'high', dec:1 },
      { id:'res', label:'Ressenti', type:'scale', per:'try', min:0, max:10, step:1, better:'low', agg:'mean',
        labels:['Repos','Très très facile','Très facile','Facile','Moyen','Un peu dur','Dur','Très dur','Très très dur','Épuisant','Maximal'] } ],
    roles:[ { n:'Coureur', d:'' }, { n:'Chronométreur', d:'Je prends le temps' }, { n:'Lièvre', d:'J\'impose l\'allure' } ], rotate:true,
    grade:{ on:false, total:20, items:[] },
    tools:{ chrono:{ on:true, el:true }, interval:{ on:true, el:true, work:60, rest:30, rounds:6 } },
    icon:{ mode:'apsa', apsa:'CA1-demi-fond', bg:'#1E8E3E' } } },

  { key:'observation', both:true, ico:'👁', n:'Grille d\'observation', d:'Critères Jamais → Toujours, note d\'observation sur 10.', cfg:{
    name:'Observation en acrosport', short:'Acro obs', sub:'CA3 · Grille d\'observation par l\'élève', lessons:6, attempts:1, color:'#8A2BE2',
    fields:[
      { id:'sec', label:'Sécurité des parades', type:'choice', per:'try', agg:'last', opts:[
        { l:'Jamais', v:0, c:'#D0161B' }, { l:'Parfois', v:1, c:'#F07000' }, { l:'Souvent', v:2, c:'#FFD000' }, { l:'Toujours', v:3, c:'#1E8E3E' } ] },
      { id:'ten', label:'Tenue de la figure 3 secondes', type:'choice', per:'try', agg:'last', opts:[ { l:'Non', v:0, c:'#D0161B' }, { l:'Oui', v:3, c:'#1E8E3E' } ] },
      { id:'not', label:'Note d\'observation', type:'calc', per:'lesson', formula:'( {sec} + {ten} ) / 6 * 10', unit:'/10', dec:1 } ],
    roles:[ { n:'Porteur', d:'' }, { n:'Voltigeur', d:'' }, { n:'Pareur', d:'Je sécurise la figure' }, { n:'Observateur', d:'Je remplis la grille' } ], rotate:true,
    grade:{ on:true, total:20, items:[ { field:'not', from:'mean', pts:20, table:[[0,0],[10,20]] } ] },
    tools:{ timer:{ on:true, el:true, presets:'3, 10, 30, 60' } },
    icon:{ mode:'apsa', apsa:'CA3-acrosport', bg:'#8A2BE2' } } },
];
