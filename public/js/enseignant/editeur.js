// enseignant/editeur.js — l'onglet « Réglages » et « Ta version du jeu ».
//
// Un seul éditeur pour deux usages : les réglages de la séance ouverte (les
// équipes voient le changement dès qu'on applique), et la version du jeu de
// l'enseignant·e (reprise à chaque nouvelle séance). On modifie un brouillon
// (ui.ed.r) ; rien ne part avant « Appliquer » ou « Enregistrer ».

import * as donnees from '../donnees.js';
import { mesure } from '../config.js';
import { $, esc, typo, telecharger } from '../outils.js';
import * as Rg from '../reglages.js';
import { enregistrerMaVersion, reglerSeance } from '../seance.js';
import { base, etat, ui, page } from './etat.js';

const MAX_AJOUTS = 12;
const ETATS_ECRITE = [['requise', 'Requise'], ['facultative', 'Facultative'], ['off', 'Pas posée']];
const ETATS_ORALE = [['on', 'En classe, à l\'oral'], ['off', 'Pas posée']];

/** Une ligne pour dire ce que contient une version du jeu (format, minutes, questions, corrections). */
export function resumeReglages(r) {
  const cc = Rg.appliquer(base, r);
  const n = (k, mot) => `${k} ${mot}${k > 1 ? 's' : ''}`;
  return [Rg.FORMATS[r.format]?.nom, `${cc.miseEnRoute.min + Rg.totalPrevu(cc)} min en tout`,
    n(cc.q.ecrites.length, 'question écrite') + ` dont ${cc.q.ecrites.filter((q) => q.requise).length} requises`,
    n(r.ajouts.length, 'question ajoutée'), n(Object.keys(r.corrections).length, 'correction')].join(' · ');
}

/** `cible` : 'seance' (la séance ouverte) ou 'version' (la version du jeu de l'enseignant·e). */
export function ouvrirEditeur(cible, source) {
  ui.ed = { cible, r: Rg.completer(base, source), modifie: false, msg: '', ajout: null };
}
const attente = () => (ui.ed?.cible === 'version' ? 'Changements pas encore enregistrés.' : 'Changements pas encore appliqués à la séance.');

/** Un champ a changé : on le dit, sans redessiner (le curseur reste où il est). */
function modifie() {
  if (!ui.ed) return;
  ui.ed.modifie = true; ui.ed.msg = '';
  const z = $('#ed-etat');
  if (z) { z.textContent = attente(); z.dataset.modifie = '1'; }
  const nc = $('#n-corr');
  if (nc) { const n = Object.keys(ui.ed.r.corrections).length; nc.textContent = `${n} correction${n > 1 ? 's' : ''}`; }
  const t = $('#total-min');
  if (t) { const cc = Rg.appliquer(base, ui.ed.r); t.textContent = `Total : ${cc.miseEnRoute.min + Rg.totalPrevu(cc)} min`; }
}

export function vueReglages() {
  // sans changement en attente, l'éditeur repart toujours de la séance telle qu'elle est (un « +5 min » compris)
  if (!ui.ed || ui.ed.cible !== 'seance') ouvrirEditeur('seance', etat.S?.config);
  else if (!ui.ed.modifie) ui.ed.r = Rg.completer(base, etat.S?.config);
  return editeur();
}

export function rendreEditeur() {
  if (!ui.ed) return;
  if (ui.ed.cible === 'version') { $('#onglets').innerHTML = ''; $('#prof').innerHTML = typo(editeur()); return; }
  page.rendre(true);
}

