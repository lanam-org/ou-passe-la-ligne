// carte.js — la carte schématique de la presqu'île, et ce qu'elle affiche.
//
// La carte change à chaque choix de l'équipe (retours des enseignant·es, Playtest 2) : la zone de chaque secteur
// se lit à la couleur ET au motif — jamais la couleur seule ; un secteur pas encore décidé est hachuré ; chaque
// village est une maison, entière s'il reste habité, barrée s'il est vidé ; le corridor écologique est un trait
// (continu, affaibli, rompu). Carte schématique, dessinée pour le jeu : positions justes, pas les formes ni les
// tailles — et l'écran le dit. Ce n'est pas une image à faire autoriser : `images` (config.js) ne la touche pas.
//
// Le geste, au tracé : on touche un secteur, puis on choisit sa zone dans le panneau à côté (panneauSecteur).

import { esc } from './outils.js';
import { releve, nomZone, nbVillages, decide, aDecider } from './jeu.js';

const MOTIFS = `<defs>
  <pattern id="m-pres" width="7" height="7" patternUnits="userSpaceOnUse">
    <rect width="7" height="7" fill="var(--z-pres)"/></pattern>
  <pattern id="m-sauv" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="7" height="7" fill="var(--z-sauv)"/>
    <line x1="0" y1="0" x2="0" y2="7" stroke="var(--z-trait)" stroke-width="2.2"/></pattern>
  <pattern id="m-plein" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="var(--z-plein)"/>
    <circle cx="4" cy="4" r="1.5" fill="var(--z-trait)"/></pattern>
  <pattern id="m-vill" width="9" height="9" patternUnits="userSpaceOnUse">
    <rect width="9" height="9" fill="var(--z-vill)"/>
    <rect x="2" y="2" width="4" height="4" fill="none" stroke="var(--z-trait)" stroke-width="1.4"/></pattern>
  <pattern id="m-decider" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
    <rect width="10" height="10" fill="var(--terre)"/>
    <line x1="0" y1="0" x2="0" y2="10" stroke="var(--fort)" stroke-width="3"/></pattern>
</defs>`;

// La maison de chaque village, posée au-dessus de son nom (positions du schéma, pas des données du jeu).
const MAISONS = { anse: [90, 125], rosiers: [205, 136], morris: [90, 198], penouille: [92, 280], grave: [218, 271], ship: [334, 248] };
const DECALAGE_NOM = { ship: 7 };   // Ship Head : le nom descend un peu pour laisser la place à sa maison

// La règle de chaque zone, en une phrase courte (le panneau de choix et la légende).
export const REGLES = {
  preservation: 'Personne n\'entre. Personne n\'habite.',
  sauvage: 'Des sentiers. Personne n\'habite.',
  plein: 'Des visiteurs. Personne n\'habite.',
  village: 'On peut y habiter.',
  hors: 'Pas protégé. Personne ne part.'
};

/**
 * L'état d'un village sur la carte : 'habite' (personne ne part), 'vide' (la zone ne permet pas d'habiter),
 * 'decider' (pas encore décidé, au tracé). Avant le tracé, tous les villages sont habités.
 */
function etatVillage(c, e, s, neutre) {
  if (neutre) return 'habite';
  if (!decide(e, s.id)) return 'decider';
  const z = e.zones[s.id];
  return !z || c.zones[z].habite ? 'habite' : 'vide';
}

function maison(x, y, etatV) {
  // une maison : un toit et un mur ; barrée d'une croix si le village est vidé
  const corps = '<path d="M-7,1 L0,-6 L7,1 L7,8 L-7,8 Z"/>';
  if (etatV === 'vide') return `<g class="maison maison--vide" transform="translate(${x} ${y})" aria-hidden="true">${corps}
    <path class="maison-x" d="M-9,-7 L9,10 M9,-7 L-9,10"/></g>`;
  return `<g class="maison${etatV === 'decider' ? ' maison--decider' : ''}" transform="translate(${x} ${y})" aria-hidden="true">${corps}</g>`;
}

/**
 * @param c   le contenu
 * @param e   l'état de l'équipe
 * @param o   { releves: bool (les pastilles des relevés), cliquable: bool (les secteurs se touchent),
 *              choisi: id du secteur choisi, neutre: bool (avant le tracé : le territoire sans zones),
 *              mini: bool, titre: texte de l'étiquette (lecteur d'écran), sansLegende: bool }
 */
