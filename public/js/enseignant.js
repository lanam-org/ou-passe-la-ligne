// enseignant.js — l'espace enseignant, séparé du jeu.
//
// Créer une séance (un code à afficher), suivre les équipes en direct, envoyer
// un message à toute la classe, animer le débrief, retrouver les questions et
// leurs réponses attendues, puis fermer et effacer la séance.
//
// Ce fichier ouvre la séance, l'écoute en direct, choisit l'onglet à dessiner et
// répond aux gestes faits en séance. Chaque écran a son fichier dans enseignant/ :
//   etat.js      l'état partagé (la séance, ses équipes, le contenu réglé) et de petits outils
//   accueil.js   « Vos séances » : créer, rouvrir, effacer, imprimer le dossier d'avance
//   direct.js    En direct          debrief.js   Rétroaction
//   editeur.js   Réglages et « Votre version du jeu »
//   preparer.js  Questions, Dossier, Déroulement
//   apres.js     Mesures, Questionnaire
//   rapport.js   le rapport de séance, et l'impression
//   trousse.js   la trousse d'essai : « Démarrer en 5 minutes », la grille d'observation

import * as donnees from './donnees.js';
import { mesure } from './config.js';
import { $, typo, validationEnFrancais } from './outils.js';
import * as Rg from './reglages.js';
import { dossierHTML } from './dossierdoc.js';
import { cheminSeance, cheminReponses, effacerSeance, reglerMinutes, reglerChrono, reglerRythme, chronoNeuf, donnerRetour, MAX_MESSAGE, ouvrirApercu } from './seance.js';
import { base, etat, ui, page, appliquerReglages, configSeance, seanceGardee, stable, chronoDe, chronoTexte } from './enseignant/etat.js';
import { afficherAccueil } from './enseignant/accueil.js';
import { vueDirect } from './enseignant/direct.js';
import { vueDebrief } from './enseignant/debrief.js';
import { vueReglages, idQuestion } from './enseignant/editeur.js';
import { vueQuestions, vueDossier, vueDeroulement } from './enseignant/preparer.js';
import { vueMesures, vueQuestionnaire, exporterCSV, exporterReponses, questionnairePapier } from './enseignant/apres.js';
import { rapportHTML, imprimer } from './enseignant/rapport.js';
import './enseignant/trousse.js';   // ses boutons [data-trousse] : il écoute lui-même les clics

validationEnFrancais();

// Huit onglets, dans l'ordre d'une séance : préparer, animer, puis ce qui sert la recherche.
// (Une séance s'ouvre sur « En direct » : c'est le moment où l'on en a besoin.)
// Le titre de chaque groupe est écrit au-dessus de ses onglets (retours d'essai : en petit, à côté, il ne guidait pas),
// en verbes plutôt qu'en « avant / pendant / après » (experte UI/UX), sans gras et suivi d'un deux-points : un titre,
// pas un bouton. « Rétroaction » plutôt que « Débrief », qui sonnait comme « après » (retours d'essai).
const ONGLETS = [
  { g: 'Préparer', titre: 'Préparer la séance', l: [{ id: 'reglages', t: 'Réglages' }, { id: 'questions', t: 'Questions' },
    { id: 'dossier', t: 'Dossier' }, { id: 'deroulement', t: 'Déroulement' }] },
  { g: 'Animer', titre: 'Animer la séance', l: [{ id: 'direct', t: 'En direct' }, { id: 'debrief', t: 'Rétroaction' }] },
  { g: 'Pour la recherche', titre: 'Pour la recherche', replie: true,
    l: [{ id: 'mesures', t: 'Données' }, { id: 'questionnaire', t: 'Questionnaire' }] }
];
// « less is more » : un groupe replié (la recherche) ne montre que son titre, un bouton qui l'ouvre ; il s'ouvre seul
// quand on y est déjà. Le menu des fenêtres étroites, lui, garde tous les onglets.
const groupeOuvert = (g) => !g.replie || ui.rechercheOuverte || g.l.some((x) => x.id === etat.onglet);
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
      if (s && s.etat === 'ouverte' && (donnees.mode === 'local' || s.enseignantId === etat.MOI.uid)) return ouvrir(garde);
    } catch { /* on revient à la liste */ }
  }
  retourAccueil();
}

