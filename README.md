# Fabrique N'EPS – concevoir son appli EPS

PWA pour que chaque enseignant fabrique **sa propre appli de suivi**, sans programmer, sur le même socle que
les applis **Biathlon 5 s** et **Musculation** (Quentin Delisle · N'EPS numérique) :
tablette enseignant ↔ tablettes élèves par **QR codes en aller-retour**, hors-ligne, données sur chaque appareil.

## Principe
1. L'enseignant ouvre la Fabrique : un assistant lui demande « une seule leçon ou tout un cycle ? », puis un exemple de départ.
2. Il décrit son activité en 7 étapes : identité et icône (banque APSA, pictos, texte, image), organisation, saisies, rôles (banque par activité), outils de séance, note, export.
3. Il teste dans l'**aperçu** (tablette simulée, « 🧪 Classe de démo » pour voir résultats et notes).
4. **📦 Télécharger l'appli (.zip)** : une PWA autonome à publier sur GitHub Pages ou La Forge.

## Saisies disponibles
| Type | Usage |
|---|---|
| 🎡 Molette | Roue crantée min → max (plots, points). Au-delà de 40 crans : compteur. |
| ➕ Compteur | − / + (réussites, tours). |
| 🌡️ Échelle | Boutons colorés min → max, libellé par cran (ressenti, niveau). |
| 🔘 Choix | Choix colorés valant des points (Jamais → Toujours, Oui / Non…). |
| 🔢 Nombre | Valeur tapée (distance, charge…). |
| ⏱️ Chrono | Chronomètre intégré, temps modifiable. |
| 🧮 Calcul | Construit par blocs avec les noms des saisies (aucun code à retenir) ou choisi parmi les « calculs tout prêts » : somme, moyenne, écart, % de réussite, vitesse, points au-delà d'un seuil… |

Chaque saisie : par tentative ou une fois par leçon, résultat de la leçon (meilleure, moyenne, dernière, première, total),
« le mieux = plus grand / plus petit », cible par élève (échelle de 7 couleurs selon l'écart, comme Biathlon).

## Outils de séance (au choix)
Minuteur, chronomètre à tours, intervalles (Tabata, 30/30…), rotation d'ateliers, tirage au sort, équipes (au hasard ou équilibrées), tableau de score, compteur de tours (reporté dans une saisie). Bips sonores, écran maintenu allumé.

## Une leçon ou un cycle
- **Une seule leçon** : pas de numéros de leçon ni d'évolution ; bouton « Nouvelle séance » pour rejouer avec chaque classe ; la note porte sur la séance.
- **Cycle** : leçons, évolution, cibles recalculées, progrès, leçons d'évaluation.

## Ce que fait l'appli générée
- Tablette enseignant (code 0000) : classes, import Pronote / Excel / liste collée, groupes de couleur = tablettes, appel (absent, dispensé, inapte partiel, sans tenue), remarques par élève, bilan de leçon, classement, fiche élève imprimable,
  leçon en cours, tentatives, leçons d'évaluation, cibles (à la main ou depuis les résultats d'une leçon, ±1 cran),
  rôles en rotation, résultats par leçon et évolution, notes selon le barème, export Excel, sauvegarde / restauration.
- 📲 QR de la leçon → tablettes élèves (élèves, groupes, présence, cibles, rôles, résultats précédents).
- Tablettes élèves : tuiles du groupe, saisies, calculs, puis 📤 QR des saisies → 📥 tablette enseignant
  (fusion automatique, la saisie la plus récente l'emporte ; la caméra reste allumée pour enchaîner les tablettes).
- Chaque appli a un **identifiant** propre : données séparées sur une même tablette, et le QR d'une autre appli est refusé.

## Organisation des fichiers
- `index.html`, `fabrique.js`, `fabrique.css`, `modeles.js`, `banque.js` + `banque/apsa/` : la Fabrique (constructeur) et sa banque d'icônes.
- `moteur/outils.js` : les outils de séance.
- `moteur/` : le moteur générique copié dans chaque appli exportée (`app.js`, `styles.css`, `lib/`).
  `moteur/config.js` sert seulement à l'aperçu ; à l'export il est remplacé par la configuration de l'activité.
- Le bloc d'échange QR du moteur (Base45 + compression, série de QR qui défile, lecteurs natif / ZXing / jsQR,
  secours photo et fichier) est repris à l'identique de l'appli Musculation.

## Mise en ligne de la Fabrique
GitHub Pages ou La Forge (`.gitlab-ci.yml` fourni). HTTPS obligatoire. L'export .zip lit les fichiers du moteur
depuis l'adresse de la Fabrique : il ne fonctionne pas en ouvrant `index.html` directement depuis le disque.
Mise à jour : changer `CACHE` dans `sw.js`.

## Points d'attention
- L'aperçu et les applis générées stockent leurs données dans le navigateur de chaque tablette (pas de serveur) :
  penser à la sauvegarde .json en fin de cycle.
- Modifier une appli déjà utilisée : garder le même projet dans la Fabrique (même identifiant) et ré-exporter.
  Supprimer ou changer le type d'une saisie rend les anciennes données de cette saisie illisibles.
