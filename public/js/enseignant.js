// enseignant.js — l'espace enseignant·e, séparé du jeu.
//
// Créer une séance (un code à afficher), suivre les équipes en direct, envoyer
// un message à toute la classe, animer le débrief, retrouver les questions et
// leurs réponses attendues, puis fermer et effacer la séance.
//
// Ce fichier ouvre la séance, l'écoute en direct, choisit l'onglet à dessiner et
// répond aux gestes faits en séance. Chaque écran a son fichier dans enseignant/ :
//   etat.js      l'état partagé (la séance, ses équipes, le contenu réglé) et de petits outils
//   accueil.js   « Tes séances » : créer, rouvrir, effacer, imprimer le dossier d'avance
//   direct.js    En direct          debrief.js   Débrief
//   editeur.js   Réglages et « Ta version du jeu »
//   preparer.js  Questions, Dossier, Déroulement
//   apres.js     Mesures, Questionnaire
//   rapport.js   le rapport de séance, et l'impression

import * as donnees from './donnees.js';
import { mesure } from './config.js';
import { $, typo, validationEnFrancais } from './outils.js';
import * as Rg from './reglages.js';
import { dossierHTML } from './dossierdoc.js';
import { cheminSeance, cheminReponses, effacerSeance, reglerMinutes, reglerChrono, chronoNeuf, donnerBravo, MAX_MESSAGE } from './seance.js';
import { base, etat, ui, page, appliquerReglages, configSeance, seanceGardee, stable, chronoDe, chronoTexte } from './enseignant/etat.js';
import { afficherAccueil } from './enseignant/accueil.js';
import { vueDirect } from './enseignant/direct.js';
import { vueDebrief } from './enseignant/debrief.js';
import { vueReglages } from './enseignant/editeur.js';
import { vueQuestions, vueDossier, vueDeroulement } from './enseignant/preparer.js';
import { vueMesures, vueQuestionnaire, exporterCSV, questionnairePapier } from './enseignant/apres.js';
import { rapportHTML, imprimer } from './enseignant/rapport.js';

validationEnFrancais();

// Huit onglets, rangés en trois moments : ce qu'on fait en classe d'abord, puis préparer, puis après.
const ONGLETS = [
  { g: 'En classe', l: [{ id: 'direct', t: 'En direct' }, { id: 'debrief', t: 'Débrief' }] },
  { g: 'Préparer', l: [{ id: 'reglages', t: 'Réglages' }, { id: 'questions', t: 'Questions' },
    { id: 'dossier', t: 'Dossier' }, { id: 'deroulement', t: 'Déroulement' }] },
  { g: 'Après', l: [{ id: 'mesures', t: 'Mesures' }, { id: 'questionnaire', t: 'Questionnaire' }] }
];
const VUES = { direct: vueDirect, debrief: vueDebrief, reglages: vueReglages, questions: vueQuestions, dossier: vueDossier,
  deroulement: vueDeroulement, mesures: vueMesures, questionnaire: vueQuestionnaire };

let arrets = [];   // les écoutes en direct de la séance ouverte, à couper en la quittant

/* ------------------------------------------------------------ démarrer, ouvrir, quitter */

async function demarrer() {
  if (donnees.mode === 'local') $('#mode-local').hidden = false;
  // On n'invente pas d'identité au chargement : on regarde seulement s'il y en a une.
  etat.MOI = await donnees.attendreUtilisateur();
  const garde = seanceGardee.lire();
  if (garde && etat.MOI) {
    try {
      const s = await donnees.lire(cheminSeance(garde));
      if (s && (donnees.mode === 'local' || s.enseignantId === etat.MOI.uid)) return ouvrir(garde);
    } catch { /* on revient à la liste */ }
  }
  retourAccueil();
}

