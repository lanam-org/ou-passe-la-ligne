// eleve/annonces.js — ce qui arrive sans que l'équipe le demande : un geste reconnu,
// le « bravo » de l'enseignant·e, son message à la classe, et ce que lit le lecteur d'écran.

import { $, esc } from '../outils.js';
import * as J from '../jeu.js';
import { texteSignal, cleBravo, retourDe, RETOURS } from '../seance.js';
import { etat, ui, page, idx } from './etat.js';
import { confettis } from './anime.js';

const CLE_SIGNAL = 'forillon:signal-lu';
const CLE_BRAVO = 'forillon:bravo-vu';   // le dernier « bravo » de l'enseignant·e déjà fêté sur cet appareil

/** Un message fermé (« Compris ») ne revient pas, même après un rafraîchissement. */
export const signalLu = (t) => { ui.signalFerme = t; try { localStorage.setItem(`${CLE_SIGNAL}:${etat.E?.appareil}`, String(t)); } catch { /* vide */ } };

/** Au démarrage d'une équipe : le dernier message fermé et le dernier « bravo » fêté, sur cet appareil. */
export function relireAnnonces() {
  try { ui.signalFerme = Number(localStorage.getItem(`${CLE_SIGNAL}:${etat.E.appareil}`) || 0); } catch { /* vide */ }
  try { ui.bravoVu = Number(localStorage.getItem(`${CLE_BRAVO}:${etat.E.appareil}`) || 0); } catch { /* vide */ }
}

/**
 * Ce qui vient d'arriver, dit aux lecteurs d'écran : le carnet se redessine à chaque geste, ses
 * nouveautés ne seraient pas annoncées. Une zone #annonce, toujours là, les lit (WCAG 4.1.3).
 */
export const sansBalises = (t) => String(t || '').replace(/<[^>]+>/g, '');
export function dire(texte) {
  const z = $('#annonce');
  if (!z) return;
  z.textContent = '';
  setTimeout(() => { z.textContent = texte; }, 60);   // vidée puis remplie : la même phrase se relit
}
export function direEffet(effet) {
  const nz = (z) => J.nomZone(etat.c, z);
  const n = (k, un, plus) => (k ? `${k > 0 ? plus : 'moins'} ${Math.abs(k)} ${un}` : '');
  dire([`${effet.secteur} : ${nz(effet.de)}, devient ${nz(effet.a)}.`,
    n(effet.dans, 'secteur protégé', 'plus'), n(effet.vides, 'village à vider', 'plus'), n(effet.gardes, 'village gardé', 'plus'),
    effet.corridorChange ? `Corridor ${effet.corridor}.` : ''].filter(Boolean).join(' '));
}

/* ------------------------------------------------------------ les « bravos » */

let minuterieBravo = null;
const FERMER_BRAVO = '<button type="button" class="bravo-x" data-fermer-bravo aria-label="Fermer">×</button>';
export function fermerBravo() { clearTimeout(minuterieBravo); const z = $('#bravo'); if (z) z.innerHTML = ''; }

/** Un retour de l'enseignant·e (« bravo » ou retour précis) : plus long à l'écran qu'un geste reconnu ; il nomme la question. */
function annoncerBravoEnseignant(items) {
  const z = $('#bravo');
  if (!z) return;
  const fete = items.some((x) => RETOURS[x.k].positif), piste = items.some((x) => !RETOURS[x.k].positif);
  z.innerHTML = `<div class="bravo bravo--ens">${FERMER_BRAVO}<p class="bravo-sur">${piste ? 'De votre enseignant·e'
    : '<span aria-hidden="true">✦</span> Bravo de votre enseignant·e'}</p>${items.map((x) => `<p class="bravo-l"><span class="bravo-i" aria-hidden="true">${RETOURS[x.k].s}</span>
      <span><b>${esc(RETOURS[x.k].long)}</b><br>Votre réponse à « ${esc(x.q.eleve)} »</span></p>`).join('')}</div>`;
  clearTimeout(minuterieBravo);
  // une piste invite à reprendre la réponse : elle reste jusqu'à « Fermer »
  if (!piste) minuterieBravo = setTimeout(() => { z.innerHTML = ''; }, 7500);
  if (fete) confettis(70);
}

/** Les gestes reconnus pendant la partie : un « Bravo » court, sans score. */
export function annoncer(ids) {
  const z = $('#bravo');
  if (!z || !ids.length) return;
  z.innerHTML = `<div class="bravo">${FERMER_BRAVO}<p class="bravo-sur">Bravo</p>${ids.map((id) => `<p class="bravo-l">
    <span class="bravo-i" aria-hidden="true">✦</span><span><b>${esc(etat.c.mentions[id].nom)}</b><br>${esc(etat.c.mentions[id].court)}</span></p>`).join('')}</div>`;
  clearTimeout(minuterieBravo);
  minuterieBravo = setTimeout(() => { z.innerHTML = ''; }, 4600);
  confettis(40);
}

/** Un « bravo » vient d'arriver : on le fête une fois, quelle que soit l'étape où l'équipe se trouve. */
export function bravosRecus() {
  const { S, idEq, E, c } = etat;
  const mes = S?.bravos?.[idEq] || {};
  const quand = (v) => (typeof v === 'number' ? v : v?.t || 0);   // une date seule (séances d'avant), ou { k, t }
  const neufs = Object.entries(mes).filter(([, v]) => quand(v) > ui.bravoVu);
  if (!neufs.length) return;
  ui.bravoVu = Math.max(...neufs.map(([, v]) => quand(v)));
  try { localStorage.setItem(`${CLE_BRAVO}:${E.appareil}`, String(ui.bravoVu)); } catch { /* vide */ }
  const items = neufs.map(([k]) => (c.q?.ecrites || []).find((q) => cleBravo(q.id) === k)).filter(Boolean)
    .map((q) => ({ q, k: retourDe(S, idEq, q.id)?.k })).filter((x) => x.k);
  if (items.length) annoncerBravoEnseignant(items);
}

/* ------------------------------------------------------------ le message de l'enseignant·e */

export function rendreSignal() {
  const { S, E, c } = etat;
  const z = $('#signal');
  if (!z) return;
  if (S === null || S?.etat === 'fermee') {
    z.hidden = false;
    z.innerHTML = `<p><b>La séance est terminée.</b> Votre enseignant·e l'a fermée.</p>`;
    document.body.classList.add('avec-signal');
    return;
  }
  const sg = S?.signal;
  if (!sg || sg.t <= ui.signalFerme || !texteSignal(sg) || (E && sg.t < E.creeLe - 60000)) {
    z.hidden = true; z.innerHTML = ''; document.body.classList.remove('avec-signal'); return;
  }
  document.body.classList.add('avec-signal');
  const versDebrief = sg.type === 'debrief' && E && E.etape < idx('debrief');
  z.hidden = false;
  z.innerHTML = `<p><span class="sur">Message de votre enseignant·e</span> ${esc(texteSignal(sg))}</p>
    <div class="signal-a">${versDebrief ? `<button class="btn" data-vers-debrief="1">Y aller : ${esc(c.etapes[idx('debrief')].t.toLowerCase())} →</button>` : ''}
    <button class="btn btn--f" data-fermer-signal="${Number(sg.t) || 0}">Compris</button></div>`;
  if (E) page.majPied();
}