export function carte(c, e, o = {}) {
  const { releves: avecReleves = false, cliquable = false, choisi = null, neutre = false, mini = false } = o;

  const fill = (s) => {
    if (neutre) return 'var(--terre)';
    if (!decide(e, s.id)) return 'url(#m-decider)';
    const z = e.zones[s.id];
    return z ? c.zones[z].motif : 'var(--sable)';
  };
  const libelle = (s) => {
    if (neutre) return s.habite ? 'village habité' : 'forêt';
    if (!decide(e, s.id)) return 'à décider';
    const z = e.zones[s.id];
    const v = s.habite ? (etatVillage(c, e, s) === 'vide' ? ', village vidé' : ', village habité') : '';
    return `${nomZone(c, z)}${v}`;
  };

  const zones = c.secteurs.map((s) => {
    const hors = !neutre && decide(e, s.id) && !e.zones[s.id];
    return `<path class="sect${s.id === choisi ? ' sect--choisi' : ''}" d="${s.d}" ${cliquable ? `data-sect="${s.id}"` : ''}
      fill="${fill(s)}" stroke="${hors ? 'var(--fort)' : 'var(--surface)'}" stroke-width="2.5" stroke-linejoin="round"
      ${hors ? 'stroke-dasharray="5 4"' : ''}
      ${cliquable ? `role="button" tabindex="0" aria-pressed="${s.id === choisi}"` : 'pointer-events="none"'}
      aria-label="${esc(s.nom)} : ${esc(libelle(s))}"><title>${esc(s.nom)} : ${esc(libelle(s))}</title></path>`;
  }).join('');
  // le secteur choisi, redessiné par-dessus : son contour se voit entier
  const sc = choisi && c.secteurs.find((s) => s.id === choisi);
  const contour = sc ? `<path d="${sc.d}" fill="none" stroke="var(--encre)" stroke-width="4" stroke-linejoin="round" pointer-events="none"/>
    <path d="${sc.d}" fill="none" stroke="var(--surface)" stroke-width="1.5" stroke-dasharray="4 4" stroke-linejoin="round" pointer-events="none"/>` : '';

  const maisons = c.secteurs.filter((s) => s.habite && MAISONS[s.id]).map((s) => maison(...MAISONS[s.id], etatVillage(c, e, s, neutre))).join('');

  // le nom écrit sur la carte : déjà dit par le secteur lui-même (aria-label), pas deux fois au lecteur d'écran
  const noms = mini ? '' : c.secteurs.map((s) =>
    `<text class="sect-nom" x="${s.tx}" y="${s.ty + (DECALAGE_NOM[s.id] || 0) + 4}" text-anchor="middle" aria-hidden="true">${esc(s.nom)}</text>`).join('');

  // le corridor : de l'intérieur de la Gaspésie (à l'ouest) vers la forêt du parc
  const r = releve(c, e);
  const corridor = neutre ? 'continu' : r.corridor;
  const etatLien = (id) => (neutre ? 'continu' : !decide(e, id) ? 'à décider' : !e.zones[id] ? 'rompu'
    : ['preservation', 'sauvage'].includes(e.zones[id]) ? 'continu' : 'affaibli');
  const pire = (a, b) => ['rompu', 'à décider', 'affaibli', 'continu'].find((x) => [a, b].includes(x));
  const eMorris = etatLien('morris');
  const liens = [[[6, 226], [92, 232], eMorris], [[92, 232], [300, 224], pire(eMorris, etatLien('foret'))]];
  const trait = liens.map(([a, b, x]) => {
    const coul = x === 'continu' ? 'var(--env)' : x === 'affaibli' ? 'var(--eco)' : x === 'rompu' ? 'var(--action)' : 'var(--pale)';
    const tiret = x === 'continu' ? '0' : x === 'affaibli' ? '3 5' : x === 'rompu' ? '7 6' : '2 4';
    // pointer-events:none : sinon le trait passe devant les secteurs et avale le clic. Un liseré de la couleur
    // du fond, dessous : le trait se lit sur le vert foncé de la préservation, dans les trois affichages.
    const l = `x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-dasharray="${tiret}" stroke-linecap="round" pointer-events="none"`;
    return `<line ${l} stroke="var(--surface)" stroke-width="7"/><line ${l} stroke="${coul}" stroke-width="3.5"/>`;
  }).join('') + (mini ? '' : `<text class="carte-corr" x="170" y="243" aria-hidden="true">corridor ${neutre ? '' : esc(corridor)}</text>`);

  // Gespe'gewa'gi entoure TOUS les secteurs, dedans comme dehors : la ligne de
  // l'équipe ne le découpe pas, parce qu'elle ne parle pas de la même chose.
  const enveloppe = e.gespeg ? `
    <path d="M0,84 L150,90 L300,110 L404,160 L452,238 L404,290 L292,326 L150,352 L0,364"
      fill="none" stroke="var(--gespeg)" stroke-width="3" stroke-dasharray="11 7"
      stroke-linejoin="round" pointer-events="none" opacity=".92"/>
    ${mini ? '' : `<text x="150" y="62" class="mono" font-size="12" fill="var(--gespeg)" pointer-events="none"
      font-weight="600">GESPE'GEWA'GI</text>
    <text x="150" y="76" font-size="10" fill="var(--gespeg)" pointer-events="none">territoire mi'gmaq · depuis des temps immémoriaux</text>`}` : '';

  const pins = avecReleves ? c.releves.map((a, i) => {
    const vu = e.releves.includes(i);
    return `<g class="pin" data-releve="${i}" role="button" tabindex="0" aria-pressed="${vu}"
      aria-label="Relevé ${i + 1}${vu ? ` (lu) : ${esc(a.t)}` : ''}"><title>Relevé ${i + 1}${vu ? ` : ${esc(a.t)}` : ''}</title>
      <circle cx="${a.cx}" cy="${a.cy}" r="15" fill="${vu ? 'var(--env)' : 'var(--primaire)'}"
        stroke="var(--surface)" stroke-width="3"/>
      <text x="${a.cx}" y="${a.cy + 4.5}" text-anchor="middle" class="pin-n" fill="var(--surface)">${vu ? '✓' : i + 1}</text>
    </g>`;
  }).join('') : '';

  // Une image en lecture seule ; un groupe dès qu'elle contient des secteurs ou des relevés à toucher
  // (une « image » ne peut pas contenir de boutons : les lecteurs d'écran ne les verraient pas).
  const role = cliquable || avecReleves ? 'group' : 'img';
  const etiquette = o.titre || (neutre ? 'Carte schématique de la presqu\'île de Forillon en 1970 : sept secteurs, six villages habités'
    : `Carte schématique de votre ligne : ${r.dans} secteur${r.dans > 1 ? 's' : ''} sur ${r.total} dans le parc, ${r.vides.length} village${r.vides.length > 1 ? 's' : ''} vidé${r.vides.length > 1 ? 's' : ''}, corridor ${corridor}`);
  const svg = `<svg class="carte${mini ? ' carte--mini' : ''}" viewBox="0 0 460 380" role="${role}" aria-label="${esc(etiquette)}">
    ${MOTIFS}
    <rect x="0" y="0" width="460" height="380" fill="var(--mer)"/>
    <path d="M0,96 L40,108 L40,332 L0,344 Z" fill="var(--terre)" pointer-events="none"/>
    ${mini ? '' : `<text x="22" y="150" class="mono" font-size="9" fill="var(--roche)" text-anchor="middle"
      transform="rotate(-90 22 150)" pointer-events="none">GASPÉSIE</text>
    <text x="230" y="36" class="mono" font-size="10" fill="var(--roche)">GOLFE DU SAINT-LAURENT</text>
    <text x="300" y="366" class="mono" font-size="10" fill="var(--roche)">BAIE DE GASPÉ</text>`}
    ${zones}${contour}${trait}${maisons}${enveloppe}${noms}${pins}
    ${mini ? '' : `<g transform="translate(414,36)" aria-hidden="true"><path d="M0,-16 L5,4 L0,0 L-5,4 Z" fill="var(--encre)"/>
      <text x="0" y="18" text-anchor="middle" class="mono" font-size="9" fill="var(--doux)">N</text></g>`}
  </svg>`;

  if (o.sansLegende || mini) return svg;
  return svg + legende(c, e, { neutre, bascule: cliquable || avecReleves, court: o.legendeCourte });
}

