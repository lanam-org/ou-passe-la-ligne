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

// une page pour une classe au Québec n'écrit pas « 3.5 »
export const dec = (n, d = 1) => Number(n).toLocaleString('fr-CA',
  { minimumFractionDigits: d, maximumFractionDigits: d });

export const secondes = (ms) => Math.max(0, Math.round((ms || 0) / 1000));
export const mmss = (ms) => {
  const s = secondes(ms);
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
};

const lireJSON = async (chemin) => {
  const r = await fetch(chemin, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Contenu introuvable (${chemin})`);
  return r.json();
};

let cache = null;
/**
 * Le contenu du jeu : tout ce qui est texte, chiffre ou source vit dans contenu/forillon.json.
 * Avec `guide`, chaque question de la banque reçoit aussi sa réponse attendue et ses notes
 * (contenu/guide.json) : l'espace enseignant·e seulement. La page des équipes ne télécharge
 * jamais ce fichier, et le service worker ne le garde pas d'avance sur les Chromebooks.
 */
export async function chargerContenu({ guide = false } = {}) {
  cache ||= await lireJSON('contenu/forillon.json');
  if (!guide) return cache;
  let g = null;
  try { g = await lireJSON('contenu/guide.json'); }
  catch (e) { console.warn('Guide de l\'enseignant·e indisponible (hors ligne ?) : le jeu reste complet, sans les réponses attendues', e); }
  return { ...cache, banque: cache.banque.map((q) => ({ ...q, ...g?.banque?.[q.id] })) };
}

/**
 * Un message d'erreur en français pour l'écran. Nos propres erreurs (sans code) sont déjà en
 * français ; celles de Firebase portent un code et un message en anglais : on traduit le code.
 */
export function messageErreur(e, defaut) {
  const code = String(e?.code || '');
  // une erreur de programmation (TypeError…) a un message technique en anglais : jamais à l'écran
  if (!code) return e?.name === 'Error' && e.message ? e.message : defaut;
  if (/permission-denied|insufficient/.test(code)) return 'La base a refusé cette action : la séance est peut-être fermée, ou elle n’est pas à toi.';
  if (/unavailable|network|deadline|offline/.test(code)) return 'Pas de connexion pour le moment. Vérifie le Wi-Fi, puis réessaie.';
  if (/not-found/.test(code)) return 'Cette séance n’existe plus : elle a peut-être été effacée.';
  if (/quota|resource-exhausted|too-many/.test(code)) return 'Trop de demandes en même temps. Attends une minute, puis réessaie.';
  return defaut;
}

/**
 * Les bulles de validation du navigateur (« Please fill out this field ») suivent la langue
 * de l'ordinateur : on les remplace par des phrases en français, partout dans la page.
 */
export function validationEnFrancais() {
  document.addEventListener('invalid', (ev) => {
    const c = ev.target, v = c.validity;
    if (!c.setCustomValidity || !v) return;
    c.setCustomValidity(v.valueMissing ? (c.type === 'radio' || c.type === 'checkbox' ? 'Choisissez une option.' : 'Ce champ est à remplir.')
      : v.rangeUnderflow ? `Au moins ${c.min}.` : v.rangeOverflow ? `Au plus ${c.max}.`
        : v.badInput || v.stepMismatch ? 'Entrez un nombre entier.' : v.tooLong ? `${c.maxLength} caractères au plus.`
          : v.typeMismatch || v.patternMismatch ? 'Ce format n’est pas reconnu.' : '');
  }, true);
  // la correction efface le message : il ne doit pas bloquer l'envoi suivant
  const effacer = (ev) => {
    const c = ev.target;
    if (!c.setCustomValidity) return;
    // un groupe de boutons radio : le message vit sur le premier, effacer tout le groupe
    const groupe = c.type === 'radio' && c.form ? [...c.form.elements].filter((x) => x.name === c.name) : [c];
    groupe.forEach((x) => x.setCustomValidity(''));
  };
  document.addEventListener('input', effacer, true);
  document.addEventListener('change', effacer, true);
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

/**
 * Vrai si les dessins sont affichés ; faux : la carte devient des boutons dans un cadre « Carte à venir »,
 * et l'image temporaire marque la place des images (config.js).
 */
export const IMAGES = config.images === true;

/**
 * L'image temporaire, toujours la même, là où une image est prévue (la carte, la garde-parc) :
 * mise à l'échelle de sa place, jamais rognée ni déformée. À remplacer par les vraies images.
 */
export const IMAGE_TEMPORAIRE = 'images/temporaire.png';

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

// Sans images : l'image temporaire à la place du portrait (taille dans site.css, .garde-temp).
export const GARDE = IMAGES ? DESSIN_GARDE
  : `<img class="garde-temp" src="${IMAGE_TEMPORAIRE}" alt="" width="126" height="72">`;
