// seance.js — créer une séance, la rejoindre, l'effacer.
//
// Une séance = un code de cinq caractères que l'enseignant·e affiche au
// tableau. Chaque équipe l'entre sur son Chromebook et choisit un nom parmi
// des animaux de Forillon. Aucun prénom n'est demandé, nulle part : le nom de
// l'équipe est le seul nom que le site connaisse.

import * as donnees from './donnees.js';
import * as config from './config.js';
import { nouvelEtat } from './jeu.js';
import { separerReponses } from './reglages.js';

/**
 * La date d'effacement automatique (Loi 25 : on ne garde pas plus longtemps que
 * nécessaire). Chaque séance, fiche d'équipe et avis porte un champ `expireLe` ;
 * la politique TTL de Firestore (à activer une fois, voir le README) efface le
 * document après cette date. Les fiches et les avis prennent la date de leur
 * séance : tout part ensemble. Une date JavaScript devient un Timestamp dans Firestore.
 */
export const JOURS_CONSERVATION = Number(config.conservationJours) || 30;
export const expiration = (seance) => seance?.expireLe || new Date(Date.now() + JOURS_CONSERVATION * 86400000);

// sans 0/O, 1/I/L : un code qui se lit au tableau sans se tromper
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const NOMS_EQUIPES = [
  'Fou de Bassan', 'Phoque gris', 'Petit rorqual', 'Orignal', 'Ours noir', 'Castor',
  'Renard roux', 'Porc-épic', 'Guillemot', 'Petit pingouin', 'Mouette tridactyle',
  'Cormoran', 'Grand héron', 'Lynx', 'Martin-pêcheur'
];

/** Un emoji par animal, à l'écran « Rejoindre » et à la fin de la partie (décoratif : le nom reste le nom). */
export const EMOJIS_EQUIPES = {
  'Fou de Bassan': '🦢', 'Phoque gris': '🦭', 'Petit rorqual': '🐋', 'Orignal': '🫎', 'Ours noir': '🐻', 'Castor': '🦫',
  'Renard roux': '🦊', 'Porc-épic': '🦔', 'Guillemot': '🐦', 'Petit pingouin': '🐧', 'Mouette tridactyle': '🕊️',
  'Cormoran': '🦆', 'Grand héron': '🦩', 'Lynx': '🐈', 'Martin-pêcheur': '🦜'
};

export const idEquipe = (nom) => nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const cheminSeance = (code) => `seances/${code}`;
export const cheminEquipe = (code, id) => `seances/${code}/equipes/${id}`;
/**
 * Les réponses attendues de la séance (questions ajoutées, réponses corrigées) : à part,
 * parce que toute équipe qui a le code lit le document de la séance. Les règles Firestore
 * réservent celui-ci à l'enseignant·e. Le document de la séance n'en contient aucune.
 */
export const cheminReponses = (code) => `seances/${code}/prive/reponses`;

export const normaliserCode = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
export const codeValide = (t) => /^[A-HJ-KM-NP-Z2-9]{5}$/.test(t);

function codeAuHasard() {
  const a = new Uint32Array(5);
  crypto.getRandomValues(a);
  return [...a].map((n) => ALPHABET[n % ALPHABET.length]).join('');
}

/** Un chrono de classe neuf : il démarre avec la première équipe (voir enseignant.js). */
export const chronoNeuf = () => ({ debut: null, pause: null, pauses: [] });

/**
 * Crée une séance et renvoie son code. `reglages` (questions, minutes,
 * corrections) y est copié : changer sa version plus tard ne touche pas les
 * séances déjà créées ; changer les réglages d'une séance ne touche qu'elle.
 */
