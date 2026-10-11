// seance.js — créer une séance, la rejoindre, l'effacer.
//
// Une séance = un code de cinq caractères que l'enseignant·e affiche au
// tableau. Chaque équipe l'entre sur son Chromebook et choisit un nom parmi
// des animaux de Forillon. Aucun prénom n'est demandé, nulle part : le nom de
// l'équipe est le seul nom que le site connaisse.

import * as donnees from './donnees.js';
import { nouvelEtat } from './jeu.js';

// sans 0/O, 1/I/L : un code qui se lit au tableau sans se tromper
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const NOMS_EQUIPES = [
  'Fou de Bassan', 'Phoque gris', 'Petit rorqual', 'Orignal', 'Ours noir', 'Castor',
  'Renard roux', 'Porc-épic', 'Guillemot', 'Petit pingouin', 'Mouette tridactyle',
  'Cormoran', 'Grand héron', 'Lynx', 'Martin-pêcheur'
];

export const idEquipe = (nom) => nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const cheminSeance = (code) => `seances/${code}`;
export const cheminEquipe = (code, id) => `seances/${code}/equipes/${id}`;

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
  for (let essai = 0; essai < 8; essai++) {
    const code = codeAuHasard();
    let existe = null;
    try { existe = await donnees.lire(cheminSeance(code)); } catch { existe = { pris: true }; }
    if (existe) continue;
    await donnees.ecrire(cheminSeance(code), {
      enseignantId: moi.uid, creeLe: Date.now(), etat: 'ouverte',
      questionnaire: !!questionnaire, signal: null,
      config: reglages ? JSON.parse(JSON.stringify(reglages)) : null, chrono: chronoNeuf()
    });
    return code;
  }
  throw new Error('Impossible de trouver un code libre. Réessaie.');
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

/** Remplace les réglages d'une séance en cours (questions, minutes, corrections). */
export async function reglerSeance(code, reglages) {
  await donnees.majPartielle(cheminSeance(code), { config: JSON.parse(JSON.stringify(reglages)) });
}

/** Met le chrono de la classe à jour (démarrer, pause, reprise, remise à zéro). */
export async function reglerChrono(code, chrono) {
  await donnees.majPartielle(cheminSeance(code), { chrono });
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
  if (!s) throw new Error('Aucune séance avec ce code. Vérifie les cinq caractères au tableau.');
  if (s.etat !== 'ouverte') throw new Error('Cette séance est terminée.');
  const id = idEquipe(nom);
  const chemin = cheminEquipe(code, id);
  let deja = null;
  try { deja = await donnees.lire(chemin); }
  catch { throw new Error(`« ${nom} » est déjà pris. Choisis un autre nom.`); }
  if (deja && deja.appareil !== moi.uid) throw new Error(`« ${nom} » est déjà pris. Choisis un autre nom.`);
  if (deja) return { code, id, etat: deja, reprise: true };
  const etat = nouvelEtat(c, nom, moi.uid);
  try { await donnees.ecrire(chemin, etat); }
  catch { throw new Error(`« ${nom} » vient d'être pris. Choisis un autre nom.`); }
  return { code, id, etat, reprise: false };
}

/** Les séances créées par cette identité, de la plus récente à la plus ancienne. */
export async function mesSeances(uid) {
  if (!uid) return [];
  const l = await donnees.requete('seances', 'enseignantId', uid);
  return l.sort((a, b) => (b.creeLe || 0) - (a.creeLe || 0));
}

/** Efface la séance entière : équipes, avis, puis la séance elle-même. */
export async function effacerSeance(code) {
  for (const sous of ['equipes', 'avis']) {
    const docs = await donnees.lireCollection(`${cheminSeance(code)}/${sous}`);
    for (const d of docs) await donnees.supprimer(`${cheminSeance(code)}/${sous}/${d.id}`);
  }
  await donnees.supprimer(cheminSeance(code));
}

export const SIGNAUX = {
  temps: { t: 'Il reste 5 minutes à cette étape.', court: '5 minutes' },
  pause: { t: "Pause : regardez votre enseignant·e.", court: 'Pause' },
  debrief: { t: "On revient sur notre démarche, toute la classe ensemble.", court: 'Au retour en classe' }
};
