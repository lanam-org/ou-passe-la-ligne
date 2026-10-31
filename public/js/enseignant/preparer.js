// enseignant/preparer.js — les onglets « Questions », « Dossier » et « Déroulement » :
// ce que l'enseignant·e lit pour préparer la séance. Rien de ceci n'apparaît chez les élèves.
// (L'onglet « Réglages » a son propre fichier : editeur.js.)

import { mesure } from '../config.js';
import { esc, icone } from '../outils.js';
import { tableauArrimage } from './pfeq.js';
import * as Rg from '../reglages.js';
import { dossierHTML } from '../dossierdoc.js';
import { etat, ui, qid } from './etat.js';

/* ------------------------------------------------------------ questions */

/** Où en est une question de la banque dans cette séance : [libellé, classe du badge]. */
function etatQuestion(q) {
  const m = Rg.modeQuestion(q), v = etat.c.reglages.questions[q.id];
  if (m === 'geste') return ['geste dans le jeu', 'posee'];
  if (m === 'enseignant') return ['par l\'enseignant·e, à la mise en route', 'ecran'];
  if (m === 'orale') return v === 'on' ? ['orale, en classe', 'posee'] : ['retirée', ''];
  return v === 'requise' ? ['écrite, requise', 'posee'] : v === 'facultative' ? ['écrite, facultative', 'reprise'] : ['retirée', ''];
}
const retiree = (q) => etatQuestion(q)[0] === 'retirée';

/**
 * Sous chaque question, les deux gestes qu'on vient chercher ici : changer son état (requise, facultative,
 * retirée) et corriger son texte. Chacun mène à l'onglet Réglages, ouvert au bon endroit (enseignant.js).
 */
function liensQuestion(q) {
  if (q.ajout) return `<p class="bq-l"><button class="btn btn--f btn--s" data-aller-reglage="ajout:${esc(q.id)}">Modifier ou retirer cette question</button></p>`;
  const m = Rg.modeQuestion(q), v = etat.c.reglages.questions[q.id];
  const changer = m === 'ecrite' ? (v === 'requise' ? 'Rendre facultative ou retirer' : v === 'facultative' ? 'Rendre requise ou retirer' : 'Poser cette question')
    : m === 'orale' ? (v === 'on' ? 'Retirer de la séance' : 'Poser à l\'oral') : '';
  return `<p class="bq-l">${changer ? `<button class="btn btn--f btn--s" data-aller-reglage="q:${esc(q.id)}">${changer}</button>` : ''}
    <button class="btn btn--f btn--s" data-aller-reglage="c:banque|${esc(q.id)}">Mettre à jour ce texte</button></p>`;
}

export function vueQuestions() {
  const { c } = etat;
  // l'état d'une question (« écrite, facultative ») mène aussi à son réglage : c'est là qu'on clique d'instinct
  const cible = (q) => (q.ajout ? `ajout:${q.id}` : ['ecrite', 'orale'].includes(Rg.modeQuestion(q)) ? `q:${q.id}` : '');
  const badge = (q, txt, cls) => (cible(q)
    ? `<button class="badge badge-b${cls ? ` badge--${cls}` : ''}" data-aller-reglage="${esc(cible(q))}"
        aria-label="${esc(txt)} : changer dans Réglages">${esc(txt)} <span aria-hidden="true">▾</span></button>`
    : `<span class="badge${cls ? ` badge--${cls}` : ''}">${esc(txt)}</span>`);
  const item = (q, [txt, cls]) => `<article class="bq">
    <div class="bq-h"><span class="qid">${esc(qid(q))}</span><span class="bq-q">${esc(q.eleve || q.q)}</span>
      ${badge(q, txt, cls)}</div>
    ${q.reponse ? `<p class="bq-r"><span class="sur">Réponse attendue</span><br>${esc(q.reponse)}</p>` : ''}
    <p class="bq-s">${q.note ? esc(q.note) + ' · ' : ''}${esc((q.sources || []).join(' · '))}</p>${liensQuestion(q)}</article>`;
  const ajouts = [...c.q.ecrites, ...c.q.orales].filter((q) => q.ajout);
  const etatAjout = (q) => c.q.orales.includes(q) ? ['ajoutée · orale', 'posee'] : [`ajoutée · ${q.requise ? 'requise' : 'facultative'}`, q.requise ? 'posee' : 'reprise'];
  const retirees = c.banque.filter(retiree);
  const nReq = c.q.ecrites.filter((q) => q.requise).length;
  return `<div class="p-tete"><h2>Les questions</h2>
      <p>Dans cette séance (${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}) : ${c.q.ecrites.length} questions écrites en équipe,
        dont ${nReq} requises, et ${c.q.orales.length} à l'oral, à la rétroaction. Les autres restent dans la banque, pour une reprise.
        Sous chaque question : la rendre facultative, la retirer ou la poser, et mettre à jour son texte, même pendant la séance.</p></div>
    ${c.etapes.filter((x) => x.id !== 'avis').map((x) => {
      const l = c.banque.filter((q) => Rg.etapeQuestion(c, q) === x.id && !retiree(q));
      const a = ajouts.filter((q) => (q.etape || 'debrief') === x.id);
      return l.length || a.length ? `<section class="p-sect"><div class="p-sect-h"><h3>Étape ${x.n} · ${esc(x.t)}</h3>
        <span class="hint">${x.min} min</span></div><div class="banque">${l.map((q) => item(q, etatQuestion(q))).join('')}${
          a.map((q) => item(q, etatAjout(q))).join('')}</div></section>` : '';
    }).join('')}
    <section class="p-sect"><div class="p-sect-h"><h3>Retirées de cette séance</h3>
      <span class="hint">${retirees.length} questions, gardées dans la banque pour une reprise ou une autre séance</span></div>
      <div class="banque">${retirees.map((q) => item(q, etatQuestion(q))).join('')}</div></section>`;
}