/** Quitte la séance à l'écran (sans l'effacer) et revient à « Tes séances ». */
function retourAccueil(erreur = '') {
  arrets.forEach((f) => f()); arrets = [];
  Object.assign(etat, { code: null, S: null, reponses: null, EQ: [], AV: [], choisie: null, onglet: 'direct' });
  ui.ed = null;
  appliquerReglages(null);
  $('#onglets').innerHTML = '';
  return afficherAccueil(erreur);
}

function ouvrir(code) {
  etat.code = code; etat.reponses = null; ui.ed = null;
  seanceGardee.garder(code);
  arrets.forEach((f) => f());
  arrets = [
    donnees.ecouter(cheminSeance(code), (s) => {
      etat.S = s; if (!s) return finie();
      appliquerReglages(configSeance());
      lancerChrono(); rendre();
    }),
    // les réponses attendues de la séance, à part (seance.js) : vides si le document manque
    donnees.ecouter(cheminReponses(code), (r) => {
      etat.reponses = r || {};
      if (etat.S) { appliquerReglages(configSeance()); rendre(); }
    }, (e) => { console.warn('Réponses attendues de la séance illisibles', e); etat.reponses = {}; rendre(); }),
    donnees.ecouterCollection(`${cheminSeance(code)}/equipes`, (l) => { etat.EQ = l; lancerChrono(); rendre(); })
  ];
  if (mesure) arrets.push(donnees.ecouterCollection(`${cheminSeance(code)}/avis`, (l) => { etat.AV = l; if (etat.onglet === 'questionnaire') rendre(); }));
  rendre();
}

function finie() {
  seanceGardee.oublier();
  retourAccueil();
}

// les chronomètres avancent sans attendre une écriture
setInterval(() => { if (etat.code && etat.onglet === 'direct' && !document.hidden) rendre(); }, 5000);
// le chrono avance chaque seconde, sans redessiner la page
setInterval(() => { const z = document.getElementById('chrono-v'); if (z && etat.S) z.textContent = chronoTexte(chronoDe()); }, 1000);

/** Le chrono démarre seul avec la première équipe. */
function lancerChrono() {
  const { S, EQ, code } = etat;
  if (!S?.chrono || S.chrono.debut || !EQ.length || ui.chronoLance === code) return;
  ui.chronoLance = code;
  reglerChrono(code, { ...S.chrono, debut: Math.min(...EQ.map((e) => e.creeLe || Date.now())) })
    .catch((e) => { ui.chronoLance = ''; console.warn('Chrono non démarré', e); });
}

/* ------------------------------------------------------------ rendu */

