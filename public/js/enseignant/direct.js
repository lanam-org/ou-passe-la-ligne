// enseignant/direct.js — l'onglet « En direct » : le code, le chrono, le message
// à la classe, chaque équipe et le détail de ses réponses.

import * as donnees from '../donnees.js';
import { esc } from '../outils.js';
import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { carte, blocReleve } from '../carte.js';
import { SIGNAUX, texteSignal, MAX_MESSAGE, aUnBravo } from '../seance.js';
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

export function vueDirect() {
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
  const nReq = ecrites.filter((q) => q.requise).length;
  return `<div class="p-tete">
      <h2 class="cache-visuel">En direct</h2>
      <p class="retour"><button class="lien" data-retour="1">← Tes séances</button></p>
      <div class="tete-g">
        <section class="p-sect tete-code${ui.qrGrand ? ' tete-code--qr' : ''}">
          <div class="code-g">
            <div>
              <p class="sur">Code de la séance</p>
              <p class="code-v" id="code-seance">${esc(code)}</p>
              <p class="code-u">À afficher au tableau.</p>
            </div>
            <div class="qr-f">${codeQR(lien)}
              <button class="lien" type="button" data-qr aria-pressed="${!!ui.qrGrand}">${ui.qrGrand ? 'Réduire le code QR' : 'Agrandir le code QR'}</button>
            </div>
          </div>
          <p class="code-u">Lien direct : <a href="${esc(lien)}" target="_blank" rel="noopener">${esc(lien)}</a>
            <button class="lien lien-copier" type="button" data-copier="${esc(lien)}">Copier</button>${donnees.mode === 'local'
            ? '<br><span class="hint">Démonstration : ce lien et ce code QR ne marchent que dans ce navigateur.</span>'
            : '<br><span class="hint">Le code QR mène au même lien : la caméra du Chromebook l\'ouvre, le code déjà rempli.</span>'}</p>
        </section>
        <section class="p-sect tete-chrono">
          <p class="sur">Chrono de la classe${ch.pause ? ' <span class="badge badge--pause">en pause</span>' : ''}</p>
          <p class="chrono${ch.debut ? '' : ' chrono--attente'}" id="chrono"><span id="chrono-v">${chronoTexte(ch)}</span> <span>sur ${total} min prévues</span></p>
          <p class="hint">${ch.debut ? 'Temps écoulé depuis le début, pauses retirées. ' : 'Démarre avec la première équipe. '}Prévu :
            ${c.miseEnRoute.min} min de mise en route, puis ${etapesJeu.length} étapes ; ${ecrites.length} questions écrites
            (${nReq} requises) et ${c.q.orales.length} à l'oral.</p>
          <details class="chrono-detail" data-k="chrono-detail" ${ui.ouverts.has('chrono-detail') ? 'open' : ''}>
            <summary>Le détail, étape par étape</summary>
            <ol>${etapesJeu.map((x) => `<li>${esc(x.t)} · ${x.min} min${nq(x.id) ? ` · ${nq(x.id)} question${nq(x.id) > 1 ? 's' : ''}` : ''}</li>`).join('')}</ol>
          </details>
          <div class="signaux">${!ch.debut ? '<button class="btn btn--f btn--s" data-chrono="demarrer">Démarrer maintenant</button>'
            : ch.pause ? '<button class="btn btn--s" data-chrono="reprendre">Reprendre</button>'
              : '<button class="btn btn--f btn--s" data-chrono="pause">Pause</button>'}
            ${ch.debut ? '<button class="btn btn--f btn--s" data-chrono="zero">Remettre à zéro</button>' : ''}</div>
        </section>
      </div>
    </div>
    <section class="p-sect">
      <div class="p-sect-h"><h3>Message à toute la classe</h3>
        <span class="hint">${texteSignal(sg) ? `Affiché : « ${esc(texteSignal(sg))} »` : 'Aucun message affiché.'}</span></div>
      <div class="signaux">
        ${Object.entries(SIGNAUX).map(([k, v]) => `<button class="btn btn--f" data-signal="${k}" aria-pressed="${sg?.type === k}">${esc(v.court)}</button>`).join('')}
        ${texteSignal(sg) ? '<button class="lien" data-signal="">Retirer le message</button>' : ''}
      </div>
      <form class="signal-perso" id="f-signal" autocomplete="off">
        <label class="champ"><span>Ou votre propre message, sans prénom (${MAX_MESSAGE} caractères au plus)</span>
          <input name="texte" maxlength="${MAX_MESSAGE}" placeholder="Ex. : Relisez la consigne avant de continuer."></label>
        <button class="btn btn--f" type="submit">Envoyer</button>
      </form>
    </section>
    <section class="p-sect">
      <div class="p-sect-h"><h3>Les équipes (${eq.length})</h3>
        <span class="hint">Temps dans l'étape / temps prévu · vert, puis ocre au-delà du prévu, rouge au-delà de 1,5 fois</span></div>
      ${classe ? `<div class="signaux duree-v"><span class="hint">La plupart des équipes : ${esc(classe.t)}, ${classe.min} min prévues.
          Les équipes voient le temps qui reste.</span>
        <button class="btn btn--f" data-minutes="${classe.id}" data-delta="5">+5 min</button>
        <button class="btn btn--f" data-minutes="${classe.id}" data-delta="-5" ${classe.min <= 1 ? 'disabled' : ''}>−5 min</button>
        <button class="btn btn--f" data-terminer="${classe.id}"
          title="Le temps prévu de l'étape s'arrête maintenant : les équipes voient « Temps prévu dépassé ».">Terminer l'étape maintenant</button></div>` : ''}
      ${eq.length ? `<div class="equipes">${eq.map((e) => {
        const t = etatTemps(e), x = etapeDe(e);
        return `<button class="eq" data-equipe="${esc(e.id)}" aria-pressed="${e.id === choisie}">
          <span class="eq-h"><b>${esc(e.nom)}</b><span class="eq-t ${t.cls}">${t.txt}</span></span>
          <span class="eq-e">${e.fini ? 'Partie terminée' : `Étape ${x.n} · ${esc(x.t)}`}</span>
          ${segments(e)}${puces(e)}</button>`;
      }).join('')}</div>`
      : `<p class="vide">Aucune équipe pour l'instant. Affiche le code <b>${esc(code)}</b> au tableau.</p>`}
    </section>
    ${sel ? vueDetail(sel) : ''}
    <section class="p-sect">
      <div class="p-sect-h"><h3>Fin de la séance</h3></div>
      <p class="hint">Imprimer : un rapport de la séance (la classe, le temps, chaque équipe et ses réponses), à garder
        sur papier ou en PDF. Fermer : plus aucune équipe ne peut entrer. Effacer : les équipes, leurs réponses et la
        séance sont supprimées pour de bon — imprime d'abord.</p>
      <div class="p-actions">
        <button class="btn" data-rapport="1" ${EQ.length ? '' : 'disabled'}>Imprimer le rapport de séance</button>
        ${S?.etat === 'ouverte' ? '<button class="btn btn--f" data-fermer="1">Fermer la séance</button>' : '<span class="hint">Séance fermée.</span>'}
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
