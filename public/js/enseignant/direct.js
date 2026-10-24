// enseignant/direct.js — l'onglet « En direct » : le code, le chrono, le message
// à la classe, chaque équipe et le détail de ses réponses.

import { esc, icone } from '../outils.js';
import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { carte, blocReleve } from '../carte.js';
import { SIGNAUX, texteSignal, MAX_MESSAGE, aUnBravo, EMOJIS_EQUIPES } from '../seance.js';
import { encode } from '../vendor/uqr.js';
import { etat, ui, qid, etapeDe, chronoDe, chronoTexte, autresReponses } from './etat.js';

const lienEleve = () => new URL(`eleve.html?code=${etat.code}`, location.href).href;

/**
 * Le code QR du lien direct, dessiné dans la page (aucun service extérieur). Noir sur blanc dans
 * tous les affichages, avec sa marge de quatre modules : c'est ce que lisent les caméras.
 * Gardé une fois calculé : l'onglet se redessine toutes les cinq secondes.
 */
const qrFaits = new Map();
function codeQR(lien) {
  if (!qrFaits.has(lien)) {
    const { size, data } = encode(lien, { ecc: 'M', border: 4 });
    const d = data.flatMap((ligne, y) => ligne.map((noir, x) => (noir ? `M${x} ${y}h1v1h-1z` : ''))).join('');
    qrFaits.set(lien, `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="Code QR du lien direct vers la séance"
      shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`);
  }
  return qrFaits.get(lien);
}

function etatTemps(e) {
  if (e.fini) return { cls: 't--ok', txt: 'terminé' };
  const x = etapeDe(e);
  const prevu = x.min * 60000;
  const t = prevu - Rg.resteEtape(etat.c, e, chronoDe());
  return { cls: t > 1.5 * prevu ? 't--alerte' : t > prevu ? 't--att' : 't--ok', txt: `${Math.floor(t / 60000)} / ${x.min} min` };
}

function segments(e) {
  const { etapesJeu } = etat;
  return `<div class="eq-seg" style="grid-template-columns:repeat(${etapesJeu.length},1fr)" aria-hidden="true">${
    etapesJeu.map((x, i) => `<i class="${e.fini || i < e.etape ? 'fait' : i === e.etape ? 'ici' : ''}"></i>`).join('')}</div>`;
}

function puces(e) {
  const { c, ecrites } = etat;
  const r = J.releve(c, e);
  const utiles = e.docs.filter((id) => c.documents.find((d) => d.id === id)?.utile).length;
  const p = [`relevés ${e.releves.length}/${c.releves.length}`];
  if (e.juge) p.push(`docs utiles ${utiles}/3`);
  if (e.atteinte >= 3) p.push(`villages vidés ${r.vides.length}/${J.nbVillages(c)}`, `corridor ${r.corridor}`);
  if (e.comps) p.push(`points de vue ${e.comps}/4`);
  p.push(`réponses ${ecrites.filter((q) => J.repondu(e, q.id)).length}/${ecrites.length}`);
  if (e.mentions.length) p.push(`✦ ${e.mentions.length} geste${e.mentions.length > 1 ? 's' : ''} reconnu${e.mentions.length > 1 ? 's' : ''}`);
  return `<div class="puces">${p.map((x) => `<span class="puce">${esc(x)}</span>`).join('')}</div>`;
}

/**
 * Le chrono en lecteur, comme une application de musique (conseil de l'experte UI/UX) : un gros bouton
 * démarrer / pause au centre ; autour, −5 et +5 minutes à l'étape de la plupart des équipes et « terminer l'étape ».
 * Des icônes : chaque bouton garde son nom (aria-label, qui commence par ce qu'on lit) et une infobulle. La remise à zéro,
 * qui efface le temps de toute la classe, attend dans « Le détail » : pas à côté de −5, où un clic de travers suffirait.
 */
