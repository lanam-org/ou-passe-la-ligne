// eleve/etat.js — ce que partagent les morceaux de la page des équipes.
//
// Une seule source de vérité, l'objet `etat` : eleve.js le modifie (l'équipe entre,
// la séance change) ; les écrans le lisent et rendent du HTML.

import { mesure } from '../config.js';
import { chargerContenu } from '../outils.js';
import * as Rg from '../reglages.js';

// Le contenu d'origine, puis le contenu tel que la séance le règle (questions,
// minutes, corrections). Les réglages arrivent avec la séance et peuvent
// changer en cours de partie : le contenu est alors recalculé et l'écran redessiné.
export const base = await chargerContenu();

export const etat = {
  code: null, idEq: null,   // la séance et l'équipe
  E: null,                  // la fiche de l'équipe, enregistrée à chaque geste
  S: null,                  // la séance : réglages, chrono, message, bravos, état
  c: null, B: {},           // le contenu réglé pour la séance, et ses questions par identifiant
  apercu: false             // l'aperçu de l'enseignant·e : ni séance ni équipe, rien n'est enregistré
};

/** Ce qui ne vit qu'à l'écran. lus : les documents ouverts avec « Lire ». */
export const ui = { outil: 'preservation', effet: null, nouvelles: [], avis: {}, avisEnvoye: false,
  signalFerme: 0, rendue: -1, erreur: '', lus: new Set(),
  compVu: 0, compNeuf: false, bravoVu: 0, bravos: '{}', releveVu: null };

/** Redessiner l'écran, mettre à jour la barre du bas : eleve.js les branche au démarrage. */
export const page = { rendre: () => {}, majPied: () => {} };

let empreinte = '';
/** Recalcule le contenu quand les réglages de la séance changent. Vrai si quelque chose a changé. */
export function appliquerReglages(config) {
  const k = JSON.stringify(config || null);
  if (k === empreinte) return false;
  empreinte = k;
  etat.c = Rg.appliquer(base, config || null);
  etat.B = Object.fromEntries(etat.c.banque.map((q) => [q.id, q]));
  return true;
}
appliquerReglages(null);

export const idx = (id) => etat.c.etapes.findIndex((x) => x.id === id);
export const avisActif = () => mesure && !!etat.S?.questionnaire;
export const etapesVisibles = () => etat.c.etapes.filter((x) => x.id !== 'avis' || avisActif());
