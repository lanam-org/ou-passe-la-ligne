// carte.js — la carte schématique de la presqu'île, et ce qu'elle affiche.
//
// La zone se lit à la couleur ET au motif — jamais la couleur seule. Les relevés
// sont numérotés et visibles : on voit tout de suite où toucher. Carte
// schématique : positions justes, pas les formes ni les tailles — et l'écran le dit.

import { esc, IMAGES, IMAGE_TEMPORAIRE } from './outils.js';
import { releve, nomZone, nbVillages } from './jeu.js';

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
</defs>`;

/**
 * @param c   le contenu
 * @param e   l'état de l'équipe
 * @param o   { releves: bool, cliquable: bool, outil: string, mini: bool }
 */
export function carte(c, e, o = {}) {
  const { releves: avecReleves = false, cliquable = true, outil = 'preservation', mini = false } = o;

  const zones = c.secteurs.map((s) => {
    const z = e.zones[s.id];
    return `<path class="sect" d="${s.d}" ${cliquable ? `data-sect="${s.id}"` : ''}
      fill="${z ? c.zones[z].motif : 'var(--sable)'}"
      stroke="var(--surface)" stroke-width="2.5" stroke-linejoin="round"
      ${cliquable ? 'role="button" tabindex="0"' : 'pointer-events="none"'}
      aria-label="${esc(s.nom)} : ${esc(nomZone(c, z))}. ${esc(s.fait)}">
      <title>${esc(s.nom)} — ${esc(nomZone(c, z))} · ${esc(s.fait)}</title></path>`;
  }).join('');

  // le nom écrit sur la carte : déjà dit par le secteur lui-même (aria-label), pas deux fois au lecteur d'écran
  const noms = mini ? '' : c.secteurs.map((s) =>
    `<text class="sect-nom" x="${s.tx}" y="${s.ty}" text-anchor="middle" aria-hidden="true">${esc(s.nom)}</text>`).join('');

  // le corridor : de l'intérieur de la Gaspésie (à l'ouest) vers la forêt du parc
  const etat = (z) => !z ? 'rompu' : (z === 'preservation' || z === 'sauvage') ? 'continu' : 'affaibli';
  const pire = (a, b) => [a, b].includes('rompu') ? 'rompu' : [a, b].includes('affaibli') ? 'affaibli' : 'continu';
  const eMorris = etat(e.zones.morris);
  const liens = [[[6, 226], [92, 232], eMorris], [[92, 232], [300, 224], pire(eMorris, etat(e.zones.foret))]];
  const trait = liens.map(([a, b, x]) => {
    const coul = x === 'continu' ? 'var(--env)' : x === 'affaibli' ? 'var(--eco)' : 'var(--action)';
    const tiret = x === 'continu' ? '0' : x === 'affaibli' ? '3 5' : '7 6';
    // pointer-events:none : sinon le trait passe devant les secteurs et avale le clic.
    // Un liseré de la couleur du fond, dessous : le trait se lit sur le vert foncé
    // de la préservation, dans les trois affichages (clair, sombre, contraste élevé).
    const l = `x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-dasharray="${tiret}" stroke-linecap="round" pointer-events="none"`;
    return `<line ${l} stroke="var(--surface)" stroke-width="7"/><line ${l} stroke="${coul}" stroke-width="3.5"/>`;
  }).join('');

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
      aria-label="Relevé ${i + 1} : ${esc(a.t)}"><title>Relevé ${i + 1} — ${esc(a.t)}</title>
      <circle cx="${a.cx}" cy="${a.cy}" r="14" fill="${vu ? 'var(--env)' : 'var(--primaire)'}"
        stroke="var(--surface)" stroke-width="3"/>
      <text x="${a.cx}" y="${a.cy + 4}" text-anchor="middle" class="pin-n" fill="var(--surface)">${vu ? '✓' : i + 1}</text>
    </g>`;
  }).join('') : '';

  // Des boutons à bascule (aria-pressed) : un « radio » ARIA promettrait les flèches du clavier.
  const palette = !cliquable ? '' : `<div class="palette" role="group" aria-label="Zone à appliquer">
    ${c.ordreZones.map((z) => `<button class="outil${outil === z ? ' outil--on' : ''}" data-outil="${z}"
        aria-pressed="${outil === z}">
        <svg width="20" height="20" aria-hidden="true"><rect width="20" height="20" rx="4"
          fill="${c.zones[z].motif}" stroke="var(--z-trait)" stroke-width="1"/></svg>
        <span><b>${esc(c.zones[z].nom)}</b><small>${esc(c.zones[z].pc)}</small></span></button>`).join('')}
    <button class="outil${outil === 'hors' ? ' outil--on' : ''}" data-outil="hors" aria-pressed="${outil === 'hors'}">
      <svg width="20" height="20" aria-hidden="true"><rect width="20" height="20" rx="4"
        fill="var(--sable)" stroke="var(--fort)" stroke-width="1.5" stroke-dasharray="3 2"/></svg>
      <span><b>Hors de la ligne</b><small>non protégé</small></span></button>
  </div>
  <p class="outil-q">${outil === 'hors'
    ? "Le secteur reste en dehors du parc : il n'est pas protégé, et personne ne part."
    : esc(c.zones[outil].q)}</p>`;

  // Une image en lecture seule ; un groupe dès qu'elle contient des secteurs ou des relevés à cliquer
  // (une « image » ne peut pas contenir de boutons : les lecteurs d'écran ne les verraient pas).
  const role = cliquable || avecReleves ? 'group' : 'img';
  const svg = !IMAGES ? carteVide(c, e, { avecReleves, cliquable, mini }) : `<svg class="carte${mini ? ' carte--mini' : ''}" viewBox="0 0 460 380" role="${role}"
      aria-label="Carte schématique de la presqu'île de Forillon, sept secteurs à zoner">
    ${MOTIFS}
    <rect x="0" y="0" width="460" height="380" fill="var(--mer)"/>
    <path d="M0,96 L40,108 L40,332 L0,344 Z" fill="var(--terre)" pointer-events="none"/>
    ${mini ? '' : `<text x="22" y="150" class="mono" font-size="9" fill="var(--roche)" text-anchor="middle"
      transform="rotate(-90 22 150)" pointer-events="none">GASPÉSIE</text>
    <text x="230" y="36" class="mono" font-size="10" fill="var(--roche)">GOLFE DU SAINT-LAURENT</text>
    <text x="300" y="366" class="mono" font-size="10" fill="var(--roche)">BAIE DE GASPÉ</text>`}
    ${zones}${trait}${enveloppe}${noms}${pins}
    ${mini ? '' : `<g transform="translate(414,36)"><path d="M0,-16 L5,4 L0,0 L-5,4 Z" fill="var(--encre)"/>
      <text x="0" y="18" text-anchor="middle" class="mono" font-size="9" fill="var(--doux)">N</text></g>`}
  </svg>`;

  const legende = !cliquable ? '' : `<div class="legende">
      ${IMAGES ? `<span>Corridor :</span>
      <span><i style="border-top:3px solid var(--env)"></i> continu</span>
      <span><i style="border-top:3px dashed var(--eco)"></i> affaibli</span>
      <span><i style="border-top:3px dashed var(--action)"></i> rompu</span>` : '<span>Le corridor se lit dans « Votre relevé ».</span>'}
      <button class="bascule" data-gespeg="1" aria-pressed="${e.gespeg}">
        <i style="border-top:3px dashed var(--gespeg);width:16px"></i>
        Gespe'gewa'gi : ${e.gespeg ? 'affiché' : 'masqué'}</button>
    </div>
    <p class="avert">Les six secteurs habités sont les principaux secteurs expropriés en 1970, selon Parcs Canada.${IMAGES ? ` Carte schématique : les
      positions sont justes, pas les formes ni les tailles.` : ''}</p>`;

  return palette + svg + legende;
}