function lecteur(ch, classe) {
  const b = (attrs, nom, contenu, cls = '') => `<button class="lecteur-b${cls}" type="button" ${attrs} aria-label="${esc(nom)}" title="${esc(nom)}">${contenu}</button>`;
  const grand = !ch.debut ? b('data-chrono="demarrer"', 'Démarrer le chrono maintenant', icone('jouer'), ' lecteur-b--g')
    : ch.pause ? b('data-chrono="reprendre"', 'Reprendre le chrono', icone('jouer'), ' lecteur-b--g')
      : b('data-chrono="pause"', 'Mettre le chrono en pause', icone('pause'), ' lecteur-b--g');
  const etape = classe ? `l'étape « ${classe.t} »` : '';
  return `<div class="lecteur">
    ${classe ? b(`data-minutes="${classe.id}" data-delta="-5" ${classe.min <= 1 ? 'disabled' : ''}`, `−5 minutes à ${etape}`, '<span aria-hidden="true">−5</span>') : ''}
    ${grand}
    ${classe ? b(`data-minutes="${classe.id}" data-delta="5"`, `+5 minutes à ${etape}`, '<span aria-hidden="true">+5</span>') : ''}
    ${classe ? b(`data-terminer="${classe.id}"`, `Terminer ${etape} maintenant : les équipes voient « Temps prévu dépassé »`, icone('fin')) : ''}
  </div>`;
}

/** Avancer ensemble : un interrupteur, et l'étape ouverte avec le bouton qui ouvre la suivante. */
function vueRythme() {
  const { c, S } = etat;
  const r = S?.rythme, dernier = c.etapes.findIndex((x) => x.id === 'debrief');
  const ouverte = r && r.etape <= dernier ? c.etapes[r.etape] : null;
  return `<div class="rythme">
    <label class="bascule"><input type="checkbox" role="switch" data-rythme ${r ? 'checked' : ''}><span class="bascule-p" aria-hidden="true"></span>
      <span>Avancer ensemble</span></label>
    ${!r ? '' : ouverte ? `<span>Jusqu'à <b>${esc(ouverte.n)}. ${esc(ouverte.t)}</b></span>
      <button class="btn btn--s" type="button" data-rythme-suivante>${r.etape === dernier ? 'Ouvrir la fin' : 'Ouvrir l\'étape suivante'} →</button>`
      : '<span>Toutes les étapes sont ouvertes</span>'}
  </div>`;
}

/**
 * La progression, à projeter (comme la course de Space Race dans Socrative, mais sans course) : chaque équipe, son
 * animal, sur l'étape où elle se trouve. Avec « avancer ensemble », les étapes pas encore ouvertes sont estompées.
 */
function vueProgression() {
  const { c, S, EQ, code, etapesJeu } = etat;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const r = S?.rythme;
  const animal = (e) => `<span class="piste-a"><span class="piste-e" aria-hidden="true">${EMOJIS_EQUIPES[e.nom] || ''}</span><small>${esc(e.nom)}</small></span>`;
  return `<div class="projection prog-proj">
    <div class="prog-proj-h"><h2>La progression</h2><span class="prog-proj-code">Code : <b>${esc(code)}</b></span>
      <button class="btn btn--f btn--s" type="button" data-proj-prog aria-pressed="true">Quitter la projection</button></div>
    <ol class="piste" style="grid-template-columns:repeat(${etapesJeu.length + 1},minmax(0,1fr))">
      ${etapesJeu.map((x, i) => `<li class="${r && i > r.etape ? 'piste--fermee' : ''}"><p class="piste-t">${esc(x.n)}. ${esc(x.t)}</p>
        <div class="piste-g">${eq.filter((e) => !e.fini && e.etape === i).map(animal).join('')}</div></li>`).join('')}
      <li class="piste--fin"><p class="piste-t">Terminé</p><div class="piste-g">${eq.filter((e) => e.fini).map(animal).join('')}</div></li>
    </ol></div>`;
}