/** Sous la carte : ce que veulent dire les maisons et le trait ; Gespe'gewa'gi à afficher ou masquer. */
function legende(c, e, { neutre, bascule, court = false }) {
  return `<div class="legende">
      <span><svg width="18" height="16" viewBox="-9 -8 18 18" aria-hidden="true">${maison(0, 0, 'habite')}</svg> village habité</span>
      ${neutre ? '' : `<span><svg width="18" height="16" viewBox="-9 -8 18 18" aria-hidden="true">${maison(0, 0, 'vide')}</svg> village vidé</span>
      <span><i class="leg-decider" aria-hidden="true"></i> à décider</span>`}
      <span><i style="border-top:3px solid var(--env)" aria-hidden="true"></i> corridor continu</span>
      ${neutre ? '' : `<span><i style="border-top:3px dashed var(--eco)" aria-hidden="true"></i> affaibli</span>
      <span><i style="border-top:3px dashed var(--action)" aria-hidden="true"></i> rompu</span>`}
      ${bascule ? `<button class="bascule" data-gespeg="1" aria-pressed="${e.gespeg}">
        <i style="border-top:3px dashed var(--gespeg);width:16px" aria-hidden="true"></i>
        Gespe'gewa'gi : ${e.gespeg ? 'affiché' : 'masqué'}</button>` : ''}
    </div>
    ${court ? '<p class="avert avert--court">Carte schématique : positions justes, pas les formes ni les tailles.</p>'
    : `<p class="avert">Carte schématique : les positions sont justes, pas les formes ni les tailles. Les six villages
      sont les principaux secteurs expropriés en 1970, selon Parcs Canada.</p>`}`;
}