/**
 * La carte, en attendant l'image : un cadre « Carte à venir », et dedans
 * les mêmes gestes en boutons simples — les relevés numérotés, les sept
 * secteurs avec leur zone (couleur ET motif ET nom). Mêmes attributs que la
 * carte dessinée (data-releve, data-sect) : le jeu, les mesures et les tests
 * ne voient pas la différence. L'image temporaire marque la place de la carte,
 * sous les boutons : les gestes restent en haut, visibles sans défiler.
 */
function carteVide(c, e, { avecReleves, cliquable, mini }) {
  const pastille = (z) => `<svg width="16" height="16" aria-hidden="true"><rect width="16" height="16" rx="3"
    fill="${z ? c.zones[z].motif : 'var(--sable)'}" stroke="${z ? 'var(--z-trait)' : 'var(--fort)'}" stroke-width="1"
    ${z ? '' : 'stroke-dasharray="3 2"'}/></svg>`;
  const releves = avecReleves ? `<div class="vide-releves">${c.releves.map((a, i) => {
    const vu = e.releves.includes(i);
    return `<button type="button" class="vide-pin${vu ? ' vide-pin--vu' : ''}" data-releve="${i}" aria-pressed="${vu}"
      aria-label="Relevé ${i + 1}${vu ? ` : ${esc(a.t)}` : ''}">${vu ? '✓' : ''} Relevé ${i + 1}</button>`;
  }).join('')}</div>` : '';
  const secteurs = `<div class="vide-secteurs">${c.secteurs.map((s) => {
    const z = e.zones[s.id];
    const dedans = `${pastille(z)}<span class="vide-sect-t"><b>${esc(s.nom)}</b>
      <small>${esc(nomZone(c, z))}${s.habite ? ' · habité' : ''}</small></span>`;
    return cliquable
      ? `<button type="button" class="vide-sect" data-sect="${s.id}" aria-label="${esc(s.nom)} : ${esc(nomZone(c, z))}">${dedans}</button>`
      : `<span class="vide-sect">${dedans}</span>`;
  }).join('')}</div>`;
  return `<div class="carte carte--vide${mini ? ' carte--mini' : ''}" role="group" aria-label="Carte à venir : les sept secteurs">
    <svg width="0" height="0" aria-hidden="true" style="position:absolute">${MOTIFS}</svg>
    ${mini ? '' : '<p class="vide-t">Carte à venir</p>'}
    ${releves}${avecReleves && !cliquable ? '' : secteurs}
    ${e.gespeg && !mini ? `<p class="vide-gespeg">Gespe'gewa'gi couvre les sept secteurs, dedans comme dehors de la ligne.</p>` : ''}
    <img class="vide-img" src="${IMAGE_TEMPORAIRE}" alt="" width="306" height="175">
  </div>`;
}