function editeur() {
  const ed = ui.ed, r = ed.r;
  const cc = Rg.appliquer(base, r);
  const ccB = Object.fromEntries(cc.banque.map((q) => [q.id, q]));
  const etapes = cc.etapes.filter((x) => x.id !== 'avis' || mesure);
  const seance = ed.cible === 'seance';
  const ouvert = (k) => (ui.ouverts.has(k) ? 'open' : '');
  const choix = (attr, id, liste, v) => `<select ${attr}="${esc(id)}" aria-label="${esc(id)}">${liste.map(([k, t]) =>
    `<option value="${k}" ${v === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;

  const ligneQuestion = (q) => {
    const m = Rg.modeQuestion(q);
    return `<div class="rg-q"><span class="qid">${esc(q.id)}</span><span class="rg-t">${esc(ccB[q.id].eleve)}</span>
      ${m === 'ecrite' ? choix('data-etatq', q.id, ETATS_ECRITE, r.questions[q.id])
        : m === 'orale' ? choix('data-etatq', q.id, ETATS_ORALE, r.questions[q.id])
          : `<span class="hint">${m === 'geste' ? 'toujours posée : c\'est le tri des documents' : 'toujours : par toi, à la mise en route'}</span>`}</div>`;
  };
  const ligneAjout = (a) => `<div class="rg-q rg-q--ajout"><span class="qid">ajout</span>
    <span class="rg-t">${esc(a.q)}<br><span class="hint">${a.mode === 'orale' ? 'orale, au débrief' : a.requise ? 'écrite, requise' : 'écrite, facultative'}${
      a.reponse ? ` · attendu : ${esc(a.reponse)}` : ''}${a.source ? ` · ${esc(a.source)}` : ''}</span></span>
    <span class="signaux"><button class="btn btn--f" data-ajout-modifier="${esc(a.id)}">Modifier</button>
      <button class="btn btn--f danger" data-ajout-retirer="${esc(a.id)}">Retirer</button></span></div>`;
  const enCours = ed.ajout ? r.ajouts.find((a) => a.id === ed.ajout) : null;
  const nCorr = Object.keys(r.corrections).length;

  const champ = (ch) => {
    const corr = r.corrections[ch.cle];
    const val = corr ? corr.valeur : ch.origine;
    return `<div class="rg-champ${corr ? ' rg-champ--corrige' : ''}">
      <label class="champ"><span>${esc(ch.label)}</span>${ch.long
        ? `<textarea data-corr="${esc(ch.cle)}" rows="3" maxlength="1500">${esc(val)}</textarea>`
        : `<input data-corr="${esc(ch.cle)}" value="${esc(val)}" maxlength="300">`}</label>
      <div class="rg-corr" ${corr ? '' : 'hidden'}>
        <p class="hint">Original : ${esc(ch.origine)}</p>
        <label class="champ"><span>Raison de la correction (gardée avec elle)</span>
          <input data-raison="${esc(ch.cle)}" value="${esc(corr?.raison || '')}" maxlength="200"
            placeholder="Ex. : chiffre mis à jour selon Parcs Canada, 2026"></label>
        <button class="btn btn--f" data-retablir="${esc(ch.cle)}">Rétablir l'original</button>
      </div></div>`;
  };

  return `<div class="rg"><div class="p-tete">
      ${seance ? '' : '<p style="margin-bottom:10px"><button class="lien" data-retour="1">← Tes séances</button></p>'}
      <h2>${seance ? 'Réglages de la séance' : 'Ta version du jeu'}</h2>
      <p>${seance ? `Ce que tu changes ici ne touche que la séance ${esc(etat.code)}. Les équipes voient le changement dès que tu appliques,
          même en pleine partie ; une réponse déjà écrite n'est jamais effacée.`
        : 'Reprise à chaque nouvelle séance. Les séances déjà créées ne changent pas.'}</p></div>

    <section class="p-sect"><div class="p-sect-h"><h3>La durée</h3>
        <span class="hint" id="total-min">Total : ${cc.miseEnRoute.min + Rg.totalPrevu(cc)} min</span></div>
      <div class="signaux formats-b">${Object.entries(Rg.FORMATS).map(([k, f]) =>
        `<button class="btn btn--f" data-format="${k}" aria-pressed="${r.format === k}">${esc(f.nom)}</button>`).join('')}</div>
      <p class="hint">Un format reprend ses minutes et ses questions ; tes questions ajoutées et tes corrections restent.
        Ensuite, chaque étape s'ajuste à la minute${seance ? ' (ou avec « +5 min » dans l\'onglet En direct)' : ''}.</p>
      <div class="minutes-g">
        <label class="champ"><span>Mise en route</span><input type="number" min="0" max="60" data-min="miseEnRoute" value="${r.miseEnRoute}"></label>
        ${etapes.map((x) => `<label class="champ"><span>${x.n}. ${esc(x.t)}</span>
          <input type="number" min="1" max="90" data-min="${x.id}" value="${r.minutes[x.id]}"></label>`).join('')}
      </div>
      ${cc.coupure ? `<p class="hint">Deux périodes : coupure conseillée après « ${esc(cc.etapes.find((x) => x.id === cc.coupure).t)} ».
        Chaque équipe reprend ensuite sur le même Chromebook, avec le même code.</p>` : ''}
    </section>

    <section class="p-sect"><div class="p-sect-h"><h3>Les questions</h3>
        <span class="hint">${cc.q.ecrites.length} écrites, dont ${cc.q.ecrites.filter((q) => q.requise).length} requises · ${cc.q.orales.length} à l'oral</span></div>
      <p class="hint">Requise : l'équipe y répond avant de continuer. Facultative : elle peut la laisser. Pas posée : elle ne la voit pas.
        Une question requise ajoutée à une étape qu'une équipe a déjà passée lui arrive dans « À rattraper ».</p>
      ${cc.etapes.filter((x) => x.id !== 'avis').map((x) => {
        const qs = base.banque.filter((q) => Rg.etapeQuestion(base, q) === x.id);
        const aj = r.ajouts.filter((a) => (a.mode === 'orale' ? 'debrief' : a.etape) === x.id);
        return qs.length || aj.length ? `<div class="rg-etape"><h4>${x.n}. ${esc(x.t)}</h4>${qs.map(ligneQuestion).join('')}${aj.map(ligneAjout).join('')}</div>` : '';
      }).join('')}

      <form id="f-ajout" class="rg-form" autocomplete="off">
        <h4>${enCours ? 'Modifier la question ajoutée' : 'Ajouter une question'}</h4>
        ${!enCours && r.ajouts.length >= MAX_AJOUTS ? `<p class="hint">Douze questions ajoutées au plus : retires-en une pour en ajouter une autre.</p>` : `
        <div class="rg-form-g">
          <label class="champ"><span>Étape (une question orale va au débrief)</span><select name="etape">${cc.etapes.filter((x) => x.id !== 'avis').map((x) =>
            `<option value="${x.id}" ${(enCours?.etape || 'trace') === x.id ? 'selected' : ''}>${x.n}. ${esc(x.t)}</option>`).join('')}</select></label>
          <fieldset class="champ"><legend>Forme</legend>
            <label class="case-l"><input type="radio" name="mode" value="ecrite" ${enCours?.mode !== 'orale' ? 'checked' : ''}><span>Écrite, en équipe</span></label>
            <label class="case-l"><input type="radio" name="mode" value="orale" ${enCours?.mode === 'orale' ? 'checked' : ''}><span>Orale, en classe</span></label>
            <label class="case-l"><input type="checkbox" name="requise" ${enCours ? (enCours.requise ? 'checked' : '') : 'checked'}><span>Requise (écrite seulement)</span></label>
          </fieldset>
        </div>
        <label class="champ"><span>La question, telle que les élèves la liront</span>
          <textarea name="q" rows="2" maxlength="300" required>${esc(enCours?.q || '')}</textarea></label>
        <label class="champ"><span>Réponse attendue (pour toi seulement)</span>
          <textarea name="reponse" rows="2" maxlength="600">${esc(enCours?.reponse || '')}</textarea></label>
        <label class="champ"><span>Source (facultatif)</span><input name="source" maxlength="200" value="${esc(enCours?.source || '')}"></label>
        <div class="p-actions"><button class="btn btn--f" type="submit">${enCours ? 'Garder la modification' : 'Ajouter la question'}</button>
          ${enCours ? '<button class="btn btn--f" type="button" data-ajout-modifier="">Annuler</button>' : ''}</div>`}
      </form>
    </section>

    <section class="p-sect"><div class="p-sect-h"><h3>Les corrections</h3>
        <span class="hint" id="n-corr">${nCorr} correction${nCorr > 1 ? 's' : ''}</span></div>
      <p class="hint">Un chiffre a changé, une source a bougé, un nom s'écrit autrement : corrige-le ici. L'original reste gardé avec la raison
        de la correction ; « Rétablir l'original » le remet.</p>
      ${Rg.corrigeables(base).map((g) => {
        const n = g.items.reduce((k, it) => k + it.champs.filter((ch) => r.corrections[ch.cle]).length, 0);
        return `<details class="rg-groupe" data-k="rg|${esc(g.t)}" ${ouvert(`rg|${g.t}`)}><summary>${esc(g.t)}${n ? ` <span class="badge badge--reprise">${n} corrigé${n > 1 ? 's' : ''}</span>` : ''}</summary>
          ${g.items.map((it) => {
            const k = `rg|${it.groupe}|${it.id}`;
            const m = it.champs.some((ch) => r.corrections[ch.cle]);
            return `<details class="rg-item" data-k="${esc(k)}" ${ouvert(k)}><summary>${esc(it.titre)}${m ? ' <span class="badge badge--reprise">corrigé</span>' : ''}</summary>
              ${it.champs.map(champ).join('')}</details>`;
          }).join('')}</details>`;
      }).join('')}
    </section>

    <section class="p-sect"><div class="p-sect-h"><h3>Partager</h3></div>
      <p class="hint">Exporte tes questions ajoutées et tes corrections (un fichier JSON, sans aucune donnée d'élève) pour les envoyer à
        l'équipe du jeu : les bonnes idées pourront entrer dans la version officielle. Importer reprend un fichier exporté, celui
        d'un·e collègue par exemple ; rien ne change avant que tu appliques.</p>
      <div class="p-actions"><button class="btn btn--f" data-ed="exporter">Exporter (JSON)</button>
        <label class="btn btn--f">Importer un fichier<input type="file" accept=".json,application/json" id="importer" hidden></label></div>
    </section>
    <div class="rg-barre">
      <span class="hint" id="ed-etat" ${ed.modifie ? 'data-modifie="1"' : ''}>${ed.modifie ? attente() : esc(ed.msg || (seance ? 'Rien à appliquer.' : 'Rien à enregistrer.'))}</span>
      <span class="signaux">
        ${seance ? '<button class="btn" data-ed="appliquer">Appliquer à la séance</button>' : '<button class="btn" data-ed="enregistrer">Enregistrer ma version</button>'}
        <button class="btn btn--f" data-ed="annuler">Annuler les changements</button>
        ${seance ? '<button class="btn btn--f" data-ed="garder">Enregistrer aussi comme ma version</button>' : ''}
      </span></div></div>`;
}

/* ------------------------------------------------------------ exporter, importer */

function exporterReglages() {
  const r = ui.ed.r;
  const champs = new Map(Rg.corrigeables(base).flatMap((g) => g.items.flatMap((it) => it.champs.map((ch) => [ch.cle, { it, ch }]))));
  const nomEtape = (id) => base.etapes.find((x) => x.id === id)?.t || id;
  const sortie = {
    jeu: 'Où passe la ligne — Forillon', versionContenu: base.version || '', exporteLe: new Date().toISOString(),
    format: r.format, miseEnRoute: r.miseEnRoute, minutes: r.minutes, questions: r.questions,
    ajouts: r.ajouts.map((a) => ({ ...a, etapeNom: nomEtape(a.etape) })),
    corrections: Object.entries(r.corrections).map(([cle, x]) => ({ cle, element: champs.get(cle)?.it.titre || '',
      champ: champs.get(cle)?.ch.label || '', original: champs.get(cle)?.ch.origine || '', corrige: x.valeur,
      raison: x.raison || '', date: x.date ? new Date(x.date).toISOString().slice(0, 10) : '' }))
  };
  telecharger(`forillon_reglages_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(sortie, null, 2), 'application/json');
}