/** Quitte la séance à l'écran (sans l'effacer) et revient à « Vos séances ». */
function retourAccueil(erreur = '') {
  arrets.forEach((f) => f()); arrets = [];
  Object.assign(etat, { code: null, S: null, reponses: null, EQ: [], AV: [], choisie: null, onglet: 'direct' });
  ui.ed = null; ui.projProg = false; ui.projection = false; ui.comparer = []; ui.voir1970 = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  appliquerReglages(null);
  $('#onglets').innerHTML = '';
  return afficherAccueil(erreur);
}

function ouvrir(code) {
  etat.code = code; etat.reponses = null; ui.ed = null; ui.comparer = []; ui.voir1970 = false;
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
  // « Vos séances » d'abord ; puis une rangée d'onglets sur un écran large, un menu déroulant quand la fenêtre
  // est étroite (site.css choisit)
  $('#onglets').innerHTML = '<button class="onglets-retour" data-retour="1">← Vos séances</button>'
    + ONGLETS.map((g) => `<div class="onglets-g" role="group" aria-label="${g.titre}">
    ${g.replie ? `<button class="onglets-t onglets-bascule" data-bascule-groupe aria-expanded="${groupeOuvert(g)}">${g.g} ${groupeOuvert(g) ? '▴' : '▾'}</button>`
      : `<span class="onglets-t" aria-hidden="true">${g.g}&nbsp;:</span>`}${groupeOuvert(g) ? g.l.map((x) =>
      `<button data-onglet="${x.id}" aria-current="${onglet === x.id ? 'page' : 'false'}">${x.t}</button>`).join('') : ''}</div>`).join('')
    + `<label class="onglets-menu"><span class="cache-visuel">Section de l'espace enseignant</span>
      <select data-onglet-menu>${ONGLETS.map((g) => `<optgroup label="${g.titre}">${g.l.map((x) =>
        `<option value="${x.id}" ${onglet === x.id ? 'selected' : ''}>${x.t}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
  // un message en cours d'écriture survit au rafraîchissement (toutes les 5 s, et à chaque geste d'équipe)
  const brouillon = $('#f-signal [name=texte]');
  const garde = brouillon && { v: brouillon.value, focus: document.activeElement === brouillon, a: brouillon.selectionStart, b: brouillon.selectionEnd };
  const fa = document.activeElement;
  const actif = ['data-proj-prog', 'data-rythme', 'data-rythme-suivante', 'data-rythme-precedente', 'data-cmp', 'data-voir1970']
    .find((a) => fa?.hasAttribute?.(a));
  const valeur = actif && fa.getAttribute(actif);
  $('#prof').innerHTML = typo(VUES[onglet]());
  if (actif) document.querySelector(`[${actif}="${CSS.escape(valeur)}"]`)?.focus();
  const neuf = garde && $('#f-signal [name=texte]');
  if (neuf) {
    neuf.value = garde.v;
    if (garde.focus) { neuf.focus(); try { neuf.setSelectionRange(garde.a, garde.b); } catch { /* vide */ } }
  }
}

Object.assign(page, { rendre, ouvrir, accueil: retourAccueil });

/* ------------------------------------------------------------ les gestes en séance */
// (Ceux de l'accueil sont dans accueil.js, ceux des réglages dans editeur.js.)

/**
 * Depuis les onglets Questions et Dossier : l'onglet Réglages, ouvert au bon endroit, le focus sur ce qu'on
 * vient changer. `cible` : « q:F2.1 » (l'état d'une question), « c:releves|0 » (un texte à corriger),
 * « ajout:A… » (une question ajoutée).
 */
function allerAuReglage(cible) {
  const i = cible.indexOf(':'), type = cible.slice(0, i), cle = cible.slice(i + 1);
  ui.ouverts.add('rg-avance');   // tout ce qu'on vient changer est dans « Réglages avancés »
  if (type === 'c') {   // ouvrir la partie et l'élément ; une recherche en cours le cacherait peut-être
    const [groupe, id] = cle.split('|');
    const g = Rg.corrigeables(base).find((x) => x.items.some((it) => it.groupe === groupe && String(it.id) === id));
    if (g) { ui.ouverts.add(`rg|${g.t}`); ui.ouverts.add(`rg|${groupe}|${id}`); }
    if (ui.ed) ui.ed.cherche = '';
  }
  etat.onglet = 'reglages';
  rendre(true);
  if (type === 'ajout' && ui.ed) { ui.ed.ajout = cle; rendre(true); }
  const champ = type === 'q' ? document.querySelector(`#rg-q-${idQuestion(cle)} input:checked`)
    : type === 'c' ? document.querySelector(`[data-corr^="${cle}|"]`) : document.querySelector('#f-ajout [name=q]');
  champ?.closest('.rg-q, .rg-champ, .rg-form')?.scrollIntoView({ block: 'center' });
  champ?.focus({ preventScroll: true });
}

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
      $('#ed-etat').textContent = 'Changements pas encore appliqués : appliquez-les, ou choisissez encore cette section pour les laisser en attente.';
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
  const ar = ev.target.closest('[data-aller-reglage]');
  if (ar) return allerAuReglage(ar.dataset.allerReglage);
  if (ev.target.closest('[data-bascule-groupe]')) { ui.rechercheOuverte = !ui.rechercheOuverte; rendre(true); $('[data-bascule-groupe]')?.focus(); return; }
  // l'aperçu élève, avec les réglages de la séance (réponses attendues comprises : elles restent sur cet appareil)
  if (ev.target.closest('[data-apercu="seance"]')) return ouvrirApercu(configSeance());
  const ong = ev.target.closest('[data-onglet]');
  if (ong) {
    if (!allerA(ong.dataset.onglet, !!ong.dataset.confirme)) {
      ong.dataset.confirme = '1';
      $('#ed-etat').textContent = 'Changements pas encore appliqués : appliquez-les, ou cliquez encore sur l\'onglet pour les laisser en attente.';
    }
    return;
  }
  const bv = ev.target.closest('[data-bravo]');
  if (bv) {
    // un retour (« bravo » ou retour précis) se donne, se change ou se reprend ; l'écran se redessine quand la séance change
    bv.disabled = true;
    await donnerRetour(code, bv.dataset.pour, bv.dataset.bravo, bv.getAttribute('aria-pressed') === 'true' ? null : (bv.dataset.k || 'bravo'));
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
  // le code QR en grand, pour le tableau ; le focus reste sur le bouton redessiné
  if (ev.target.closest('[data-qr]')) { ui.qrGrand = !ui.qrGrand; rendre(); $('[data-qr]')?.focus(); return; }
  const cp = ev.target.closest('[data-copier]');
  if (cp) {
    // le bouton n'est qu'une icône : le mot remplace l'icône, et son nom lu change avec lui
    const dire = (m) => { cp.textContent = m; cp.setAttribute('aria-label', m); };
    try { await navigator.clipboard.writeText(cp.dataset.copier); dire('Copié ✓'); }
    catch { dire('Clic droit sur « Lien direct », puis copier l’adresse'); }
    return;
  }
  const sg = ev.target.closest('[data-signal]');
  if (sg) {
    const champs = { signal: sg.dataset.signal ? { type: sg.dataset.signal, t: Date.now() } : null };
    // avancer ensemble : envoyer la classe à la rétroaction ouvre aussi cette étape (sinon l'équipe y arrive… et attend)
    const iDebrief = c.etapes.findIndex((x) => x.id === 'debrief');
    if (sg.dataset.signal === 'debrief' && S?.rythme && S.rythme.etape < iDebrief) champs.rythme = { etape: iDebrief };
    await donnees.majPartielle(cheminSeance(code), champs);
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
  // comparer les lignes : trois équipes au plus, puis la ligne de 1970
  const cm = ev.target.closest('[data-cmp]');
  if (cm) {
    const id = cm.dataset.cmp;
    ui.comparer = ui.comparer.filter((x) => etat.EQ.some((e) => e.id === x));   // une équipe effacée ne garde pas sa place
    ui.comparer = ui.comparer.includes(id) ? ui.comparer.filter((x) => x !== id) : [...ui.comparer, id].slice(0, 3);
    rendre(); document.querySelector(`[data-cmp="${CSS.escape(id)}"]`)?.focus(); return;
  }
  if (ev.target.closest('[data-voir1970]')) { ui.voir1970 = !ui.voir1970; rendre(); document.querySelector('[data-voir1970]')?.focus(); return; }
  if (ev.target.closest('[data-plein]')) {
    // un interrupteur : « Plein écran », puis « Quitter le plein écran »
    if (ui.projection) {
      ui.projection = false;
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      return rendre();
    }
    ui.projection = true;
    try { await document.documentElement.requestFullscreen(); } catch { /* refusé : on garde la mise en page agrandie */ }
    return rendre();
  }
  if (ev.target.closest('[data-export]')) return exporterCSV();
  if (ev.target.closest('[data-export-reponses]')) return exporterReponses();
  // la progression à projeter : en plein écran, et le même bouton en sort
  if (ev.target.closest('[data-proj-prog]')) {
    ui.projProg = !ui.projProg;
    if (ui.projProg) { try { await document.documentElement.requestFullscreen(); } catch { /* refusé : la vue s'affiche quand même */ } }
    else if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    window.scrollTo({ top: 0 });
    return rendre();
  }
  // avancer ensemble : l'interrupteur, puis « Ouvrir l'étape suivante »
  const ry = ev.target.closest('input[data-rythme]');
  if (ry) {
    const classe = Rg.etapeDeLaClasse(c, EQ);
    return reglerRythme(code, ry.checked ? { etape: Math.max(0, classe ? c.etapes.indexOf(classe) : 0) } : null)
      .catch((e) => { console.warn('Rythme non enregistré', e); rendre(); });
  }
  // une étape ouverte par erreur : on revient d'une étape (une équipe déjà plus loin n'est pas renvoyée en arrière)
  if (ev.target.closest('[data-rythme-precedente]') && S?.rythme) {
    ev.target.closest('[data-rythme-precedente]').disabled = true;
    const fin = c.etapes.findIndex((x) => x.id === 'debrief') + 1;
    return reglerRythme(code, { etape: Math.max(0, Math.min(S.rythme.etape, fin) - 1) })
      .catch((e) => { console.warn('Rythme non enregistré', e); rendre(); });
  }
  if (ev.target.closest('[data-rythme-suivante]') && S?.rythme) {
    ev.target.closest('[data-rythme-suivante]').disabled = true;
    return reglerRythme(code, { etape: S.rythme.etape + 1 }).catch((e) => { console.warn('Rythme non enregistré', e); rendre(); });
  }
  if (ev.target.closest('[data-imprimer]')) return imprimer(questionnairePapier());
  if (ev.target.closest('[data-rapport]')) return imprimer(rapportHTML());
  const ddi = ev.target.closest('[data-dossier-imprimer]');
  if (ddi) {
    const version = ddi.dataset.dossierImprimer;
    return imprimer(dossierHTML(c, { version, pastilles: ui.pastilles, enseignant: version === 'complet' }));
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && (ui.projection || ui.projProg)) { ui.projection = false; ui.projProg = false; rendre(); }
});

demarrer();
