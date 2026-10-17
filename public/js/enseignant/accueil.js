// enseignant/accueil.js — l'accueil « Tes séances » : créer une séance, rouvrir ou
// effacer les anciennes, imprimer le dossier d'avance, sa version du jeu, son compte.

import * as donnees from '../donnees.js';
import { mesure, googleEnseignant } from '../config.js';
import { $, esc, typo, messageErreur } from '../outils.js';
import * as Rg from '../reglages.js';
import { dossierHTML } from '../dossierdoc.js';
import { creerSeanceDemo } from '../demo.js';
import { creerSeance, effacerSeance, mesSeances, lireMaVersion, effacerMaVersion, JOURS_CONSERVATION } from '../seance.js';
import { base, etat, ui, page, seanceGardee } from './etat.js';
import { resumeReglages, ouvrirEditeur, rendreEditeur } from './editeur.js';
import { imprimer } from './rapport.js';

const JOUR = 86400000;
const dateCourte = (t) => new Date(t).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });

/** Dessine l'accueil : le compte, une nouvelle séance, et les séances déjà créées. */
export async function afficherAccueil(erreur = '') {
  const { MOI } = etat;
  let liste = [];
  try { liste = MOI ? await mesSeances(MOI.uid) : []; } catch (e) { console.warn('Liste des séances indisponible', e); }
  ui.maVersion = MOI ? await lireMaVersion(MOI.uid) : null;
  const v = ui.maVersion ? Rg.completer(base, ui.maVersion) : null;
  const fmt = v?.format || 'standard';
  const google = MOI && !MOI.anonyme;
  const compte = donnees.mode === 'local'
    ? '<p class="hint">Version de démonstration : pas de compte. Tes séances restent dans ce navigateur.</p>'
    : !googleEnseignant ? '<p class="hint">Sans compte : tes séances restent liées à ce navigateur.</p>'
    : google ? `<p>Connecté·e avec Google : <b>${esc(MOI.nom || '')}</b> ${MOI.courriel ? `· ${esc(MOI.courriel)}` : ''}</p>
        <p class="hint">Tu retrouves tes séances sur n'importe quel ordinateur. Ni ton nom ni ton courriel ne sont écrits dans la base.</p>
        <div class="p-actions"><button class="btn btn--f" data-deconnexion="1">Se déconnecter</button></div>`
    : `<p>Sans compte, tes séances restent liées à <b>ce navigateur</b>. Avec Google, tu les retrouves sur n'importe quel ordinateur.</p>
        <p class="hint">Les élèves, eux, n'ont jamais de compte. Ni ton nom ni ton courriel ne sont écrits dans la base.</p>
        <div class="p-actions"><button class="btn" data-google="1">Se connecter avec Google</button></div>`;
  const demo = donnees.mode === 'local' ? `<section class="p-sect" id="demo"><div class="p-sect-h"><h3>Séance de démonstration</h3></div>
      <p class="p-txt">Une séance de 50 minutes en cours depuis 40 minutes, avec quatre équipes à des étapes différentes.
        Pour explorer le suivi en direct, le débrief et le rapport.</p>
      <div class="p-actions"><button class="btn btn--f" data-demo="1">Ouvrir la démonstration →</button></div>
    </section>` : '';
  $('#prof').innerHTML = typo(`<div class="p-tete">
      <h2>Tes séances</h2>
      <p>Une séance = un code de cinq caractères. Tu l'affiches au tableau ; chaque équipe l'entre sur
        son Chromebook. Tu suis ensuite les équipes ici, en direct.</p>
    </div>
    ${erreur ? `<p class="erreur" role="alert">${esc(erreur)}</p>` : ''}
    <div class="accueil-g">
    <div class="accueil-m">
    <section class="p-sect creer"><div class="p-sect-h"><h3>Nouvelle séance</h3></div>
      <fieldset class="formats" id="formats"><legend>La durée</legend>
        ${Object.entries(Rg.FORMATS).map(([k, f]) => `<label class="case-l"><input type="radio" name="format" value="${k}" ${k === fmt ? 'checked' : ''}>
          <span>${esc(f.nom)}${k === 'mesure' ? ` <input type="number" id="duree-mesure" class="duree-mesure" min="15" max="240" step="1"
            value="${v?.format === 'mesure' ? v.miseEnRoute + Object.entries(v.minutes).filter(([id]) => id !== 'avis').reduce((s, [, m]) => s + m, 0) : 60}"
            aria-label="Durée totale, en minutes"> min` : ''}<br><span class="hint">${esc(f.resume)}</span></span></label>`).join('')}
      </fieldset>
      <p class="hint formats-n">${v ? `Ta version du jeu sert de départ (${esc(resumeReglages(v))}). Choisir un autre format reprend ses minutes et ses questions ; tes questions ajoutées et tes corrections restent.`
        : 'Les minutes de chaque étape, les questions et les corrections se changent ensuite dans l\'onglet « Réglages », même pendant la séance.'}</p>
      <label class="case-l"><input type="checkbox" id="opt-avis" ${mesure ? '' : 'disabled'}>
        <span>Proposer le questionnaire « Ton avis » à la fin (séances d'essai, hors du temps de la séance).
        ${mesure ? '' : '<br><span class="hint">Désactivé : la collecte pour la recherche attend le certificat d\'éthique.</span>'}</span></label>
      <div class="p-actions"><button class="btn" id="creer">Créer la séance →</button></div>
    </section>
    <section class="p-sect"><div class="p-sect-h"><h3>Séances déjà créées (${liste.length})</h3></div>
      <p class="hint">Les réponses des équipes restent en ligne tant que la séance existe : imprime le rapport, puis efface.${
        donnees.mode === 'local' ? '' : ` Sans action de ta part, chaque séance est effacée automatiquement ${JOURS_CONSERVATION} jours après sa création.`}</p>
      ${liste.length ? `<div class="tab-w"><table class="tab" id="mes-seances"><thead><tr><th>Créée le</th><th>Code</th><th>État</th><th></th></tr></thead>
        <tbody>${liste.map((x) => `<tr><td>${esc(dateCourte(x.creeLe))}${Date.now() - x.creeLe > 30 * JOUR
          ? ' <span class="badge badge--reprise">plus de 30 jours</span>' : ''}</td>
          <td class="mono">${esc(x.id)}${x.demo ? ' <span class="badge">démonstration</span>' : ''}</td><td>${x.etat === 'ouverte' ? 'ouverte' : 'fermée'}</td>
          <td><div class="signaux"><button class="btn btn--f btn--s" data-ouvrir="${esc(x.id)}">Ouvrir</button>${ui.effacerListe === x.id
              ? `<button class="btn btn--danger btn--s" data-effacer-liste="${esc(x.id)}" data-confirme="1">Oui, effacer</button>
                 <button class="btn btn--f btn--s" data-effacer-liste="">Annuler</button>`
              : `<button class="btn btn--f btn--s danger" data-effacer-liste="${esc(x.id)}">Effacer</button>`}</div></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="vide">Aucune séance pour l\'instant.</p>'}
    </section>
    </div>
    <aside class="accueil-a">
    <section class="p-sect" id="avant"><div class="p-sect-h"><h3>Avant la séance</h3></div>
      <p class="p-txt">Le dossier documentaire, à distribuer d'avance : le portrait du territoire et les documents à trier,
        sans les surprises (les points de vue et la décision de 1970).</p>
      <div class="p-actions"><button class="btn" data-dossier-avance="devoir">Imprimer le dossier élève</button>
        <button class="btn btn--f" data-dossier-avance="complet">Dossier complet, pour toi</button></div>
      <p class="hint" style="margin-top:10px">Tes corrections (ta version du jeu) s'y appliquent. En ligne :
        <a href="dossier.html" target="_blank" rel="noopener">la version élève</a>.</p>
    </section>
    ${demo}
    <section class="p-sect"><div class="p-sect-h"><h3>Ta version du jeu</h3></div>
      <p class="p-txt">${v ? esc(resumeReglages(v)) : 'Aucune pour l\'instant : chaque séance part de la version d\'origine.'}</p>
      <p class="hint">Tes corrections, tes questions ajoutées, tes minutes : reprises à chaque nouvelle séance. Les séances déjà créées ne changent pas.</p>
      <div class="p-actions"><button class="btn btn--f" data-ma-version="1">${v ? 'Modifier ma version' : 'Créer ma version'}</button>${
        !v ? '' : ui.effacerVersion
          ? `<button class="btn btn--danger" data-effacer-version="1" data-confirme="1">Oui, supprimer</button>
             <button class="btn btn--f" data-effacer-version="">Annuler</button>`
          : '<button class="btn btn--f danger" data-effacer-version="1">Supprimer ma version</button>'}</div>
    </section>
    ${donnees.mode === 'local' ? '' : `<section class="p-sect"><div class="p-sect-h"><h3>Ton compte</h3></div>${compte}</section>`}
    </aside>
    </div>`);
}

/** Crée la séance choisie (format, durée sur mesure, questionnaire) à partir de la version du jeu. */
async function creer() {
  const fmt = document.querySelector('input[name=format]:checked')?.value || 'standard';
  const v = ui.maVersion ? Rg.completer(base, ui.maVersion) : null;
  const garder = { ajouts: v?.ajouts, corrections: v?.corrections };
  let reglages;
  if (fmt === 'mesure') {
    // sur mesure : la durée totale tapée ; les questions de ta version sur mesure, s'il y en a une
    reglages = Rg.reglagesSurMesure(base, Number($('#duree-mesure')?.value), garder);
    if (v?.format === 'mesure') reglages.questions = { ...reglages.questions, ...v.questions };
  } else reglages = v && v.format === fmt ? v : Rg.reglagesDuFormat(base, fmt, garder);
  const cd = await creerSeance({ questionnaire: !!$('#opt-avis')?.checked, reglages });
  etat.MOI = await donnees.attendreUtilisateur();
  page.ouvrir(cd);
  // sur mesure : on ouvre tout de suite les réglages, pour choisir les questions avant l'arrivée des équipes
  if (fmt === 'mesure') {
    etat.onglet = 'reglages'; page.rendre(true);
    if (ui.ed) { ui.ed.msg = 'Séance sur mesure : choisis tes questions (et ajuste les minutes), puis « Appliquer à la séance ».'; page.rendre(true); }
  }
}

// taper une durée « sur mesure » choisit ce format
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'duree-mesure') { const r = document.querySelector('input[name=format][value="mesure"]'); if (r) r.checked = true; }
});

