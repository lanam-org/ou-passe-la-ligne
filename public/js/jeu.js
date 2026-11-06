// jeu.js — les règles du jeu, sans aucun affichage.
//
// Tout ce qui décide (ce qu'une ligne protège, quels villages elle vide, l'état
// du corridor, les gestes reconnus, les indicateurs de l'enseignant·e) vit ici,
// en fonctions pures. La page élève et la page enseignant·e s'en servent toutes
// les deux : elles calculent donc exactement la même chose.
//
// Aucun score, aucun total, aucun classement : une conséquence à chaque geste,
// et des gestes reconnus, une seule fois, sans comparaison.

/** L'état d'une équipe au départ. C'est aussi la forme du document Firestore. */
export function nouvelEtat(c, nom, appareil) {
  const maintenant = Date.now();
  return {
    nom, appareil, creeLe: maintenant, maj: maintenant,
    etape: 0, atteinte: 0, entree: maintenant, temps: {},
    releves: [], docs: [], juge: false,
    // Rien n'est zoné au départ : la ligne n'existe pas encore. Un secteur est « à décider » tant que
    // l'équipe ne lui a pas donné de zone (son historique est vide, voir decide()).
    zones: Object.fromEntries(c.secteurs.map((s) => [s.id, null])),
    comps: 0, gespeg: true, gespegVu: 0, historique: {}, corridorRompu: false,
    mentions: [], reponses: {}, fini: false,
    compteurs: { retours: 0, sauts: 0, clicsVides: 0, gestesTrace: 0, gestesComp: 0,
      apresComp: [0, 0, 0, 0], premierGeste: null, t0Trace: null }
  };
}

export const nomZone = (c, z) => (z ? c.zones[z].nom : 'hors de la ligne');
export const nbVillages = (c) => c.secteurs.filter((s) => s.habite).length;

/**
 * Un secteur est décidé dès qu'il a une zone, ou que l'équipe lui a donné « hors de la ligne » (la zone qu'il a au
 * départ : son historique le garde). Aucun nouveau champ dans la fiche de l'équipe ; une fiche d'avant le Playtest 2
 * (tout en préservation au départ) reste décidée.
 */
export const decide = (e, id) => e.zones?.[id] != null || (e.historique?.[id] || []).length > 0;
/** Les secteurs encore à décider, dans l'ordre de la carte. */
export const aDecider = (c, e) => c.secteurs.filter((s) => !decide(e, s.id));

/**
 * Le minimum avant d'arrêter la ligne (retours des enseignant·es, Playtest 2) : il n'y a pas de bonne réponse,
 * mais chaque secteur reçoit une décision et la ligne protège au moins un secteur en préservation.
 * Renvoie ce qui manque, en clair (vide : la ligne peut s'arrêter).
 */
export function manqueLigne(c, e) {
  const reste = aDecider(c, e);
  const manque = [];
  if (reste.length) manque.push(`${reste.length === 1 ? 'Un secteur reste' : `${reste.length} secteurs restent`} à décider : ${reste.map((s) => s.nom).join(', ')}`);
  if (!c.secteurs.some((s) => e.zones[s.id] === 'preservation')) manque.push('Aucun secteur en préservation : la ligne doit en protéger au moins un');
  return manque;
}

/** Ce que la ligne fait : secteurs, villages vidés ou gardés, corridor, visiteurs. */
export function releve(c, e) {
  const par = { preservation: 0, sauvage: 0, plein: 0, village: 0 };
  let dans = 0;
  const vides = [], gardes = [], dehors = [];
  for (const s of c.secteurs) {
    const z = e.zones[s.id];
    if (!z) { if (s.habite && decide(e, s.id)) dehors.push(s.nom); continue; }
    dans += 1; par[z] += 1;
    if (s.habite) (c.zones[z].habite ? gardes : vides).push(s.nom);
  }
  // le corridor ne se juge qu'une fois ses secteurs décidés : un secteur pas encore touché ne rompt rien
  const maillons = c.corridor.map((id) => e.zones[id]);
  const corridor = c.corridor.some((id) => !decide(e, id)) ? 'à décider'
    : maillons.some((z) => !z) ? 'rompu'
      : maillons.every((z) => z === 'preservation' || z === 'sauvage') ? 'continu' : 'affaibli';
  const visiteurs = (par.plein || par.village) ? 'fort' : par.sauvage ? 'sentiers seulement' : 'aucun';
  return { dans, total: c.secteurs.length, par, vides, gardes, dehors, corridor, visiteurs,
    aDecider: aDecider(c, e).map((s) => s.nom) };
}

const ajouterMention = (e, id, nouvelles) => {
  if (e.mentions.includes(id)) return;
  e.mentions.push(id);
  nouvelles.push(id);
};

