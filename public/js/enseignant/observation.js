// enseignant/observation.js — ce que l'enseignant·e voit et fait pendant la séance, pour la recherche : la grille
// d'observation (cochée à la main, par équipe), le détail d'une équipe ouvert, les messages à la classe, les retours.
//
// Gardé dans CE navigateur seulement (localStorage), séance par séance : rien ne part dans la base, aucune équipe ne
// le lit. Effacer la séance l'efface aussi. Un autre ordinateur repart d'une grille vide.

import * as J from '../jeu.js';
import { RETOURS, cleObservation } from '../seance.js';
import { etat } from './etat.js';

/** La grille : quatre cases par équipe, cochées quand on l'a vu (une case vide : pas vu, pas « non »). */
export const GRILLE = [
  ['participe', 'Tout le monde participe'],
  ['discute', 'L\'équipe discute avant de choisir'],
  ['voix', 'Quelqu\'un lit à voix haute'],
  ['main', 'L\'ordinateur change de main']
];

const cle = cleObservation;
const memoire = {};   // le stockage peut être bloqué : la page garde tout en mémoire
const vide = () => ({ grille: {}, details: {}, messages: 0 });

export function lire(code = etat.code) {
  if (!code) return vide();
  try {
    const o = JSON.parse(localStorage.getItem(cle(code)) || 'null');
    if (o) return { grille: o.grille || {}, details: o.details || {}, messages: Number(o.messages) || 0 };
  } catch { /* vide */ }
  return memoire[code] || vide();
}
function garder(code, o) {
  memoire[code] = o;
  try { localStorage.setItem(cle(code), JSON.stringify(o)); } catch { /* cette page seulement */ }
}
function changer(code, f) { if (!code) return; const o = lire(code); f(o); garder(code, o); }

export const cocher = (code, equipe, k, oui) => changer(code, (o) => {
  if (!GRILLE.some(([x]) => x === k)) return;
  o.grille[equipe] = { ...(o.grille[equipe] || {}), [k]: !!oui };
});
export const compterDetail = (code, equipe) => changer(code, (o) => { o.details[equipe] = (o.details[equipe] || 0) + 1; });
export const compterMessage = (code) => changer(code, (o) => { o.messages += 1; });
export function oublier(code) { delete memoire[code]; try { localStorage.removeItem(cle(code)); } catch { /* vide */ } }

/** Les retours donnés à une équipe (bravos et pistes), d'après la séance. */
export const retoursDonnes = (S, equipe) => Object.values(S?.bravos?.[equipe] || {})
  .filter((v) => v && (typeof v !== 'object' || Object.hasOwn(RETOURS, v.k))).length;

/** Les lignes de l'enseignant·e, à la suite des indicateurs de l'équipe (même forme : groupe, indicateur, valeur). */
export function lignesEnseignant(e) {
  const o = lire(), g = o.grille[e.id];
  return [
    ...GRILLE.map(([k, t]) => ({ g: 'Collaboration (observée)', k: t, v: g ? (g[k] ? 'oui' : '') : '', ok: g?.[k] ? true : null })),
    { g: 'Relances', k: 'Détail de l\'équipe ouvert', v: String(o.details[e.id] || 0) },
    { g: 'Relances', k: 'Retours donnés (bravos et pistes)', v: String(retoursDonnes(etat.S, e.id)) }
  ];
}

/** Tous les indicateurs d'une équipe : ceux du jeu, puis ceux de l'enseignant·e. */
export const indicateursEquipe = (e) => [...J.indicateurs(etat.c, e), ...lignesEnseignant(e)];
