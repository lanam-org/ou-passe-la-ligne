// enseignant/trousse.js — la trousse d'essai, à imprimer :
//   · « Démarrer en 5 minutes » : une page pour l'enseignant·e qui découvre le jeu ;
//   · la grille d'observation : pour la personne qui observe une séance d'essai (playtest),
//     avec les « À observer » de chaque étape, les fonctions que l'enseignant·e doit trouver
//     seul·e, et le plan de mesure.
// Tout vient du contenu et des réglages : une étape, une durée ou un critère qui change
// change aussi la trousse. Les boutons [data-trousse] sont sur l'accueil et dans « Déroulement ».

import * as donnees from '../donnees.js';
import { mesure } from '../config.js';
import { esc } from '../outils.js';
import * as Rg from '../reglages.js';
import { JOURS_CONSERVATION } from '../seance.js';
import { base, etat, ui, qid } from './etat.js';
import { imprimer } from './rapport.js';

const adresse = (page) => new URL(page, location.href).href;
/** Le contenu de la séance ouverte ; sans séance, celui de la version du jeu de l'enseignant·e. */
const contenuActuel = () => (etat.code ? etat.c : Rg.appliquer(base, ui.maVersion));

/* ------------------------------------------------------------ Démarrer en 5 minutes */

function ficheDemarrer() {
  const formats = [Rg.FORMATS.standard.nom, Rg.FORMATS.mesure.nom].join(' ou ');
  const pas = [
    ['Créer la séance', `Ouvrir l'espace enseignant (${esc(adresse('enseignant.html'))}), choisir la durée (${esc(formats)}),
      puis « Créer la séance ». Un format prêt suffit pour une première séance. Pour l'adapter ensuite (rendre une question
      facultative ou la retirer, mettre à jour un chiffre ou un texte) : « Réglages avancés », dans l'onglet « Réglages », même
      pendant la séance, ou les liens sous chaque question (onglet « Questions ») et chaque document (onglet « Dossier »).
      « ← Vos séances », au début de la barre d'onglets, ramène à toutes vos séances.`],
    ['Faire entrer les équipes', `Dans « En direct » : le code de cinq caractères, à écrire au tableau, ou son code QR
      (« Agrandir le code QR »). Chaque équipe ouvre « Je suis élève » (${esc(adresse('eleve.html'))}), entre le code et
      choisit un nom d'animal. Un Chromebook par équipe, aucun prénom, ni dans le nom ni dans les réponses.`],
    ['Suivre la classe', `« En direct » : le chrono démarre avec la première équipe. « Message à toute la classe » pour
      un rappel ; le chrono, comme un lecteur de musique : pause, −5 et +5 minutes à l'étape, terminer l'étape. Toucher une équipe pour lire ses réponses,
      et « ✦ Bravo » pour en saluer une : l'équipe le voit tout de suite. « Avancer ensemble » retient les équipes à l'étape
      ouverte ; « Projeter la progression » montre au tableau où en est chaque équipe.`],
    ['Animer la rétroaction', `L'onglet « Rétroaction », à projeter : les lignes tracées par les équipes, les questions orales et ce
      que les équipes ont écrit. « Cacher les réponses attendues » avant de projeter ; « Plein écran ».`],
    ['Garder une trace, puis effacer', `« Imprimer le rapport de séance » (ou « Enregistrer au format PDF » dans la fenêtre
      d'impression), « Exporter les réponses » pour un tableur, puis « Effacer la séance et ses données ». Sans action, la séance s'efface seule
      ${JOURS_CONSERVATION} jours après sa création.`]
  ];
  const ou = [
    ['Vos séances', 'au début de la barre d\'onglets : retrouver une ancienne séance, en créer une autre'],
    ['Réglages', 'la durée ; puis, dans « Réglages avancés » : chaque question, vos questions, mettre à jour un chiffre ou un texte'],
    ['Questions', 'chaque question et sa réponse attendue ; la rendre facultative, la retirer, mettre à jour son texte'],
    ['Dossier', 'le dossier documentaire, chaque document avec « Mettre à jour ce texte » ; la version élève s\'imprime d\'avance'],
    ['Déroulement', 'l\'intention de chaque étape, ce qu\'elle fait travailler, quoi observer'],
    ['Données', 'ce que le site a mesuré, équipe par équipe (pour la recherche)'],
    ['« ? »', 'en haut à droite, le guide de la page : les bulles d\'aide reviennent']
  ];
  return `<h1>Où passe la ligne&nbsp;? · démarrer en 5 minutes</h1>
    <p class="r-note">Un jeu de géographie en équipe : tracer la limite d'une aire protégée à Forillon, en 1970, puis voir
      l'information arriver. Une équipe de deux ou trois élèves par Chromebook.</p>
    ${donnees.mode === 'local' ? `<p class="r-note"><b>Version de démonstration</b> : la séance n'existe que dans ce navigateur.
      Pour jouer une équipe, ouvrir la page des équipes dans un autre onglet du même navigateur.</p>` : ''}
    <ol class="t-pas">${pas.map(([t, x]) => `<li><div><b>${t}</b>${x}</div></li>`).join('')}</ol>
    <h2>Où trouver le reste</h2>
    <table><tbody>${ou.map(([o, x]) => `<tr><th scope="row">${esc(o)}</th><td>${esc(x)}</td></tr>`).join('')}</tbody></table>`;
}