export function vueDirect() {
  if (ui.projProg) return vueProgression();
  const { c, S, EQ, code, choisie, ecrites, etapesJeu } = etat;
  const ch = chronoDe();
  const total = c.miseEnRoute.min + Rg.totalPrevu(c);
  const classe = Rg.etapeDeLaClasse(c, EQ);
  const sg = S?.signal;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const sel = eq.find((e) => e.id === choisie);
  const lien = lienEleve();
  // ce que prévoit la séance, en clair : les minutes ET les questions de chaque étape
  const nq = (id) => ecrites.filter((q) => q.etape === id).length + (id === 'debrief' ? c.q.orales.length : 0);
  return `<div class="p-tete">
      <h2 class="cache-visuel">En direct</h2>
      <div class="tete-g">
        <section class="p-sect tete-code${ui.qrGrand ? ' tete-code--qr' : ''}">
          <div class="code-g">
            <div>
              <p class="sur">Code de la séance</p>
              <p class="code-v" id="code-seance">${esc(code)}</p>
            </div>
            <div class="qr-f">${codeQR(lien)}
              <button class="lien" type="button" data-qr aria-pressed="${!!ui.qrGrand}">${ui.qrGrand ? 'Réduire le code QR' : 'Agrandir le code QR'}</button>
            </div>
          </div>
          <p class="code-u code-liens"><a class="lien-direct" href="${esc(lien)}" target="_blank" rel="noopener"
              title="${esc(lien)}">${icone('lien')} Lien direct</a>
            <button class="lien lien-copier" type="button" data-copier="${esc(lien)}" aria-label="Copier le lien direct"
              title="Copier le lien">${icone('copier')}</button>
            <button class="lien" type="button" data-apercu="seance">${icone('oeil')} Voir comme une équipe</button></p>
        </section>
        <section class="p-sect tete-chrono">
          <p class="sur">${icone('horloge')} Chrono de la classe${ch.pause ? ' <span class="badge badge--pause">en pause</span>' : ''}</p>
          <p class="chrono${ch.debut ? '' : ' chrono--attente'}" id="chrono"><span id="chrono-v">${chronoTexte(ch)}</span> <span>sur ${total} min</span></p>
          ${lecteur(ch, classe)}
          <p class="lecteur-l">${classe ? `Étape de la plupart des équipes : <b>${esc(classe.t)}</b>, <span class="temps">${classe.min} min</span>`
            : ch.debut ? '' : 'Le chrono part avec la première équipe.'}</p>
          <details class="chrono-detail" data-k="chrono-detail" ${ui.ouverts.has('chrono-detail') ? 'open' : ''}>
            <summary>Le détail, étape par étape</summary>
            <ol>${etapesJeu.map((x) => `<li>${esc(x.t)} · <span class="temps">${x.min} min</span>${nq(x.id) ? ` · ${nq(x.id)} question${nq(x.id) > 1 ? 's' : ''}` : ''}</li>`).join('')}</ol>
            ${ch.debut ? `<p><button class="lien danger" type="button" data-chrono="zero">${icone('zero')} Remettre le chrono à zéro</button></p>` : ''}
          </details>
        </section>
      </div>
    </div>
    <section class="p-sect">
      <div class="p-sect-h"><h3>${icone('bulle')} Message à toute la classe</h3>
        <span class="hint">${texteSignal(sg) ? `Affiché : « ${esc(texteSignal(sg))} »` : 'Aucun message affiché.'}</span></div>
      <div class="signaux">
        ${Object.entries(SIGNAUX).map(([k, v]) => `<button class="btn btn--f bulle-b" data-signal="${k}" aria-pressed="${sg?.type === k}">${esc(v.court)}</button>`).join('')}
        ${texteSignal(sg) ? '<button class="lien danger" data-signal="">Retirer le message</button>' : ''}
      </div>
      <details class="msg-perso" data-k="msg-perso" ${ui.ouverts.has('msg-perso') ? 'open' : ''}><summary>Écrire votre propre message</summary>
      <form class="signal-perso" id="f-signal" autocomplete="off">
        <label class="champ"><span>Votre message, sans prénom (${MAX_MESSAGE} caractères au plus)</span>
          <input name="texte" maxlength="${MAX_MESSAGE}" placeholder="Ex. : Relisez la consigne avant de continuer."></label>
        <button class="btn btn--f btn-ic" type="submit" title="Envoyer">${icone('envoyer')}<span class="cache-visuel">Envoyer</span></button>
      </form></details>
    </section>
    <section class="p-sect">
      <div class="p-sect-h"><h3>Les équipes (${eq.length})</h3>
        <button class="btn btn--f btn--s" type="button" data-proj-prog aria-pressed="false">${icone('ecran')} Projeter la progression</button></div>
      ${vueRythme()}
      <div class="p-sect-h">
        <span class="hint">Temps dans l'étape / temps prévu · vert, puis ocre au-delà du prévu, rouge au-delà de 1,5 fois</span></div>
      ${eq.length ? '<p class="hint eq-aide">Touchez une équipe pour lire ses réponses, et saluer une bonne réponse d\'un <b>✦ Bravo</b> : l\'équipe le voit tout de suite.</p>' : ''}
      ${eq.length ? `<div class="equipes">${eq.map((e) => {
        const t = etatTemps(e), x = etapeDe(e);
        return `<button class="eq" data-equipe="${esc(e.id)}" aria-pressed="${e.id === choisie}">
          <span class="eq-h"><b>${esc(e.nom)}</b><span class="eq-t ${t.cls}">${t.txt}</span></span>
          <span class="eq-e">${e.fini ? 'Partie terminée' : `Étape ${x.n} · ${esc(x.t)}`}</span>
          ${segments(e)}${puces(e)}</button>`;
      }).join('')}</div>`
      : `<p class="vide">Aucune équipe pour l'instant. Affichez le code <b>${esc(code)}</b> au tableau.</p>`}
    </section>
    ${sel ? vueDetail(sel) : ''}
    <section class="p-sect">
      <div class="p-sect-h"><h3>Fin de la séance</h3></div>
      <p class="hint">Fermer : plus aucune équipe n'entre. Effacer : tout est supprimé pour de bon ; imprimez le rapport avant.</p>
      <div class="p-actions">
        <button class="btn" data-rapport="1" ${EQ.length ? '' : 'disabled'}>${icone('imprimer')} Imprimer le rapport de séance</button>
        <button class="btn btn--f" data-export-reponses="1" ${EQ.length ? '' : 'disabled'}>${icone('tableur')} Exporter les réponses</button>
        ${S?.etat === 'ouverte' ? '<button class="btn btn--f danger" data-fermer="1">Fermer la séance</button>' : '<span class="hint">Séance fermée.</span>'}
        ${ui.effacer
          ? '<button class="btn btn--danger" data-effacer="oui">Oui, tout effacer</button><button class="btn btn--f" data-effacer="non">Annuler</button>'
          : '<button class="btn btn--f danger" data-effacer="demander">Effacer la séance et ses données</button>'}
      </div>
    </section>`;
}

function vueDetail(e) {
  const { c, S, ecrites } = etat;
  return `<section class="p-sect detail" id="detail">
    <div class="p-sect-h"><h3>Équipe ${esc(e.nom)}</h3><button class="lien" data-equipe="">Fermer ✕</button></div>
    <div class="detail-g">
      <div>${carte(c, e, { cliquable: false })}<div style="margin-top:12px">${blocReleve(c, e, true)}</div>
        ${e.juge ? `<p class="sur" style="margin-top:14px">Documents retenus</p><ul class="docs-r">${e.docs.map((id) => {
          const d = c.documents.find((x) => x.id === id);
          return `<li class="${d.utile ? 'ok' : 'hs'}"><span aria-hidden="true">${d.utile ? '✓' : '—'}</span> ${esc(d.t)}${d.utile ? '' : ' <small>(hors sujet)</small>'}</li>`; }).join('')}</ul>` : ''}</div>
      <div class="rep-l">${ecrites.map((q) => {
        const r = String(e.reponses?.[q.id] || '').trim();
        const bravo = aUnBravo(S, e.id, q.id);
        return `<div class="rep${r ? '' : ' rep--vide'}${bravo ? ' rep--bravo' : ''}"><p class="k">${esc(qid(q))} · ${esc(c.etapes.find((x) => x.id === q.etape).t)}${q.requise ? '' : ' · facultative'}</p>
          <p><b>${esc(q.eleve)}</b></p><p>${r ? esc(r) : 'pas encore de réponse'}</p>
          ${r ? `<button class="btn btn--f btn--s bravo-b" data-bravo="${esc(q.id)}" data-pour="${esc(e.id)}" aria-pressed="${bravo}"
            title="L'équipe voit tout de suite que cette réponse vous a plu">${bravo ? '✦ Bravo envoyé' : '✦ Bravo'}</button>` : ''}
          ${q.reponse ? `<details data-k="${esc(e.id)}-${esc(q.id)}" ${ui.ouverts.has(`${e.id}-${q.id}`) ? 'open' : ''}><summary class="hint">Réponse attendue</summary><p class="att">${esc(q.reponse)}</p></details>` : ''}</div>`;
      }).join('')}${autresReponses(e).map((x) => `<div class="rep"><p class="k">${esc(x.k)}</p><p><b>${esc(x.t)}</b></p><p>${esc(x.r)}</p></div>`).join('')}</div>
    </div></section>`;
}
