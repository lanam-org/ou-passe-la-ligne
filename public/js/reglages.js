// reglages.js — ce que l'enseignant·e peut adapter, sans toucher au code.
//
//   · la DURÉE : trois formats prêts (50 min, 75 min, deux périodes), puis chaque
//     étape à la minute près, avant ou pendant la séance ;
//   · les QUESTIONS : chacune des 28 questions de la banque se pose (requise ou
//     facultative) ou non, et l'enseignant·e peut en ajouter ;
//   · les CORRECTIONS : un fait, un texte ou une source qui change avec le temps
//     se corrige ici, avec sa raison, sans effacer l'original ;
//   · le CHRONO de la classe : démarrer, mettre en pause, reprendre.
//
// Tout tient dans un objet « réglages » : celui de l'enseignant·e (sa version,
// réutilisée à chaque nouvelle séance) est copié dans la séance à sa création,
// puis peut changer pendant la séance. Les équipes lisent les réglages de LEUR
// séance : un changement en cours de partie arrive chez elles en direct.
//
// Fonctions pures, sans affichage : la page élève et la page enseignant·e
// calculent exactement la même chose.

import { esc } from './outils.js';
import { repondu } from './jeu.js';

const copie = (o) => JSON.parse(JSON.stringify(o));

/* ------------------------------------------------------------ les formats */

// Les 12 questions de la version allégée, écrites en équipe (le reste est oral ou porté par l'écran)
const ECRITES_STANDARD = ['F1.2', 'F2.1', 'F2.4', 'F3.2', 'F4.3', 'F5.1', 'F5.4', 'F6.1'];
const ORALES_STANDARD = ['F7.1', 'F7.2', 'F7.5'];

export const FORMATS = {
  courte: {
    nom: 'Courte · 50 min', resume: 'Une période de 50 minutes : quatre questions requises, les autres facultatives.',
    miseEnRoute: 5, minutes: { arrivee: 3, marche: 7, dossier: 8, trace: 7, comp: 8, bilan: 3, debrief: 9, avis: 3 },
    questions: { 'F1.2': 'requise', 'F2.1': 'facultative', 'F2.4': 'facultative', 'F3.2': 'requise', 'F4.3': 'requise',
      'F5.1': 'facultative', 'F5.4': 'requise', 'F6.1': 'facultative', 'F7.1': 'on', 'F7.2': 'on', 'F7.5': 'off' }
  },
  standard: {
    nom: 'Standard · 75 min', resume: 'La version allégée : 12 questions dans une période de 75 minutes.',
    miseEnRoute: 8, minutes: { arrivee: 4, marche: 10, dossier: 12, trace: 10, comp: 12, bilan: 5, debrief: 14, avis: 3 },
    questions: {}
  },
  deux: {
    nom: 'Deux périodes · 150 min', resume: 'Les 28 questions : celles de la version allégée restent requises, les questions de reprise s\'ajoutent, facultatives. Coupure conseillée après le tracé.',
    miseEnRoute: 16, coupure: 'trace',
    minutes: { arrivee: 6, marche: 20, dossier: 22, trace: 16, comp: 24, bilan: 14, debrief: 32, avis: 3 },
    questions: { 'F2.2': 'facultative', 'F2.3': 'facultative', 'F2.5': 'facultative', 'F2.6': 'facultative',
      'F3.3': 'facultative', 'F4.1': 'facultative', 'F4.2': 'facultative', 'F4.4': 'facultative',
      'F5.2': 'facultative', 'F5.3': 'facultative', 'F6.2': 'facultative', 'F6.3': 'facultative',
      'F7.3': 'on', 'F7.4': 'on', 'F7.6': 'on' }
  }
};

/** Le mode d'une question de la banque : 'ecrite', 'orale', 'geste' (F3.1, le tri) ou 'enseignant' (F1.1). */
export function modeQuestion(q) {
  if (q.id === 'F3.1') return 'geste';
  if (q.id === 'F1.1') return 'enseignant';
  if (q.id.startsWith('F7.')) return 'orale';
  return 'ecrite';
}

/** L'étape d'une question de la banque : F2.x → l'exploration, etc. */
export const etapeQuestion = (c, q) => q.etape || c.etapes[Number(q.id[1]) - 1]?.id;

/** L'état d'une question dans le format standard (la version allégée). */
function etatStandard(q) {
  const m = modeQuestion(q);
  if (m === 'ecrite') return ECRITES_STANDARD.includes(q.id) ? 'requise' : 'off';
  if (m === 'orale') return ORALES_STANDARD.includes(q.id) ? 'on' : 'off';
  return 'fixe';
}

/** Réglages complets d'un format, prêts à être enregistrés. */
export function reglagesDuFormat(base, format = 'standard', garder = {}) {
  // hasOwn : un format « __proto__ » venu d'un fichier importé ne tombe pas sur Object.prototype
  const f = Object.hasOwn(FORMATS, format) ? FORMATS[format] : FORMATS.standard;
  const questions = {};
  for (const q of base.banque) {
    if (etatStandard(q) === 'fixe') continue;
    questions[q.id] = f.questions[q.id] || etatStandard(q);
  }
  return {
    format, miseEnRoute: f.miseEnRoute, minutes: { ...f.minutes }, questions,
    ajouts: garder.ajouts || [], corrections: garder.corrections || {}
  };
}

