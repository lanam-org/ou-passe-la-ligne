// eleve/questions.js — les questions écrites en équipe : la case, le compteur, le « bravo »
// de l'enseignant·e, ce qui manque encore, et « À rattraper ».

import { esc } from '../outils.js';
import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { aUnBravo, retourDe, RETOURS, texteRetour } from '../seance.js';
import { etat } from './etat.js';

export const MAX_REPONSE = 400;   // deux ou trois phrases ; le compteur sous la case le montre
export const PAS_FINI = 'Répondez à la question avant de continuer.';

function blocQuestion(q) {
  const { E, S, idEq } = etat;
  const bravo = aUnBravo(S, idEq, q.id), ret = retourDe(S, idEq, q.id);
  return `<div class="qe${bravo ? ' qe--bravo' : ''}">
    <label class="qe-l" for="r-${esc(q.id)}"><span class="sur">Question pour l'équipe${q.requise ? '' : ' · facultative'}</span>${esc(q.eleve)}</label>
    <textarea id="r-${esc(q.id)}" data-rep="${esc(q.id)}" rows="2" maxlength="${MAX_REPONSE}"
      placeholder="Une ou deux phrases, écrites ensemble.">${esc(E.reponses?.[q.id] || '')}</textarea>
    <p class="qe-compte" data-compte="${esc(q.id)}" aria-hidden="true">${String(E.reponses?.[q.id] || '').length} / ${MAX_REPONSE}</p>
    ${ret ? `<p class="qe-bravo${bravo ? '' : ' qe-bravo--piste'}"><span aria-hidden="true">${RETOURS[ret.k].s}</span>
      ${esc(texteRetour(ret.k))}.</p>` : ''}
  </div>`;
}

/** Les questions qui ont reçu un « bravo » de l'enseignant·e (écrites dans cette séance). */
export const questionsBravo = () => (etat.c.q?.ecrites || []).filter((q) => aUnBravo(etat.S, etat.idEq, q.id));

/** Les questions écrites de l'étape que l'équipe peut déjà voir. */
export const blocQuestions = (etapeId, filtre = () => true) =>
  Rg.questionsVisibles(etat.c, etat.E, etapeId).filter(filtre).map(blocQuestion).join('');
/** Toutes les questions requises visibles de l'étape ont une réponse. */
export const ok = (etapeId) => Rg.requisesOK(etat.c, etat.E, etapeId);
export const R = (id) => J.repondu(etat.E, id);

/** Les questions requises d'une étape déjà passée, restées sans réponse. */
export function rattrapage() {
  const qs = Rg.aRattraper(etat.c, etat.E);
  if (!qs.length) return '';
  return `<div class="rattrapage"><p class="sur">À rattraper</p>
    <p class="hint">${qs.length > 1 ? 'Ces questions d\'une étape précédente attendent' : 'Cette question d\'une étape précédente attend'} votre réponse.</p>
    ${qs.map(blocQuestion).join('')}</div>`;
}

/** La première réponse requise encore vide : « À rattraper » d'abord, puis l'étape en cours. */
export function reponseManquante() {
  const { c, E } = etat;
  const ici = c.etapes[E.etape].id;
  return [...Rg.aRattraper(c, E), ...Rg.questionsVisibles(c, E, ici)].find((q) => q.requise && !R(q.id));
}