/**
 * Applique une zone à un secteur et dit ce que ça change.
 * Renvoie { effet, nouvelles } — ou null si rien ne change.
 */
export function peindre(c, e, idSecteur, outil, maintenant = Date.now()) {
  const sec = c.secteurs.find((x) => x.id === idSecteur);
  if (!sec) return null;
  const cible = outil === 'hors' ? null : outil;
  // un secteur pas encore décidé peut recevoir la zone qu'il a déjà (« hors de la ligne ») : c'est une décision
  const premier = !decide(e, idSecteur);
  if (e.zones[idSecteur] === cible && !premier) return null;
  const avant = releve(c, e);
  const avantZone = e.zones[idSecteur];
  e.zones[idSecteur] = cible;
  // l'historique d'abord : un secteur tout juste décidé compte comme décidé dans le relevé d'après
  const hist = ((e.historique ||= {})[idSecteur] ||= []);
  for (const z of premier ? [cible || 'hors'] : [avantZone || 'hors', cible || 'hors']) if (!hist.includes(z)) hist.push(z);
  const apres = releve(c, e);
  const nouvelles = [];

  // le journal de l'enseignant·e (anonyme, jamais montré à l'élève)
  const ici = c.etapes[e.etape].id;
  const k = e.compteurs;
  if (ici === 'trace') {
    k.gestesTrace += 1;
    if (k.premierGeste == null && k.t0Trace != null) k.premierGeste = maintenant - k.t0Trace;
  }
  if (ici === 'comp') {
    k.gestesComp += 1;
    if (e.comps > 0) k.apresComp[e.comps - 1] += 1;
  }

  // ce que le geste révèle
  if (e.comps > 0) ajouterMention(e, 'rouverte', nouvelles);
  if (new Set(Object.values(e.zones).filter(Boolean)).size >= 3) ajouterMention(e, 'zonage', nouvelles);
  if (sec.habite && ['preservation', 'sauvage', 'plein'].some((z) => hist.includes(z)) && hist.includes('village'))
    ajouterMention(e, 'arbitrage', nouvelles);
  if (apres.corridor === 'rompu') e.corridorRompu = true;
  if (e.corridorRompu && avant.corridor !== 'continu' && apres.corridor === 'continu')
    ajouterMention(e, 'repare', nouvelles);

  return {
    nouvelles,
    effet: {
      id: sec.id, secteur: sec.nom, fait: sec.fait, src: sec.src, de: avantZone, a: cible, premier, etape: ici, comps: e.comps,
      dans: apres.dans - avant.dans,
      vides: apres.vides.length - avant.vides.length,
      gardes: apres.gardes.length - avant.gardes.length,
      dehors: apres.dehors.length - avant.dehors.length,
      corridor: apres.corridor, corridorChange: apres.corridor !== avant.corridor
    }
  };
}

/** Ouvre un relevé. Le rouvrir le remontre, sans jamais le retirer des relevés faits. */
export function ouvrirReleve(c, e, i) {
  const nouvelles = [];
  if (!e.releves.includes(i)) e.releves = [...e.releves, i];
  if (e.releves.length === c.releves.length) ajouterMention(e, 'releves', nouvelles);
  return nouvelles;
}

/** Coche ou décoche un document (trois au plus). */
export function basculerDoc(e, id) {
  if (e.juge) return;
  if (e.docs.includes(id)) e.docs = e.docs.filter((x) => x !== id);
  else if (e.docs.length < 3) e.docs = [...e.docs, id];
}

/** Soumet le tri : chaque document retenu reçoit son verdict. */
/** Un document par son identifiant, même retiré de la séance depuis (une option éteinte). */
export const docParId = (c, id) => (c.documentsTous || c.documents).find((d) => d.id === id);

export function juger(c, e) {
  const nouvelles = [];
  e.juge = true;
  const pris = e.docs.map((id) => docParId(c, id)).filter(Boolean);
  if (pris.length === 3 && pris.every((d) => d.utile)) ajouterMention(e, 'tri', nouvelles);
  if (e.docs.includes('d5')) ajouterMention(e, 'sources', nouvelles);
  if (e.docs.includes('d3')) ajouterMention(e, 'temoin', nouvelles);
  return nouvelles;
}

export function basculerGespeg(e) {
  const nouvelles = [];
  e.gespeg = !e.gespeg;
  e.gespegVu += 1;
  // masquer PUIS réafficher : c'est la comparaison qu'on reconnaît
  if (e.gespegVu >= 2 && e.gespeg) ajouterMention(e, 'couches', nouvelles);
  return nouvelles;
}

