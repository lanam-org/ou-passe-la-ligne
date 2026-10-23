// enseignant/accueil.js — l'accueil « Vos séances » : créer une séance, rouvrir ou
// effacer les anciennes, imprimer le dossier d'avance, sa version du jeu, son compte.

import * as donnees from '../donnees.js';
import { mesure, googleEnseignant } from '../config.js';
import { $, esc, typo, messageErreur, icone } from '../outils.js';
import * as Rg from '../reglages.js';
import { dossierHTML } from '../dossierdoc.js';
import { creerSeanceDemo } from '../demo.js';
import { creerSeance, effacerSeance, mesSeances, lireMaVersion, effacerMaVersion, JOURS_CONSERVATION, ouvrirApercu } from '../seance.js';
import { base, etat, ui, page, seanceGardee } from './etat.js';
import { resumeReglages, ouvrirEditeur, rendreEditeur } from './editeur.js';
import { imprimer } from './rapport.js';

const JOUR = 86400000;
/** Une vignette à cliquer : une icône, un titre, une ligne (experte UI/UX : des « petits paquets » plutôt que des phrases). */
const vignette = (attrs, ic, titre, ligne) => `<button class="vignette" type="button" ${attrs}>${icone(ic)}<b>${esc(titre)}</b>
  <span class="hint">${esc(ligne)}</span></button>`;
const dateCourte = (t) => new Date(t).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Dessine l'accueil : une nouvelle séance, les séances déjà créées, le dossier élève. « Less is more » : ce qui sert
 * moins souvent (dossier complet, version du jeu, trousse d'essai, fiche pour l'école) attend sous « Plus d'outils ».
 */
