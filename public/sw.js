// sw.js — le site continue de s'ouvrir quand le Wi-Fi de l'école décroche.
//
// Un « service worker » : le navigateur le garde et lui confie les requêtes.
//   · Les fichiers du site (pages, code, contenu) : le réseau d'abord, pour
//     toujours servir la dernière version ; la copie gardée si le réseau ne
//     répond pas en 3 secondes ou plus du tout.
//   · Le code Firebase (adresses versionnées, qui ne changent jamais) : la
//     copie gardée d'abord. Les polices, elles, font partie du site (polices/).
//   · Firestore et la connexion : jamais touchés. Firestore a sa propre file
//     d'attente hors ligne (donnees.js) : les réponses partent au retour du réseau.
//
// Rien de personnel n'est gardé ici : seulement les fichiers publics du site.
// VERSION est remplacée par le numéro du commit à chaque mise en ligne
// (.github/workflows/publier.yml) : les anciennes copies sont alors effacées.

const VERSION = 'dev';
const CACHE = `olp-${VERSION}`;
const EXTERNE = 'olp-externe';
const DELAI = 3000;

// Tout le site, gardé dès la première visite. Un fichier ajouté à public/ doit
// figurer ici : le test (outils/verifier_site.mjs) le vérifie. Une exception :
// contenu/guide.json (les réponses attendues). Gardé d'avance, il serait sur
// chaque Chromebook ; il n'est gardé que là où l'espace enseignant·e l'a ouvert.
const COQUILLE = [
  './', 'index.html', 'eleve.html', 'enseignant.html', 'dossier.html', 'confidentialite.html', 'ecoles.html', '404.html',
  'css/site.css', 'contenu/forillon.json', 'images/temporaire.png',
  'polices/atkinson-hyperlegible-next.woff2', 'polices/atkinson-hyperlegible-next-italique.woff2',
  'polices/atkinson-hyperlegible-mono.woff2', 'polices/OFL.txt',
  'js/aide.js', 'js/carte.js', 'js/config.js', 'js/demo.js', 'js/donnees.js', 'js/dossier.js', 'js/dossierdoc.js',
  'js/eleve.js', 'js/enseignant.js', 'js/horsligne.js', 'js/imprimer.js', 'js/jeu.js', 'js/local.js', 'js/outils.js',
  'js/reglages.js', 'js/seance.js', 'js/secours.js', 'js/theme.js',
  'js/enseignant/accueil.js', 'js/enseignant/apres.js', 'js/enseignant/debrief.js', 'js/enseignant/direct.js',
  'js/enseignant/editeur.js', 'js/enseignant/etat.js', 'js/enseignant/preparer.js', 'js/enseignant/rapport.js',
  'js/enseignant/trousse.js',
  'js/eleve/annonces.js', 'js/eleve/ecrans.js', 'js/eleve/envoi.js', 'js/eleve/etat.js', 'js/eleve/questions.js',
  'js/vendor/uqr.js'
];

const IMMUABLE = /^https:\/\/www\.gstatic\.com\/firebasejs\//;

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // un à un : un fichier manquant n'empêche pas de garder les autres
    await Promise.all(COQUILLE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('olp-') && k !== CACHE && k !== EXTERNE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (ev) => {
  const r = ev.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    // eleve.html?code=K7P2M et eleve.html : une seule copie
    ev.respondWith(reseauDabord(ev, CACHE, new Request(u.origin + u.pathname)));
  } else if (IMMUABLE.test(r.url)) {
    ev.respondWith(gardeDabord(r));
  }
  // tout le reste (Firestore, connexion Google) passe sans être touché
});

const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function reseauDabord(ev, nom, cle) {
  const r = ev.request;
  const cache = await caches.open(nom);
  const reseau = fetch(r).then((rep) => {
    if (rep.ok) cache.put(cle, rep.clone()).catch(() => {});
    return rep;
  });
  ev.waitUntil(reseau.catch(() => {}));
  const garde = () => cache.match(cle);
  try {
    return await Promise.race([reseau, attendre(DELAI).then(async () => (await garde()) || reseau)]);
  } catch {
    const g = await garde();
    if (g) return g;
    if (r.mode === 'navigate') return (await cache.match(new URL('index.html', self.registration.scope).href)) || Response.error();
    return Response.error();
  }
}

async function gardeDabord(r) {
  const cache = await caches.open(EXTERNE);
  const g = await cache.match(r);
  if (g) return g;
  const rep = await fetch(r);
  if (rep.ok) cache.put(r, rep.clone()).catch(() => {});
  return rep;
}
