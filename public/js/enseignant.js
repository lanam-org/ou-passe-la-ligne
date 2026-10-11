// enseignant.js — l'espace enseignant·e, séparé du jeu.
//
// Créer une séance (un code à afficher), suivre les équipes en direct, envoyer
// un message à toute la classe, animer le débrief, retrouver les questions et
// leurs réponses attendues, puis fermer et effacer la séance.
//
// Les réglages (durée, questions, corrections) se changent avant ou pendant la
// séance ; la version du jeu de l'enseignant·e les reprend à chaque nouvelle séance.

import * as donnees from './donnees.js';
import { mesure, googleEnseignant } from './config.js';
import { $, esc, typo, dec, mmss, chargerContenu, telecharger } from './outils.js';
import * as J from './jeu.js';
import * as Rg from './reglages.js';
import { carte, blocReleve } from './carte.js';
import { dossierHTML } from './dossierdoc.js';
import { creerSeanceDemo } from './demo.js';
import { creerSeance, cheminSeance, effacerSeance, mesSeances, SIGNAUX, lireMaVersion, enregistrerMaVersion,
  reglerSeance, reglerChrono, chronoNeuf } from './seance.js';

// Le contenu d'origine, puis le contenu réglé pour la séance ouverte.
const base = await chargerContenu();
let c, B, ecrites, etapesJeu, empreinte = '';
function appliquerReglages(config) {
  const k = JSON.stringify(config || null);
  if (c && k === empreinte) return false;
  empreinte = k;
  c = Rg.appliquer(base, config || null);
  B = Object.fromEntries(c.banque.map((q) => [q.id, q]));
  ecrites = J.questionsEcrites(c);
  etapesJeu = c.etapes.filter((x) => x.id !== 'avis');
  return true;
}
appliquerReglages(null);
const CLE = 'forillon:seance-prof';

let code = null, S = null, EQ = [], AV = [], choisie = null, onglet = 'direct', MOI = null;
const ui = { cacheAttendu: false, effacer: false, projection: false, ouverts: new Set(), effacerListe: null,
  maVersion: null, ed: null, chronoLance: '', pastilles: true };
let arrets = [];

const ONGLETS = [
  { id: 'direct', t: 'En direct' }, { id: 'reglages', t: 'Réglages' }, { id: 'debrief', t: 'Débrief' },
  { id: 'questions', t: 'Questions' }, { id: 'dossier', t: 'Dossier' }, { id: 'deroulement', t: 'Déroulement' }, { id: 'mesures', t: 'Mesures' },
  { id: 'questionnaire', t: 'Questionnaire' }
];
const qid = (q) => (q.ajout ? 'ajout' : q.id);
/** Comparer deux réglages sans dépendre de l'ordre des clés (Firestore les renvoie triées). */
const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v));

/* ------------------------------------------------------------ démarrer */

async function demarrer() {
  if (donnees.mode === 'local') $('#mode-local').hidden = false;
  // On n'invente pas d'identité au chargement : on regarde seulement s'il y en a une.
  MOI = await donnees.attendreUtilisateur();
  let garde = null;
  try { garde = localStorage.getItem(CLE); } catch { /* vide */ }
  if (garde && MOI) {
    try {
      const s = await donnees.lire(cheminSeance(garde));
      if (s && (donnees.mode === 'local' || s.enseignantId === MOI.uid)) return ouvrir(garde);
    } catch { /* on revient à la liste */ }
  }
  ecranAccueil();
}

const JOUR = 86400000;
const dateCourte = (t) => new Date(t).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });

/** L'accueil de l'espace : le compte, une nouvelle séance, et les séances déjà créées. */
async function ecranAccueil(erreur = '') {
  arrets.forEach((f) => f()); arrets = [];
  code = null; S = null; EQ = []; AV = []; choisie = null; onglet = 'direct'; ui.ed = null;
  appliquerReglages(null);
  $('#onglets').innerHTML = '';
  let liste = [];
  try { liste = MOI ? await mesSeances(MOI.uid) : []; } catch (e) { console.warn('Liste des séances indisponible', e); }
  ui.maVersion = MOI ? await lireMaVersion(MOI.uid) : null;
  const v = ui.maVersion ? Rg.completer(base, ui.maVersion) : null;
  const fmt = v?.format || 'standard';
  const google = MOI && !MOI.anonyme;
  const compte = donnees.mode === 'local'
    ? '<p class="hint">Mode démonstration : pas de compte. La connexion Google sera proposée une fois le site branché sur Firebase.</p>'
    : !googleEnseignant ? '<p class="hint">Sans compte : tes séances restent liées à ce navigateur.</p>'
    : google ? `<p>Connecté·e avec Google : <b>${esc(MOI.nom || '')}</b> ${MOI.courriel ? `· ${esc(MOI.courriel)}` : ''}</p>
        <p class="hint">Tu retrouves tes séances sur n'importe quel ordinateur. Ni ton nom ni ton courriel ne sont écrits dans la base.</p>
        <div class="p-actions"><button class="btn btn--f" data-deconnexion="1">Se déconnecter</button></div>`
    : `<p>Sans compte, tes séances restent liées à <b>ce navigateur</b>. Avec Google, tu les retrouves sur n'importe quel ordinateur.</p>
        <p class="hint">Les élèves, eux, n'ont jamais de compte. Ni ton nom ni ton courriel ne sont écrits dans la base.</p>
        <div class="p-actions"><button class="btn" data-google="1">Se connecter avec Google</button></div>`;
  $('#prof').innerHTML = typo(`<div class="p-tete creer">
      <h2>Tes séances</h2>
      <p>Une séance = un code de cinq caractères. Tu l'affiches au tableau ; chaque équipe l'entre sur
        son Chromebook. Tu suis ensuite les équipes ici, en direct.</p>
    </div>
    ${erreur ? `<p class="erreur" role="alert">${esc(erreur)}</p>` : ''}
    <section class="p-sect creer"><div class="p-sect-h"><h3>Ton compte</h3></div>${compte}</section>
    <section class="p-sect creer"><div class="p-sect-h"><h3>Nouvelle séance</h3></div>
      <fieldset class="formats" id="formats"><legend>La durée</legend>
        ${Object.entries(Rg.FORMATS).map(([k, f]) => `<label class="case-l"><input type="radio" name="format" value="${k}" ${k === fmt ? 'checked' : ''}>
          <span>${esc(f.nom)}<br><span class="hint">${esc(f.resume)}</span></span></label>`).join('')}
      </fieldset>
      <p class="hint">${v ? `Ta version du jeu sert de départ (${esc(resumeReglages(v))}). Choisir un autre format reprend ses minutes et ses questions ; tes questions ajoutées et tes corrections restent.`
        : 'Les minutes de chaque étape, les questions et les corrections se changent ensuite dans l\'onglet « Réglages », même pendant la séance.'}</p>
      <label class="case-l"><input type="checkbox" id="opt-avis" ${mesure ? '' : 'disabled'}>
        <span>Proposer le questionnaire « Ton avis » à la fin (séances d'essai, hors du temps de la séance).
        ${mesure ? '' : '<br><span class="hint">Désactivé : la collecte pour la recherche est éteinte dans config.js, en attendant le certificat d\'éthique.</span>'}</span></label>
      <div class="p-actions"><button class="btn" id="creer">Créer la séance →</button></div>
    </section>
    ${donnees.mode === 'local' ? `<section class="p-sect creer" id="demo"><div class="p-sect-h"><h3>Séance de démonstration</h3></div>
      <p>Une séance de 75 minutes déjà en cours depuis 40 minutes, avec quatre équipes à des endroits différents :
        une au retour sur la démarche, une aux points de vue, une bloquée à « Se questionner » au-delà du temps prévu,
        une arrivée en retard. Pour voir le suivi en direct, le débrief et le rapport sans faire jouer quatre onglets.</p>
      <p class="hint">Réponses inventées. Une vraie équipe peut aussi la rejoindre avec son code, dans un autre onglet.</p>
      <div class="p-actions"><button class="btn btn--f" data-demo="1">Ouvrir une séance de démonstration →</button></div>
    </section>` : ''}
    <section class="p-sect creer"><div class="p-sect-h"><h3>Ta version du jeu</h3></div>
      <p>${v ? esc(resumeReglages(v)) : 'Aucune pour l\'instant : chaque séance part de la version d\'origine.'}</p>
      <p class="hint">Tes corrections, tes questions ajoutées, tes minutes : reprises à chaque nouvelle séance. Les séances déjà créées ne changent pas.</p>
      <div class="p-actions"><button class="btn btn--f" data-ma-version="1">${v ? 'Modifier ma version' : 'Créer ma version'}</button></div>
    </section>
    <section class="p-sect"><div class="p-sect-h"><h3>Séances déjà créées (${liste.length})</h3>
      <span class="hint">Les réponses des équipes restent en ligne tant que la séance existe : imprime le rapport, puis efface.</span></div>
      ${liste.length ? `<div class="tab-w"><table class="tab" id="mes-seances"><thead><tr><th>Créée le</th><th>Code</th><th>État</th><th></th></tr></thead>
        <tbody>${liste.map((x) => `<tr><td>${esc(dateCourte(x.creeLe))}${Date.now() - x.creeLe > 30 * JOUR
          ? ' <span class="badge badge--reprise">plus de 30 jours</span>' : ''}</td>
          <td class="mono">${esc(x.id)}${x.demo ? ' <span class="badge">démonstration</span>' : ''}</td><td>${x.etat === 'ouverte' ? 'ouverte' : 'fermée'}</td>
          <td><div class="signaux"><button class="btn btn--f" data-ouvrir="${esc(x.id)}">Ouvrir</button>
            ${ui.effacerListe === x.id
              ? `<button class="btn btn--danger" data-effacer-liste="${esc(x.id)}" data-confirme="1">Oui, effacer</button>
                 <button class="btn btn--f" data-effacer-liste="">Annuler</button>`
              : `<button class="btn btn--f danger" data-effacer-liste="${esc(x.id)}">Effacer</button>`}</div></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="vide">Aucune séance pour l\'instant.</p>'}
    </section>`);
}

function ouvrir(cd) {
  code = cd; ui.ed = null;
  try { localStorage.setItem(CLE, cd); } catch { /* vide */ }
  arrets.forEach((f) => f());
  arrets = [
    donnees.ecouter(cheminSeance(code), (s) => {
      S = s; if (!s) return finie();
      appliquerReglages(s.config);
      lancerChrono(); rendre();
    }),
    donnees.ecouterCollection(`${cheminSeance(code)}/equipes`, (l) => { EQ = l; lancerChrono(); rendre(); })
  ];
  if (mesure) arrets.push(donnees.ecouterCollection(`${cheminSeance(code)}/avis`, (l) => { AV = l; if (onglet === 'questionnaire') rendre(); }));
  rendre();
}

function finie() {
  try { localStorage.removeItem(CLE); } catch { /* vide */ }
  ecranAccueil();
}

// les chronomètres avancent sans attendre une écriture
setInterval(() => { if (code && onglet === 'direct' && !document.hidden) rendre(); }, 5000);

/* ------------------------------------------------------------ outils d'affichage */

const etapeDe = (e) => c.etapes[e.etape] || c.etapes[0];
const lienEleve = () => new URL(`eleve.html?code=${code}`, location.href).href;

/** Le chrono de la classe (une ancienne séance sans chrono compte depuis sa création). */
const chronoDe = () => S?.chrono || { debut: S?.creeLe || null, pause: null, pauses: [] };

/** Le chrono démarre seul avec la première équipe. */
function lancerChrono() {
  if (!S?.chrono || S.chrono.debut || !EQ.length || ui.chronoLance === code) return;
  ui.chronoLance = code;
  reglerChrono(code, { ...S.chrono, debut: Math.min(...EQ.map((e) => e.creeLe || Date.now())) })
    .catch((e) => { ui.chronoLance = ''; console.warn('Chrono non démarré', e); });
}

function etatTemps(e) {
  if (e.fini) return { cls: 't--ok', txt: 'terminé' };
  const x = etapeDe(e);
  const prevu = x.min * 60000;
  const t = prevu - Rg.resteEtape(c, e, chronoDe());
  return { cls: t > 1.5 * prevu ? 't--alerte' : t > prevu ? 't--att' : 't--ok', txt: `${mmss(t)} / ${x.min} min` };
}

function segments(e) {
  return `<div class="eq-seg" style="grid-template-columns:repeat(${etapesJeu.length},1fr)" aria-hidden="true">${
    etapesJeu.map((x, i) => `<i class="${e.fini || i < e.etape ? 'fait' : i === e.etape ? 'ici' : ''}"></i>`).join('')}</div>`;
}

function puces(e) {
  const r = J.releve(c, e);
  const utiles = e.docs.filter((id) => c.documents.find((d) => d.id === id)?.utile).length;
  const p = [`relevés ${e.releves.length}/${c.releves.length}`];
  if (e.juge) p.push(`docs utiles ${utiles}/3`);
  if (e.atteinte >= 3) p.push(`villages vidés ${r.vides.length}/${J.nbVillages(c)}`, `corridor ${r.corridor}`);
  if (e.comps) p.push(`points de vue ${e.comps}/4`);
  p.push(`réponses ${ecrites.filter((q) => J.repondu(e, q.id)).length}/${ecrites.length}`);
  if (e.mentions.length) p.push(`✦ ${e.mentions.length}`);
  return `<div class="puces">${p.map((x) => `<span class="puce">${esc(x)}</span>`).join('')}</div>`;
}

/* ------------------------------------------------------------ en direct */

function vueDirect() {
  const ch = chronoDe();
  const total = c.miseEnRoute.min + Rg.totalPrevu(c);
  const classe = Rg.etapeDeLaClasse(c, EQ);
  const sg = S?.signal;
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const sel = eq.find((e) => e.id === choisie);
  return `<div class="p-tete">
      <p style="margin-bottom:10px"><button class="lien" data-retour="1">← Tes séances</button></p>
      <div class="code-g">
        <div><p class="sur">Code de la séance</p><p class="code-v" id="code-seance">${esc(code)}</p></div>
        <div><p class="sur">Chrono de la classe${ch.pause ? ' · en pause' : ''}</p>
          <p class="chrono" id="chrono">${ch.debut ? mmss(Rg.ecoule(ch)) : '—'}</p>
          <p class="hint">${ch.debut ? '' : 'Il démarre avec la première équipe. '}Prévu : ${total} min en tout, ${c.miseEnRoute.min} de mise en route, puis
            ${etapesJeu.map((x) => x.min).join(' + ')} min.</p>
          <div class="signaux">${!ch.debut ? '<button class="btn btn--f" data-chrono="demarrer">Démarrer maintenant</button>'
            : ch.pause ? '<button class="btn" data-chrono="reprendre">Reprendre</button>'
              : '<button class="btn btn--f" data-chrono="pause">Pause</button>'}
            ${ch.debut ? '<button class="btn btn--f" data-chrono="zero">Remettre à zéro</button>' : ''}</div></div>
      </div>
      <p class="code-u" style="margin-top:10px">Les équipes ouvrent <b>${esc(lienEleve())}</b></p>
    </div>
    <section class="p-sect">
      <div class="p-sect-h"><h3>Message à toute la classe</h3>
        <span class="hint">${sg && SIGNAUX[sg.type] ? `Affiché : « ${esc(SIGNAUX[sg.type].t)} »` : 'Aucun message affiché.'}</span></div>
      <div class="signaux">
        ${Object.entries(SIGNAUX).map(([k, v]) => `<button class="btn btn--f" data-signal="${k}">${esc(v.court)}</button>`).join('')}
        <button class="btn btn--f" data-signal="">Retirer le message</button>
      </div>
    </section>
    <section class="p-sect">
      <div class="p-sect-h"><h3>Les équipes (${eq.length})</h3>
        <span class="hint">Temps dans l'étape / temps prévu · vert, puis ocre au-delà du prévu, rouge au-delà de 1,5 fois</span></div>
      ${classe ? `<div class="signaux duree-v"><span class="hint">La plupart des équipes : ${esc(classe.t)}, ${classe.min} min prévues.
          Les équipes voient le temps qui reste.</span>
        <button class="btn btn--f" data-minutes="${classe.id}" data-delta="5">+5 min</button>
        <button class="btn btn--f" data-minutes="${classe.id}" data-delta="-5" ${classe.min <= 5 ? 'disabled' : ''}>−5 min</button></div>` : ''}
      ${eq.length ? `<div class="equipes">${eq.map((e) => {
        const t = etatTemps(e), x = etapeDe(e);
        return `<button class="eq" data-equipe="${esc(e.id)}" aria-pressed="${e.id === choisie}">
          <span class="eq-h"><b>${esc(e.nom)}</b><span class="eq-t ${t.cls}">${t.txt}</span></span>
          <span class="eq-e">${e.fini ? 'Partie terminée' : `Étape ${x.n} · ${esc(x.t)}`}</span>
          ${segments(e)}${puces(e)}</button>`;
      }).join('')}</div>`
      : `<p class="vide">Aucune équipe pour l'instant. Affiche le code <b>${esc(code)}</b> au tableau.</p>`}
    </section>
    ${sel ? vueDetail(sel) : ''}
    <section class="p-sect">
      <div class="p-sect-h"><h3>Fin de la séance</h3></div>
      <p class="hint">Imprimer : un rapport de la séance (la classe, le temps, chaque équipe et ses réponses), à garder
        sur papier ou en PDF. Fermer : plus aucune équipe ne peut entrer. Effacer : les équipes, leurs réponses et la
        séance sont supprimées pour de bon — imprime d'abord.</p>
      <div class="p-actions">
        <button class="btn" data-rapport="1" ${EQ.length ? '' : 'disabled'}>Imprimer le rapport de séance</button>
        ${S?.etat === 'ouverte' ? '<button class="btn btn--f" data-fermer="1">Fermer la séance</button>' : '<span class="hint">Séance fermée.</span>'}
        ${ui.effacer
          ? '<button class="btn btn--danger" data-effacer="oui">Oui, tout effacer</button><button class="btn btn--f" data-effacer="non">Annuler</button>'
          : '<button class="btn btn--f danger" data-effacer="demander">Effacer la séance et ses données</button>'}
      </div>
    </section>`;
}

function vueDetail(e) {
  return `<section class="p-sect detail" id="detail">
    <div class="p-sect-h"><h3>Équipe ${esc(e.nom)}</h3><button class="lien" data-equipe="">Fermer ✕</button></div>
    <div class="detail-g">
      <div>${carte(c, e, { cliquable: false })}<div style="margin-top:12px">${blocReleve(c, e, true)}</div>
        ${e.juge ? `<p class="sur" style="margin-top:14px">Documents retenus</p><ul class="carnet-l">${e.docs.map((id) => {
          const d = c.documents.find((x) => x.id === id);
          return `<li>${d.utile ? '✓' : '—'} ${esc(d.t)}</li>`; }).join('')}</ul>` : ''}</div>
      <div class="rep-l">${ecrites.map((q) => {
        const r = String(e.reponses?.[q.id] || '').trim();
        return `<div class="rep${r ? '' : ' rep--vide'}"><p class="k">${esc(qid(q))} · ${esc(c.etapes.find((x) => x.id === q.etape).t)}${q.requise ? '' : ' · facultative'}</p>
          <p><b>${esc(q.eleve)}</b></p><p>${r ? esc(r) : 'pas encore de réponse'}</p>
          ${q.reponse ? `<details data-k="${esc(e.id)}-${esc(q.id)}" ${ui.ouverts.has(`${e.id}-${q.id}`) ? 'open' : ''}><summary class="hint">Réponse attendue</summary><p class="att">${esc(q.reponse)}</p></details>` : ''}</div>`;
      }).join('')}${autresReponses(e).map((x) => `<div class="rep"><p class="k">${esc(x.k)}</p><p><b>${esc(x.t)}</b></p><p>${esc(x.r)}</p></div>`).join('')}</div>
    </div></section>`;
}

/** Les réponses à des questions qui ne sont plus posées (retirées en cours de séance) : rien ne se perd. */
function autresReponses(e) {
  const posees = new Set(ecrites.map((q) => q.id));
  return Object.entries(e.reponses || {}).filter(([id, r]) => !posees.has(id) && String(r || '').trim())
    .map(([id, r]) => ({ id, k: 'question retirée depuis', t: B[id]?.eleve || 'Question ajoutée puis retirée', r: String(r).trim() }));
}

/* ------------------------------------------------------------ débrief */

const attendu = (q) => String(q?.reponse || '').replace(/^Éléments attendus\s*:\s*/, '');
// La question écrite en équipe qui prépare chaque question orale
const APPUIS = { 'F7.1': 'F5.4', 'F7.2': 'F6.1', 'F7.3': 'F5.4', 'F7.4': 'F6.3', 'F7.5': 'F5.1' };

function vueDebrief() {
  const eq = EQ.filter((e) => e.atteinte >= 3);
  const rs = eq.map((e) => J.releve(c, e));
  const n = eq.length;
  const tous = rs.filter((r) => r.vides.length === J.nbVillages(c)).length;
  const garde = rs.filter((r) => r.gardes.length > 0).length;
  const continu = rs.filter((r) => r.corridor === 'continu').length;
  const rezone = EQ.filter((e) => (e.compteurs?.apresComp || []).some((x) => x > 0)).length;
  const posees = new Map(ecrites.map((q) => [q.id, q]));
  const reponses = (id) => EQ.filter((e) => J.repondu(e, id))
    .map((e) => `<div><small>${esc(e.nom)}</small>${esc(e.reponses[id])}</div>`).join('') || '<p class="hint">Aucune réponse pour l\'instant.</p>';
  const orales = c.q.orales;
  const bloc = (q) => {
    const ap = posees.get(APPUIS[q.id]);
    return `<section class="p-sect">
      <p class="db-q"><span class="qid">${esc(qid(q))}</span> ${esc(q.eleve)}</p>
      ${q.reponse ? `<p class="db-a">Attendu — ${esc(attendu(q))}</p>` : ''}
      ${ap ? `<p class="sur" style="margin-top:14px">Ce que les équipes ont écrit : ${esc(ap.eleve)} (${esc(ap.id)})</p><div class="db-r">${reponses(ap.id)}</div>` : ''}</section>`;
  };
  const ecritesDebrief = ecrites.filter((q) => q.etape === 'debrief');
  const f32 = posees.get('F3.2');
  return `<div class="${ui.projection ? 'projection' : ''} ${ui.cacheAttendu ? 'cache-att' : ''}">
    <div class="p-tete"><h2>Le débrief, en classe entière</h2>
      <p>${c.etapes.find((x) => x.id === 'debrief').min} minutes, ${orales.length} question${orales.length > 1 ? 's' : ''} à l'oral.
        Cette page se projette : les noms d'équipes sont des animaux, aucun prénom.</p>
      <div class="p-actions">
        <button class="btn btn--f" data-attendu="1">${ui.cacheAttendu ? 'Montrer' : 'Cacher'} les réponses attendues</button>
        <button class="btn btn--f" data-plein="1">Plein écran</button>
      </div></div>
    <section class="p-sect"><div class="p-sect-h"><h3>Vos lignes</h3><span class="hint">${n} équipe${n > 1 ? 's ont' : ' a'} tracé une ligne</span></div>
      <div class="paires lignes">
        <div class="paire"><span class="v">${tous}</span><span class="k">vident les six villages, comme en 1970</span></div>
        <div class="paire"><span class="v">${garde}</span><span class="k">gardent au moins un village dans le parc</span></div>
        <div class="paire"><span class="v">${continu}</span><span class="k">gardent le corridor continu</span></div>
        <div class="paire"><span class="v">${rezone}</span><span class="k">ont rezoné après un autre point de vue</span></div>
      </div></section>
    ${orales.map(bloc).join('')}
    ${ecritesDebrief.map((q) => `<section class="p-sect"><p class="db-q"><span class="qid">${esc(qid(q))}</span> ${esc(q.eleve)}</p>
      ${q.reponse ? `<p class="db-a">Attendu — ${esc(attendu(q))}</p>` : ''}<div class="db-r">${reponses(q.id)}</div></section>`).join('')}
    ${f32 ? `<section class="p-sect"><p class="db-q"><span class="qid">F3.2</span> À reprendre si le temps le permet : ${esc(f32.eleve)}</p>
      <p class="db-a">Attendu — ${esc(attendu(f32))}</p><div class="db-r">${reponses('F3.2')}</div></section>` : ''}
  </div>`;
}

/* ------------------------------------------------------------ questions */

/** Où en est une question de la banque dans cette séance : [libellé, classe du badge]. */
function etatQuestion(q) {
  const m = Rg.modeQuestion(q), v = c.reglages.questions[q.id];
  if (m === 'geste') return ['geste dans le jeu', 'posee'];
  if (m === 'enseignant') return ['par toi, à la mise en route', 'ecran'];
  if (m === 'orale') return v === 'on' ? ['orale, en classe', 'posee'] : ['pas posée', ''];
  return v === 'requise' ? ['écrite, requise', 'posee'] : v === 'facultative' ? ['écrite, facultative', 'reprise'] : ['pas posée', ''];
}

function vueQuestions() {
  const item = (q, [txt, cls]) => `<article class="bq">
    <div class="bq-h"><span class="qid">${esc(qid(q))}</span><span class="bq-q">${esc(q.eleve || q.q)}</span>
      <span class="badge${cls ? ` badge--${cls}` : ''}">${esc(txt)}</span></div>
    ${q.reponse ? `<p class="bq-r"><span class="sur">Réponse attendue</span><br>${esc(q.reponse)}</p>` : ''}
    <p class="bq-s">${q.note ? esc(q.note) + ' · ' : ''}${esc((q.sources || []).join(' · '))}</p></article>`;
  const ajouts = [...c.q.ecrites, ...c.q.orales].filter((q) => q.ajout);
  const etatAjout = (q) => c.q.orales.includes(q) ? ['ajoutée · orale', 'posee'] : [`ajoutée · ${q.requise ? 'requise' : 'facultative'}`, q.requise ? 'posee' : 'reprise'];
  const pasPosees = c.banque.filter((q) => etatQuestion(q)[0] === 'pas posée');
  const nReq = c.q.ecrites.filter((q) => q.requise).length;
  return `<div class="p-tete"><h2>Les questions</h2>
      <p>Dans cette séance (${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}) : ${c.q.ecrites.length} questions écrites en équipe,
        dont ${nReq} requises, et ${c.q.orales.length} à l'oral au débrief. Les autres restent dans la banque, pour une reprise.
        Pour en changer, même pendant la séance : l'onglet « Réglages ».</p></div>
    ${c.etapes.filter((x) => x.id !== 'avis').map((x) => {
      const l = c.banque.filter((q) => Rg.etapeQuestion(c, q) === x.id && etatQuestion(q)[0] !== 'pas posée');
      const a = ajouts.filter((q) => (q.etape || 'debrief') === x.id);
      return l.length || a.length ? `<section class="p-sect"><div class="p-sect-h"><h3>Étape ${x.n} · ${esc(x.t)}</h3>
        <span class="hint">${x.min} min</span></div><div class="banque">${l.map((q) => item(q, etatQuestion(q))).join('')}${
          a.map((q) => item(q, etatAjout(q))).join('')}</div></section>` : '';
    }).join('')}
    <section class="p-sect"><div class="p-sect-h"><h3>Pas posées dans cette séance</h3>
      <span class="hint">${pasPosees.length} questions, pour une reprise ou une autre séance</span></div>
      <div class="banque">${pasPosees.map((q) => item(q, etatQuestion(q))).join('')}</div></section>`;
}

/* ------------------------------------------------------------ dossier documentaire */

function vueDossier() {
  const lien = new URL(`dossier.html?code=${code}`, location.href).href;
  return `<div class="p-tete"><h2>Le dossier documentaire</h2>
      <p>Tout ce que le jeu montre, avec la phrase exacte de chaque source, la date de sa vérification et son lien : si un lien
        meurt, l'information reste dans le site. Les corrections de l'onglet Réglages s'y appliquent.</p>
      <div class="p-actions">
        <button class="btn" data-dossier-imprimer="complet">Imprimer le dossier complet</button>
        <button class="btn btn--f" data-dossier-imprimer="devoir">Imprimer la version devoir</button>
        <label class="case-l dd-opt"><input type="checkbox" id="dd-pastilles" ${ui.pastilles ? 'checked' : ''}><span>Pastilles des questions</span></label>
      </div>
      <p class="hint" style="margin-top:10px">Version devoir : le portrait du territoire et les documents à trier, à lire avant la séance.
        Les points de vue et la décision de 1970 n'y sont pas : ils servent à contredire ce que l'équipe croyait. Avec les pastilles,
        les élèves voient quels documents servent ; le tri en classe devient alors un rappel.</p>
      <p class="code-u" style="margin-top:10px">Version devoir en ligne, pour les élèves : <b id="lien-dossier">${esc(lien)}</b></p>
    </div>
    <section class="p-sect">${dossierHTML(c, { version: 'complet', pastilles: ui.pastilles, enseignant: true })}</section>`;
}

/* ------------------------------------------------------------ déroulement */

function vueDeroulement() {
  const posees = (id) => [...(id === 'dossier' ? [B['F3.1']] : []), ...ecrites.filter((q) => q.etape === id),
    ...(id === 'debrief' ? c.q.orales : [])];
  return `<div class="p-tete"><h2>Déroulement de la séance</h2>
      <p>${c.miseEnRoute.min + Rg.totalPrevu(c)} minutes (${esc(Rg.FORMATS[c.reglages.format]?.nom || '')}) : ${c.miseEnRoute.min} de mise en route, puis sept étapes.
        Ce que vit l'équipe, ce que ça fait travailler, et quoi observer. Rien de ceci n'apparaît chez les élèves.</p>
      ${c.coupure ? `<p class="hint">Deux périodes : coupure conseillée après « ${esc(c.etapes.find((x) => x.id === c.coupure).t)} ».
        À la période suivante, chaque équipe reprend sur le même Chromebook, avec le même code.</p>` : ''}</div>
    <div class="etapes-p">
      <article class="etape-p"><header><span class="etape-n">0</span><div><h3>Mise en route</h3>
        <span class="hint">${c.miseEnRoute.min} min · par l'enseignant·e</span></div></header>
        <div class="etape-g"><div><ul>${c.miseEnRoute.etapes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="etape-c"><p class="sur">À observer</p><ul class="obs"><li><span class="case" aria-hidden="true"></span>
          Chaque équipe a-t-elle rejoint la séance avant la fin de la mise en route ?</li></ul></div></div></article>
      ${c.etapes.filter((x) => x.id !== 'avis' || mesure).map((x) => {
        const n = c.notes[x.id], pr = c.programme[x.id];
        return `<article class="etape-p"><header><span class="etape-n">${x.n}</span>
          <div><h3>${esc(x.t)}</h3><span class="hint">${x.min} min${x.id === 'avis' ? " · hors du temps de la séance, séances d'essai seulement" : ''}</span></div></header>
          <div class="etape-g"><div>
            <p class="sur">Intention</p><p class="p-t">${esc(n.t)}</p><p>${esc(n.p)}</p>
            ${n.l.length ? `<ul>${n.l.map((y) => `<li>${y}</li>`).join('')}</ul>` : ''}
            ${posees(x.id).length ? `<p class="sur" style="margin-top:12px">Questions posées</p><ul>${posees(x.id).map((q) =>
              `<li><span class="qid">${esc(qid(q))}</span> ${esc(q.eleve)}</li>`).join('')}</ul>` : ''}
          </div><div class="etape-c">
            ${pr ? `<p class="sur">Au programme</p><p class="p-t">${esc(pr.c)}</p>
              <p class="mots">${pr.m.map((y) => `<span class="badge">${esc(y)}</span>`).join('')}</p>` : ''}
            <p class="sur" style="margin-top:14px">À observer</p>
            <ul class="obs">${(c.observer[x.id] || []).map((y) => `<li><span class="case" aria-hidden="true"></span>${esc(y)}</li>`).join('')}</ul>
            ${x.id === 'debrief' ? `<p class="sur" style="margin-top:14px">Ce qu'on vise à faire apprendre</p>
              <ul>${c.visees.map((y) => `<li>${y}</li>`).join('')}</ul>` : ''}
          </div></div></article>`;
      }).join('')}
    </div>`;
}

/* ------------------------------------------------------------ mesures */

function vueMesures() {
  const eq = [...EQ].sort((a, b) => a.creeLe - b.creeLe);
  const ind = eq.map((e) => J.indicateurs(c, e));
  const lignes = ind[0] || J.indicateurs(c, J.nouvelEtat(c, '', ''));
  const puce = (ok) => ok === true ? '<span class="pt pt--ok" title="repère atteint">●</span>'
    : ok === false ? '<span class="pt pt--non" title="repère non atteint">●</span>' : '<span class="pt"></span>';
  return `<div class="p-tete"><h2>Mesures</h2>
      <p>Ce que le site enregistre pour chaque équipe, et le plan de mesure pour étudier l'efficacité du jeu.</p></div>
    <div class="garde"><b>Vie privée.</b> Aucun prénom, aucun courriel : une équipe n'est qu'un nom d'animal.
      L'export pour la recherche ${mesure ? 'est activé (config.js).' : "est désactivé tant que le certificat d'éthique n'est pas obtenu (config.js)."}</div>
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

function exporterCSV() {
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

function vueQuestionnaire() {
  const echelles = c.avis.filter((q) => q.type === 'echelle');
  return `<div class="p-tete"><h2>Questionnaire élève</h2>
      <p>Huit questions, trois minutes, après le débrief. Chaque élève répond seul, sans nom, sur le Chromebook de
        l'équipe ou sur papier. ${mesure ? (S?.questionnaire ? 'Activé pour cette séance.' : 'Non activé pour cette séance.')
          : "Désactivé à l'écran tant que la collecte pour la recherche est éteinte (config.js) ; la version papier reste disponible."}</p></div>
    <section class="p-sect"><div class="tab-w"><table class="tab">
      <thead><tr><th>#</th><th>Question posée à l'élève</th><th>Forme</th><th>Ce qu'elle mesure</th><th>Repère</th>${mesure ? '<th>Résultat</th>' : ''}</tr></thead>
      <tbody>${c.avis.map((q, i) => {
        let res = '';
        if (mesure && q.type === 'echelle') {
          const n = AV.map((a) => Number(a[q.id])).filter(Boolean);
          res = n.length ? `${dec(n.reduce((x, y) => x + y, 0) / n.length)} / 4 (${n.length})` : '';
        } else if (mesure) res = `${AV.filter((a) => String(a[q.id] || '').trim()).length} réponse(s)`;
        return `<tr><td class="mono">Q${i + 1}</td><td><b>${esc(q.t)}</b></td>
          <td>${q.type === 'echelle' ? 'échelle 1 à 4' : q.type === 'choix' ? 'un choix' : 'une phrase'}</td>
          <td>${esc(q.mesure)}</td><td>${esc(q.cible)}</td>${mesure ? `<td>${esc(res)}</td>` : ''}</tr>`;
      }).join('')}</tbody></table></div>
      <p class="avert">Échelle : ${c.echelle.map((x, i) => `${i + 1} = ${x}`).join(' · ')}. Quatre points, sans milieu.
        Q3 est inversée exprès. ${echelles.length} questions à échelle.</p>
      <div class="p-actions"><button class="btn btn--f" data-imprimer="1">Imprimer (version papier)</button></div>
    </section>`;
}

/* ------------------------------------------------------------ rapport imprimable */
// Pour garder une trace d'une séance sans rien laisser en ligne : on imprime,
// ou on choisit « Enregistrer au format PDF » dans la fenêtre d'impression,
// puis on efface la séance. Aucun prénom n'y figure : les équipes sont des animaux.

function rapportHTML() {
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
      return `<section class="r-eq"><h2>Équipe ${esc(e.nom)}</h2>
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
          <dd>${String(e.reponses?.[q.id] || '').trim() ? esc(e.reponses[q.id]) : '<i>pas de réponse</i>'}</dd>`).join('')}${
          autresReponses(e).map((x) => `<dt>${esc(x.t)} (${esc(x.k)})</dt><dd>${esc(x.r)}</dd>`).join('')}</dl>
      </section>`;
    }).join('')}`;
}

/** Les réglages de la séance, pour que le papier dise dans quelles conditions on a joué. */
function rapportReglages() {
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

function imprimer(html) {
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

/* ------------------------------------------------------------ réglages */
// Un seul éditeur pour deux usages : les réglages de la séance ouverte (les
// équipes voient le changement dès qu'on applique), et la version du jeu de
// l'enseignant·e (reprise à chaque nouvelle séance). On modifie un brouillon ;
// rien ne part avant « Appliquer » ou « Enregistrer ».

const MAX_AJOUTS = 12;
const ETATS_ECRITE = [['requise', 'Requise'], ['facultative', 'Facultative'], ['off', 'Pas posée']];
const ETATS_ORALE = [['on', 'En classe, à l\'oral'], ['off', 'Pas posée']];

function resumeReglages(r) {
  const cc = Rg.appliquer(base, r);
  const n = (k, mot) => `${k} ${mot}${k > 1 ? 's' : ''}`;
  return [Rg.FORMATS[r.format]?.nom, `${cc.miseEnRoute.min + Rg.totalPrevu(cc)} min en tout`,
    n(cc.q.ecrites.length, 'question écrite') + ` dont ${cc.q.ecrites.filter((q) => q.requise).length} requises`,
    n(r.ajouts.length, 'question ajoutée'), n(Object.keys(r.corrections).length, 'correction')].join(' · ');
}

function ouvrirEditeur(cible, source) {
  ui.ed = { cible, r: Rg.completer(base, source), modifie: false, msg: '', ajout: null };
}
const attente = () => (ui.ed?.cible === 'version' ? 'Changements pas encore enregistrés.' : 'Changements pas encore appliqués à la séance.');
const modifie = () => {
  if (!ui.ed) return;
  ui.ed.modifie = true; ui.ed.msg = '';
  const z = $('#ed-etat');
  if (z) { z.textContent = attente(); z.dataset.modifie = '1'; }
  const nc = $('#n-corr');
  if (nc) { const n = Object.keys(ui.ed.r.corrections).length; nc.textContent = `${n} correction${n > 1 ? 's' : ''}`; }
  const t = $('#total-min');
  if (t) { const cc = Rg.appliquer(base, ui.ed.r); t.textContent = `Total : ${cc.miseEnRoute.min + Rg.totalPrevu(cc)} min`; }
};

function vueReglages() {
  // sans changement en attente, l'éditeur repart toujours de la séance telle qu'elle est (un « +5 min » compris)
  if (!ui.ed || ui.ed.cible !== 'seance') ouvrirEditeur('seance', S?.config);
  else if (!ui.ed.modifie) ui.ed.r = Rg.completer(base, S?.config);
  return editeur();
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
      <p>${seance ? `Ce que tu changes ici ne touche que la séance ${esc(code)}. Les équipes voient le changement dès que tu appliques,
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

function rendreEditeur() {
  if (!ui.ed) return;
  if (ui.ed.cible === 'version') { $('#onglets').innerHTML = ''; $('#prof').innerHTML = typo(editeur()); return; }
  rendre(true);
}

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

function nouvelAjout(a, id) {
  const orale = a.mode === 'orale';
  const valide = (x) => typeof x === 'string' && /^A[a-z0-9]{3,14}$/.test(x);
  return { id: id || (valide(a.id) ? a.id : `A${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`),
    etape: orale ? 'debrief' : a.etape, q: String(a.q).trim().slice(0, 300), reponse: String(a.reponse || '').trim().slice(0, 600),
    source: String(a.source || '').trim().slice(0, 200), mode: orale ? 'orale' : 'ecrite', requise: !orale && !!a.requise, t: Date.now() };
}

async function actionEditeur(quoi, bouton) {
  const ed = ui.ed;
  if (quoi === 'exporter') return exporterReglages();
  if (quoi === 'annuler') {
    ouvrirEditeur(ed.cible, ed.cible === 'seance' ? S?.config : ui.maVersion);
    ui.ed.msg = 'Changements annulés.';
    return rendreEditeur();
  }
  if (bouton) bouton.disabled = true;
  try {
    if (quoi === 'appliquer') {
      await reglerSeance(code, ed.r);
      ed.modifie = false;
      ed.msg = `Appliqué à la séance à ${new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}.`;
    }
    if (quoi === 'enregistrer' || quoi === 'garder') {
      MOI = MOI || await donnees.identite();
      await enregistrerMaVersion(MOI.uid, ed.r);
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

/* ------------------------------------------------------------ rendu et gestes */

function rendre(force = false) {
  if (!code) return;
  // L'éditeur ne se redessine pas sous les doigts à chaque geste d'une équipe.
  // Il se recale seulement si la séance a changé ailleurs et qu'aucun changement n'attend.
  if (onglet === 'reglages' && !force && ui.ed?.cible === 'seance') {
    const ailleurs = Rg.completer(base, S?.config);
    if (ui.ed.modifie || stable(ailleurs) === stable(ui.ed.r)) return;
    ui.ed.r = ailleurs;
  }
  $('#onglets').innerHTML = ONGLETS.map((x) => `<button data-onglet="${x.id}" aria-current="${onglet === x.id ? 'page' : 'false'}">${x.t}</button>`).join('');
  const vues = { direct: vueDirect, reglages: vueReglages, debrief: vueDebrief, questions: vueQuestions, dossier: vueDossier, deroulement: vueDeroulement,
    mesures: vueMesures, questionnaire: vueQuestionnaire };
  $('#prof').innerHTML = typo(vues[onglet]());
}

// l'éditeur de réglages : on modifie le brouillon sans redessiner (le curseur reste où il est)
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

document.addEventListener('change', (ev) => {
  if (ev.target.id === 'dd-pastilles') { ui.pastilles = ev.target.checked; rendre(true); }
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

// garder ouvertes les « réponses attendues » qu'on lisait, malgré le rafraîchissement
document.addEventListener('toggle', (ev) => {
  const k = ev.target?.dataset?.k;
  if (k) ev.target.open ? ui.ouverts.add(k) : ui.ouverts.delete(k);
}, true);


document.addEventListener('click', async (ev) => {
  // ---- l'accueil de l'espace
  if (ev.target.closest('#creer')) {
    const b = ev.target.closest('#creer'); b.disabled = true;
    try {
      const fmt = document.querySelector('input[name=format]:checked')?.value || 'standard';
      const v = ui.maVersion ? Rg.completer(base, ui.maVersion) : null;
      const reglages = v && v.format === fmt ? v
        : Rg.reglagesDuFormat(base, fmt, { ajouts: v?.ajouts, corrections: v?.corrections });
      const cd = await creerSeance({ questionnaire: !!$('#opt-avis')?.checked, reglages });
      MOI = await donnees.attendreUtilisateur();
      return ouvrir(cd);
    } catch (e) { return ecranAccueil(e.message || 'Impossible de créer la séance.'); }
  }
  if (ev.target.closest('[data-demo]')) {
    const b = ev.target.closest('[data-demo]'); b.disabled = true;
    try {
      const reglages = Rg.reglagesDuFormat(base, 'standard');
      const cd = await creerSeanceDemo(Rg.appliquer(base, reglages), reglages);
      MOI = await donnees.attendreUtilisateur();
      return ouvrir(cd);
    } catch (e) { return ecranAccueil(e.message || 'Impossible de créer la démonstration.'); }
  }
  if (ev.target.closest('[data-ma-version]')) {
    MOI = MOI || await donnees.identite();
    ui.maVersion = await lireMaVersion(MOI.uid);
    ouvrirEditeur('version', ui.maVersion);
    window.scrollTo({ top: 0 });
    return rendreEditeur();
  }
  // ---- l'éditeur de réglages
  if (ui.ed) {
    const ed = ev.target.closest('[data-ed]');
    if (ed) return actionEditeur(ed.dataset.ed, ed);
    const fm = ev.target.closest('[data-format]');
    if (fm) {
      ui.ed.r = Rg.reglagesDuFormat(base, fm.dataset.format, { ajouts: ui.ed.r.ajouts, corrections: ui.ed.r.corrections });
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
  }
  if (ev.target.closest('[data-google]')) {
    try { MOI = await donnees.connexionGoogle(); }
    catch (e) { return ecranAccueil(e.message || 'Connexion Google impossible.'); }
    return ecranAccueil();
  }
  if (ev.target.closest('[data-deconnexion]')) {
    await donnees.deconnexion(); MOI = null;
    try { localStorage.removeItem(CLE); } catch { /* vide */ }
    return ecranAccueil();
  }
  const ouv = ev.target.closest('[data-ouvrir]');
  if (ouv) return ouvrir(ouv.dataset.ouvrir);
  const efl = ev.target.closest('[data-effacer-liste]');
  if (efl) {
    const cd = efl.dataset.effacerListe;
    if (!cd) { ui.effacerListe = null; return ecranAccueil(); }
    if (!efl.dataset.confirme) { ui.effacerListe = cd; return ecranAccueil(); }
    efl.disabled = true;
    await effacerSeance(cd);
    ui.effacerListe = null;
    return ecranAccueil();
  }
  if (ev.target.closest('[data-retour]')) {
    try { localStorage.removeItem(CLE); } catch { /* vide */ }
    return ecranAccueil();
  }

  const ong = ev.target.closest('[data-onglet]');
  if (ong) {
    if (onglet === 'reglages' && ong.dataset.onglet !== 'reglages' && ui.ed?.modifie
      && !ong.dataset.confirme) {
      ong.dataset.confirme = '1';
      $('#ed-etat').textContent = 'Changements pas encore appliqués : applique-les, ou clique encore sur l\'onglet pour les laisser en attente.';
      return;
    }
    onglet = ong.dataset.onglet; window.scrollTo({ top: 0 }); return rendre(true);
  }
  const eqb = ev.target.closest('[data-equipe]');
  if (eqb) {
    choisie = eqb.dataset.equipe && eqb.dataset.equipe !== choisie ? eqb.dataset.equipe : null;
    rendre();
    if (choisie) $('#detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const chb = ev.target.closest('[data-chrono]');
  if (chb) {
    const ch = chronoDe(), t = Date.now();
    const neuf = { demarrer: { ...chronoNeuf(), debut: t }, zero: { ...chronoNeuf(), debut: t },
      pause: { ...ch, pauses: ch.pauses || [], pause: t },
      reprendre: { ...ch, pauses: [...(ch.pauses || []), { a: ch.pause, b: t }], pause: null } }[chb.dataset.chrono];
    if (neuf) { chb.disabled = true; ui.chronoLance = code; await reglerChrono(code, neuf); }
    return;
  }
  const mn = ev.target.closest('[data-minutes]');
  if (mn) {
    const r = Rg.completer(base, S?.config);
    const id = mn.dataset.minutes;
    r.minutes[id] = Math.max(1, Math.min(90, (r.minutes[id] || 1) + Number(mn.dataset.delta)));
    mn.disabled = true;
    await reglerSeance(code, r);
    if (ui.ed?.cible === 'seance') ui.ed.r.minutes[id] = r.minutes[id];
    return;
  }
  const sg = ev.target.closest('[data-signal]');
  if (sg) {
    await donnees.majPartielle(cheminSeance(code), { signal: sg.dataset.signal ? { type: sg.dataset.signal, t: Date.now() } : null });
    return;
  }
  if (ev.target.closest('[data-fermer]')) { await donnees.majPartielle(cheminSeance(code), { etat: 'fermee' }); return; }
  const ef = ev.target.closest('[data-effacer]');
  if (ef) {
    if (ef.dataset.effacer === 'demander') { ui.effacer = true; return rendre(); }
    if (ef.dataset.effacer === 'non') { ui.effacer = false; return rendre(); }
    ef.disabled = true;
    const cd = code;
    arrets.forEach((f) => f()); arrets = [];
    await effacerSeance(cd);
    ui.effacer = false;
    return finie();
  }
  if (ev.target.closest('[data-attendu]')) { ui.cacheAttendu = !ui.cacheAttendu; return rendre(); }
  if (ev.target.closest('[data-plein]')) {
    ui.projection = true;
    try { await document.documentElement.requestFullscreen(); } catch { /* refusé : on garde la mise en page agrandie */ }
    return rendre();
  }
  if (ev.target.closest('[data-export]')) return exporterCSV();
  if (ev.target.closest('[data-imprimer]')) {
    return imprimer(`<h1>Où passe la ligne — ton avis</h1><p>Pas de nom. Il n'y a pas de bonne réponse.</p>
      ${c.avis.map((q, i) => `<div class="p-q"><b>${i + 1}. ${esc(q.t)}</b>${
        q.type === 'echelle' ? `<div class="p-cases">${c.echelle.map((x) => `<span>${x}</span>`).join('')}</div>`
        : q.type === 'choix' ? `<div class="p-cases">${q.options.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`
        : '<div class="p-lignes"></div><div class="p-lignes"></div>'}</div>`).join('')}`);
  }
  if (ev.target.closest('[data-rapport]')) return imprimer(rapportHTML());
  const ddi = ev.target.closest('[data-dossier-imprimer]');
  if (ddi) {
    const version = ddi.dataset.dossierImprimer;
    return imprimer(dossierHTML(c, { version, pastilles: ui.pastilles, enseignant: version === 'complet' }));
  }
});

document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && ui.projection) { ui.projection = false; rendre(); } });

demarrer();