/* ------------------------------------------------------------ la grille d'observation */

// Ce que l'enseignant·e doit pouvoir trouver seul·e : les 18 fonctions du courriel d'essai, dans son ordre (avant la
// séance, puis pendant et après), avec les mots de l'interface d'aujourd'hui, et les fonctions ajoutées depuis.
const FONCTIONS = [
  'Choisir la durée de la séance', 'Rendre une question facultative, ou la retirer', 'Ajouter votre propre question',
  'Mettre à jour un chiffre ou un texte du jeu', 'Garder vos réglages pour les prochaines séances', 'Imprimer le dossier élève avant la séance',
  'Explorer une séance de démonstration', 'Voir le jeu comme une équipe (aperçu)', 'Trouver les réponses attendues aux questions',
  'Créer une séance et afficher son code', 'Rejoindre la séance comme équipe', 'Suivre une équipe et lire ses réponses',
  'Envoyer un message à toute la classe', 'Mettre le chrono en pause, ajouter 5 minutes', 'Faire avancer les équipes ensemble',
  'Projeter la progression de la classe', 'Féliciter une équipe pour une bonne réponse', 'Animer la rétroaction en plein écran',
  'Imprimer le rapport de séance', 'Exporter les réponses en tableur', 'Effacer la séance', 'Retrouver une ancienne séance'
];
const QUESTIONS_APRES = ['Qu\'avez-vous cherché sans le trouver ?', 'Qu\'est-ce qui vous a ralenti·e, ou surpris·e ?',
  'Qu\'est-ce qui a surpris les élèves ?', 'Referiez-vous ce jeu en classe ? Avec quels changements ?',
  // la suite du jeu (rencontre avec l'experte UI/UX) : ce que les enseignant·es pensent d'adapter ou de créer un scénario
  'Aimeriez-vous adapter ce jeu (questions, documents, images) ? Qu\'y changeriez-vous ?',
  'Créeriez-vous un scénario sur un autre territoire ? Avec quoi : questions, photos, documents ?'];
const MESURE_PAR = { auto: 'le site (onglet Données)', observation: 'vous', questionnaire: 'le questionnaire' };

function grilleObservation() {
  const c = contenuActuel();
  const etapes = c.etapes.filter((x) => x.id !== 'avis' || mesure);
  const trois = '<td class="t-c">☐</td><td class="t-c">☐</td><td class="t-c">☐</td>';
  const ligneEtape = (titre, min, items) => items.map((y, i) => `<tr>${i === 0 ? `<th scope="row" rowspan="${items.length + 1}">${esc(titre)}
      <br><span class="r-note">${min} min prévues</span></th>` : ''}<td>${esc(y)}</td>${trois}</tr>`).join('')
    + '<tr class="t-notes"><td colspan="4"><span class="r-note">Notes</span></td></tr>';
  const parSource = (src) => src.split(/\s*\+\s*/).map((s) => MESURE_PAR[s] || s).join(' et ');
  return `<h1>Où passe la ligne&nbsp;? · grille d'observation</h1>
    <div class="t-champs"><span>Séance :</span><span>Date :</span><span>Observateur·rice :</span><span>Format : ${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}</span>
      <span class="t-large">Équipes observées (noms d'animaux) :</span></div>
    <p class="r-note">Aucun prénom d'élève sur cette grille : les équipes portent un nom d'animal. Cochez « Pas vu » quand
      vous n'avez pas pu observer.</p>

    <h2>1. Étape par étape</h2>
    <table><thead><tr><th>Étape</th><th>À observer</th><th class="t-c">Oui</th><th class="t-c">Non</th><th class="t-c">Pas vu</th></tr></thead>
      <tbody>${ligneEtape('Mise en route', c.miseEnRoute.min, ['Chaque équipe a-t-elle rejoint la séance avant la fin de la mise en route ?'])}
        ${etapes.map((x) => ligneEtape(`${x.n}. ${x.t}`, x.min, c.observer[x.id] || [])).join('')}</tbody></table>

    <h2 class="t-saut">2. L'enseignant·e trouve-t-il les fonctions seul·e ?</h2>
    <table><thead><tr><th>Fonction</th><th class="t-c">Seul·e</th><th class="t-c">Avec aide</th><th class="t-c">Pas trouvée</th><th>Remarques</th></tr></thead>
      <tbody>${FONCTIONS.map((f) => `<tr><td>${esc(f)}</td>${trois}<td class="t-rem"></td></tr>`).join('')}</tbody></table>

    <h2>3. Le plan de mesure</h2>
    <p class="r-note">Un critère = un test oui / non. Ceux que mesure le site se lisent dans l'onglet « Données » ; ceux du
      questionnaire, dans l'onglet « Questionnaire ».</p>
    <table><thead><tr><th>Dimension</th><th>Critère</th><th>Le test</th><th>Mesuré par</th><th class="t-c">Oui</th><th class="t-c">Non</th><th class="t-c">Pas vu</th></tr></thead>
      <tbody>${c.plan.map((p, i) => `<tr><td>${i === 0 || c.plan[i - 1].g !== p.g ? `<b>${esc(p.g)}</b>` : ''}</td><td>${esc(p.c)}</td>
        <td>${esc(p.test)}</td><td>${esc(parSource(p.src))}</td>${/observation/.test(p.src) ? trois : '<td colspan="3"></td>'}</tr>`).join('')}</tbody></table>

    <h2 class="t-saut">4. Après la séance, avec l'enseignant·e</h2>
    ${QUESTIONS_APRES.map((q) => `<div class="p-q"><b>${esc(q)}</b><div class="p-lignes"></div><div class="p-lignes"></div></div>`).join('')}`;
}

