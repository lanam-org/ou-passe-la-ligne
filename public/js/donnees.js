// donnees.js — la seule porte d'entrée vers le stockage.
//
// Le reste du site n'appelle JAMAIS Firebase directement : il appelle les
// fonctions ci-dessous. Selon que config.js contient une configuration Firebase
// ou non, elles s'adressent à Firestore ou à l'adaptateur local (local.js).
// Même principe que l'application du Conseil.
//
//   connexion()                  → { uid }   (anonyme : aucun nom, aucun courriel)
//   connexionGoogle()            → { uid, anonyme:false, nom, courriel }   (enseignant·e seulement)
//   deconnexion()
//   attendreUtilisateur()        → attend que l'identité soit connue, puis la renvoie
//   lire(chemin)                 → l'objet, ou null
//   ecrire(chemin, objet)        → crée ou fusionne
//   majPartielle(chemin, champs) → remplace les champs donnés ; échoue si le document n'existe pas
//   supprimer(chemin)
//   ecouter(chemin, rappel)      → temps réel ; renvoie une fonction d'arrêt
//   ecouterCollection(chemin, r) → temps réel sur les enfants directs
//   requete(collection, champ, valeur) → les documents dont champ == valeur
//
// Un « chemin » est une chaîne : 'seances/K7P2M' ou 'seances/K7P2M/equipes/orignal'.

import { firebase as configFirebase, versionFirebase, estLocal } from './config.js';
import * as local from './local.js';

export const mode = estLocal ? 'local' : 'firebase';

let fb = null; // chargé seulement si une configuration existe

