// eleve/envoi.js — la fiche de l'équipe part à chaque geste (avec un court délai) : l'enseignant·e
// suit la classe en direct, et une équipe qui rafraîchit la page reprend où elle était.

import * as donnees from '../donnees.js';
import { $, retarder } from '../outils.js';
import { cheminEquipe } from '../seance.js';
import { etat } from './etat.js';

const CHAMPS = ['maj', 'etape', 'atteinte', 'entree', 'temps', 'releves', 'docs', 'juge', 'zones',
  'comps', 'gespeg', 'gespegVu', 'historique', 'corridorRompu', 'mentions', 'reponses', 'fini', 'compteurs'];

/**
 * Le voyant en haut à droite, en mots simples (le survol en dit plus) :
 *   · « Enregistré » : l'enseignant·e a vos réponses ;
 *   · « Pas encore enregistré » : pas de connexion ; les réponses restent sur cet ordinateur
 *     et le site réessaie tout seul ;
 *   · « Séance terminée » : la séance a été fermée ou effacée, plus rien ne peut partir.
 */
const ETATS_ENVOI = {
  ok: ['1', 'Enregistré', 'Vos réponses sont enregistrées.'],
  attente: ['0', 'Pas encore enregistré', 'Pas de connexion pour l’instant. Vos réponses restent sur cet ordinateur ; le site réessaie tout seul.'],
  fin: ['0', 'Séance terminée', 'La séance a été fermée ou effacée : les nouvelles réponses ne peuvent plus partir.']
};
function etatEnvoi(e) {
  const z = $('#etat-envoi');
  const [ok, t, titre] = ETATS_ENVOI[e];
  // seulement quand l'état change : un lecteur d'écran ne répète pas « Enregistré » à chaque phrase tapée
  if (!z || z.textContent === t) return;
  z.setAttribute('data-ok', ok);
  z.textContent = t;
  z.title = titre;
}

let reessai = null;
async function envoyer() {
  const { E, code, idEq } = etat;
  if (!E || etat.apercu) return;   // l'aperçu de l'enseignant·e n'enregistre rien
  E.maj = Date.now();
  const champs = Object.fromEntries(CHAMPS.map((k) => [k, E[k] ?? null]));
  try {
    await donnees.majPartielle(cheminEquipe(code, idEq), champs);
    etatEnvoi('ok');
  } catch (e) {
    console.warn('Envoi impossible pour le moment', e);
    const perdu = /not-found|permission-denied/.test(e?.code || '');
    etatEnvoi(perdu ? 'fin' : 'attente');
    if (!perdu) { clearTimeout(reessai); reessai = setTimeout(() => sauver(), 8000); }   // on réessaie, sans rien demander
  }
}
export const sauver = retarder(envoyer, 1200);   // un envoi par pause de 1,2 s : peu d'écritures, suivi presque en direct
export const sauverTout = () => { sauver(); sauver.maintenant(); };
