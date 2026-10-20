// local.js — l'adaptateur local (repris de l'application du Conseil).
//
// Il imite le peu de Firestore dont le site a besoin, sans compte ni
// installation :
//   · l'état partagé vit dans localStorage : tous les onglets du même
//     navigateur voient la même séance ;
//   · BroadcastChannel prévient les autres onglets à chaque écriture, ce qui
//     reproduit le temps réel de Firestore ;
//   · l'identité vit dans sessionStorage, PROPRE À CHAQUE ONGLET : un onglet
//     enseignant·e et trois onglets d'équipe, c'est une classe de démonstration.
//
// Il est STRICT comme Firestore : une mise à jour sur un document absent
// échoue. Un double plus permissif laisserait passer en local un bogue qui ne
// se verrait qu'en ligne, le jour de la séance.

// Chaque version du site (/playtest-1/, /dev/) garde ses propres séances de démonstration : deux versions ouvertes dans
// le même navigateur ne se mélangent pas. L'adresse principale garde le nom d'origine : rien ne se perd.
const dossierVersion = (location.pathname.match(/\/(dev|playtest-\d+)\/[^/]*$/) || [])[1];
const CLE = dossierVersion ? `forillon:base:${dossierVersion}` : 'forillon:base';
const canal = 'BroadcastChannel' in window ? new BroadcastChannel(dossierVersion ? `forillon:${dossierVersion}` : 'forillon') : null;
const abonnes = new Map(); // chemin -> Set de fonctions

function base() {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}'); } catch { return {}; }
}
function ecrireBase(b) {
  try { localStorage.setItem(CLE, JSON.stringify(b)); } catch (e) { console.warn('Stockage local indisponible', e); }
}
function prevenir(chemin) {
  const set = abonnes.get(chemin);
  if (set) { const d = lire(chemin); set.forEach((f) => f(d)); }
  const parent = chemin.split('/').slice(0, -1).join('/');
  const setC = abonnes.get('col:' + parent);
  if (setC) { const l = lireCollection(parent); setC.forEach((f) => f(l)); }
}
if (canal) canal.onmessage = (e) => prevenir(e.data);
window.addEventListener('storage', (e) => {
  if (e.key === CLE) abonnes.forEach((set, cle) => {
    if (cle.startsWith('col:')) { const l = lireCollection(cle.slice(4)); set.forEach((f) => f(l)); }
    else { const d = lire(cle); set.forEach((f) => f(d)); }
  });
});

const copie = (o) => JSON.parse(JSON.stringify(o));

export function lire(chemin) {
  const d = base()[chemin];
  return d ? copie(d) : null;
}

export function lireCollection(chemin) {
  const b = base(), sortie = [], prefixe = chemin + '/';
  for (const cle of Object.keys(b)) {
    if (!cle.startsWith(prefixe) || cle.slice(prefixe.length).includes('/')) continue;
    sortie.push({ id: cle.slice(prefixe.length), ...copie(b[cle]) });
  }
  return sortie.sort((a, c) => a.id.localeCompare(c.id));
}

function annoncer(chemin) { prevenir(chemin); if (canal) canal.postMessage(chemin); }

// Comme setDoc(…, { merge: true }) dans Firestore : la fusion se fait en
// profondeur (une clé absente d'une sous-table est gardée). Pour remplacer une
// sous-table entière, passer par majPartielle.
function fusionner(cible, ajout) {
  const sortie = { ...(cible || {}) };
  for (const [k, v] of Object.entries(ajout)) {
    const objet = (x) => x && typeof x === 'object' && !Array.isArray(x);
    sortie[k] = objet(v) && objet(sortie[k]) ? fusionner(sortie[k], v) : v;
  }
  return sortie;
}

export async function ecrire(chemin, donnees) {
  const b = base();
  b[chemin] = fusionner(b[chemin], copie(donnees));
  ecrireBase(b);
  annoncer(chemin);
}

export async function majPartielle(chemin, champs) {
  const b = base();
  if (!b[chemin]) {
    const e = new Error(`No document to update: ${chemin}`);
    e.code = 'not-found';
    throw e;
  }
  for (const [cle, valeur] of Object.entries(copie(champs))) {
    const morceaux = cle.split('.');
    let noeud = b[chemin];
    while (morceaux.length > 1) {
      const m = morceaux.shift();
      if (typeof noeud[m] !== 'object' || noeud[m] === null) noeud[m] = {};
      noeud = noeud[m];
    }
    noeud[morceaux[0]] = valeur;
  }
  ecrireBase(b);
  annoncer(chemin);
}

export async function supprimer(chemin) {
  const b = base();
  delete b[chemin];
  ecrireBase(b);
  annoncer(chemin);
}

export function ecouter(chemin, rappel) {
  if (!abonnes.has(chemin)) abonnes.set(chemin, new Set());
  abonnes.get(chemin).add(rappel);
  rappel(lire(chemin));
  return () => abonnes.get(chemin).delete(rappel);
}

export function ecouterCollection(chemin, rappel) {
  const cle = 'col:' + chemin;
  if (!abonnes.has(cle)) abonnes.set(cle, new Set());
  abonnes.get(cle).add(rappel);
  rappel(lireCollection(chemin));
  return () => abonnes.get(cle).delete(rappel);
}

/** « Connexion » locale : un identifiant technique, propre à l'onglet. */
export async function connexion() {
  let u = utilisateurCourant();
  if (!u) {
    u = { uid: 'local-' + Math.random().toString(36).slice(2, 10) };
    try { sessionStorage.setItem('forillon:moi', JSON.stringify(u)); } catch { /* vide */ }
  }
  return utilisateurCourant() || u;
}

export function utilisateurCourant() {
  try {
    const u = JSON.parse(sessionStorage.getItem('forillon:moi') || 'null');
    return u && { ...u, anonyme: true, nom: null, courriel: null };
  } catch { return null; }
}

export async function deconnexion() {
  try { sessionStorage.removeItem('forillon:moi'); } catch { /* vide */ }
}