export async function afficherAccueil(erreur = '') {
  const { MOI } = etat;
  let liste = [];
  try { liste = MOI ? await mesSeances(MOI.uid) : []; } catch (e) { console.warn('Liste des séances indisponible', e); }
  ui.maVersion = MOI ? await lireMaVersion(MOI.uid) : null;
  const v = ui.maVersion ? Rg.completer(base, ui.maVersion) : null;
  const fmt = v?.format || 'standard';
  const google = MOI && !MOI.anonyme;
  const compte = donnees.mode === 'local'
    ? '<p class="hint">Version de démonstration : pas de compte. Vos séances restent dans ce navigateur.</p>'
    : !googleEnseignant ? '<p class="hint">Sans compte : vos séances restent liées à ce navigateur.</p>'
    : google ? `<p>Connecté·e avec Google : <b>${esc(MOI.nom || '')}</b> ${MOI.courriel ? `· ${esc(MOI.courriel)}` : ''}</p>
        <p class="hint">Vous retrouvez vos séances sur n'importe quel ordinateur. Ni votre nom ni votre courriel ne sont écrits dans la base.</p>
        <div class="p-actions"><button class="btn btn--f" data-deconnexion="1">Se déconnecter</button></div>`
    : `<p>Sans compte, vos séances restent liées à <b>ce navigateur</b>. Avec Google, vous les retrouvez sur n'importe quel ordinateur.</p>
        <p class="hint">Les élèves, eux, n'ont jamais de compte. Ni votre nom ni votre courriel ne sont écrits dans la base.</p>
        <div class="p-actions"><button class="btn" data-google="1">Se connecter avec Google</button></div>`;
  // la démonstration, juste sous « Créer la séance » : c'est là qu'on la cherche quand on découvre l'espace
  const demo = donnees.mode === 'local' ? `<div class="demo" id="demo"><p class="hint">Découvrir l'espace sans élèves : une séance
      déjà en cours, avec quatre équipes.</p>
      <div class="p-actions"><button class="btn btn--f" data-demo="1">Explorer une séance de démonstration →</button></div></div>` : '';
  $('#prof').innerHTML = typo(`<div class="p-tete">
      <h2>Vos séances</h2>
      <p>Une séance = un code à afficher au tableau ; chaque équipe l'entre sur son Chromebook.</p>
    </div>
    ${erreur ? `<p class="erreur" role="alert">${esc(erreur)}</p>` : ''}
    <div class="accueil-g">
    <div class="accueil-m">
    <section class="p-sect creer"><div class="p-sect-h"><h3>Nouvelle séance</h3></div>
      <fieldset class="formats" id="formats"><legend>${icone('horloge')} La durée</legend>
        ${Object.entries(Rg.FORMATS).filter(([k]) => k === 'standard' || k === 'mesure' || k === fmt).map(([k, f]) => `<label class="case-l"><input type="radio" name="format" value="${k}" ${k === fmt ? 'checked' : ''}>
          <span>${esc(f.nom)}${k === 'mesure' ? ` <input type="number" id="duree-mesure" class="duree-mesure" min="15" max="240" step="1"
            value="${v?.format === 'mesure' ? v.miseEnRoute + Object.entries(v.minutes).filter(([id]) => id !== 'avis').reduce((s, [, m]) => s + m, 0) : 60}"
            aria-label="Durée totale, en minutes"> min` : ''}<br><span class="hint">${esc(f.resume)}</span></span></label>`).join('')}
      </fieldset>
      ${v ? '<p class="hint formats-n">Votre version du jeu sert de départ.</p>' : ''}
      ${mesure ? `<label class="bascule"><input type="checkbox" role="switch" id="opt-avis"><span class="bascule-p" aria-hidden="true"></span>
        <span>Questionnaire « Ton avis » en fin de séance</span></label>` : ''}
      <div class="p-actions p-actions--d"><button class="lien" type="button" data-apercu="choix">${icone('oeil')} Voir le jeu comme une équipe</button>
        <button class="btn" id="creer">Créer la séance →</button></div>
      ${demo}
    </section>
    ${liste.length ? `<section class="p-sect" id="mes-seances-s"><div class="p-sect-h"><h3>Historique (${liste.length})</h3></div>
      <p class="hint">${donnees.mode === 'local' ? 'Pour garder le rapport d’une séance, imprimez-le avant de l’effacer.'
        : `Chaque séance s'efface seule ${JOURS_CONSERVATION} jours après sa création : imprimez son rapport avant, pour le garder.`}</p>
      <div class="tab-w"><table class="tab" id="mes-seances"><thead><tr><th>Créée le</th><th>Code</th><th>État</th><th></th></tr></thead>
        <tbody>${liste.map((x) => `<tr><td>${esc(dateCourte(x.creeLe))}${Date.now() - x.creeLe > 30 * JOUR
          ? ' <span class="badge badge--reprise">plus de 30 jours</span>' : ''}</td>
          <td class="mono">${esc(x.id)}${x.demo ? ' <span class="badge">démonstration</span>' : ''}</td><td>${x.etat === 'ouverte' ? 'ouverte' : 'fermée'}</td>
          <td><div class="signaux"><button class="btn btn--f btn--s" data-ouvrir="${esc(x.id)}">Ouvrir</button>${ui.effacerListe === x.id
              ? `<button class="btn btn--danger btn--s" data-effacer-liste="${esc(x.id)}" data-confirme="1">Oui, effacer</button>
                 <button class="btn btn--f btn--s" data-effacer-liste="">Annuler</button>`
              : `<button class="btn btn--f btn--s danger" data-effacer-liste="${esc(x.id)}">Effacer</button>`}</div></td></tr>`).join('')}</tbody></table></div>
    </section>` : ''}
    </div>
    <aside class="accueil-a">
    <section class="p-sect" id="avant"><div class="p-sect-h"><h3>Préparer votre séance</h3></div>
      <div class="vignettes">
        ${vignette('data-dossier-avance="devoir"', 'imprimer', 'Dossier élève', 'À distribuer d’avance, sans les surprises')}
        ${vignette('data-dossier-avance="complet"', 'imprimer', 'Dossier complet', 'Pour vous : avec les surprises')}
      </div>
      <p class="hint">En ligne : <a href="dossier.html" target="_blank" rel="noopener">le dossier élève</a>.</p>
    </section>
    <details class="p-sect plus-outils" data-k="accueil-plus" ${ui.ouverts.has('accueil-plus') ? 'open' : ''}>
      <summary><span class="plus-t">Plus d'outils</span>
        <span class="hint">Trousse d'essai, fiche pour l'école, votre version du jeu</span></summary>
      <div class="vignettes">
        ${vignette('data-trousse="demarrer"', 'imprimer', 'Démarrer en 5 minutes', 'Une page pour un essai du jeu')}
        ${vignette('data-trousse="observation"', 'imprimer', 'Grille d’observation', 'Pour la personne qui observe')}
        <a class="vignette" href="ecoles.html" target="_blank" rel="noopener">${icone('lien')}<b>Fiche pour l'école</b>
          <span class="hint">Ce que le site fait des données, pour la direction</span></a>
      </div>
      <h3>Votre version du jeu</h3>
      <p class="p-txt">${v ? esc(resumeReglages(v)) : 'Aucune pour l’instant : chaque séance part de la version d’origine.'}</p>
      <p class="hint">Reprise à chaque nouvelle séance ; les séances déjà créées ne changent pas.</p>
      <div class="p-actions"><button class="btn btn--f" data-ma-version="1">${v ? 'Modifier votre version' : 'Créer votre version'}</button>${
        !v ? '' : ui.effacerVersion
          ? `<button class="btn btn--danger" data-effacer-version="1" data-confirme="1">Oui, supprimer</button>
             <button class="btn btn--f" data-effacer-version="">Annuler</button>`
          : '<button class="btn btn--f danger" data-effacer-version="1">Supprimer votre version</button>'}</div>
    </details>
    ${donnees.mode === 'local' ? '' : `<section class="p-sect"><div class="p-sect-h"><h3>Votre compte</h3></div>${compte}</section>`}
    </aside>
    </div>`);
}

