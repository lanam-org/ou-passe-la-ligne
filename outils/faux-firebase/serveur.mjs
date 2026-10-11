// faux-firebase — un double de Firestore, pour répéter avant la première.
// (Repris de « 6 - Application » ; ajouts : deleteDoc, getDocs, query/where et linkWithPopup.)
//
// POURQUOI. Le chemin Firebase de `donnees.js` n'a jamais été exécuté : tant
// que `config.js` est vide, c'est l'adaptateur local qui travaille. Une erreur
// dans ce chemin-là ne se verrait donc que le jour du branchement — c'est-à-dire
// au pire moment. Ce module sert un faux SDK Firebase à la place de celui de
// Google, et l'application tourne dessus SANS UNE LIGNE DE CHANGEMENT.
//
// CE QU'IL PROUVE EN PLUS. L'état vit ici, dans le serveur, pas dans le
// navigateur : deux contextes de navigateur différents — donc deux stockages,
// deux sessions, comme deux Chromebooks — voient la même partie et se
// synchronisent. C'est la seule chose que l'adaptateur local ne peut PAS
// simuler, et c'est précisément ce qu'il faut vérifier avant une classe.
//
// CE QU'IL NE PROUVE PAS. Les règles de sécurité, les quotas, la latence
// réelle, la fenêtre de connexion Google. Un double reste un double ; il attrape
// les erreurs de code, pas les erreurs de compte.
//
// PRINCIPE : le double est au moins aussi STRICT que Firestore. `updateDoc` sur
// un document absent échoue ici comme là-bas. Un double plus permissif que
// l'original ne sert à rien : il laisse passer ce qu'on voulait attraper.

/** Applique { "a.b": v } comme le fait updateDoc. */
function appliquerChemins(cible, champs) {
  for (const [cle, valeur] of Object.entries(champs)) {
    const morceaux = cle.split('.');
    let noeud = cible;
    while (morceaux.length > 1) {
      const m = morceaux.shift();
      if (typeof noeud[m] !== 'object' || noeud[m] === null) noeud[m] = {};
      noeud = noeud[m];
    }
    if (valeur === undefined) delete noeud[morceaux[0]];
    else noeud[morceaux[0]] = valeur;
  }
  return cible;
}

/**
 * setDoc(…, { merge: true }) fusionne en PROFONDEUR, comme Firestore : une clé
 * absente d'une sous-table est gardée. Pour remplacer une sous-table entière,
 * il faut updateDoc. Le double fait pareil, pour attraper l'erreur.
 */
function fusionner(cible, ajout) {
  const sortie = { ...(cible || {}) };
  for (const [k, v] of Object.entries(ajout)) {
    const objet = (x) => x && typeof x === 'object' && !Array.isArray(x);
    sortie[k] = objet(v) && objet(sortie[k]) ? fusionner(sortie[k], v) : v;
  }
  return sortie;
}

/**
 * Ce que Firestore refuse à l'écriture, refusé ici aussi : un tableau dans un
 * tableau (« Nested arrays are not supported ») et un nom de champ vide.
 */
function donneeInvalide(v, dansTableau = false) {
  if (Array.isArray(v)) {
    if (dansTableau) return 'Nested arrays are not supported';
    for (const x of v) { const m = donneeInvalide(x, true); if (m) return m; }
    return null;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (!k) return 'Field names must not be empty';
      const m = donneeInvalide(x, false); if (m) return m;
    }
  }
  return null;
}