/** Lit un fichier exporté : on ne garde que ce qu'on reconnaît. */
function lireReglages(texte) {
  const o = JSON.parse(texte);
  const cles = new Set(Rg.corrigeables(base).flatMap((g) => g.items.flatMap((it) => it.champs.map((ch) => ch.cle))));
  const corrections = {};
  const liste = Array.isArray(o.corrections) ? o.corrections.map((x) => [x.cle, { valeur: x.corrige, raison: x.raison }])
    : Object.entries(o.corrections || {});
  for (const [cle, x] of liste) if (cles.has(cle) && typeof x?.valeur === 'string')
    corrections[cle] = { valeur: x.valeur.slice(0, 1500), raison: String(x.raison || '').slice(0, 200), date: Date.now() };
  const etapes = new Set(base.etapes.map((x) => x.id));
  const ajouts = (Array.isArray(o.ajouts) ? o.ajouts : []).filter((a) => a && typeof a.q === 'string' && a.q.trim() && etapes.has(a.etape))
    .slice(0, MAX_AJOUTS).map((a) => nouvelAjout(a));
  const questions = {};
  for (const [id, v] of Object.entries(o.questions || {})) if (['requise', 'facultative', 'off', 'on'].includes(v)) questions[id] = v;
  const minutes = {};
  for (const [id, v] of Object.entries(o.minutes || {})) if (etapes.has(id) && Number.isFinite(Number(v))) minutes[id] = Math.max(1, Math.min(90, Math.round(v)));
  return Rg.completer(base, { format: Rg.FORMATS[o.format] ? o.format : 'standard',
    miseEnRoute: Number.isFinite(Number(o.miseEnRoute)) ? Math.max(0, Math.min(60, Math.round(o.miseEnRoute))) : undefined,
    minutes, questions, ajouts, corrections });
}

