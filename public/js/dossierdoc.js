// dossierdoc.js — le dossier documentaire, tel qu'il se lit et s'imprime.
//
// Le dossier vit DANS le site : chaque relevé, document ou point de vue garde
// la phrase exacte de sa source, la date à laquelle elle a été vérifiée et le
// lien. Si un lien meurt, l'information reste.
//
// Deux versions :
//   · « devoir » : ce qu'on peut lire avant la séance — le portrait et le
//     dossier. Les documents marqués « surprise » (ceux qui servent à contredire
//     ce que l'équipe croyait) n'y sont pas : lus d'avance, ils ne contrediraient plus rien ;
//   · « complet » : tout, pour l'enseignant·e, avec les surprises signalées.
//
// Les pastilles disent à quelle question du jeu sert un document, dans la
// couleur de sa famille. L'identifiant est toujours écrit : la couleur aide,
// elle ne porte jamais seule l'information (papier en noir et blanc, daltonisme).
// Attention : avec les pastilles, un élève voit quels documents servent ; le tri
// de l'étape « Se questionner » devient un rappel. D'où le choix laissé à l'enseignant·e.

import { esc } from './outils.js';

const domaine = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

/**
 * Les questions de la séance (réglages appliqués), par identifiant. En version
 * devoir, seulement celles posées avant la ligne : une question des étapes
 * suivantes (« La route 132 traverse le parc… ») trahirait une surprise.
 */
const AVANT_LA_LIGNE = ['arrivee', 'marche', 'dossier', 'trace'];
function questionsActives(c, complet) {
  const l = [...(c.q?.ecrites || []), ...(complet ? (c.q?.orales || []) : [])]
    .filter((q) => complet || AVANT_LA_LIGNE.includes(q.etape));
  return new Map(l.map((q) => [q.id, q]));
}

function pastilles(c, item, actives) {
  const fam = c.dossier?.questions || {};
  const ids = (item.sert || []).filter((id) => actives.has(id));
  if (!ids.length) return '';
  return `<span class="dd-pastilles">${ids.map((id) => `<span class="pastille fam-${fam[id] || 'aucune'}"
    title="${esc(actives.get(id).eleve || '')}">${esc(id)}</span>`).join('')}</span>`;
}

function copie(item) {
  const l = item.copie || [];
  if (!l.length) {
    return item.url ? `<div class="dd-src"><p class="dd-sur">La source</p>
      <p class="dd-lien"><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(domaine(item.url))}</a></p></div>` : '';
  }
  return `<div class="dd-src"><p class="dd-sur">Ce que dit la source</p>${l.map((q) => `<blockquote>
      <p class="dd-q">« ${esc(q.q)} »</p>
      ${q.trad ? `<p class="dd-trad">Traduction libre : « ${esc(q.trad)} »</p>` : ''}
      <p class="dd-cite">— ${esc(q.src)} · <a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(domaine(q.url))}</a></p>
    </blockquote>`).join('')}</div>`;
}

function article(c, item, o) {
  const { k, t, x, brut } = o;
  return `<article class="dd-item${item.surprise ? ' dd-item--surprise' : ''}">
    <header class="dd-h"><span class="dd-k">${esc(k)}</span>${o.pastilles ? pastilles(c, item, o.actives) : ''}</header>
    <h3>${esc(t)}</h3>
    <p class="dd-x">${brut ? x : esc(x)}</p>
    ${item.s ? `<p class="dd-s">${esc(item.s)}</p>` : ''}
    ${copie(item)}
    ${item.surprise && o.enseignant ? '<p class="dd-surprise">Surprise : absent de la version devoir.</p>' : ''}
  </article>`;
}

/**
 * Le dossier en HTML.
 * @param c          contenu, réglages de la séance appliqués (corrections comprises)
 * @param version    'devoir' ou 'complet'
 * @param pastilles  montrer à quelles questions sert chaque document
 * @param enseignant signaler les surprises (dossier complet)
 */
