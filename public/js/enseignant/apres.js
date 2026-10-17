// enseignant/apres.js — les onglets « Mesures » et « Questionnaire » : ce que la
// séance a donné, l'export pour la recherche (s'il est permis) et le questionnaire papier.

import { mesure } from '../config.js';
import { esc, dec, telecharger } from '../outils.js';
import * as J from '../jeu.js';
import { etat } from './etat.js';

/* ------------------------------------------------------------ mesures */

export function vueMesures() {
  const { c, EQ } = etat;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const ind = eq.map((e) => J.indicateurs(c, e));
  const lignes = ind[0] || J.indicateurs(c, J.nouvelEtat(c, '', ''));
  const puce = (ok) => ok === true ? '<span class="pt pt--ok" title="repère atteint">●</span>'
    : ok === false ? '<span class="pt pt--non" title="repère non atteint">●</span>' : '<span class="pt"></span>';
  return `<div class="p-tete"><h2>Mesures</h2>
      <p>Ce que le site enregistre pour chaque équipe, et le plan de mesure pour étudier l'efficacité du jeu.</p></div>
    <div class="garde"><b>Vie privée.</b> Aucun prénom, aucun courriel : une équipe n'est qu'un nom d'animal.
      L'export pour la recherche ${mesure ? 'est activé.' : "est désactivé tant que le certificat d'éthique n'est pas obtenu."}</div>
    <section class="p-sect"><div class="p-sect-h"><h3>Par équipe</h3><span class="hint">${eq.length} équipe${eq.length > 1 ? 's' : ''}</span></div>
      ${eq.length ? `<div class="tab-w"><table class="tab"><thead><tr><th>Indicateur</th>${eq.map((e) => `<th>${esc(e.nom)}</th>`).join('')}</tr></thead>
        <tbody>${lignes.map((l, i) => `<tr><td>${i === 0 || lignes[i - 1].g !== l.g ? `<b>${esc(l.g)}</b> · ` : ''}${esc(l.k)}</td>${
          ind.map((x) => `<td>${puce(x[i].ok)} ${esc(x[i].v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="avert"><span class="pt pt--ok">●</span> repère atteint · <span class="pt pt--non">●</span> non atteint · sans pastille : pas encore mesuré.</p>`
      : '<p class="vide">Aucune équipe pour l\'instant.</p>'}
      <div class="p-actions"><button class="btn btn--f" data-rapport="1" ${eq.length ? '' : 'disabled'}>Imprimer le rapport de séance</button>
        <button class="btn" data-export="csv" ${mesure && eq.length ? '' : 'disabled'}>Exporter (CSV)</button></div>
    </section>
    <section class="p-sect"><div class="p-sect-h"><h3>Plan de mesure</h3><span class="hint">Un critère = un test oui / non. Repères à ajuster après le premier essai.</span></div>
      <div class="tab-w"><table class="tab"><thead><tr><th>Dimension</th><th>Critère</th><th>Le test</th><th>Source</th></tr></thead>
        <tbody>${c.plan.map((p, i) => `<tr><td>${i === 0 || c.plan[i - 1].g !== p.g ? `<b>${p.g}</b>` : ''}</td>
          <td>${esc(p.c)}</td><td>${esc(p.test)}</td><td><span class="src-t src-t--${p.src.split(' ')[0]}">${esc(p.src)}</span></td></tr>`).join('')}</tbody></table></div>
      <div class="limite"><b>Ce que ces mesures ne disent pas.</b> Elles décrivent ce que l'équipe fait sur le site, pas ce
        qu'elle a appris. Pour parler d'apprentissage, il faut une mesure avant / après : les mêmes deux questions courtes
        au début de la période et au débrief, codées à la main par équipe.</div>
    </section>`;
}

export function exporterCSV() {
  const { c, EQ, code, etapesJeu } = etat;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const lignes = eq.map((e, i) => {
    const r = J.releve(c, e);
    const o = { seance: code, equipe: i + 1, etape_atteinte: e.atteinte + 1, fini: e.fini ? 1 : 0,
      docs: e.docs.join(' '), docs_utiles: e.docs.filter((id) => c.documents.find((d) => d.id === id)?.utile).length,
      zones: new Set(Object.values(e.zones).filter(Boolean)).size, villages_vides: r.vides.length,
      villages_gardes: r.gardes.length, corridor: r.corridor, complications: e.comps,
      apres_comp: (e.compteurs?.apresComp || []).join('|'), premier_geste_s: e.compteurs?.premierGeste != null ? Math.round(e.compteurs.premierGeste / 1000) : '',
      clics_vides: e.compteurs?.clicsVides || 0, retours: e.compteurs?.retours || 0, sauts: e.compteurs?.sauts || 0,
      mentions: e.mentions.length };
    etapesJeu.forEach((x) => { o[`s_${x.id}`] = Math.round(J.tempsEtape(c, e, x.id) / 1000); });
    // les réponses écrites ne sont PAS exportées : texte libre, à coder à la main dans l'espace enseignant·e
    return o;
  });
  if (!lignes.length) return;
  const cols = Object.keys(lignes[0]);
  const cel = (v) => `"${String(v).replace(/"/g, '""')}"`;
  telecharger(`forillon_${code}_mesures.csv`, '﻿' + [cols.join(';'), ...lignes.map((l) => cols.map((k) => cel(l[k])).join(';'))].join('\n'),
    'text/csv;charset=utf-8');
}

/* ------------------------------------------------------------ questionnaire */

export function vueQuestionnaire() {
  const { c, S, AV } = etat;
  const echelles = c.avis.filter((q) => q.type === 'echelle');
  return `<div class="p-tete"><h2>Questionnaire élève</h2>
      <p>Huit questions, trois minutes, après le débrief. Chaque élève répond seul, sans nom, sur le Chromebook de
        l'équipe ou sur papier. ${mesure ? (S?.questionnaire ? 'Activé pour cette séance.' : 'Non activé pour cette séance.')
          : "Désactivé à l'écran tant que la collecte pour la recherche attend le certificat d'éthique ; la version papier reste disponible."}</p></div>
    <section class="p-sect"><div class="tab-w"><table class="tab">
      <thead><tr><th>#</th><th>Question posée à l'élève</th><th>Forme</th><th>Ce qu'elle mesure</th><th>Repère</th>${mesure ? '<th>Résultat</th>' : ''}</tr></thead>
      <tbody>${c.avis.map((q, i) => {
        let res = '';
        if (mesure && q.type === 'echelle') {
          const n = AV.map((a) => Number(a[q.id])).filter(Boolean);
          res = n.length ? `${dec(n.reduce((x, y) => x + y, 0) / n.length)} / 4 (${n.length})` : '';
        } else if (mesure) { const n = AV.filter((a) => String(a[q.id] || '').trim()).length; res = `${n} réponse${n > 1 ? 's' : ''}`; }
        return `<tr><td class="mono">Q${i + 1}</td><td><b>${esc(q.t)}</b></td>
          <td>${q.type === 'echelle' ? 'échelle 1 à 4' : q.type === 'choix' ? 'un choix' : 'une phrase'}</td>
          <td>${esc(q.mesure)}</td><td>${esc(q.cible)}</td>${mesure ? `<td>${esc(res)}</td>` : ''}</tr>`;
      }).join('')}</tbody></table></div>
      <p class="avert">Échelle : ${c.echelle.map((x, i) => `${i + 1} = ${x}`).join(' · ')}. Quatre points, sans milieu.
        Q3 est inversée exprès. ${echelles.length} questions à échelle.</p>
      <div class="p-actions"><button class="btn btn--f" data-imprimer="1">Imprimer (version papier)</button></div>
    </section>`;
}

/** Le questionnaire sur papier, pour une classe sans Chromebook ou une collecte éteinte. */
export function questionnairePapier() {
  const { c } = etat;
  return `<h1>Où passe la ligne — ton avis</h1><p>Pas de nom. Il n'y a pas de bonne réponse.</p>
      ${c.avis.map((q, i) => `<div class="p-q"><b>${i + 1}. ${esc(q.t)}</b>${
        q.type === 'echelle' ? `<div class="p-cases">${c.echelle.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`
        : q.type === 'choix' ? `<div class="p-cases">${q.options.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`
        : '<div class="p-lignes"></div><div class="p-lignes"></div>'}</div>`).join('')}`;
}