/** Complète des réglages partiels (anciens, ou venus d'un import) avec les valeurs du format. */
export function completer(base, r) {
  const d = reglagesDuFormat(base, r?.format);
  if (!r) return d;
  return {
    format: r.format || d.format,
    miseEnRoute: Number.isFinite(r.miseEnRoute) ? r.miseEnRoute : d.miseEnRoute,
    minutes: { ...d.minutes, ...(r.minutes || {}) },
    questions: { ...d.questions, ...(r.questions || {}) },
    ajouts: Array.isArray(r.ajouts) ? r.ajouts : [],
    corrections: r.corrections || {}
  };
}

/* ------------------------------------------------------------ les corrections */

// Les champs affichés tels quels (ils contiennent du HTML d'origine) : une
// correction y est toujours ÉCHAPPÉE, pour qu'aucun texte saisi ne s'exécute
// chez les élèves.
const BRUTS = new Set(['complications.x', 'complications.quoi']);

// Les SEULS champs qu'une correction peut toucher : [clé, libellé, texte long].
// Une correction venue d'ailleurs (un fichier importé, la base) qui viserait un
// autre champ — un lien, le tracé d'un secteur, un identifiant — est ignorée.
const CHAMPS = {
  releves: [['t', 'Titre'], ['x', 'Texte', 1], ['s', 'Source']],
  documents: [['t', 'Titre'], ['x', 'Texte', 1], ['s', 'Source'], ['v', 'Verdict affiché après le tri', 1]],
  complications: [['t', 'Titre'], ['x', 'Texte', 1], ['s', 'Source'], ['quoi', 'Consigne', 1]],
  secteurs: [['fait', 'Fait affiché', 1], ['src', 'Source']],
  bilan: [['texte', 'Texte', 1], ['src', 'Source', 1]],
  banque: [['eleve', 'Question posée aux élèves', 1], ['reponse', 'Réponse attendue', 1]]
};
const corrigeable = (groupe, champ) => Object.hasOwn(CHAMPS, groupe) && CHAMPS[groupe].some(([k]) => k === champ);

/** Ce qui se corrige, groupé comme à l'écran. Clé : « groupe|identifiant|champ ». */
export function corrigeables(base) {
  const sansBalises = (t) => String(t || '').replace(/<[^>]+>/g, '');
  const item = (groupe, id, titre, src) => ({ groupe, id, titre,
    champs: CHAMPS[groupe].map(([k, label, long]) => ({ cle: `${groupe}|${id}|${k}`, k, label, long: !!long,
      origine: sansBalises(src[k]) })) });
  return [
    { t: 'Relevés de terrain', items: base.releves.map((r, i) => item('releves', i, `Relevé ${i + 1} · ${r.t}`, r)) },
    { t: 'Documents du dossier', items: base.documents.map((d) => item('documents', d.id, d.t, d)) },
    { t: 'Points de vue', items: base.complications.map((x) => item('complications', x.id, x.t, x)) },
    { t: 'Secteurs de la carte', items: base.secteurs.map((s) => item('secteurs', s.id, s.nom, s)) },
    { t: 'Bilan', items: base.bilan.map((b, i) => item('bilan', i, b.t, b)) },
    { t: 'Questions de la banque', items: base.banque.map((q) => item('banque', q.id, `${q.id} · ${q.eleve || q.q}`,
      { ...q, eleve: q.eleve || q.q })) }
  ];
}

/** Le contenu, réglages appliqués. Ne modifie jamais `base`. */
export function appliquer(base, reglages) {
  const r = completer(base, reglages);
  const c = copie(base);
  // corrections
  for (const [cle, corr] of Object.entries(r.corrections || {})) {
    const [groupe, id, champ] = cle.split('|');
    if (!corrigeable(groupe, champ)) continue;
    const liste = c[groupe];
    if (!Array.isArray(liste)) continue;
    const cible = /^\d+$/.test(id) && groupe !== 'banque' ? liste[Number(id)] : liste.find((x) => x.id === id);
    if (!cible || typeof corr?.valeur !== 'string') continue;
    cible[champ] = BRUTS.has(`${groupe}.${champ}`) ? esc(corr.valeur) : corr.valeur;
    if (groupe === 'banque' && champ === 'eleve') cible.q = corr.valeur;
  }
  // minutes
  c.etapes = c.etapes.map((x) => ({ ...x, min: Math.max(1, Math.min(90, Number(r.minutes[x.id]) || x.min)) }));
  c.miseEnRoute = { ...c.miseEnRoute, min: r.miseEnRoute };
  // questions
  const ecrites = [], orales = [];
  for (const q of c.banque) {
    const m = modeQuestion(q);
    const etape = etapeQuestion(c, q);
    const e = r.questions[q.id];
    q.eleve ||= q.q;
    if (m === 'ecrite' && (e === 'requise' || e === 'facultative'))
      ecrites.push({ id: q.id, etape, eleve: q.eleve, reponse: q.reponse, sources: q.sources, requise: e === 'requise' });
    if (m === 'orale' && e === 'on') orales.push({ id: q.id, eleve: q.eleve, reponse: q.reponse, sources: q.sources });
  }
  for (const a of r.ajouts || []) {
    if (!a || !a.id || !a.q) continue;
    const q = { id: a.id, etape: a.etape, eleve: a.q, reponse: a.reponse || '', sources: a.source ? [a.source] : [],
      requise: !!a.requise, ajout: true };
    if (a.mode === 'orale') orales.push(q); else ecrites.push(q);
  }
  const ordre = (x) => c.etapes.findIndex((y) => y.id === x.etape);
  ecrites.sort((a, b) => ordre(a) - ordre(b));
  c.q = { ecrites, orales };
  c.reglages = r;
  c.coupure = FORMATS[r.format]?.coupure || null;
  return c;
}

