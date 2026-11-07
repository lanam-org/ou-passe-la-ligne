// enseignant/apres.js — les onglets « Mesures » et « Questionnaire » : ce que la
// séance a donné, l'export pour la recherche (s'il est permis) et le questionnaire papier.

import { mesure } from '../config.js';
import { esc, dec, telecharger, icone } from '../outils.js';
import * as J from '../jeu.js';
import { etat, qid } from './etat.js';
import { indicateursEquipe, lire as lireObservation, GRILLE, retoursDonnes } from './observation.js';

/* ------------------------------------------------------------ mesures */

export function vueMesures() {
  const { c, EQ } = etat;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const ind = eq.map((e) => indicateursEquipe(e));
  const lignes = ind[0] || indicateursEquipe({ ...J.nouvelEtat(c, '', ''), id: '' });
  const puce = (ok) => ok === true ? '<span class="pt pt--ok" title="repère atteint" aria-hidden="true">●</span><span class="cache-visuel">repère atteint :</span>'
    : ok === false ? '<span class="pt pt--non" title="repère non atteint" aria-hidden="true">●</span><span class="cache-visuel">repère non atteint :</span>' : '<span class="pt"></span>';
  return `<div class="p-tete"><h2>Données de la recherche</h2>
      <p>Ce que le site enregistre pour chaque équipe, et le plan de mesure pour étudier l'efficacité du jeu.</p></div>
    <div class="garde"><b>Vie privée.</b> Aucun prénom, aucun courriel : une équipe n'est qu'un nom d'animal.
      L'export pour la recherche ${mesure ? 'est activé.' : "est désactivé tant que le certificat d'éthique n'est pas obtenu."}</div>
    <section class="p-sect"><div class="p-sect-h"><h3>Par équipe</h3><span class="hint">${eq.length} équipe${eq.length > 1 ? 's' : ''}</span></div>
      ${eq.length ? `<div class="tab-w"><table class="tab"><thead><tr><th>Indicateur</th>${eq.map((e) => `<th>${esc(e.nom)}</th>`).join('')}</tr></thead>
        <tbody>${lignes.map((l, i) => `<tr><td>${i === 0 || lignes[i - 1].g !== l.g ? `<b>${esc(l.g)}</b> · ` : ''}${esc(l.k)}</td>${
          ind.map((x) => `<td>${puce(x[i].ok)} ${esc(x[i].v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="avert"><span class="pt pt--ok">●</span> repère atteint · <span class="pt pt--non">●</span> non atteint · sans pastille : pas encore mesuré.</p>`
      : '<p class="vide">Aucune équipe pour l\'instant.</p>'}
      <div class="p-actions"><button class="btn btn--f" data-rapport="1" ${eq.length ? '' : 'disabled'}>${icone('imprimer')} Imprimer le rapport de séance</button>
        <button class="btn" data-export="csv" ${mesure && eq.length ? '' : 'disabled'}>Exporter (CSV)</button></div>
    </section>
    <section class="p-sect"><div class="p-sect-h"><h3>Plan de mesure</h3><span class="hint">Un critère = un test oui / non. Repères à ajuster après le premier essai.</span></div>
      <div class="tab-w"><table class="tab"><thead><tr><th>Dimension</th><th>Critère</th><th>Le test</th><th>Source</th></tr></thead>
        <tbody>${c.plan.map((p, i) => `<tr><td>${i === 0 || c.plan[i - 1].g !== p.g ? `<b>${p.g}</b>` : ''}</td>
          <td>${esc(p.c)}</td><td>${esc(p.test)}</td><td><span class="src-t src-t--${p.src.split(' ')[0]}">${esc(p.src)}</span></td></tr>`).join('')}</tbody></table></div>
      <div class="limite"><b>Ce que ces mesures ne disent pas.</b> Elles décrivent ce que l'équipe fait sur le site, pas ce
        qu'elle a appris. Les deux questions avant / après (réglage allumé par défaut) en donnent une première idée : le
        site compte les acteurs nommés au début et à la fin ; la nuance se code à la main, par équipe. Les repères tirés
        des réponses (mots, nombres, « parce que », Gespe'gewa'gi nommé) comptent des mots : à vérifier en lisant. Un
        temps sans geste peut aussi être une bonne discussion. La grille d'observation et les relances restent dans ce
        navigateur.</div>
    </section>`;
}

/** Les questions avant / après à exporter : celles de la séance, ou celles du contenu si des réponses existent encore. */
const avantApresExport = (c, eq) => (J.questionsAvantApres(c).length || eq.some((e) => Object.keys(e.reponses || {}).some(J.estAvantApres))
  ? c.avantApresTous || J.questionsAvantApres(c) : []);

export function exporterCSV() {
  const { c, EQ, code, etapesJeu } = etat;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const aa = avantApresExport(c, eq);
  const lignes = eq.map((e, i) => {
    const r = J.releve(c, e);
    const o = { seance: code, equipe: i + 1, etape_atteinte: e.atteinte + 1, fini: e.fini ? 1 : 0,
      docs: e.docs.join(' '), docs_utiles: e.docs.filter((id) => J.docParId(c, id)?.utile).length,
      zones: new Set(Object.values(e.zones).filter(Boolean)).size, villages_vides: r.vides.length,
      villages_gardes: r.gardes.length, corridor: r.corridor, complications: e.comps,
      apres_comp: (e.compteurs?.apresComp || []).join('|'), premier_geste_s: e.compteurs?.premierGeste != null ? Math.round(e.compteurs.premierGeste / 1000) : '',
      clics_vides: e.compteurs?.clicsVides || 0, retours: e.compteurs?.retours || 0, sauts: e.compteurs?.sauts || 0,
      mentions: e.mentions.length };
    etapesJeu.forEach((x) => { o[`s_${x.id}`] = Math.round(J.tempsEtape(c, e, x.id) / 1000); });
    // les mesures ajoutées après le Playtest 2 (des nombres seulement ; les textes restent dans « Exporter les réponses »)
    const k = { ...J.nouveauxCompteurs(), ...(e.compteurs || {}) };
    const m = J.journalMesure(e);   // une fiche d'avant le journal : ses colonnes restent vides, pas 0
    const n = (v) => (m ? v : '');
    const tx = J.analyseTextes(c, e), changee = J.ligneChangee(c, e), obs = lireObservation();
    aa.forEach((q, j) => {
      for (const [p, l] of [['av', tx.avant], ['ap', tx.apres]]) {
        o[`${p}${j + 1}_mots`] = l[j] ? l[j].mots : '';
        o[`${p}${j + 1}_acteurs`] = l[j] ? l[j].acteurs.length : '';
      }
    });
    const somme = (x) => Object.values(x || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    Object.assign(o, {
      secteurs_changes_pdv: changee ? changee.length : '', secteurs_changes_noms: changee ? changee.join(' | ') : '',
      rep_total: tx.n, mots_moyen: tx.n ? tx.motsMoy : '', rep_nombre_source: tx.nombreSource, rep_justifiees: tx.justifiees,
      cadre_spontane: tx.cadre.length ? 1 : 0, cadre_questions: tx.cadre.join(' '),
      releves_ouverts: e.releves.length, docs_lus: n(k.docsLus.length), pov_relus: n(k.povRelus), dossier_relu: n(k.relireDocs),
      inactif_s: n(Math.round(somme(k.inactif) / 1000)), inactif_n: n(k.inactifN),
      revisions: n(somme(k.revisions)), questions_revisees: n(Object.values(k.revisions).filter((x) => x > 0).length),
      aide_ou: n(k.aideOu), aide_manque: n(k.aideManque), blocages: n(somme(k.blocages)),
      sans_zone: n(k.sansZone), change_zone: n(k.changeZone),
      bulles_vues: n(k.bulles?.vues || 0), bulles_guide: n(k.bulles?.guide || 0), bulles_arret: n(k.bulles?.arret || 0),
      s_avant: Math.round((e.temps?.avant || 0) / 1000)
    });
    // par étape (et « avant » : la question du jeu et les deux questions du début) : temps sans geste, « Suivant » trop
    // tôt, premier geste (-1 : quittée sans aucun geste ; vide : pas mesuré)
    [{ id: 'avant' }, ...etapesJeu].forEach((x) => {
      o[`inactif_s_${x.id}`] = n(Math.round((k.inactif[x.id] || 0) / 1000));
      o[`blocages_${x.id}`] = n(k.blocages[x.id] || 0);
      o[`premier_s_${x.id}`] = k.premiere[x.id] == null ? '' : k.premiere[x.id] < 0 ? -1 : Math.round(k.premiere[x.id] / 1000);
    });
    // ce que l'enseignant·e a noté et fait (gardé dans ce navigateur)
    const g = obs.grille[e.id];
    GRILLE.forEach(([cle]) => { o[`obs_${cle}`] = g ? (g[cle] ? 1 : 0) : ''; });
    Object.assign(o, { details_ouverts: obs.details[e.id] || 0, retours_donnes: retoursDonnes(etat.S, e.id), messages_classe: obs.messages });
    // les réponses écrites ne sont PAS exportées : texte libre, à coder à la main dans l'espace enseignant
    return o;
  });
  if (!lignes.length) return;
  const cols = Object.keys(lignes[0]);
  const cel = (v) => `"${String(v).replace(/"/g, '""')}"`;
  telecharger(`forillon_${code}_mesures.csv`, '﻿' + [cols.join(';'), ...lignes.map((l) => cols.map((k) => cel(l[k])).join(';'))].join('\n'),
    'text/csv;charset=utf-8');
}

/**
 * Les réponses écrites des équipes, en tableur : une ligne par équipe (son animal, jamais un prénom), une colonne
 * par question. Pour l'enseignant·e, avec ou sans la collecte de la recherche.
 */
export function exporterReponses() {
  const { EQ, code, ecrites, etapesJeu } = etat;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  if (!eq.length) return;
  // une cellule qui commence par = + - @ serait prise pour une formule par le tableur : on la neutralise
  const cel = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  const aa = avantApresExport(etat.c, eq).flatMap((q, j) => [[J.idAvant(j), `Au début · ${q.q}`], [J.idApres(j), `À la fin · ${q.q}`]]);
  const tete = ['Équipe', 'Étape atteinte', 'Partie terminée', ...ecrites.map((q) => `${qid(q)} · ${q.eleve || q.q || ''}`),
    ...aa.map(([id, t]) => `${id} · ${t}`)];
  const lignes = eq.map((e) => [e.nom, `${Math.min(e.atteinte, etapesJeu.length - 1) + 1} / ${etapesJeu.length}`, e.fini ? 'oui' : 'non',
    ...ecrites.map((q) => String(e.reponses?.[q.id] || '').trim()), ...aa.map(([id]) => String(e.reponses?.[id] || '').trim())]);
  telecharger(`forillon_${code}_reponses.csv`, '\uFEFF' + [tete, ...lignes].map((l) => l.map(cel).join(';')).join('\r\n'),
    'text/csv;charset=utf-8');
}

/* ------------------------------------------------------------ questionnaire */

export function vueQuestionnaire() {
  const { c, S, AV } = etat;
  const echelles = c.avis.filter((q) => q.type === 'echelle');
  return `<div class="p-tete"><h2>Questionnaire élève</h2>
      <p>Huit questions, trois minutes, après la rétroaction. Chaque élève répond seul, sans nom, sur le Chromebook de
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
      <p class="avert">Échelle : ${c.echelle.map((x, i) => `${i + 1} = ${x}`).join(' · ')}. </p>
      <div class="p-actions"><button class="btn btn--f" data-imprimer="1">${icone('imprimer')} Imprimer (version papier)</button></div>
    </section>`;
}

/** Le questionnaire sur papier, pour une classe sans Chromebook ou une collecte éteinte. */
export function questionnairePapier() {
  const { c } = etat;
  return `<h1>Où passe la ligne&nbsp;? · ton avis</h1><p>Pas de nom. Il n'y a pas de bonne réponse.</p>
      ${c.avis.map((q, i) => `<div class="p-q"><b>${i + 1}. ${esc(q.t)}</b>${
        q.type === 'echelle' ? `<div class="p-cases">${c.echelle.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`
        : q.type === 'choix' ? `<div class="p-cases">${q.options.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`
        : '<div class="p-lignes"></div><div class="p-lignes"></div>'}</div>`).join('')}`;
}
