// enseignant/etat.js — ce que partagent les écrans de l'espace enseignant·e.
//
// Une seule source de vérité, l'objet `etat` : enseignant.js le modifie (une
// séance s'ouvre, une équipe avance, les réglages changent) ; les écrans
// (direct.js, debrief.js…) le lisent et rendent du HTML, sans rien écrire.

import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { chargerContenu } from '../outils.js';

/** Le contenu d'origine. */
export const base = await chargerContenu();

export const etat = {
  code: null,        // la séance ouverte ; null : l'accueil « Tes séances »
  S: null,           // son document : réglages, chrono, message, bravos
  EQ: [], AV: [],    // ses équipes et ses avis, en direct
  MOI: null,         // l'identité de l'enseignant·e
  choisie: null,     // l'équipe dont on lit le détail
  onglet: 'direct',
  // le contenu réglé pour la séance (voir appliquerReglages)
  c: null, B: {}, ecrites: [], etapesJeu: []
};

/** Ce qui ne vit qu'à l'écran : sections ouvertes, confirmations en attente, l'éditeur de réglages. */
export const ui = { cacheAttendu: false, effacer: false, projection: false, ouverts: new Set(), effacerListe: null,
  effacerVersion: false, maVersion: null, ed: null, chronoLance: '', pastilles: true, confirmeOnglet: null };

/**
 * Redessiner l'écran, ouvrir une séance, revenir à l'accueil : enseignant.js
 * branche ces trois gestes au démarrage. Un écran les appelle sans dépendre de lui.
 */
export const page = { rendre: (force) => {}, ouvrir: (code) => {}, accueil: (erreur) => {} };

let empreinte = '';
/** Recalcule le contenu de la séance quand ses réglages changent. Vrai si quelque chose a changé. */
export function appliquerReglages(config) {
  const k = JSON.stringify(config || null);
  if (etat.c && k === empreinte) return false;
  empreinte = k;
  const c = Rg.appliquer(base, config || null);
  etat.c = c;
  etat.B = Object.fromEntries(c.banque.map((q) => [q.id, q]));
  etat.ecrites = J.questionsEcrites(c);
  etat.etapesJeu = c.etapes.filter((x) => x.id !== 'avis');
  return true;
}
appliquerReglages(null);

/** La séance ouverte reste ouverte après un rafraîchissement (dans ce navigateur seulement). */
const CLE = 'forillon:seance-prof';
export const seanceGardee = {
  lire: () => { try { return localStorage.getItem(CLE); } catch { return null; } },
  garder: (code) => { try { localStorage.setItem(CLE, code); } catch { /* vide */ } },
  oublier: () => { try { localStorage.removeItem(CLE); } catch { /* vide */ } }
};

/* ------------------------------------------------------------ petits outils communs */

export const qid = (q) => (q.ajout ? 'ajout' : q.id);

/** Comparer deux réglages sans dépendre de l'ordre des clés (Firestore les renvoie triées). */
export const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v));

export const etapeDe = (e) => etat.c.etapes[e.etape] || etat.c.etapes[0];

/** Le chrono de la classe (une ancienne séance sans chrono compte depuis sa création). */
export const chronoDe = () => etat.S?.chrono || { debut: etat.S?.creeLe || null, pause: null, pauses: [] };

/** Le temps écoulé, en minutes et secondes (« 12:05 ») : on le voit avancer dès la première seconde. */
export const chronoTexte = (ch) => {
  const s = ch.debut ? Math.floor(Rg.ecoule(ch) / 1000) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Les réponses à des questions qui ne sont plus posées (retirées en cours de séance) : rien ne se perd. */
export function autresReponses(e) {
  const posees = new Set(etat.ecrites.map((q) => q.id));
  return Object.entries(e.reponses || {}).filter(([id, r]) => !posees.has(id) && String(r || '').trim())
    .map(([id, r]) => ({ id, k: 'question retirée depuis', t: etat.B[id]?.eleve || 'Question ajoutée puis retirée', r: String(r).trim() }));
}