/* ------------------------------------------------------------ dossier documentaire */

export function vueDossier() {
  const lien = new URL(`dossier.html?code=${etat.code}`, location.href).href;
  return `<div class="p-tete"><h2>Le dossier documentaire</h2>
      <p>Chaque source, sa phrase exacte et sa date.</p>
      <div class="p-actions">
        <button class="btn" data-dossier-imprimer="complet">${icone('imprimer')} Imprimer le dossier complet</button>
        <button class="btn btn--f" data-dossier-imprimer="devoir">${icone('imprimer')} Imprimer le dossier élève (sans les surprises)</button>
        <label class="case-l dd-opt"><input type="checkbox" id="dd-pastilles" ${ui.pastilles ? 'checked' : ''}><span>Pastilles des questions</span></label>
      </div>
      <p class="code-u" style="margin-top:10px"><a id="lien-dossier" href="${esc(lien)}" target="_blank" rel="noopener">${icone('lien')} Dossier élève en ligne</a></p>
    </div>
    <section class="p-sect">${dossierHTML(etat.c, { version: 'complet', pastilles: ui.pastilles, enseignant: true, corriger: true })}</section>`;
}

/* ------------------------------------------------------------ déroulement */

export function vueDeroulement() {
  const { c, B, ecrites } = etat;
  const posees = (id) => [...(id === 'dossier' ? [B['F3.1']] : []), ...ecrites.filter((q) => q.etape === id),
    ...(id === 'debrief' ? c.q.orales : [])];
  return `<div class="p-tete"><h2>Déroulement de la séance</h2>
      <p>${c.miseEnRoute.min + Rg.totalPrevu(c)} minutes (${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}) : ${c.miseEnRoute.min} de mise en route, puis sept étapes.</p>
      ${c.coupure ? `<p class="hint">Deux périodes : coupure après « ${esc(c.etapes.find((x) => x.id === c.coupure).t)} ».
        Avec « Avancer ensemble », retenez les équipes à cette étape.</p>` : ''}
      <div class="p-actions"><button class="btn btn--f" data-trousse="retroaction">${icone('imprimer')} Animer la rétroaction</button>
        <button class="btn btn--f" data-trousse="observation">${icone('imprimer')} Imprimer la grille d'observation</button></div></div>
    <section class="p-sect" id="programme"><div class="p-sect-h"><h3>Lien avec le programme</h3>
        <span class="hint">Géographie, 1er cycle du secondaire · territoire protégé (parc naturel)</span></div>
      <p class="hint">L'expropriation de 1970 et Gespe'gewa'gi : hors savoirs prescrits, ils enrichissent les compétences 2 et 3.</p>
      ${tableauArrimage(c)}
    </section>
    <div class="etapes-p">
      <article class="etape-p"><header><span class="etape-n">0</span><div><h3>Mise en route</h3>
        <span class="hint">${c.miseEnRoute.min} min · par l'enseignant·e</span></div></header>
        <div class="etape-g"><div><ul>${c.miseEnRoute.etapes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="etape-c"><p class="sur">À observer</p><ul class="obs"><li><span class="case" aria-hidden="true"></span>
          Chaque équipe a-t-elle rejoint la séance avant la fin de la mise en route ?</li></ul></div></div></article>
      ${c.etapes.filter((x) => x.id !== 'avis' || mesure).map((x) => {
        const n = c.notes[x.id], pr = c.programme[x.id];
        return `<article class="etape-p"><header><span class="etape-n">${x.n}</span>
          <div><h3>${esc(x.t)}</h3><span class="hint">${x.min} min${x.id === 'avis' ? " · hors du temps de la séance, séances d'essai seulement" : ''}</span></div></header>
          <div class="etape-g"><div>
            <p class="sur">Intention</p><p class="p-t">${esc(n.t)}</p><p>${esc(n.p)}</p>
            ${n.l.length ? `<ul>${n.l.map((y) => `<li>${y}</li>`).join('')}</ul>` : ''}
            ${posees(x.id).length ? `<p class="sur" style="margin-top:12px">Questions posées</p><ul>${posees(x.id).map((q) =>
              `<li><span class="qid">${esc(qid(q))}</span> ${esc(q.eleve)}</li>`).join('')}</ul>` : ''}
          </div><div class="etape-c">
            ${pr ? `<p class="sur">Au programme</p><p class="p-t">${esc(pr.c)}</p>
              <p class="mots">${pr.m.map((y) => `<span class="badge">${esc(y)}</span>`).join('')}</p>` : ''}
            <p class="sur" style="margin-top:14px">À observer</p>
            <ul class="obs">${(c.observer[x.id] || []).map((y) => `<li><span class="case" aria-hidden="true"></span>${esc(y)}</li>`).join('')}</ul>
            ${x.id === 'debrief' ? `<p class="sur" style="margin-top:14px">Ce qu'on vise à faire apprendre</p>
              <ul>${c.visees.map((y) => `<li>${y}</li>`).join('')}</ul>` : ''}
          </div></div></article>`;
      }).join('')}
    </div>`;
}