export function creerFauxFirebase() {
  const base = new Map();          // chemin -> objet
  const flux = new Set();          // réponses SSE ouvertes
  const compteur = { lectures: 0, ecritures: 0, ecoutes: 0, poussees: 0 };

  const lire = (p) => (base.has(p) ? JSON.parse(JSON.stringify(base.get(p))) : null);
  const lireCollection = (p) => {
    const prefixe = p + '/';
    return [...base.keys()]
      .filter((k) => k.startsWith(prefixe) && !k.slice(prefixe.length).includes('/'))
      .sort()
      .map((k) => ({ id: k.slice(prefixe.length), ...JSON.parse(JSON.stringify(base.get(k))) }));
  };

  function pousser(chemin) {
    const message = `data: ${JSON.stringify({ chemin })}\n\n`;
    for (const r of flux) { try { r.write(message); compteur.poussees++; } catch { flux.delete(r); } }
  }

  const corps = (req) => new Promise((res, rej) => {
    let t = ''; req.on('data', (c) => { t += c; });
    req.on('end', () => { try { res(t ? JSON.parse(t) : {}); } catch (e) { rej(e); } });
  });

  const json = (res, code, objet) => {
    res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(objet));
  };

  /** À brancher dans un serveur HTTP. Renvoie vrai si la requête a été traitée. */
  async function router(req, res, url) {
    if (!url.pathname.startsWith('/__fb/')) return false;
    const q = url.searchParams;

    if (url.pathname === '/__fb/doc') {
      compteur.lectures++;
      return json(res, 200, { donnees: lire(q.get('chemin')) }), true;
    }
    if (url.pathname === '/__fb/collection') {
      compteur.lectures++;
      return json(res, 200, { docs: lireCollection(q.get('chemin')) }), true;
    }
    if (url.pathname === '/__fb/set') {
      const { chemin, donnees, fusion } = await corps(req);
      const invalide = donneeInvalide(donnees);
      if (invalide) return json(res, 400, { code: 'invalid-argument', message: invalide }), true;
      compteur.ecritures++;
      base.set(chemin, JSON.parse(JSON.stringify(fusion ? fusionner(base.get(chemin), donnees) : donnees)));
      pousser(chemin);
      return json(res, 200, { ok: true }), true;
    }
    if (url.pathname === '/__fb/update') {
      const { chemin, champs } = await corps(req);
      const invalide = donneeInvalide(champs);
      if (invalide) return json(res, 400, { code: 'invalid-argument', message: invalide }), true;
      // Firestore refuse une mise à jour sur un document absent. Le double aussi :
      // c'est exactement le genre d'écart qui ne se voit qu'en production.
      if (!base.has(chemin)) {
        return json(res, 404, { code: 'not-found',
          message: `No document to update: ${chemin}` }), true;
      }
      compteur.ecritures++;
      base.set(chemin, appliquerChemins(base.get(chemin), donneesSures(champs)));
      pousser(chemin);
      return json(res, 200, { ok: true }), true;
    }
    if (url.pathname === '/__fb/delete') {
      const { chemin } = await corps(req);
      compteur.ecritures++;
      base.delete(chemin);
      pousser(chemin);
      return json(res, 200, { ok: true }), true;
    }
    if (url.pathname === '/__fb/flux') {
      compteur.ecoutes++;
      res.writeHead(200, { 'content-type': 'text/event-stream',
        'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(': ouvert\n\n');
      flux.add(res);
      req.on('close', () => flux.delete(res));
      return true;
    }
    if (url.pathname === '/__fb/etat') {
      return json(res, 200, { documents: base.size, ...compteur }), true;
    }
    if (url.pathname === '/__fb/vider') {
      base.clear();
      return json(res, 200, { ok: true }), true;
    }
    return json(res, 404, { erreur: 'inconnu' }), true;
  }

  const donneesSures = (o) => JSON.parse(JSON.stringify(o));

  return {
    router,
    etat: () => ({ documents: base.size, ...compteur }),
    lire, lireCollection,
    vider: () => { base.clear(); Object.keys(compteur).forEach((k) => { compteur[k] = 0; }); },
    fermer: () => { for (const r of flux) { try { r.end(); } catch { /* vide */ } } flux.clear(); }
  };
}

/* ======================= le faux SDK, côté navigateur ======================= */
// Trois modules, servis à la place de ceux de gstatic.com. Ils implémentent
// exactement ce que `donnees.js` utilise — rien de plus, pour que le double
// reste lisible et qu'on voie tout de suite ce dont l'application dépend.

export const MODULES = {
  'firebase-app.js': `
export function initializeApp(config){ return { options: config, name: '[DEFAULT]' }; }
`,

  'firebase-auth.js': `
// L'identité vit dans sessionStorage : propre à l'onglet, comme un appareil.
const CLE = 'faux-fb:moi';
const ecouteurs = new Set();

function poser(u){
  try { u ? sessionStorage.setItem(CLE, JSON.stringify(u)) : sessionStorage.removeItem(CLE); }
  catch { /* vide */ }
  ecouteurs.forEach((f) => f(u));
}
function courant(){
  try { return JSON.parse(sessionStorage.getItem(CLE) || 'null'); } catch { return null; }
}
const uid = () => 'faux-' + Math.random().toString(36).slice(2, 11);

export function getAuth(){
  return {
    get currentUser(){ return courant(); },
    onAuthStateChanged(f){ ecouteurs.add(f); f(courant()); return () => ecouteurs.delete(f); }
  };
}
export class GoogleAuthProvider {
  setCustomParameters(){}
  static credentialFromError(){ return null; }
}
// Un compte Google de test, le même sur tous les « ordinateurs » du test.
const COMPTE = () => window.__fauxCompteGoogle || { uid: 'faux-google-enseignante', displayName: 'Enseignante Test', email: 'enseignante@exemple.ca' };
export async function linkWithPopup(user, fournisseur){
  if (window.__fauxPopupBloquee) { const e = new Error('Firebase: Error (auth/popup-blocked).'); e.code = 'auth/popup-blocked'; throw e; }
  // relier garde l'identifiant : c'est tout l'intérêt
  const u = { ...courant(), isAnonymous: false, displayName: COMPTE().displayName, email: COMPTE().email };
  poser(u);
  return { user: u };
}
export async function signInWithCredential(){ throw new Error('non simulé'); }
export async function signInWithPopup(auth, fournisseur){
  // Une vraie fenêtre de connexion peut être bloquée. Le double permet de le
  // simuler : window.__fauxPopupBloquee = true fait échouer la connexion comme
  // Firebase le ferait, pour vérifier que l'application le dit à l'élève.
  if (window.__fauxPopupBloquee) {
    const e = new Error('Firebase: Error (auth/popup-blocked).');
    e.code = 'auth/popup-blocked';
    throw e;
  }
  const u = { uid: COMPTE().uid, displayName: COMPTE().displayName, email: COMPTE().email, isAnonymous: false };
  poser(u);
  return { user: u };
}
export async function signInAnonymously(auth){
  const u = { uid: uid(), displayName: null, isAnonymous: true };
  poser(u);
  return { user: u };
}
export async function signOut(){ poser(null); }
`,

  'firebase-firestore.js': `
const API = '/__fb';
let flux = null;
const abonnes = new Set();   // { chemin, collection, rappel }

function ouvrirFlux(){
  if (flux) return;
  flux = new EventSource(API + '/flux');
  flux.onmessage = (e) => {
    let chemin = null;
    try { chemin = JSON.parse(e.data).chemin; } catch { return; }
    const parent = chemin.split('/').slice(0, -1).join('/');
    for (const a of abonnes) {
      if (a.collection ? a.chemin === parent : a.chemin === chemin) rafraichir(a);
    }
  };
}
async function rafraichir(a){
  if (a.collection) {
    const r = await fetch(API + '/collection?chemin=' + encodeURIComponent(a.chemin));
    const { docs } = await r.json();
    a.rappel({ docs: docs.map((d) => ({ id: d.id, data: () => { const c = { ...d }; delete c.id; return c; } })) });
  } else {
    const r = await fetch(API + '/doc?chemin=' + encodeURIComponent(a.chemin));
    const { donnees } = await r.json();
    a.rappel({ exists: () => donnees !== null, data: () => donnees });
  }
}

export function getFirestore(){ return { faux: true }; }
export function initializeFirestore(app, reglages){ return { faux: true, reglages }; }
export function persistentLocalCache(o){ return { type: 'persistent', ...o }; }
export function memoryLocalCache(){ return { type: 'memory' }; }
export function persistentMultipleTabManager(){ return { type: 'multi' }; }
export function persistentSingleTabManager(){ return { type: 'single' }; }
// l'ancienne API, gardée pour vérifier qu'on ne l'appelle plus
export async function enableIndexedDbPersistence(){
  throw new Error('enableIndexedDbPersistence est retirée : utilise persistentLocalCache.');
}

export function doc(db, ...m){ return { chemin: m.join('/'), collection: false }; }
export function collection(db, ...m){ return { chemin: m.join('/'), collection: true }; }

export async function getDoc(ref){
  const r = await fetch(API + '/doc?chemin=' + encodeURIComponent(ref.chemin));
  const { donnees } = await r.json();
  return { exists: () => donnees !== null, data: () => donnees };
}
export async function setDoc(ref, donnees, options){
  const r = await fetch(API + '/set', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chemin: ref.chemin, donnees, fusion: !!(options && options.merge) }) });
  if (!r.ok) {
    const { code, message } = await r.json();
    const e = new Error(message || 'échec'); e.code = code || 'unknown'; throw e;
  }
}
export async function updateDoc(ref, champs){
  const r = await fetch(API + '/update', { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chemin: ref.chemin, champs }) });
  if (!r.ok) {
    const { code, message } = await r.json();
    const e = new Error(message || 'échec'); e.code = code || 'unknown'; throw e;
  }
}
export function where(champ, op, valeur){ return { champ, op, valeur }; }
export function query(ref, ...filtres){ return { ...ref, filtres }; }
export async function getDocs(ref){
  const r = await fetch(API + '/collection?chemin=' + encodeURIComponent(ref.chemin));
  let { docs } = await r.json();
  for (const f of ref.filtres || []) {
    if (f.op !== '==') throw new Error('Seul == est simulé');
    docs = docs.filter((d) => d[f.champ] === f.valeur);
  }
  return { docs: docs.map((d) => ({ id: d.id, data: () => { const c = { ...d }; delete c.id; return c; } })) };
}
export async function deleteDoc(ref){
  await fetch(API + '/delete', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chemin: ref.chemin }) });
}
export function onSnapshot(ref, rappel){
  ouvrirFlux();
  const a = { chemin: ref.chemin, collection: !!ref.collection, rappel };
  abonnes.add(a);
  rafraichir(a);
  return () => abonnes.delete(a);
}
`
};