/**
 * Le panneau à côté de la carte, au tracé et aux autres points de vue : le secteur choisi, puis ses cinq choix
 * (les quatre zones et « hors de la ligne »), chacun avec sa règle et, pour un village, ce qu'il devient.
 * Sans secteur choisi : la liste des secteurs, pour choisir sans viser la carte (et au clavier).
 */
export function panneauSecteur(c, e, id) {
  const s = id && c.secteurs.find((x) => x.id === id);
  const liste = `<div class="choix-liste" role="group" aria-label="Les sept secteurs">${c.secteurs.map((x) => {
    const d = decide(e, x.id);
    return `<button type="button" class="choix-sect${d ? '' : ' choix-sect--decider'}" data-sect="${x.id}" aria-pressed="${x.id === id}">
      <b>${esc(x.nom)}</b><small>${d ? esc(nomZone(c, e.zones[x.id])) : 'à décider'}</small></button>`;
  }).join('')}</div>`;
  if (!s) {
    const reste = aDecider(c, e).length;
    return `<div class="panneau-s" aria-live="polite">
      <p class="choix-sur">Votre choix</p>
      <p class="choix-vide">Touchez un secteur sur la carte${reste ? ` (encore ${reste} à décider)` : ''}.</p>
      ${liste}</div>`;
  }
  const zActuelle = decide(e, s.id) ? (e.zones[s.id] || 'hors') : null;
  const choix = [...c.ordreZones, 'hors'].map((z) => {
    const nom = z === 'hors' ? 'Hors de la ligne' : c.zones[z].nom;
    const motif = z === 'hors' ? 'var(--sable)' : c.zones[z].motif;
    const suite = !s.habite ? '' : (z === 'hors' || c.zones[z].habite) ? 'le village reste' : 'le village est vidé';
    return `<button type="button" class="choix-z${z === zActuelle ? ' choix-z--on' : ''}" data-zone="${z}" aria-pressed="${z === zActuelle}">
      <svg width="22" height="22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" rx="4" fill="${motif}"
        stroke="${z === 'hors' ? 'var(--fort)' : 'var(--z-trait)'}" stroke-width="1.5" ${z === 'hors' ? 'stroke-dasharray="3 2"' : ''}/></svg>
      <span><b>${esc(nom)}</b><small>${esc(REGLES[z])}</small></span>
      ${suite ? `<em class="choix-suite${suite.includes('vidé') ? ' choix-suite--vide' : ''}">${suite}</em>` : ''}</button>`;
  }).join('');
  return `<div class="panneau-s" aria-live="polite">
    <p class="choix-sur">Secteur choisi</p>
    <h3 class="choix-t">${esc(s.nom)}</h3>
    <p class="choix-h">${s.habite ? 'Un village habité en 1970.' : 'La forêt, sans village.'} ${zActuelle ? `Votre choix : <b>${esc(nomZone(c, e.zones[s.id]))}</b>.` : 'Pas encore décidé.'}</p>
    <div class="choix-g" role="group" aria-label="La zone de ${esc(s.nom)}">${choix}</div>
    <p class="choix-fait">${esc(s.fait)}</p>
    <details class="choix-autres"><summary>Choisir un autre secteur</summary>${liste}</details>
  </div>`;
}