/** Les réglages de la durée choisie (format, durée sur mesure), à partir de la version du jeu de l'enseignant·e. */
function reglagesChoisis() {
  const fmt = document.querySelector('input[name=format]:checked')?.value || 'standard';
  const v = ui.maVersion ? Rg.completer(base, ui.maVersion) : null;
  const garder = { ajouts: v?.ajouts, corrections: v?.corrections };
  if (fmt !== 'mesure') return v && v.format === fmt ? v : Rg.reglagesDuFormat(base, fmt, garder);
  // sur mesure : la durée totale tapée ; les questions de sa version sur mesure, s'il y en a une
  const reglages = Rg.reglagesSurMesure(base, Number($('#duree-mesure')?.value), garder);
  if (v?.format === 'mesure') reglages.questions = { ...reglages.questions, ...v.questions };
  return reglages;
}

/** Crée la séance choisie (format, durée sur mesure, questionnaire) à partir de la version du jeu. */
async function creer() {
  const reglages = reglagesChoisis(), fmt = reglages.format;
  const cd = await creerSeance({ questionnaire: !!$('#opt-avis')?.checked, reglages });
  etat.MOI = await donnees.attendreUtilisateur();
  page.ouvrir(cd);
  // sur mesure : on ouvre tout de suite les réglages, pour choisir les questions avant l'arrivée des équipes
  if (fmt === 'mesure') {
    etat.onglet = 'reglages'; page.rendre(true);
    if (ui.ed) { ui.ed.msg = 'Séance sur mesure : choisissez vos questions (et ajustez les minutes), puis « Appliquer à la séance ».'; page.rendre(true); }
  }
}

// taper une durée « sur mesure » choisit ce format
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'duree-mesure') { const r = document.querySelector('input[name=format][value="mesure"]'); if (r) r.checked = true; }
});

document.addEventListener('click', async (ev) => {
  // l'aperçu élève, avec la durée choisie ci-dessus, sans créer de séance
  if (ev.target.closest('[data-apercu="choix"]')) return ouvrirApercu(reglagesChoisis());
  if (ev.target.closest('#creer')) {
    ev.target.closest('#creer').disabled = true;
    try { return await creer(); }
    catch (e) { return page.accueil(messageErreur(e, 'Impossible de créer la séance pour le moment. Réessayez.')); }
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
      catch (e) { console.warn('Version non supprimée', e); return page.accueil('Impossible de supprimer votre version pour le moment. Réessayez.'); }
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
