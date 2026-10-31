// enseignant/pfeq.js — le lien avec le programme : géographie du 1er cycle du secondaire (PFEQ), territoire protégé.
//
// Les trois compétences, les quatre énoncés de savoirs du parc naturel, et ce que chaque étape du jeu fait travailler.
// Source : Progression des apprentissages au secondaire, géographie (ministère de l'Éducation, 2010), p. 26-27 ;
// Forillon y est cité en exemple (localisation, activités permises). L'expropriation de 1970 et Gespe'gewa'gi ne
// sont pas des savoirs prescrits : ils enrichissent les compétences 2 et 3.

import { esc } from '../outils.js';

export const COMPETENCES = [
  ['cd1', "Lire l'organisation d'un territoire"],
  ['cd2', 'Interpréter un enjeu territorial'],
  ['cd3', "Construire sa conscience citoyenne à l'échelle planétaire"]
];
export const ENONCES = [[1, 'Localisation'], [2, 'Caractéristiques'], [3, 'Aménagement (zonage)'], [4, 'Enjeux']];
const ARRIMAGE = {
  arrivee: { cd: ['cd1'], en: [1] },
  marche: { cd: ['cd1'], en: [2] },
  dossier: { cd: ['cd2'], en: [2, 4] },
  trace: { cd: ['cd1', 'cd2'], en: [3, 4] },
  comp: { cd: ['cd2', 'cd3'], en: [4] },
  bilan: { cd: ['cd2'], en: [2, 3] },
  debrief: { cd: ['cd3'], en: [4] }
};

/** Le tableau étapes × compétences et énoncés (onglet Déroulement, rapport imprimé). */
export function tableauArrimage(c) {
  const etapes = c.etapes.filter((x) => ARRIMAGE[x.id]);
  const point = (oui) => (oui ? '<span aria-label="oui">●</span>' : '<span class="cache-visuel">non</span>');
  return `<div class="tab-w"><table class="tab arrimage">
    <thead><tr><th scope="col">Étape</th>${COMPETENCES.map(([id, t], i) => `<th scope="col" title="${esc(t)}">Compétence ${i + 1}</th>`).join('')}
      <th scope="col">Énoncés</th></tr></thead>
    <tbody>${etapes.map((x) => `<tr><th scope="row">${esc(x.n)}. ${esc(x.t)}</th>${COMPETENCES.map(([id]) =>
      `<td class="t-c">${point(ARRIMAGE[x.id].cd.includes(id))}</td>`).join('')}
      <td>${ARRIMAGE[x.id].en.join(', ')}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint">Compétences : ${COMPETENCES.map(([, t], i) => `${i + 1}. ${esc(t)}`).join(' · ')}.
      Énoncés du parc naturel : ${ENONCES.map(([n, t]) => `${n}. ${esc(t)}`).join(' · ')}.</p>`;
}

/** Une grille facultative, par équipe, pour l'évaluation : chaque compétence observée, en partie, ou pas observée. */
export const grilleCompetences = () => `<table class="r-cd"><thead><tr><th>Compétence (facultatif)</th><th>Observée</th><th>En partie</th>
  <th>Pas observée</th></tr></thead><tbody>${COMPETENCES.map(([, t], i) => `<tr><td>${i + 1}. ${esc(t)}</td>
  <td class="t-c">☐</td><td class="t-c">☐</td><td class="t-c">☐</td></tr>`).join('')}</tbody></table>`;