/* ------------------------------------------------------------ les questions, chez l'équipe */

/**
 * Une question écrite apparaît quand l'équipe a vu ce qui sert à y répondre :
 * F2.n après le relevé n, F3.x après le tri, F5.n après la complication n.
 * Une question ajoutée apparaît en arrivant à l'étape, sauf au dossier (après
 * le tri), à la marche (après le dernier relevé) et aux complications (après
 * la dernière).
 */
export function debloquee(q, e, c) {
  const m = /^F(\d)\.(\d)$/.exec(q.id);
  if (!m) {
    if (q.etape === 'dossier') return !!e.juge;
    if (q.etape === 'marche') return e.releves.length >= (c?.releves.length ?? 0);
    if (q.etape === 'comp') return e.comps >= (c?.complications.length ?? 0);
    return true;
  }
  const n = Number(m[1]), k = Number(m[2]);
  if (n === 2) return e.releves.includes(k - 1);
  if (n === 3) return !!e.juge;
  if (n === 5) return e.comps >= k;
  return true;
}

/** Les questions écrites d'une étape, déjà visibles pour cette équipe. */
export const questionsVisibles = (c, e, etapeId) =>
  (c.q?.ecrites || []).filter((q) => q.etape === etapeId && debloquee(q, e, c));

/** Vrai si toutes les questions REQUISES visibles de l'étape ont une réponse. */
export const requisesOK = (c, e, etapeId) => questionsVisibles(c, e, etapeId).every((q) => !q.requise || repondu(e, q.id));

/**
 * Les questions d'étapes déjà passées restées sans réponse : une question
 * ajoutée (ou rendue requise) en cours de partie, par exemple. Les questions
 * facultatives laissées de côté ne reviennent pas.
 */
export function aRattraper(c, e) {
  return (c.q?.ecrites || []).filter((q) => {
    const i = c.etapes.findIndex((x) => x.id === q.etape);
    return i > -1 && i < e.etape && (q.requise || q.ajout) && debloquee(q, e, c) && !repondu(e, q.id);
  });
}

/* ------------------------------------------------------------ le chrono de la classe */

// chrono = { debut, pause, pauses: [{ a, b }, …] } — tout en millisecondes.
// (Des objets, pas des paires [a, b] : Firestore refuse un tableau dans un tableau.)

const chevauche = (a, b, x, y) => Math.max(0, Math.min(b, y) - Math.max(a, x));

/** Temps de pause compris entre deux instants. */
export function enPause(chrono, de, a) {
  if (!chrono) return 0;
  let t = (chrono.pauses || []).reduce((s, p) => s + chevauche(de, a, p.a, p.b), 0);
  if (chrono.pause) t += chevauche(de, a, chrono.pause, a);
  return t;
}

/** Temps écoulé au chrono de la classe, pauses retirées. */
export function ecoule(chrono, maintenant = Date.now()) {
  if (!chrono?.debut) return 0;
  return Math.max(0, maintenant - chrono.debut - enPause(chrono, chrono.debut, maintenant));
}

/** Temps passé par l'équipe dans son étape en cours, pauses de la classe retirées. */
export function tempsDansEtape(e, chrono, maintenant = Date.now()) {
  const de = e.entree || maintenant;
  return Math.max(0, maintenant - de - enPause(chrono, de, maintenant));
}

export const totalPrevu = (c) => c.etapes.filter((x) => x.id !== 'avis').reduce((s, x) => s + x.min, 0);

/** Ce qu'il reste à l'équipe dans son étape en cours, en ms (négatif : temps prévu dépassé). */
export function resteEtape(c, e, chrono, maintenant = Date.now()) {
  const x = c.etapes[e.etape];
  if (!x) return 0;
  return x.min * 60000 - (e.temps?.[x.id] || 0) - tempsDansEtape(e, chrono, maintenant);
}

/** L'étape où se trouvent le plus d'équipes encore en jeu (pour « +5 min à l'étape de la classe »). */
export function etapeDeLaClasse(c, equipes) {
  const n = {};
  for (const e of equipes) if (!e.fini) n[e.etape] = (n[e.etape] || 0) + 1;
  const i = Object.entries(n).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  return i == null ? null : c.etapes[Number(i)];
}
