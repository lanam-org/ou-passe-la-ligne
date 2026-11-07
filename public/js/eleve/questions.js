// eleve/questions.js — les questions écrites en équipe : la case, le compteur, le « bravo »
// de l'enseignant·e, ce qui manque encore, et « À rattraper ».

import { esc } from '../outils.js';
import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { aUnBravo, retourDe, RETOURS, texteRetour } from '../seance.js';
import { etat } from './etat.js';

export const MAX_REPONSE = 400;   // deux ou trois phrases ; le compteur sous la case le montre
export const PAS_FINI = 'Répondez à la question avant de continuer.';

/**
 * Où chercher la réponse : le relevé, le point de vue ou le document qui sert à cette question (son champ `sert`
 * dans le contenu). Un relevé ou un point de vue déjà vus se rouvrent d'un clic.
 */
function ouChercher(q) {
  const { c, E } = etat;
  const ici = c.etapes[E.etape]?.id;
  const l = [];
  c.releves.forEach((r, i) => { if ((r.sert || []).includes(q.id) && E.releves.includes(i)) l.push(ici === 'marche'
    ? `<button type="button" class="lien lien-ou" data-releve="${i}">relevé ${i + 1}, « ${esc(r.t)} »</button>` : `relevé ${i + 1}, « ${esc(r.t)} »`); });
  c.complications.forEach((x, i) => { if ((x.sert || []).includes(q.id) && i < E.comps) l.push(ici === 'comp'
    ? `<button type="button" class="lien lien-ou" data-pov="${i}">point de vue ${i + 1}, « ${esc(x.t)} »</button>` : `point de vue ${i + 1}, « ${esc(x.t)} »`); });
  if (q.etape === 'dossier') c.documents.forEach((d) => { if ((d.sert || []).includes(q.id)) l.push(`le document « ${esc(d.t)} »`); });
  return l.length ? `<p class="qe-ou">Où chercher : ${l.join(' · ')}</p>` : '';
}

/** Une question écrite : la question, ce qu'on attend, où chercher, la case. `court` : dans la colonne de droite. */
export function blocQuestion(q, { court = false } = {}) {
  const { E, S, idEq } = etat;
  const bravo = aUnBravo(S, idEq, q.id), ret = retourDe(S, idEq, q.id);
  return `<div class="qe${bravo ? ' qe--bravo' : ''}${court ? ' qe--court' : ''}">
    <label class="qe-l" for="r-${esc(q.id)}"><span class="sur">Question pour l'équipe${q.requise ? '' : ' · facultative'}</span>${esc(q.eleve)}</label>
    ${q.attendu ? `<p class="qe-att"><span>Ce qu'on attend :</span> ${esc(q.attendu)}</p>` : ''}
    ${ouChercher(q)}
    <textarea id="r-${esc(q.id)}" data-rep="${esc(q.id)}" rows="${court ? 3 : 2}" maxlength="${MAX_REPONSE}"
      placeholder="Une ou deux phrases, écrites ensemble.">${esc(E.reponses?.[q.id] || '')}</textarea>
    <p class="qe-compte" data-compte="${esc(q.id)}" aria-hidden="true">${String(E.reponses?.[q.id] || '').length} / ${MAX_REPONSE}</p>
    ${ret ? `<p class="qe-bravo${bravo ? '' : ' qe-bravo--piste'}"><span aria-hidden="true">${RETOURS[ret.k].s}</span>
      ${esc(texteRetour(ret.k))}.</p>` : ''}
  </div>`;
}

/** Les questions qui ont reçu un « bravo » de l'enseignant·e (écrites dans cette séance). */
export const questionsBravo = () => (etat.c.q?.ecrites || []).filter((q) => aUnBravo(etat.S, etat.idEq, q.id));

/** Les questions écrites de l'étape que l'équipe peut déjà voir. */
export const blocQuestions = (etapeId, filtre = () => true, o = {}) =>
  Rg.questionsVisibles(etat.c, etat.E, etapeId).filter(filtre).map((q) => blocQuestion(q, o)).join('');
/** Toutes les questions requises visibles de l'étape ont une réponse. */
export const ok = (etapeId) => Rg.requisesOK(etat.c, etat.E, etapeId);
export const R = (id) => J.repondu(etat.E, id);

/** Les questions requises d'une étape déjà passée, restées sans réponse. */
export function rattrapage() {
  const qs = Rg.aRattraper(etat.c, etat.E);
  if (!qs.length) return '';
  return `<div class="rattrapage"><p class="sur">À rattraper</p>
    <p class="hint">${qs.length > 1 ? 'Ces questions d\'une étape précédente attendent' : 'Cette question d\'une étape précédente attend'} votre réponse.</p>
    ${qs.map((q) => blocQuestion(q)).join('')}</div>`;
}

/** La première réponse requise encore vide : « À rattraper » d'abord, puis l'étape en cours. */
export function reponseManquante() {
  const { c, E } = etat;
  const ici = c.etapes[E.etape].id;
  // au retour sur la démarche, les deux questions du début (avant / après) passent avant celles de l'étape
  const apres = ici === 'debrief' && J.apresDemande(c, E) ? J.questionsAvantApres(c).map((q, i) => ({ id: J.idApres(i), requise: true })) : [];
  return [...Rg.aRattraper(c, E), ...apres, ...Rg.questionsVisibles(c, E, ici)].find((q) => q.requise && !R(q.id));
}