export async function creerSeance({ questionnaire = false, reglages = null } = {}) {
  const moi = await donnees.identite();
  const { publics, reponses } = separerReponses(reglages);
  for (let essai = 0; essai < 8; essai++) {
    const code = codeAuHasard();
    let existe = null;
    try { existe = await donnees.lire(cheminSeance(code)); } catch { existe = { pris: true }; }
    if (existe) continue;
    const expireLe = expiration(null);
    await donnees.ecrire(cheminSeance(code), {
      enseignantId: moi.uid, creeLe: Date.now(), etat: 'ouverte',
      questionnaire: !!questionnaire, signal: null, config: publics, chrono: chronoNeuf(), expireLe
    });
    // après la séance : les règles vérifient que l'enseignant·e de la séance écrit ce document
    await donnees.ecrire(cheminReponses(code), { ...reponses, expireLe });
    return code;
  }
  throw new Error('Impossible de trouver un code libre. Réessayez.');
}

/* La version du jeu de l'enseignant·e : ses réglages, réutilisés à chaque nouvelle séance. */
export const cheminVersion = (uid) => `enseignants/${uid}`;

export async function lireMaVersion(uid) {
  if (!uid) return null;
  try { return (await donnees.lire(cheminVersion(uid)))?.reglages || null; } catch { return null; }
}

export async function enregistrerMaVersion(uid, reglages) {
  // updateDoc REMPLACE la sous-table (une correction retirée disparaît vraiment) ;
  // setDoc avec fusion la garderait. Première fois : le document n'existe pas encore.
  const champs = { reglages: JSON.parse(JSON.stringify(reglages)), maj: Date.now() };
  const existe = await donnees.lire(cheminVersion(uid)).catch(() => null);
  if (existe) await donnees.majPartielle(cheminVersion(uid), champs);
  else await donnees.ecrire(cheminVersion(uid), champs);
}

/** Remplace les réglages d'une séance en cours (questions, minutes, corrections, réponses attendues). */
export async function reglerSeance(code, reglages) {
  const { publics, reponses } = separerReponses(reglages);
  await donnees.majPartielle(cheminSeance(code), { config: publics });
  // updateDoc remplace chaque sous-table : une réponse retirée disparaît vraiment
  try { await donnees.majPartielle(cheminReponses(code), reponses); }
  catch { await donnees.ecrire(cheminReponses(code), { ...reponses, expireLe: expiration(null) }); }   // séance créée avant ce document
}

/** Change seulement les minutes (« +5 min », « Terminer l'étape ») : rien d'autre n'est réécrit. */
export async function reglerMinutes(code, minutes) {
  await donnees.majPartielle(cheminSeance(code), { 'config.minutes': minutes });
}

/** Met le chrono de la classe à jour (démarrer, pause, reprise, remise à zéro). */
export async function reglerChrono(code, chrono) {
  await donnees.majPartielle(cheminSeance(code), { chrono });
}

/**
 * Avancer ensemble (comme le « rythme de l'enseignant » de Socrative) : `{ etape }`, les équipes ne dépassent pas
 * cette étape (son rang dans les étapes du jeu) ; `null`, chacune avance à son rythme.
 */
export async function reglerRythme(code, rythme) {
  await donnees.majPartielle(cheminSeance(code), { rythme });
}

/*
 * Les « bravos » de l'enseignant·e : une réponse remarquée, dite à l'équipe tout de suite
 * (inspiré des retours positifs de ClassDojo et du « coup de projecteur » de Nearpod).
 * Ils vivent dans la séance, pas dans la fiche de l'équipe (que l'enseignant·e n'écrit jamais) :
 *   bravos = { [équipe]: { [question]: date } }
 * Une date, pas un point : pas de total, pas de classement. Ils partent avec la séance.
 */
export const cleBravo = (qid) => String(qid).replace(/\./g, '_');   // « F2.1 » : un point couperait le chemin du champ
export const aUnBravo = (s, equipe, qid) => !!s?.bravos?.[equipe]?.[cleBravo(qid)];
export async function donnerBravo(code, equipe, qid, oui) {
  await donnees.majPartielle(cheminSeance(code), { [`bravos.${equipe}.${cleBravo(qid)}`]: oui ? Date.now() : null });
}

export async function effacerMaVersion(uid) {
  await donnees.supprimer(cheminVersion(uid));
}

