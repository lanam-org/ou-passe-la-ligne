// config.js — LE SEUL FICHIER À MODIFIER POUR PASSER EN LIGNE.
//
// Tant que `firebase` reste vide, le site tourne en MODE LOCAL : tout est gardé
// dans le navigateur, et plusieurs onglets du même navigateur se synchronisent
// entre eux (un onglet enseignant·e, un onglet par équipe). Rien à installer.
//
// Quand le projet Firebase existe (voir le Guide d'hébergement, étape 4), colle
// ici les valeurs que la console te donne, entre les accolades, et enlève les //.
// Le site bascule tout seul : aucun autre fichier à changer.

export const firebase = {
  // apiKey:            "",
  // authDomain:        "",
  // projectId:         "",
  // storageBucket:     "",
  // messagingSenderId: "",
  // appId:             ""
};

// Version de Firebase chargée depuis le CDN de Google (aucun npm, aucun build).
export const versionFirebase = '12.19.0';

/**
 * La connexion Google, pour l'enseignant·e SEULEMENT. Les élèves restent anonymes.
 * Elle permet de retrouver ses séances depuis n'importe quel ordinateur.
 * À activer aussi dans la console Firebase : Authentication → Mode de connexion → Google.
 * Mettre `false` cache le bouton (l'enseignant·e reste alors en anonyme, lié·e à son navigateur).
 */
export const googleEnseignant = true;

/**
 * La collecte pour la recherche. ÉTEINTE, et elle doit le rester jusqu'à ce que
 * le certificat d'éthique de l'ÉTS soit obtenu ET les autorisations réunies
 * (centre de services scolaire, direction, consentement parental, assentiment).
 *
 * Éteinte :
 *   · l'étape 8 « Ton avis » n'est pas proposée aux élèves ;
 *   · l'export CSV des mesures est désactivé dans l'espace enseignant·e.
 * Le suivi en direct, lui, reste : c'est un outil de classe, pas une collecte.
 *
 * Mettre `true` est une décision, pas un réglage : à prendre avec les papiers en main.
 */
export const mesure = false;

/**
 * Les images du jeu (la carte dessinée de la presqu'île, la garde-parc).
 * `false` : des cadres vides « Image à venir » à leur place, pour discuter de
 * ce qui ira là. La carte devient de simples boutons (relevés, sept secteurs) :
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