/** Une question ajoutée, nettoyée : longueurs bornées, identifiant sûr. */
function nouvelAjout(a, id) {
  const orale = a.mode === 'orale';
  const valide = (x) => typeof x === 'string' && /^A[a-z0-9]{3,14}$/.test(x);
  return { id: id || (valide(a.id) ? a.id : `A${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`),
    etape: orale ? 'debrief' : a.etape, q: String(a.q).trim().slice(0, 300), reponse: String(a.reponse || '').trim().slice(0, 600),
    source: String(a.source || '').trim().slice(0, 200), mode: orale ? 'orale' : 'ecrite', requise: !orale && !!a.requise, t: Date.now() };
}

/* ------------------------------------------------------------ les gestes de l'éditeur */

async function actionEditeur(quoi, bouton) {
  const ed = ui.ed;
  if (quoi === 'exporter') return exporterReglages();
  if (quoi === 'annuler') {
    ouvrirEditeur(ed.cible, ed.cible === 'seance' ? etat.S?.config : ui.maVersion);
    ui.ed.msg = 'Changements annulés.';
    return rendreEditeur();
  }
  if (bouton) bouton.disabled = true;
  try {
    if (quoi === 'appliquer') {
      await reglerSeance(etat.code, ed.r);
      ed.modifie = false;
      ed.msg = `Appliqué à la séance à ${new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}.`;
    }
    if (quoi === 'enregistrer' || quoi === 'garder') {
      etat.MOI = etat.MOI || await donnees.identite();
      await enregistrerMaVersion(etat.MOI.uid, ed.r);
      ui.maVersion = JSON.parse(JSON.stringify(ed.r));
      if (quoi === 'enregistrer') ed.modifie = false;
      ed.msg = quoi === 'garder' && ed.modifie ? 'Enregistré comme ta version ; pas encore appliqué à la séance.'
        : `Enregistré comme ta version : chaque nouvelle séance partira de là.`;
    }
  } catch (e) {
    console.warn('Réglages non enregistrés', e);
    ed.msg = 'Impossible d\'enregistrer pour le moment. Vérifie la connexion, puis réessaie.';
  }
  return rendreEditeur();
}