/** Le relevé, en clair : ce que la ligne protège, qui part, qui reste. */
export function blocReleve(c, e, court = false) {
  const r = releve(c, e);
  const nv = nbVillages(c);
  const barre = c.ordreZones.filter((z) => r.par[z] > 0).map((z) =>
    `<span class="bz" style="flex:${r.par[z]};background:${c.zones[z].css}"
      title="${esc(c.zones[z].nom)} : ${r.par[z]} secteur${r.par[z] > 1 ? 's' : ''}"></span>`).join('');
  const cls = r.corridor === 'continu' ? 'v--ok' : r.corridor === 'rompu' ? 'v--alerte' : r.corridor === 'affaibli' ? 'v--moyen' : '';
  return `<div class="lect">
    ${r.aDecider.length ? `<div class="l"><span class="k">Secteurs à décider</span><span class="v">${r.aDecider.length} / ${r.total}</span></div>` : ''}
    <div class="l"><span class="k">Secteurs dans le parc</span><span class="v">${r.dans} / ${r.total}</span></div>
    ${court ? '' : `<div class="barre-z" aria-hidden="true">${barre || '<span class="bz" style="flex:1;background:var(--fond-2)"></span>'}</div>`}
    <div class="l"><span class="k">Villages vidés</span>
      <span class="v ${r.vides.length ? 'v--alerte' : 'v--ok'}">${r.vides.length} / ${nv}</span></div>
    ${r.vides.length && !court ? `<p class="noms">${r.vides.map(esc).join(' · ')}</p>` : ''}
    <div class="l"><span class="k">Villages gardés dans le parc</span>
      <span class="v ${r.gardes.length ? 'v--ok' : ''}">${r.gardes.length}</span></div>
    <div class="l"><span class="k">Corridor écologique</span><span class="v ${cls}">${esc(r.corridor)}</span></div>
    ${court ? '' : `<div class="l"><span class="k">Visiteurs</span><span class="v" style="font-size:13.5px">${r.visiteurs}</span></div>
    <div class="l"><span class="k">Territoire ancestral mi'gmaq</span>
      <span class="v" style="font-size:14px;color:var(--gespeg)">non découpé</span></div>`}
  </div>
  ${court ? '' : `<p class="avert" style="margin-top:11px">La dernière ligne ne bouge jamais :
    Gespe'gewa'gi couvre les sept secteurs, dedans comme dehors.</p>`}`;
}

/** La conséquence du dernier geste, en clair et tout de suite, avec un fait réel. */
export function effetRecent(c, effet) {
  if (!effet) return `<p class="avert">Chaque secteur que vous décidez affiche ici ce que ça change.</p>`;
  const bouts = [];
  const signe = (n) => (n > 0 ? '+' : '−') + Math.abs(n);
  if (effet.dans) bouts.push(`<span class="ch ${effet.dans > 0 ? 'ch--p' : 'ch--m'}">${signe(effet.dans)} secteur dans le parc</span>`);
  if (effet.vides) bouts.push(`<span class="ch ${effet.vides > 0 ? 'ch--m' : 'ch--p'}">${effet.vides > 0 ? `${signe(effet.vides)} village vidé` : `${signe(-effet.vides)} village sauvé`}</span>`);
  if (effet.gardes) bouts.push(`<span class="ch ${effet.gardes > 0 ? 'ch--p' : 'ch--m'}">${signe(effet.gardes)} village gardé</span>`);
  if (effet.dehors > 0) bouts.push('<span class="ch ch--o">village laissé hors du parc</span>');
  if (effet.corridorChange && effet.corridor !== 'à décider') bouts.push(`<span class="ch ${effet.corridor === 'continu' ? 'ch--p'
    : effet.corridor === 'rompu' ? 'ch--m' : 'ch--o'}">corridor ${effet.corridor}</span>`);
  const quoi = effet.premier ? `<b>${esc(effet.secteur)}</b> : <b>${esc(nomZone(c, effet.a))}</b>`
    : `<b>${esc(effet.secteur)}</b> : ${esc(nomZone(c, effet.de))} → <b>${esc(nomZone(c, effet.a))}</b>`;
  return `<div class="effet" aria-live="polite">
    <p class="sur">Ce que ça vient de changer</p>
    <p class="effet-t">${quoi}</p>
    <div class="effet-c">${bouts.join('') || '<span class="ch">rien d\'autre ne bouge</span>'}</div>
    <p class="effet-f">${esc(effet.fait)}</p>
  </div>`;
}
