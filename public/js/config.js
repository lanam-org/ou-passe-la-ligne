// config.js — LE SEUL FICHIER À MODIFIER POUR PASSER EN LIGNE.
//
// Tant que `firebase` reste vide, le site tourne en MODE LOCAL : tout est gardé
// dans le navigateur, et plusieurs onglets du même navigateur se synchronisent
// entre eux (un onglet enseignant·e, un onglet par équipe). Rien à installer.
//
// Quand le projet Firebase existe (voir le Guide d'hébergement, étape 4), colle
// ici les valeurs que la console te donne, entre les accolades, et enlève les //.
// Le site bascule tout seul : aucun autre fichier à changer.

// Le projet « ou-passe-la-ligne » (base à Montréal, northamerica-northeast1). Ces valeurs sont publiques par
// conception : ce sont les règles (firestore.rules) qui protègent les données. Pas de measurementId : aucune mesure
// d'audience (Google Analytics) n'est chargée par le site.
export const firebase = {
  apiKey:            "AIzaSyBkStLKZpL7sEpo6Q8f8HIlItgFyCYiRVs",
  authDomain:        "ou-passe-la-ligne.firebaseapp.com",
  projectId:         "ou-passe-la-ligne",
  storageBucket:     "ou-passe-la-ligne.firebasestorage.app",
  messagingSenderId: "895765056239",
  appId:             "1:895765056239:web:1f45597d3a942e9aa0691a"
};

// Version de Firebase chargée depuis le CDN de Google (aucun npm, aucun build).
export const versionFirebase = '12.19.0';

/**
 * La connexion Google, pour l'enseignant·e SEULEMENT. Les élèves restent anonymes.
 * Elle permet de retrouver ses séances depuis n'importe quel ordinateur.
 * À activer aussi dans la console Firebase : Authentication → Mode de connexion → Google.
 * Mettre `false` cache le bouton (l'enseignant·e reste alors en anonyme, lié·e à son navigateur).
 */
// Éteinte pour l'instant : l'écran de connexion Google afficherait l'adresse d'assistance du projet, et le projet
// n'a pas encore d'adresse dédiée. À rallumer une fois cette adresse créée (et Google activé dans la console).
export const googleEnseignant = false;

/**
 * La collecte pour la recherche. ÉTEINTE, et elle doit le rester jusqu'à ce que
 * le certificat d'éthique de l'ÉTS soit obtenu ET les autorisations réunies
 * (centre de services scolaire, direction, consentement parental, assentiment).
 *
 * Éteinte :
 *   · l'étape 8 « Ton avis » n'est pas proposée aux élèves ;
 *   · l'export CSV des mesures est désactivé dans l'espace enseignant.
 * Le suivi en direct, lui, reste : c'est un outil de classe, pas une collecte.
 *
 * Mettre `true` est une décision, pas un réglage : à prendre avec les papiers en main.
 */
export const mesure = false;

/**
 * Les images du jeu (la carte dessinée de la presqu'île, la garde-parc).
 * `false` : l'image temporaire (images/temporaire.png) marque leur place, en attendant
 * les vraies images. La carte devient de simples boutons (relevés, sept secteurs) :
 * le jeu reste jouable. `true` : les dessins reviennent.
 */
export const images = false;

/**
 * Combien de jours une séance (ses équipes, leurs réponses) reste en ligne avant
 * d'être effacée automatiquement, même si personne ne clique « Effacer ».
 * Loi 25 : on ne garde pas un renseignement plus longtemps que nécessaire.
 * L'effacement est fait par Firestore (politique TTL sur le champ `expireLe`,
 * à activer une fois dans la console : voir le README). Si tu changes ce nombre,
 * change aussi « 30 jours » dans confidentialite.html.
 */
export const conservationJours = 30;

// Vrai si aucune configuration Firebase n'a été fournie.
export const estLocal = Object.keys(firebase).length === 0;
