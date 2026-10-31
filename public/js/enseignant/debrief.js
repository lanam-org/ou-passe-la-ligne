// enseignant/debrief.js — l'onglet « Rétroaction » : la page à projeter en classe
// entière, avec les questions orales et ce que les équipes ont écrit.

import { esc, icone } from '../outils.js';
import { carte } from '../carte.js';
import * as J from '../jeu.js';
import { aUnBravo, retourDe, RETOURS } from '../seance.js';
import { etat, ui, qid } from './etat.js';

const attendu = (q) => String(q?.reponse || '').replace(/^Éléments attendus\s*:\s*/, '');
// La question écrite en équipe qui prépare chaque question orale
const APPUIS = { 'F7.1': 'F5.4', 'F7.2': 'F6.1', 'F7.3': 'F5.4', 'F7.4': 'F6.3', 'F7.5': 'F5.1' };

/**
 * Comparer les lignes : l'enseignant·e choisit deux ou trois équipes (leurs noms ne s'affichent pas en projection), leurs
 * lignes s'affichent côte à côte sous « Ligne A, B, C », puis la ligne de 1970, montrée quand la discussion est prête.
 */
function vueComparer(c, eq) {
  const choisies = ui.comparer.map((id) => eq.find((e) => e.id === id)).filter(Boolean);
  // 1970 : tout le territoire dans le parc, aucun village gardé (aujourd'hui, surtout du milieu sauvage)
  const ligne1970 = { zones: Object.fromEntries(c.secteurs.map((s) => [s.id, 'sauvage'])), releves: [], gespeg: false };
  const resume = (r) => `<ul class="cmp-r"><li><b>${r.dans} / ${r.total}</b> secteurs dans le parc</li>
    <li><b>${r.vides.length}</b> village${r.vides.length > 1 ? 's' : ''} à vider</li><li><b>${r.gardes.length}</b> gardé${r.gardes.length > 1 ? 's' : ''}</li>
    <li>corridor <b>${esc(r.corridor)}</b></li></ul>`;
  const fiche = (titre, e, cls = '') => `<article class="cmp-c${cls}"><h4>${titre}</h4>${carte(c, e, { cliquable: false, mini: true })}${resume(J.releve(c, e))}</article>`;
  return `<section class="p-sect cmp"><div class="p-sect-h"><h3>Comparer les lignes</h3></div>
    ${eq.length ? `<div class="cmp-choix" role="group" aria-label="Lignes à comparer, trois au plus">${eq.map((e) => {
      const oui = ui.comparer.includes(e.id);
      return `<button class="btn btn--f btn--s" type="button" data-cmp="${esc(e.id)}" aria-pressed="${oui}" ${!oui && choisies.length >= 3 ? 'disabled' : ''}>${esc(e.nom)}</button>`;
    }).join('')}</div>` : '<p class="hint">Aucune ligne tracée pour l\'instant.</p>'}
    ${choisies.length || ui.voir1970 ? `<div class="cmp-g">${choisies.map((e, i) => fiche(`Ligne ${'ABC'[i]}`, e)).join('')}
      ${ui.voir1970 ? fiche('La ligne de 1970', ligne1970, ' cmp-c--1970') : ''}</div>` : ''}
    <div class="p-actions"><button class="btn" type="button" data-voir1970 aria-pressed="${ui.voir1970}">${ui.voir1970 ? 'Cacher' : 'Montrer'} la ligne de 1970</button></div>
  </section>`;
}