function rendre(force = false) {
  if (!etat.code) return;
  const { onglet } = etat;
  // L'éditeur ne se redessine pas sous les doigts à chaque geste d'une équipe.
  // Il se recale seulement si la séance a changé ailleurs et qu'aucun changement n'attend.
  if (onglet === 'reglages' && !force && ui.ed?.cible === 'seance') {
    const ailleurs = Rg.completer(base, configSeance());
    if (ui.ed.modifie || stable(ailleurs) === stable(ui.ed.r)) return;
    ui.ed.r = ailleurs;
  }
  // Une rangée d'onglets sur un écran large ; un menu déroulant quand la fenêtre est étroite (site.css choisit)
  $('#onglets').innerHTML = ONGLETS.map((g) => `<div class="onglets-g" role="group" aria-label="${g.g}">
    <span class="onglets-t" aria-hidden="true">${g.g}</span>${g.l.map((x) =>
      `<button data-onglet="${x.id}" aria-current="${onglet === x.id ? 'page' : 'false'}">${x.t}</button>`).join('')}</div>`).join('')
    + `<label class="onglets-menu"><span class="cache-visuel">Section de l'espace enseignant·e</span>
      <select data-onglet-menu>${ONGLETS.map((g) => `<optgroup label="${g.g}">${g.l.map((x) =>
        `<option value="${x.id}" ${onglet === x.id ? 'selected' : ''}>${x.t}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
  // un message en cours d'écriture survit au rafraîchissement (toutes les 5 s, et à chaque geste d'équipe)
  const brouillon = $('#f-signal [name=texte]');
  const garde = brouillon && { v: brouillon.value, focus: document.activeElement === brouillon, a: brouillon.selectionStart, b: brouillon.selectionEnd };
  $('#prof').innerHTML = typo(VUES[onglet]());
  const neuf = garde && $('#f-signal [name=texte]');
  if (neuf) {
    neuf.value = garde.v;
    if (garde.focus) { neuf.focus(); try { neuf.setSelectionRange(garde.a, garde.b); } catch { /* vide */ } }
  }
}

Object.assign(page, { rendre, ouvrir, accueil: retourAccueil });

/* ------------------------------------------------------------ les gestes en séance */
// (Ceux de l'accueil sont dans accueil.js, ceux des réglages dans editeur.js.)

/** Changer d'onglet ; quitter les réglages avec des changements en attente demande un deuxième geste. */
function allerA(vers, confirme) {
  if (etat.onglet === 'reglages' && vers !== 'reglages' && ui.ed?.modifie && !confirme) return false;
  etat.onglet = vers; window.scrollTo({ top: 0 }); rendre(true);
  return true;
}

document.addEventListener('change', (ev) => {
  if (ev.target.id === 'dd-pastilles') { ui.pastilles = ev.target.checked; rendre(true); }
  // le menu déroulant des sections (fenêtre étroite) : mêmes règles que les onglets
  if (ev.target.matches('[data-onglet-menu]')) {
    const vers = ev.target.value;
    if (!allerA(vers, ui.confirmeOnglet === vers)) {
      ui.confirmeOnglet = vers; ev.target.value = 'reglages';
      $('#ed-etat').textContent = 'Changements pas encore appliqués : applique-les, ou choisis encore cette section pour les laisser en attente.';
      return;
    }
    ui.confirmeOnglet = null;
  }
});

// le message écrit par l'enseignant·e : envoyé comme les autres, affiché (échappé) chez chaque équipe
document.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'f-signal' || !etat.code) return;
  ev.preventDefault();
  const champ = ev.target.querySelector('[name=texte]');
  const texte = champ.value.trim().replace(/\s+/g, ' ').slice(0, MAX_MESSAGE);
  if (!texte) { champ.focus(); return; }
  champ.value = '';
  await donnees.majPartielle(cheminSeance(etat.code), { signal: { type: 'perso', texte, t: Date.now() } });
});

// garder ouvertes les « réponses attendues » qu'on lisait, malgré le rafraîchissement
document.addEventListener('toggle', (ev) => {
  const k = ev.target?.dataset?.k;
  if (k) ev.target.open ? ui.ouverts.add(k) : ui.ouverts.delete(k);
}, true);

document.addEventListener('click', async (ev) => {
  if (ev.target.closest('[data-retour]')) {
    seanceGardee.oublier();
    return retourAccueil();
  }
  const { code, S, EQ, c } = etat;
  const ong = ev.target.closest('[data-onglet]');
  if (ong) {
    if (!allerA(ong.dataset.onglet, !!ong.dataset.confirme)) {
      ong.dataset.confirme = '1';
      $('#ed-etat').textContent = 'Changements pas encore appliqués : applique-les, ou clique encore sur l\'onglet pour les laisser en attente.';
    }
    return;
  }
  const bv = ev.target.closest('[data-bravo]');
  if (bv) {
    // un « bravo » se donne ou se reprend ; l'écran se redessine quand la séance change
    bv.disabled = true;
    await donnerBravo(code, bv.dataset.pour, bv.dataset.bravo, bv.getAttribute('aria-pressed') !== 'true');
    return;
  }
  const eqb = ev.target.closest('[data-equipe]');
  if (eqb) {
    etat.choisie = eqb.dataset.equipe && eqb.dataset.equipe !== etat.choisie ? eqb.dataset.equipe : null;
    rendre();
    if (etat.choisie) $('#detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const chb = ev.target.closest('[data-chrono]');
  if (chb) {
    const ch = chronoDe(), t = Date.now();
    const neuf = { demarrer: { ...chronoNeuf(), debut: t }, zero: { ...chronoNeuf(), debut: t },
      pause: { ...ch, pauses: ch.pauses || [], pause: t },
      reprendre: { ...ch, pauses: [...(ch.pauses || []), { a: ch.pause, b: t }], pause: null } }[chb.dataset.chrono];
    if (neuf) { chb.disabled = true; ui.chronoLance = code; await reglerChrono(code, neuf); }
    return;
  }
  const mn = ev.target.closest('[data-minutes]');
  if (mn) {
    const r = Rg.completer(base, S?.config);
    const id = mn.dataset.minutes;
    r.minutes[id] = Math.max(1, Math.min(90, (r.minutes[id] || 1) + Number(mn.dataset.delta)));
    mn.disabled = true;
    await reglerMinutes(code, r.minutes);
    if (ui.ed?.cible === 'seance') ui.ed.r.minutes[id] = r.minutes[id];
    return;
  }
  // « Terminer l'étape maintenant » : le temps prévu devient le temps déjà passé par l'équipe arrivée
  // le plus tard ; toutes les équipes de l'étape voient alors « Temps prévu dépassé »
  const tm = ev.target.closest('[data-terminer]');
  if (tm) {
    const id = tm.dataset.terminer;
    const dedans = EQ.filter((e) => !e.fini && c.etapes[e.etape]?.id === id);
    if (!dedans.length) return;
    const passe = Math.min(...dedans.map((e) => (e.temps?.[id] || 0) + Rg.tempsDansEtape(e, chronoDe())));
    const r = Rg.completer(base, S?.config);
    r.minutes[id] = Math.max(1, Math.floor(passe / 60000));
    tm.disabled = true;
    await reglerMinutes(code, r.minutes);
    if (ui.ed?.cible === 'seance') ui.ed.r.minutes[id] = r.minutes[id];
    return;
  }
  const cp = ev.target.closest('[data-copier]');
  if (cp) {
    try { await navigator.clipboard.writeText(cp.dataset.copier); cp.textContent = 'Copié ✓'; }
    catch { cp.textContent = 'Sélectionne le lien pour le copier'; }
    return;
  }
  const sg = ev.target.closest('[data-signal]');
  if (sg) {
    await donnees.majPartielle(cheminSeance(code), { signal: sg.dataset.signal ? { type: sg.dataset.signal, t: Date.now() } : null });
    return;
  }
  if (ev.target.closest('[data-fermer]')) { await donnees.majPartielle(cheminSeance(code), { etat: 'fermee' }); return; }
  const ef = ev.target.closest('[data-effacer]');
  if (ef) {
    if (ef.dataset.effacer === 'demander') { ui.effacer = true; return rendre(); }
    if (ef.dataset.effacer === 'non') { ui.effacer = false; return rendre(); }
    ef.disabled = true;
    arrets.forEach((f) => f()); arrets = [];
    await effacerSeance(code);
    ui.effacer = false;
    return finie();
  }
  if (ev.target.closest('[data-attendu]')) { ui.cacheAttendu = !ui.cacheAttendu; return rendre(); }
  if (ev.target.closest('[data-plein]')) {
    ui.projection = true;
    try { await document.documentElement.requestFullscreen(); } catch { /* refusé : on garde la mise en page agrandie */ }
    return rendre();
  }
  if (ev.target.closest('[data-export]')) return exporterCSV();
  if (ev.target.closest('[data-imprimer]')) return imprimer(questionnairePapier());
  if (ev.target.closest('[data-rapport]')) return imprimer(rapportHTML());
  const ddi = ev.target.closest('[data-dossier-imprimer]');
  if (ddi) {
    const version = ddi.dataset.dossierImprimer;
    return imprimer(dossierHTML(c, { version, pastilles: ui.pastilles, enseignant: version === 'complet' }));
  }
});

document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && ui.projection) { ui.projection = false; rendre(); } });

demarrer();