export function dossierHTML(c, { version = 'devoir', pastilles: avec = true, enseignant = false } = {}) {
  const complet = version === 'complet';
  const garde = (x) => complet || !x.surprise;
  const actives = questionsActives(c, complet);
  const o = { pastilles: avec, actives, enseignant };
  const etape = (id) => c.etapes.find((e) => e.id === id)?.t || id;
  const fam = c.dossier?.questions || {};
  const familles = c.dossier?.familles || [];

  // les questions qu'au moins un document sert, pour la légende
  const servies = new Set();
  const tous = [...c.releves, ...c.documents, ...(complet ? [...c.complications, ...c.bilan] : [])].filter(garde);
  tous.forEach((x) => (x.sert || []).forEach((id) => actives.has(id) && servies.add(id)));

  const legende = avec && servies.size ? `<section class="dd-leg"><h2>Les questions du jeu</h2>
    <p class="dd-aide">Chaque pastille renvoie à une de ces questions. Sa couleur dit de quelle famille elle est.</p>
    ${familles.map((f) => {
      const ordre = [...actives.keys()];
      const qs = [...servies].filter((id) => fam[id] === f.id).sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));
      return qs.length ? `<div class="dd-fam"><p class="dd-fam-t"><span class="pastille fam-${f.id}">${esc(f.t)}</span></p>
        <ul>${qs.map((id) => `<li><span class="pastille fam-${f.id}">${esc(id)}</span> ${esc(actives.get(id).eleve)}</li>`).join('')}</ul></div>` : '';
    }).join('')}</section>` : '';

  const releves = c.releves.filter(garde).map((r) => article(c, r, { ...o, k: `Relevé ${c.releves.indexOf(r) + 1}`, t: r.t, x: r.x }));
  const docs = c.documents.filter(garde).map((d) => article(c, d, { ...o, k: d.genre, t: d.t, x: d.x }));
  const vues = complet ? c.complications.map((v, i) => article(c, v, { ...o, k: `Point de vue ${i + 1} sur ${c.complications.length} · ${v.qui || ''}`,
    t: v.t, x: v.x, brut: true })) : [];
  const bilan = complet ? c.bilan.map((b) => article(c, { ...b, s: b.src }, { ...o, k: etape('bilan'), t: b.t, x: b.texte })) : [];

  return `<div class="dossier">
    <header class="dd-tete">
      <p class="dd-sur">${complet ? 'Dossier complet · pour l\'enseignant·e' : 'Version devoir · à lire avant la séance'}</p>
      <h1>Où passe la ligne — dossier documentaire</h1>
      <p class="dd-question"><span>La question de départ</span> ${esc(c.question)}</p>
      <p class="dd-aide">${complet
        ? 'Tout ce que le jeu montre, dans l\'ordre des étapes. Les documents marqués « surprise » ne sont pas dans la version devoir : ils servent à contredire ce que l\'équipe croyait.'
        : 'Le territoire tel qu\'on pouvait le connaître, et des documents à trier. Certains sont vrais mais ne servent pas à la question : à vous de voir lesquels. Sous chaque document, la phrase exacte de sa source et le lien pour la lire.'}
        ${esc(c.dossier?.releve || '')}</p>
    </header>
    ${legende}
    <section class="dd-sect"><h2>${esc(etape('marche'))}</h2><div class="dd-g">${releves.join('')}</div></section>
    <section class="dd-sect"><h2>${esc(etape('dossier'))} · le dossier</h2><div class="dd-g">${docs.join('')}</div></section>
    ${complet ? `<section class="dd-sect"><h2>${esc(etape('comp'))}</h2><div class="dd-g">${vues.join('')}</div></section>
      <section class="dd-sect"><h2>${esc(etape('bilan'))}, et depuis</h2><div class="dd-g">${bilan.join('')}</div></section>` : ''}
    <p class="dd-pied">Jeanne Element, la garde-parc, est un personnage fictif ; tout le reste vient des sources citées.</p>
  </div>`;
}

/** Le premier lien d'un relevé, d'un document ou d'un point de vue, pour le jeu. */
export function lienSource(item) {
  const u = item?.copie?.[0]?.url || item?.url;
  return u ? `<a class="src-l" href="${esc(u)}" target="_blank" rel="noopener">Voir la source · ${esc(domaine(u))}</a>` : '';
}