export function vueDebrief() {
  const { c, S, EQ, ecrites } = etat;
  const eq = EQ.filter((e) => e.atteinte >= 3);
  const rs = eq.map((e) => J.releve(c, e));
  const n = eq.length;
  const tous = rs.filter((r) => r.vides.length === J.nbVillages(c)).length;
  const garde = rs.filter((r) => r.gardes.length > 0).length;
  const continu = rs.filter((r) => r.corridor === 'continu').length;
  const rezone = EQ.filter((e) => (e.compteurs?.apresComp || []).some((x) => x > 0)).length;
  const posees = new Map(ecrites.map((q) => [q.id, q]));
  // les réponses qui ont reçu un « bravo » d'abord, marquées ✦ : prêtes à être projetées et discutées
  const reponses = (id) => EQ.filter((e) => J.repondu(e, id))
    .sort((a, b) => aUnBravo(S, b.id, id) - aUnBravo(S, a.id, id))
    .map((e) => `<div${aUnBravo(S, e.id, id) ? ' class="db-bravo"' : ''}><small>${esc(e.nom)}${aUnBravo(S, e.id, id)
      ? ` · ✦ ${esc(RETOURS[retourDe(S, e.id, id).k].long.toLowerCase())}` : ''}</small>${esc(e.reponses[id])}</div>`).join('')
    || '<p class="hint">Aucune réponse pour l\'instant.</p>';
  const orales = c.q.orales;
  const bloc = (q) => {
    const ap = posees.get(APPUIS[q.id]);
    return `<section class="p-sect">
      <p class="db-q"><span class="qid">${esc(qid(q))}</span> ${esc(q.eleve)}</p>
      ${q.reponse ? `<p class="db-a">Attendu : ${esc(attendu(q))}</p>` : ''}
      ${ap ? `<p class="sur" style="margin-top:14px">Ce que les équipes ont écrit : ${esc(ap.eleve)} (${esc(qid(ap))})</p><div class="db-r">${reponses(ap.id)}</div>` : ''}</section>`;
  };
  const ecritesDebrief = ecrites.filter((q) => q.etape === 'debrief');
  const f32 = posees.get('F3.2');
  return `<div class="${ui.projection ? 'projection' : ''} ${ui.cacheAttendu ? 'cache-att' : ''}">
    <div class="p-tete"><h2>La rétroaction, en classe entière</h2>
      <p>${c.etapes.find((x) => x.id === 'debrief').min} minutes, ${orales.length} question${orales.length > 1 ? 's' : ''} à l'oral.
        Cette page se projette : les noms d'équipes sont des animaux, aucun prénom.</p>
      <div class="p-actions">
        <button class="btn btn--f" data-attendu="1">${ui.cacheAttendu ? 'Montrer' : 'Cacher'} les réponses attendues</button>
        <button class="btn btn--f" data-trousse="retroaction">${icone('imprimer')} Guide d'animation</button>
        <button class="btn btn--f" data-plein="1" aria-pressed="${ui.projection}">${ui.projection ? 'Quitter le plein écran' : 'Plein écran'}</button>
      </div></div>
    <section class="p-sect"><div class="p-sect-h"><h3>Vos lignes</h3><span class="hint">${n} équipe${n > 1 ? 's ont' : ' a'} tracé une ligne</span></div>
      <div class="paires lignes">
        <div class="paire"><span class="v">${tous}</span><span class="k">vident les six villages, comme en 1970</span></div>
        <div class="paire"><span class="v">${garde}</span><span class="k">gardent au moins un village dans le parc</span></div>
        <div class="paire"><span class="v">${continu}</span><span class="k">gardent le corridor continu</span></div>
        <div class="paire"><span class="v">${rezone}</span><span class="k">ont rezoné après un autre point de vue</span></div>
      </div></section>
    ${vueComparer(c, eq)}
    ${orales.map(bloc).join('')}
    ${ecritesDebrief.map((q) => `<section class="p-sect"><p class="db-q"><span class="qid">${esc(qid(q))}</span> ${esc(q.eleve)}</p>
      ${q.reponse ? `<p class="db-a">Attendu : ${esc(attendu(q))}</p>` : ''}<div class="db-r">${reponses(q.id)}</div></section>`).join('')}
    ${f32 ? `<section class="p-sect"><p class="db-q"><span class="qid">Q3.2</span> À reprendre si le temps le permet : ${esc(f32.eleve)}</p>
      ${f32.reponse ? `<p class="db-a">Attendu : ${esc(attendu(f32))}</p>` : ''}<div class="db-r">${reponses('F3.2')}</div></section>` : ''}
  </div>`;
}