// on modifie le brouillon sans redessiner (le curseur reste où il est)
document.addEventListener('input', (ev) => {
  if (!ui.ed) return;
  const r = ui.ed.r;
  const mi = ev.target.closest('[data-min]');
  if (mi) {
    const v = Math.round(Number(mi.value));
    if (!Number.isFinite(v) || mi.value === '') return;
    if (mi.dataset.min === 'miseEnRoute') r.miseEnRoute = Math.max(0, Math.min(60, v));
    else r.minutes[mi.dataset.min] = Math.max(1, Math.min(90, v));
    return modifie();
  }
  const co = ev.target.closest('[data-corr]');
  if (co) {
    const cle = co.dataset.corr;
    const ch = Rg.corrigeables(base).flatMap((g) => g.items.flatMap((it) => it.champs)).find((x) => x.cle === cle);
    if (!ch) return;
    const boite = co.closest('.rg-champ');
    if (co.value.trim() && co.value.trim() !== ch.origine.trim()) {
      r.corrections[cle] = { valeur: co.value.trim(), raison: r.corrections[cle]?.raison || boite.querySelector('[data-raison]')?.value.trim() || '', date: Date.now() };
      boite.classList.add('rg-champ--corrige'); boite.querySelector('.rg-corr').hidden = false;
    } else {
      delete r.corrections[cle];
      boite.classList.remove('rg-champ--corrige'); boite.querySelector('.rg-corr').hidden = true;
    }
    return modifie();
  }
  const ra = ev.target.closest('[data-raison]');
  if (ra && r.corrections[ra.dataset.raison]) { r.corrections[ra.dataset.raison].raison = ra.value.trim(); return modifie(); }
});