/**
 * Rejoint une séance sous un nom d'équipe.
 * Renvoie { code, id, etat } ; `reprise` vaut vrai si ce Chromebook avait déjà
 * cette équipe (rafraîchissement, onglet refermé).
 */
export async function rejoindre(c, code, nom) {
  const moi = await donnees.identite();
  const s = await donnees.lire(cheminSeance(code));
  if (!s) throw new Error(donnees.mode === 'local'
    ? 'Aucune séance avec ce code dans ce navigateur. En version de démonstration, une séance n\'existe que dans le navigateur '
      + 'où elle a été créée : ouvrez la page des équipes dans un autre onglet de ce même navigateur.'
    : 'Aucune séance avec ce code. Vérifiez les cinq caractères au tableau.');
  if (s.etat !== 'ouverte') throw new Error('Cette séance est terminée.');
  const id = idEquipe(nom);
  const chemin = cheminEquipe(code, id);
  let deja = null;
  try { deja = await donnees.lire(chemin); }
  catch { throw new Error(`« ${nom} » est déjà pris. Choisissez un autre nom.`); }
  if (deja && deja.appareil !== moi.uid) throw new Error(`« ${nom} » est déjà pris. Choisissez un autre nom.`);
  if (deja) return { code, id, etat: deja, reprise: true };
  const etat = nouvelEtat(c, nom, moi.uid);
  try { await donnees.ecrire(chemin, { ...etat, expireLe: expiration(s) }); }
  catch { throw new Error(`« ${nom} » vient d'être pris. Choisissez un autre nom.`); }
  return { code, id, etat, reprise: false };
}

/** Les séances créées par cette identité, de la plus récente à la plus ancienne. */
export async function mesSeances(uid) {
  if (!uid) return [];
  const l = await donnees.requete('seances', 'enseignantId', uid);
  return l.sort((a, b) => (b.creeLe || 0) - (a.creeLe || 0));
}

/** Efface la séance entière : équipes, avis, réponses attendues, puis la séance elle-même. */
export async function effacerSeance(code) {
  for (const sous of ['equipes', 'avis', 'prive']) {
    const docs = await donnees.lireCollection(`${cheminSeance(code)}/${sous}`);
    for (const d of docs) await donnees.supprimer(`${cheminSeance(code)}/${sous}/${d.id}`);
  }
  await donnees.supprimer(cheminSeance(code));
}

/*
 * L'aperçu élève : l'enseignant·e voit le jeu comme une équipe, avec les réglages qu'elle ou il regarde (ceux de la
 * séance, un brouillon pas encore appliqué, ou un format), sans rejoindre de séance ni créer d'équipe. Les réglages
 * passent par le stockage du navigateur (même appareil) ; la page des équipes, ouverte avec ?apercu=1, les lit et
 * n'enregistre rien (eleve.js).
 */
export const CLE_APERCU = 'forillon:apercu';
export function ouvrirApercu(reglages) {
  try { localStorage.setItem(CLE_APERCU, JSON.stringify({ config: reglages || null, t: Date.now() })); } catch { /* vide */ }
  window.open('eleve.html?apercu=1', '_blank', 'noopener');
}

/** Les messages à toute la classe : des phrases prêtes, ou un message écrit par l'enseignant·e (« perso »). */
export const SIGNAUX = {
  temps: { t: 'Il reste 5 minutes à cette étape.', court: '5 minutes restantes' },
  deux: { t: 'Il reste 2 minutes : terminez votre phrase.', court: '2 minutes restantes' },
  pause: { t: 'Pause : regardez votre enseignant·e.', court: 'Pause' },
  aide: { t: 'Une équipe est bloquée ? Levez la main.', court: 'Bloqués ? Levez la main' },
  debrief: { t: 'On revient sur notre démarche, toute la classe ensemble.', court: 'Au retour en classe' }
};
export const MAX_MESSAGE = 140;
/** Le texte d'un message, prêt ou écrit (toujours affiché échappé). */
export const texteSignal = (sg) => (sg?.type === 'perso' ? String(sg.texte || '').slice(0, MAX_MESSAGE) : SIGNAUX[sg?.type]?.t || '');