async function chargerFirebase() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${versionFirebase}`;
  const [app, auth, store] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  const application = app.initializeApp(configFirebase);
  // Le Wi-Fi de l'école décroche : l'équipe continue de jouer, et les écritures
  // partent quand le réseau revient. Le gestionnaire multi-onglets évite une
  // erreur si l'enseignant·e ouvre deux onglets.
  let db;
  try {
    db = store.initializeFirestore(application, {
      localCache: store.persistentLocalCache({ tabManager: store.persistentMultipleTabManager() })
    });
  } catch (e) {
    console.warn('Persistance hors ligne indisponible, on continue en mémoire', e);
    db = store.getFirestore(application);
  }
  fb = { auth: auth.getAuth(application), db, a: auth, s: store };
  return fb;
}

const ref = (f, chemin) => f.s.doc(f.db, ...chemin.split('/'));

/** L'identité, sans rien de plus que ce qu'il faut afficher. Le nom et le
 *  courriel de l'enseignant·e ne sont JAMAIS écrits dans la base. */
const decrire = (u) => u && { uid: u.uid, anonyme: !!u.isAnonymous,
  nom: u.isAnonymous ? null : (u.displayName || null), courriel: u.isAnonymous ? null : (u.email || null) };

export async function connexion() {
  if (estLocal) return local.connexion();
  const f = await chargerFirebase();
  const res = await f.a.signInAnonymously(f.auth);
  return decrire(res.user);
}

/**
 * Connexion Google, pour l'enseignant·e. Si une identité anonyme existe déjà sur
 * ce navigateur, on la RELIE au compte Google : l'identifiant ne change pas, et
 * les séances déjà créées restent à elle. Si ce compte Google a déjà servi
 * ailleurs, on s'y connecte simplement (les séances anonymes de ce navigateur
 * restent alors à l'ancienne identité).
 */
export async function connexionGoogle() {
  if (estLocal) throw new Error('La connexion Google fonctionne une fois le site branché sur Firebase.');
  const f = await chargerFirebase();
  const fournisseur = new f.a.GoogleAuthProvider();
  fournisseur.setCustomParameters?.({ prompt: 'select_account' });
  try {
    const u = f.auth.currentUser;
    if (u && u.isAnonymous) {
      try { return decrire((await f.a.linkWithPopup(u, fournisseur)).user); }
      catch (e) {
        if (!/credential-already-in-use|email-already-in-use/.test(e.code || '')) throw e;
        const cred = f.a.GoogleAuthProvider.credentialFromError?.(e);
        if (cred) return decrire((await f.a.signInWithCredential(f.auth, cred)).user);
      }
    }
    return decrire((await f.a.signInWithPopup(f.auth, fournisseur)).user);
  } catch (e) {
    if (/popup-blocked|popup-closed|cancelled-popup/.test(e.code || '')) {
      throw new Error('La fenêtre de connexion Google a été bloquée ou fermée. Autorise les fenêtres surgissantes pour ce site, puis réessaie.');
    }
    if (/unauthorized-domain/.test(e.code || '')) {
      throw new Error("Ce domaine n'est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés).");
    }
    if (/operation-not-allowed/.test(e.code || '')) {
      throw new Error('La connexion Google n\'est pas activée dans la console Firebase (Authentication → Mode de connexion).');
    }
    throw e;
  }
}

export async function deconnexion() {
  if (estLocal) return local.deconnexion();
  const f = await chargerFirebase();
  return f.a.signOut(f.auth);
}

/**
 * Firebase restaure la session de façon asynchrone : juste après un
 * rafraîchissement, `currentUser` est encore nul. Toujours attendre ici avant
 * de décider qu'une équipe n'est « pas connectée ».
 */
export async function attendreUtilisateur() {
  if (estLocal) return local.utilisateurCourant();
  const f = await chargerFirebase();
  if (!f.auth.currentUser) {
    await new Promise((resoudre) => {
      let arret = null, fini = false;
      const finir = () => {
        if (fini) return;
        fini = true;
        if (typeof arret === 'function') arret();
        resoudre();
      };
      arret = f.auth.onAuthStateChanged(finir);
      setTimeout(finir, 4000);
    });
  }
  return decrire(f.auth.currentUser);
}

/** Connecté ou non, renvoie une identité (en crée une au besoin). */
export async function identite() {
  return (await attendreUtilisateur()) || connexion();
}

export async function lire(chemin) {
  if (estLocal) return local.lire(chemin);
  const f = await chargerFirebase();
  const i = await f.s.getDoc(ref(f, chemin));
  return i.exists() ? i.data() : null;
}

export async function ecrire(chemin, donnees) {
  if (estLocal) return local.ecrire(chemin, donnees);
  const f = await chargerFirebase();
  return f.s.setDoc(ref(f, chemin), donnees, { merge: true });
}

export async function majPartielle(chemin, champs) {
  if (estLocal) return local.majPartielle(chemin, champs);
  const f = await chargerFirebase();
  return f.s.updateDoc(ref(f, chemin), champs);
}

export async function supprimer(chemin) {
  if (estLocal) return local.supprimer(chemin);
  const f = await chargerFirebase();
  return f.s.deleteDoc(ref(f, chemin));
}

export function ecouter(chemin, rappel, erreur = () => {}) {
  if (estLocal) return local.ecouter(chemin, rappel);
  let arret = () => {}, annule = false;
  chargerFirebase().then((f) => {
    if (annule) return;
    arret = f.s.onSnapshot(ref(f, chemin), (i) => rappel(i.exists() ? i.data() : null), erreur);
  });
  return () => { annule = true; arret(); };
}

export function ecouterCollection(chemin, rappel, erreur = () => {}) {
  if (estLocal) return local.ecouterCollection(chemin, rappel);
  let arret = () => {}, annule = false;
  chargerFirebase().then((f) => {
    if (annule) return;
    arret = f.s.onSnapshot(f.s.collection(f.db, ...chemin.split('/')),
      (inst) => rappel(inst.docs.map((d) => ({ id: d.id, ...d.data() }))), erreur);
  });
  return () => { annule = true; arret(); };
}

/** Lecture ponctuelle d'une collection (pour effacer une séance). */
export async function lireCollection(chemin) {
  if (estLocal) return local.lireCollection(chemin);
  const f = await chargerFirebase();
  const inst = await f.s.getDocs(f.s.collection(f.db, ...chemin.split('/')));
  return inst.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Les documents d'une collection dont `champ` vaut `valeur` (ex. les séances d'un·e enseignant·e). */
export async function requete(collection, champ, valeur) {
  if (estLocal) return local.lireCollection(collection).filter((d) => d[champ] === valeur);
  const f = await chargerFirebase();
  const q = f.s.query(f.s.collection(f.db, ...collection.split('/')), f.s.where(champ, '==', valeur));
  const inst = await f.s.getDocs(q);
  return inst.docs.map((d) => ({ id: d.id, ...d.data() }));
}