document.addEventListener('click', async (ev) => {
  if (ev.target.closest('#creer')) {
    ev.target.closest('#creer').disabled = true;
    try { return await creer(); }
    catch (e) { return page.accueil(messageErreur(e, 'Impossible de créer la séance pour le moment. Réessaie.')); }
  }
  if (ev.target.closest('[data-demo]')) {
    ev.target.closest('[data-demo]').disabled = true;
    try {
      const reglages = Rg.reglagesDuFormat(base, 'standard');
      const cd = await creerSeanceDemo(Rg.appliquer(base, reglages), reglages);
      etat.MOI = await donnees.attendreUtilisateur();
      return page.ouvrir(cd);
    } catch (e) { return page.accueil(messageErreur(e, 'Impossible de créer la démonstration.')); }
  }
  const efv = ev.target.closest('[data-effacer-version]');
  if (efv) {
    ui.effacerVersion = !!efv.dataset.effacerVersion && !efv.dataset.confirme;
    if (efv.dataset.confirme && etat.MOI) {
      efv.disabled = true;
      try { await effacerMaVersion(etat.MOI.uid); ui.maVersion = null; }
      catch (e) { console.warn('Version non supprimée', e); return page.accueil('Impossible de supprimer ta version pour le moment. Réessaie.'); }
    }
    return page.accueil();
  }
  if (ev.target.closest('[data-ma-version]')) {
    etat.MOI = etat.MOI || await donnees.identite();
    ui.maVersion = await lireMaVersion(etat.MOI.uid);
    ouvrirEditeur('version', ui.maVersion);
    window.scrollTo({ top: 0 });
    return rendreEditeur();
  }
  if (ev.target.closest('[data-google]')) {
    try { etat.MOI = await donnees.connexionGoogle(); }
    catch (e) { return page.accueil(messageErreur(e, 'Connexion Google impossible pour le moment.')); }
    return page.accueil();
  }
  if (ev.target.closest('[data-deconnexion]')) {
    await donnees.deconnexion(); etat.MOI = null;
    seanceGardee.oublier();
    return page.accueil();
  }
  const ouv = ev.target.closest('[data-ouvrir]');
  if (ouv) return page.ouvrir(ouv.dataset.ouvrir);
  const efl = ev.target.closest('[data-effacer-liste]');
  if (efl) {
    const cd = efl.dataset.effacerListe;
    if (!cd) { ui.effacerListe = null; return page.accueil(); }
    if (!efl.dataset.confirme) { ui.effacerListe = cd; return page.accueil(); }
    efl.disabled = true;
    await effacerSeance(cd);
    ui.effacerListe = null;
    return page.accueil();
  }
  // sans séance ouverte : le dossier selon la version du jeu de l'enseignant·e
  const dda = ev.target.closest('[data-dossier-avance]');
  if (dda) {
    const version = dda.dataset.dossierAvance;
    return imprimer(dossierHTML(Rg.appliquer(base, ui.maVersion), { version, pastilles: version === 'complet', enseignant: version === 'complet' }));
  }
});