/* ------------------------------------------------------------ animer la rétroaction */

// L'apprentissage se fait surtout dans la rétroaction (le retour réflexif) : cinq temps, les questions orales de la
// séance, les pièges à éviter, et le découpage en deux périodes.
const TEMPS = [
  ['Décrire', 'Qu\'avez-vous décidé, et pourquoi ? Projeter deux ou trois lignes sans nom (« Comparer les lignes »).'],
  ['Comparer avec 1970', 'Montrer la ligne de 1970. En quoi la vôtre est-elle différente ? Qui y gagne, qui y perd ?'],
  ['Les points de vue', 'Quel point de vue vous a fait changer d\'avis ? Lequel avez-vous écarté, et pourquoi ?'],
  ['Les sources', 'Quel document vous a le plus servi ? Deux nombres circulent (983 et 1 800) : que comptent-ils ?'],
  ['Aujourd\'hui', 'L\'accord de 2024 avec la Nation Micmac de Gespeg change-t-il votre ligne ? Que garderiez-vous ?']
];
const PIEGES = [
  'Présenter la ligne de 1970 comme la bonne, ou la mauvaise, réponse : c\'est une décision à comprendre.',
  'Parler à la place de la Nation Micmac de Gespeg ou des familles expropriées : citer les documents.',
  'Noter ou classer les lignes : il n\'y a pas de gagnant.',
  'Nommer des élèves : les équipes portent des noms d\'animaux.'
];

function guideRetroaction() {
  const c = contenuActuel();
  const debrief = c.etapes.find((x) => x.id === 'debrief');
  const coupure = c.coupure ? c.etapes.find((x) => x.id === c.coupure) : null;
  return `<h1>Où passe la ligne&nbsp;? · animer la rétroaction</h1>
    <p class="r-note">${debrief.min} minutes à l'étape « ${esc(debrief.t)} ». Onglet « Rétroaction », en plein écran.</p>
    <h2>En cinq temps</h2>
    <ol class="t-pas">${TEMPS.map(([t, x]) => `<li><div><b>${esc(t)}</b>${esc(x)}</div></li>`).join('')}</ol>
    ${c.q.orales.length ? `<h2>Les questions orales de cette séance</h2>
      <ul>${c.q.orales.map((q) => `<li><b>${esc(qid(q))}</b> ${esc(q.eleve)}</li>`).join('')}</ul>` : ''}
    <h2>Pièges à éviter</h2>
    <ul>${PIEGES.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h2>En deux périodes</h2>
    <p>Période 1 : de l'arrivée jusqu'à « ${esc(coupure ? coupure.t : 'Prendre position')} » ; « Avancer ensemble » arrête les équipes à cette étape.
      Période 2 : les équipes reprennent sur le même Chromebook, avec le même code (séance rouverte depuis « Historique »),
      puis les points de vue, la décision de 1970 et cette rétroaction.</p>`;
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-trousse]');
  if (!b) return;
  const fiches = { observation: grilleObservation, retroaction: guideRetroaction, demarrer: ficheDemarrer };
  imprimer((fiches[b.dataset.trousse] || ficheDemarrer)());
});
