// enseignant/preparer.js — les onglets « Questions », « Dossier » et « Déroulement » :
// ce que l'enseignant·e lit pour préparer la séance. Rien de ceci n'apparaît chez les élèves.
// (L'onglet « Réglages » a son propre fichier : editeur.js.)

import { mesure } from '../config.js';
import { esc } from '../outils.js';
import * as Rg from '../reglages.js';
import { dossierHTML } from '../dossierdoc.js';
import { etat, ui, qid } from './etat.js';

/* ------------------------------------------------------------ questions */

/** Où en est une question de la banque dans cette séance : [libellé, classe du badge]. */
function etatQuestion(q) {
  const m = Rg.modeQuestion(q), v = etat.c.reglages.questions[q.id];
  if (m === 'geste') return ['geste dans le jeu', 'posee'];
  if (m === 'enseignant') return ['par toi, à la mise en route', 'ecran'];
  if (m === 'orale') return v === 'on' ? ['orale, en classe', 'posee'] : ['pas posée', ''];
  return v === 'requise' ? ['écrite, requise', 'posee'] : v === 'facultative' ? ['écrite, facultative', 'reprise'] : ['pas posée', ''];
}

export function vueQuestions() {
  const { c } = etat;
  const item = (q, [txt, cls]) => `<article class="bq">
    <div class="bq-h"><span class="qid">${esc(qid(q))}</span><span class="bq-q">${esc(q.eleve || q.q)}</span>
      <span class="badge${cls ? ` badge--${cls}` : ''}">${esc(txt)}</span></div>
    ${q.reponse ? `<p class="bq-r"><span class="sur">Réponse attendue</span><br>${esc(q.reponse)}</p>` : ''}
    <p class="bq-s">${q.note ? esc(q.note) + ' · ' : ''}${esc((q.sources || []).join(' · '))}</p></article>`;
  const ajouts = [...c.q.ecrites, ...c.q.orales].filter((q) => q.ajout);
  const etatAjout = (q) => c.q.orales.includes(q) ? ['ajoutée · orale', 'posee'] : [`ajoutée · ${q.requise ? 'requise' : 'facultative'}`, q.requise ? 'posee' : 'reprise'];
  const pasPosees = c.banque.filter((q) => etatQuestion(q)[0] === 'pas posée');
  const nReq = c.q.ecrites.filter((q) => q.requise).length;
  return `<div class="p-tete"><h2>Les questions</h2>
      <p>Dans cette séance (${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}) : ${c.q.ecrites.length} questions écrites en équipe,
        dont ${nReq} requises, et ${c.q.orales.length} à l'oral au débrief. Les autres restent dans la banque, pour une reprise.
        Pour en changer, même pendant la séance : l'onglet « Réglages ».</p></div>
    ${c.etapes.filter((x) => x.id !== 'avis').map((x) => {
      const l = c.banque.filter((q) => Rg.etapeQuestion(c, q) === x.id && etatQuestion(q)[0] !== 'pas posée');
      const a = ajouts.filter((q) => (q.etape || 'debrief') === x.id);
      return l.length || a.length ? `<section class="p-sect"><div class="p-sect-h"><h3>Étape ${x.n} · ${esc(x.t)}</h3>
        <span class="hint">${x.min} min</span></div><div class="banque">${l.map((q) => item(q, etatQuestion(q))).join('')}${
          a.map((q) => item(q, etatAjout(q))).join('')}</div></section>` : '';
    }).join('')}
    <section class="p-sect"><div class="p-sect-h"><h3>Pas posées dans cette séance</h3>
      <span class="hint">${pasPosees.length} questions, pour une reprise ou une autre séance</span></div>
      <div class="banque">${pasPosees.map((q) => item(q, etatQuestion(q))).join('')}</div></section>`;
}

/* ------------------------------------------------------------ dossier documentaire */

export function vueDossier() {
  const lien = new URL(`dossier.html?code=${etat.code}`, location.href).href;
  return `<div class="p-tete"><h2>Le dossier documentaire</h2>
      <p>Tout ce que le jeu montre, avec la phrase exacte de chaque source, la date de sa vérification et son lien : si un lien
        meurt, l'information reste dans le site. Les corrections de l'onglet Réglages s'y appliquent.</p>
      <div class="p-actions">
        <button class="btn" data-dossier-imprimer="complet">Imprimer le dossier complet</button>
        <button class="btn btn--f" data-dossier-imprimer="devoir">Imprimer le dossier élève (sans les surprises)</button>
        <label class="case-l dd-opt"><input type="checkbox" id="dd-pastilles" ${ui.pastilles ? 'checked' : ''}><span>Pastilles des questions</span></label>
      </div>
      <p class="hint" style="margin-top:10px">Version devoir : le portrait du territoire et les documents à trier, à lire avant la séance.
        Les points de vue et la décision de 1970 n'y sont pas : ils servent à contredire ce que l'équipe croyait. Avec les pastilles,
        les élèves voient quels documents servent ; le tri en classe devient alors un rappel.</p>
      <p class="code-u" style="margin-top:10px">Version devoir en ligne, pour les élèves : <b id="lien-dossier">${esc(lien)}</b></p>
    </div>
    <section class="p-sect">${dossierHTML(etat.c, { version: 'complet', pastilles: ui.pastilles, enseignant: true })}</section>`;
}

/* ------------------------------------------------------------ déroulement */

export function vueDeroulement() {
  const { c, B, ecrites } = etat;
  const posees = (id) => [...(id === 'dossier' ? [B['F3.1']] : []), ...ecrites.filter((q) => q.etape === id),
    ...(id === 'debrief' ? c.q.orales : [])];
  return `<div class="p-tete"><h2>Déroulement de la séance</h2>
      <p>${c.miseEnRoute.min + Rg.totalPrevu(c)} minutes (${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}) : ${c.miseEnRoute.min} de mise en route, puis sept étapes.
        Ce que vit l'équipe, ce que ça fait travailler, et quoi observer. Rien de ceci n'apparaît chez les élèves.</p>
      ${c.coupure ? `<p class="hint">Deux périodes : coupure conseillée après « ${esc(c.etapes.find((x) => x.id === c.coupure).t)} ».
        À la période suivante, chaque équipe reprend sur le même Chromebook, avec le même code.</p>` : ''}
      <div class="p-actions"><button class="btn btn--f" data-trousse="observation">Imprimer la grille d'observation</button></div></div>
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