document.addEventListener('change', async (ev) => {
  if (!ui.ed) return;
  const eq = ev.target.closest('[data-etatq]');
  if (eq) { ui.ed.r.questions[eq.dataset.etatq] = eq.value; modifie(); return; }
  if (ev.target.id === 'importer' && ev.target.files?.[0]) {
    try {
      ui.ed.r = lireReglages(await ev.target.files[0].text());
      ui.ed.modifie = true; ui.ed.msg = '';
    } catch (e) {
      console.warn('Fichier illisible', e);
      ui.ed.msg = 'Ce fichier ne ressemble pas à des réglages exportés depuis ce site.';
    }
    return rendreEditeur();
  }
});

document.addEventListener('submit', (ev) => {
  if (ev.target.id !== 'f-ajout' || !ui.ed) return;
  ev.preventDefault();
  const f = new FormData(ev.target);
  if (!String(f.get('q') || '').trim()) return;
  const a = nouvelAjout({ etape: f.get('etape'), q: f.get('q'), reponse: f.get('reponse'), source: f.get('source'),
    mode: f.get('mode'), requise: f.get('requise') === 'on' }, ui.ed.ajout || undefined);
  const r = ui.ed.r;
  const i = r.ajouts.findIndex((x) => x.id === a.id);
  if (i > -1) r.ajouts[i] = a; else if (r.ajouts.length < MAX_AJOUTS) r.ajouts.push(a);
  ui.ed.ajout = null; ui.ed.modifie = true; ui.ed.msg = '';
  rendreEditeur();
});

document.addEventListener('click', (ev) => {
  if (!ui.ed) return;
  const ed = ev.target.closest('[data-ed]');
  if (ed) return actionEditeur(ed.dataset.ed, ed);
  const fm = ev.target.closest('[data-format]');
  if (fm) {
    // « Sur mesure » garde les minutes et les questions déjà choisies ; un format prêt les remplace
    if (fm.dataset.format === 'mesure') ui.ed.r.format = 'mesure';
    else ui.ed.r = Rg.reglagesDuFormat(base, fm.dataset.format, { ajouts: ui.ed.r.ajouts, corrections: ui.ed.r.corrections });
    ui.ed.modifie = true; ui.ed.msg = '';
    return rendreEditeur();
  }
  const am = ev.target.closest('[data-ajout-modifier]');
  if (am) { ui.ed.ajout = am.dataset.ajoutModifier || null; rendreEditeur(); if (ui.ed.ajout) $('#f-ajout')?.scrollIntoView({ block: 'center' }); return; }
  const ar = ev.target.closest('[data-ajout-retirer]');
  if (ar) {
    ui.ed.r.ajouts = ui.ed.r.ajouts.filter((a) => a.id !== ar.dataset.ajoutRetirer);
    if (ui.ed.ajout === ar.dataset.ajoutRetirer) ui.ed.ajout = null;
    ui.ed.modifie = true; ui.ed.msg = '';
    return rendreEditeur();
  }
  const rt = ev.target.closest('[data-retablir]');
  if (rt) { delete ui.ed.r.corrections[rt.dataset.retablir]; ui.ed.modifie = true; ui.ed.msg = ''; return rendreEditeur(); }
});
