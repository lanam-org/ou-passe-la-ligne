// enseignant/rapport.js — le rapport de séance, et l'impression en général.
//
// Pour garder une trace d'une séance sans rien laisser en ligne : on imprime,
// ou on choisit « Enregistrer au format PDF » dans la fenêtre d'impression,
// puis on efface la séance. Aucun prénom n'y figure : les équipes sont des animaux.

import { mesure } from '../config.js';
import { $, esc, typo, dec, mmss } from '../outils.js';
import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { carte } from '../carte.js';
import { aUnBravo } from '../seance.js';
import { base, etat, qid, autresReponses } from './etat.js';

export function rapportHTML() {
  const { c, S, EQ, AV, code, ecrites, etapesJeu } = etat;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const date = S ? new Date(S.creeLe).toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' }) : '';
  const rs = eq.map((e) => J.releve(c, e));
  const traces = eq.filter((e) => e.atteinte >= 3);
  const rsT = traces.map((e) => J.releve(c, e));
  const compte = (f) => rsT.filter(f).length;
  const rezone = eq.filter((e) => (e.compteurs?.apresComp || []).some((x) => x > 0)).length;
  const moyenne = (l) => l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0;
  const ind = eq.map((e) => J.indicateurs(c, e));
  const lignes = ind[0] || [];
  const ok = (v) => v === true ? ' ✓' : v === false ? ' ✗' : '';
  const temps = etapesJeu.map((x) => {
    const t = eq.map((e) => J.tempsEtape(c, e, x.id)).filter((v) => v > 0);
    return `<tr><td>${x.n}. ${esc(x.t)}</td><td>${x.min} min</td><td>${t.length ? mmss(moyenne(t)) : ''}</td>
      <td>${t.length ? mmss(Math.max(...t)) : ''}</td><td>${t.length}</td></tr>`;
  }).join('');
  const avis = mesure && AV.length ? `<h2>Questionnaire « Ton avis » (${AV.length} réponse${AV.length > 1 ? 's' : ''})</h2>
    <table><thead><tr><th>Question</th><th>Résultat</th></tr></thead><tbody>${c.avis.filter((q) => q.type === 'echelle').map((q) => {
      const n = AV.map((a) => Number(a[q.id])).filter(Boolean);
      return `<tr><td>${esc(q.t)}</td><td>${n.length ? `${dec(moyenne(n))} / 4 (${n.length})` : ''}</td></tr>`;
    }).join('')}</tbody></table>` : '';
  return `<header class="r-tete"><h1>Où passe la ligne — rapport de séance</h1>
      <p>Séance ${esc(code)} · ${esc(date)} · ${eq.length} équipe${eq.length > 1 ? 's' : ''} · ${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}</p>
      <p class="r-note">Aucun prénom : chaque équipe porte un nom d'animal. Rapport imprimé le
        ${esc(new Date().toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' }))}.</p></header>
    <h2>La classe</h2>
    <table><tbody>
      <tr><td>Équipes qui ont tracé une ligne</td><td>${traces.length} / ${eq.length}</td></tr>
      <tr><td>Vident les six villages, comme en 1970</td><td>${compte((r) => r.vides.length === J.nbVillages(c))}</td></tr>
      <tr><td>Gardent au moins un village dans le parc</td><td>${compte((r) => r.gardes.length > 0)}</td></tr>
      <tr><td>Gardent le corridor continu</td><td>${compte((r) => r.corridor === 'continu')}</td></tr>
      <tr><td>Ont rezoné après un autre point de vue</td><td>${rezone}</td></tr>
      <tr><td>Ont terminé la partie</td><td>${eq.filter((e) => e.fini).length}</td></tr>
    </tbody></table>
    <h2>Le temps, étape par étape</h2>
    <table><thead><tr><th>Étape</th><th>Prévu</th><th>Moyenne</th><th>Le plus long</th><th>Équipes</th></tr></thead><tbody>${temps}</tbody></table>
    ${rapportReglages()}
    ${eq.length ? `<h2>Indicateurs par équipe</h2>
    <table class="r-ind"><thead><tr><th>Indicateur</th>${eq.map((e) => `<th>${esc(e.nom)}</th>`).join('')}</tr></thead>
      <tbody>${lignes.map((l, i) => `<tr><td>${esc(l.k)}</td>${ind.map((x) => `<td>${esc(x[i].v)}${ok(x[i].ok)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="r-note">✓ repère atteint · ✗ non atteint · vide : pas encore mesuré. Repères à ajuster après le premier essai.</p>` : ''}
    ${avis}
    ${eq.map((e, k) => {
      const r = rs[k];
      // les prénoms ne passent jamais par le site (Loi 25, élèves de moins de 14 ans) : une ligne à remplir à la main
      return `<section class="r-eq"><h2>Équipe ${esc(e.nom)}</h2>
        <p class="r-membres">Membres de l'équipe (à écrire à la main) : <span></span></p>
        <div class="r-eq-g"><div class="r-carte">${carte(c, e, { cliquable: false })
          // motifs renommés : les identifiants SVG doivent être uniques dans la page
          .replace(/id="m-/g, `id="r${k}-m-`).replace(/url\(#m-/g, `url(#r${k}-m-`)}</div>
        <div><p><span class="r-k">Étape atteinte :</span> ${e.atteinte + 1} / ${etapesJeu.length}${e.fini ? ' — partie terminée' : ''}</p>
          <p><span class="r-k">Villages à vider :</span> ${r.vides.length} / ${J.nbVillages(c)}${r.vides.length ? ` (${r.vides.map(esc).join(', ')})` : ''}</p>
          <p><span class="r-k">Villages gardés :</span> ${r.gardes.length}${r.gardes.length ? ` (${r.gardes.map(esc).join(', ')})` : ''}</p>
          <p><span class="r-k">Corridor :</span> ${r.corridor} · <span class="r-k">Zones :</span> ${new Set(Object.values(e.zones).filter(Boolean)).size}</p>
          ${e.juge ? `<p><span class="r-k">Documents retenus :</span> ${e.docs.map((id) => { const d = c.documents.find((x) => x.id === id);
            return `${d.utile ? '✓' : '—'} ${esc(d.t)}`; }).join(' · ')}</p>` : ''}
          ${e.mentions.length ? `<p><span class="r-k">Gestes reconnus :</span> ${e.mentions.map((id) => esc(c.mentions[id].nom)).join(', ')}</p>` : ''}
        </div></div>
        <dl class="r-rep">${ecrites.map((q) => `<dt>${esc(qid(q))} · ${esc(q.eleve)}${q.requise ? '' : ' (facultative)'}</dt>
          <dd>${String(e.reponses?.[q.id] || '').trim() ? esc(e.reponses[q.id]) + (aUnBravo(S, e.id, q.id) ? ' <b>✦ bravo</b>' : '') : '<i>pas de réponse</i>'}</dd>`).join('')}${
          autresReponses(e).map((x) => `<dt>${esc(x.t)} (${esc(x.k)})</dt><dd>${esc(x.r)}</dd>`).join('')}</dl>
      </section>`;
    }).join('')}`;
}

/** Les réglages de la séance, pour que le papier dise dans quelles conditions on a joué. */
function rapportReglages() {
  const { c, ecrites, etapesJeu } = etat;
  const r = c.reglages;
  const corr = Object.entries(r.corrections || {});
  const champs = new Map(Rg.corrigeables(base).flatMap((g) => g.items.flatMap((it) => it.champs.map((ch) => [ch.cle, { it, ch }]))));
  return `<h2>Réglages de la séance</h2>
    <table><tbody>
      <tr><td>Format</td><td>${esc(Rg.FORMATS[r.format]?.nom || '')}</td></tr>
      <tr><td>Minutes prévues</td><td>${c.miseEnRoute.min} de mise en route, puis ${etapesJeu.map((x) => `${esc(x.t)} ${x.min}`).join(' · ')}</td></tr>
      <tr><td>Questions</td><td>${ecrites.length} écrites en équipe (${ecrites.filter((q) => q.requise).length} requises) · ${c.q.orales.length} à l'oral</td></tr>
    </tbody></table>
    ${r.ajouts.length ? `<h3>Questions ajoutées par l'enseignant·e</h3><ul>${r.ajouts.map((a) => `<li>${esc(a.q)}
      <span class="r-note">(${esc(c.etapes.find((x) => x.id === a.etape)?.t || '')}${a.mode === 'orale' ? ', à l\'oral' : a.requise ? ', requise' : ', facultative'})</span></li>`).join('')}</ul>` : ''}
    ${corr.length ? `<h3>Corrections au contenu</h3><table><thead><tr><th>Où</th><th>Original</th><th>Corrigé</th><th>Raison</th></tr></thead>
      <tbody>${corr.map(([cle, x]) => { const d = champs.get(cle);
        return `<tr><td>${esc(d ? `${d.it.titre} · ${d.ch.label}` : cle)}</td><td>${esc(d?.ch.origine || '')}</td><td>${esc(x.valeur)}</td><td>${esc(x.raison || '')}</td></tr>`; }).join('')}</tbody></table>` : ''}`;
}

/** Imprime un morceau de page (rapport, dossier, questionnaire), toujours en clair. */
export function imprimer(html) {
  $('#papier').innerHTML = typo(html);
  const themeAvant = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', 'light');   // le papier est toujours clair
  document.body.classList.add('imprime');
  const retour = () => {
    document.body.classList.remove('imprime');
    if (window.forillonTheme) window.forillonTheme.appliquer();   // l'affichage choisi (clair, sombre, contraste élevé)
    else if (themeAvant) document.documentElement.setAttribute('data-theme', themeAvant);
    else document.documentElement.removeAttribute('data-theme');
    window.removeEventListener('afterprint', retour);
  };
  window.addEventListener('afterprint', retour);
  window.print();
}