/** Le relevé, en clair : ce que la ligne protège, qui part, qui reste. */
export function blocReleve(c, e, court = false) {
  const r = releve(c, e);
  const nv = nbVillages(c);
  const barre = c.ordreZones.filter((z) => r.par[z] > 0).map((z) =>
    `<span class="bz" style="flex:${r.par[z]};background:${c.zones[z].css}"
      title="${esc(c.zones[z].nom)} : ${r.par[z]} secteur${r.par[z] > 1 ? 's' : ''}"></span>`).join('');
  const cls = r.corridor === 'continu' ? 'v--ok' : r.corridor === 'rompu' ? 'v--alerte' : 'v--moyen';
  return `<div class="lect">
    <div class="l"><span class="k">Secteurs dans la ligne</span><span class="v">${r.dans} / ${r.total}</span></div>
    ${court ? '' : `<div class="barre-z" aria-hidden="true">${barre || '<span class="bz" style="flex:1;background:var(--fond-2)"></span>'}</div>`}
    <div class="l"><span class="k">Villages à vider</span>
      <span class="v ${r.vides.length ? 'v--alerte' : 'v--ok'}">${r.vides.length} / ${nv}</span></div>
    ${r.vides.length && !court ? `<p class="noms">${r.vides.map(esc).join(' · ')}</p>` : ''}
    <div class="l"><span class="k">Villages gardés dans le parc</span>
      <span class="v ${r.gardes.length ? 'v--ok' : ''}">${r.gardes.length}</span></div>
    <div class="l"><span class="k">Corridor écologique</span><span class="v ${cls}">${r.corridor}</span></div>
    ${court ? '' : `<div class="l"><span class="k">Visiteurs</span><span class="v" style="font-size:13.5px">${r.visiteurs}</span></div>
    <div class="l"><span class="k">Territoire ancestral mi'gmaq</span>
      <span class="v" style="font-size:14px;color:var(--gespeg)">non découpé</span></div>`}
  </div>
  ${court ? '' : `<p class="avert" style="margin-top:11px">La dernière ligne ne bouge jamais :
    Gespe'gewa'gi couvre les sept secteurs, dedans comme dehors.</p>`}`;
}

/** La conséquence du dernier geste, en clair et tout de suite — avec un fait réel. */
export function effetRecent(c, effet) {
  if (!effet) return `<p class="avert">Chaque secteur que vous zonez affiche ici, tout de suite, ce que ça change.</p>`;
  const bouts = [];
  const signe = (n) => (n > 0 ? '+' : '−') + Math.abs(n);
  if (effet.dans) bouts.push(`<span class="ch ${effet.dans > 0 ? 'ch--p' : 'ch--m'}">${signe(effet.dans)} secteur protégé</span>`);
  if (effet.vides) bouts.push(`<span class="ch ${effet.vides > 0 ? 'ch--m' : 'ch--p'}">${signe(effet.vides)} village à vider</span>`);
  if (effet.gardes) bouts.push(`<span class="ch ${effet.gardes > 0 ? 'ch--p' : 'ch--m'}">${signe(effet.gardes)} village gardé</span>`);
  if (effet.dehors > 0) bouts.push('<span class="ch ch--o">village laissé dehors</span>');
  if (effet.corridorChange) bouts.push(`<span class="ch ${effet.corridor === 'continu' ? 'ch--p'
    : effet.corridor === 'rompu' ? 'ch--m' : 'ch--o'}">corridor ${effet.corridor}</span>`);
  return `<div class="effet" aria-live="polite">
    <p class="sur">Ce que ça vient de changer</p>
    <p class="effet-t"><b>${esc(effet.secteur)}</b> : ${esc(nomZone(c, effet.de))} → <b>${esc(nomZone(c, effet.a))}</b></p>
    <div class="effet-c">${bouts.join('') || '<span class="ch">rien d\'autre ne bouge</span>'}</div>
    <p class="effet-f">${esc(effet.fait)} <span>— ${esc(effet.src)}</span></p>
  </div>`;
}