export function mentionner(e, id) {
  const nouvelles = [];
  ajouterMention(e, id, nouvelles);
  return nouvelles;
}

/** Change d'étape en arrêtant le chronomètre de celle qu'on quitte. */
export function allerA(c, e, i, maintenant = Date.now()) {
  const ancienne = c.etapes[e.etape].id;
  e.temps[ancienne] = (e.temps[ancienne] || 0) + Math.max(0, maintenant - (e.entree || maintenant));
  e.etape = i;
  e.entree = maintenant;
  e.atteinte = Math.max(e.atteinte, i);
  if (c.etapes[i].id === 'trace' && e.compteurs.t0Trace == null) e.compteurs.t0Trace = maintenant;
}

/** Une réponse écrite compte quand elle dit au moins quelque chose. */
export const repondu = (e, id) => String(e.reponses?.[id] || '').trim().length >= 2;

/** Les questions écrites posées dans cette séance (réglages appliqués), dans l'ordre du jeu. */
export const questionsEcrites = (c) => c.q?.ecrites || c.banque.filter((q) => q.sort === 'posee' && q.ecrit);

/** Temps passé dans une étape, en comptant l'étape en cours. */
export function tempsEtape(c, e, id, maintenant = Date.now()) {
  const enCours = c.etapes[e.etape]?.id === id && !e.fini ? Math.max(0, maintenant - (e.entree || maintenant)) : 0;
  return (e.temps?.[id] || 0) + enCours;
}

/**
 * Les indicateurs d'une équipe. Un indicateur = un test fermé. Les repères
 * sont des hypothèses à ajuster après le premier essai, pas des normes.
 */
export function indicateurs(c, e, maintenant = Date.now()) {
  const r = releve(c, e);
  const idx = (id) => c.etapes.findIndex((x) => x.id === id);
  const utiles = e.docs.filter((id) => docParId(c, id)?.utile).length;
  const zones = new Set(Object.values(e.zones).filter(Boolean)).size;
  const k = e.compteurs || {};
  const apresComp = k.apresComp || [0, 0, 0, 0];
  const rezone = apresComp.some((n) => n > 0);
  const jeu = c.etapes.filter((x) => x.id !== 'avis');
  const depasse = jeu.filter((x) => tempsEtape(c, e, x.id, maintenant) > 1.5 * x.min * 60000).map((x) => x.t);
  const ecrites = questionsEcrites(c);
  return [
    { g: 'Apprentissage', k: 'Documents utiles retenus', v: e.juge ? `${utiles} / 3` : '', ok: e.juge ? utiles >= 2 : null },
    { g: 'Apprentissage', k: 'Document « deux sources » retenu', v: e.juge ? (e.docs.includes('d5') ? 'oui' : 'non') : '' },
    { g: 'Apprentissage', k: 'Rezonage après un autre point de vue', v: e.atteinte >= idx('bilan') ? (rezone ? 'oui' : 'non') : '',
      ok: e.atteinte >= idx('bilan') ? rezone : null },
    { g: 'Apprentissage', k: 'Gestes après chaque point de vue', v: e.comps ? apresComp.join(' · ') : '' },
    { g: 'Apprentissage', k: 'Zones dans la ligne', v: e.atteinte >= idx('trace') ? String(zones) : '',
      ok: e.atteinte >= idx('comp') ? zones >= 3 : null },
    { g: 'Apprentissage', k: 'Corridor', v: e.atteinte >= idx('trace') ? r.corridor : '' },
    { g: 'Engagement', k: 'Étape atteinte', v: `${e.atteinte + 1} / ${jeu.length}`, ok: e.atteinte >= idx('debrief') },
    { g: 'Engagement', k: 'Étapes > 1,5 × le temps prévu', v: depasse.length ? depasse.join(', ') : 'aucune', ok: depasse.length === 0 },
    { g: 'Engagement', k: 'Réponses écrites', v: `${ecrites.filter((q) => repondu(e, q.id)).length} / ${ecrites.length}` },
    { g: 'Engagement', k: 'Gestes reconnus', v: `${e.mentions.length} / ${Object.keys(c.mentions).length}` },
    { g: 'Utilisabilité', k: 'Premier geste sur la carte', v: k.premierGeste != null ? `${Math.round(k.premierGeste / 1000)} s` : '',
      ok: k.premierGeste != null ? k.premierGeste < 60000 : null },
    { g: 'Utilisabilité', k: 'Clics dans le vide sur la carte', v: String(k.clicsVides || 0), ok: (k.clicsVides || 0) <= 3 },
    { g: 'Utilisabilité', k: 'Retours en arrière', v: String(k.retours || 0), ok: (k.retours || 0) <= 2 }
  ];
}
