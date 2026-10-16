// outils.js — petites fonctions partagées par les pages.

import * as config from './config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Espaces insécables du français : avant : ; ? ! », après «.
 *  Seul le texte entre les balises est retouché : jamais le texte des élèves
 *  (dans <textarea>), ni une valeur de champ (value="…"), ni un attribut. */
export const typo = (html) => String(html).split(/(<textarea[\s\S]*?<\/textarea>|<[^>]*>)/).map((morceau, i) =>
  i % 2 ? morceau : morceau.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0')).join('');

export const nb = (n) => Number(n).toLocaleString('fr-CA');
// une page pour une classe au Québec n'écrit pas « 3.5 »
export const dec = (n, d = 1) => Number(n).toLocaleString('fr-CA',
  { minimumFractionDigits: d, maximumFractionDigits: d });

export const secondes = (ms) => Math.max(0, Math.round((ms || 0) / 1000));
export const mmss = (ms) => {
  const s = secondes(ms);
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
};

let cache = null;
/** Le contenu du jeu : tout ce qui est texte, chiffre ou source vit dans ce JSON. */
export async function chargerContenu() {
  if (cache) return cache;
  const r = await fetch('contenu/forillon.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Contenu introuvable (contenu/forillon.json)');
  cache = await r.json();
  return cache;
}

export function telecharger(nom, contenu, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exécute `f` au plus une fois par `ms`, avec la dernière valeur. */
export function retarder(f, ms) {
  let minuterie = null, args = null;
  const g = (...a) => {
    args = a;
    clearTimeout(minuterie);
    minuterie = setTimeout(() => { minuterie = null; f(...args); }, ms);
  };
  g.maintenant = () => { if (minuterie) { clearTimeout(minuterie); minuterie = null; return f(...args); } };
  return g;
}

/** Vrai si les dessins sont affichés ; faux : des cadres vides « Image à venir » (config.js). */
export const IMAGES = config.images === true;

/** Le personnage de la garde-parc (fictif), en SVG. */
const DESSIN_GARDE = `<svg viewBox="0 0 52 52" aria-hidden="true">
  <circle cx="26" cy="26" r="25" fill="#DCE8F1"/>
  <path d="M26 14c-6 0-9 4-9 9v4h18v-4c0-5-3-9-9-9z" fill="#3E5A4A"/>
  <circle cx="26" cy="27" r="7.5" fill="#E8C9A0"/>
  <path d="M14 24h24l-2-4H16z" fill="#1F5A3D"/>
  <path d="M26 16c7 0 12 3 12 5H14c0-2 5-5 12-5z" fill="#1F5A3D"/>
  <circle cx="23" cy="27" r="1.2" fill="#1B2A33"/><circle cx="29" cy="27" r="1.2" fill="#1B2A33"/>
  <path d="M23 31c2 1.6 4 1.6 6 0" stroke="#1B2A33" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M16 52c0-7 4.5-11 10-11s10 4 10 11z" fill="#3E5A4A"/></svg>`;

/** Un cadre vide, à la place d'une image dont on discutera. */
export const imageVide = (quoi, o = {}) => `<span class="image-vide${o.rond ? ' image-vide--rond' : ''}" role="img"
  aria-label="Image à venir : ${esc(quoi)}" title="Image à venir : ${esc(quoi)}">${o.court ? '' : `<span>Image à venir</span>`}</span>`;

// Sans images, pas de cadre vide à côté de la garde-parc : son nom suffit, la bulle prend la place.
export const GARDE = IMAGES ? DESSIN_GARDE : '';
