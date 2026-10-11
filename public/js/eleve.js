// eleve.js — la page des équipes : rejoindre une séance, puis jouer.
//
// L'élève ne voit que le jeu : aucune note de conception, aucune mesure, aucun
// lien au programme. Tout ce qui sert l'enseignant·e vit dans enseignant.html.
//
// Un seul Chromebook par équipe. L'état de l'équipe est enregistré à chaque
// geste (avec un court délai), ce qui permet deux choses : l'enseignant·e suit
// la classe en direct, et une équipe qui rafraîchit la page reprend où elle était.

import * as donnees from './donnees.js';
import { mesure } from './config.js';
import { $, esc, typo, chargerContenu, retarder, GARDE, IMAGES } from './outils.js';
import * as J from './jeu.js';
import * as Rg from './reglages.js';
import { carte, blocReleve, effetRecent } from './carte.js';
import { lienSource } from './dossierdoc.js';
import { NOMS_EQUIPES, rejoindre, cheminSeance, cheminEquipe,
  normaliserCode, codeValide, SIGNAUX } from './seance.js';

// Le contenu d'origine, puis le contenu tel que la séance le règle (questions,
// minutes, corrections). Les réglages arrivent avec la séance et peuvent
// changer en cours de partie : le contenu est alors recalculé et l'écran redessiné.
const base = await chargerContenu();
let c = Rg.appliquer(base, null);
let B = Object.fromEntries(c.banque.map((q) => [q.id, q]));
let empreinte = 'null';
function appliquerReglages(config) {
  const k = JSON.stringify(config || null);
  if (k === empreinte) return false;
  empreinte = k;
  c = Rg.appliquer(base, config || null);
  B = Object.fromEntries(c.banque.map((q) => [q.id, q]));
  return true;
}
const idx = (id) => c.etapes.findIndex((x) => x.id === id);

let code = null, idEq = null, E = null, S = null;   // S : la séance (signal, état)
const ui = { outil: 'preservation', effet: null, nouvelles: [], avis: {}, avisEnvoye: false,
  signalFerme: 0, rendue: -1, erreur: '' };
const CLE_SIGNAL = 'forillon:signal-lu';
const signalLu = (t) => { ui.signalFerme = t; try { localStorage.setItem(`${CLE_SIGNAL}:${E?.appareil}`, String(t)); } catch { /* vide */ } };
const CLE = 'forillon:equipe';

/* ------------------------------------------------------------ l'arrivée */

const params = new URLSearchParams(location.search);
const codeUrl = normaliserCode(params.get('code'));

async function demarrer() {
  if (donnees.mode === 'local') $('#mode-local').hidden = false;
  // L'équipe en cours est rangée sous l'identifiant de l'appareil : en mode
  // local, deux onglets (deux équipes) ne se marchent donc pas dessus.
  const moi = await donnees.attendreUtilisateur();
  let garde = null;
  try { if (moi) garde = JSON.parse(localStorage.getItem(`${CLE}:${moi.uid}`) || 'null'); } catch { /* vide */ }
  if (garde && (!codeUrl || codeUrl === garde.code)) {
    try {
      const etat = await donnees.lire(cheminEquipe(garde.code, garde.id));
      if (etat && etat.appareil === moi.uid) return entrer(garde.code, garde.id, etat);
    } catch { /* on repasse par l'accueil */ }
  }
  accueil(codeUrl);
}

function accueil(prerempli = '', erreur = '') {
  document.body.dataset.ecran = 'accueil';
  $('#app').innerHTML = typo(`<section class="rejoindre scene">
    <div class="scene-c">
      <p class="sur">Géographie · 1<sup>er</sup> cycle · en équipe</p>
      <h2>Rejoindre la séance</h2>
      <p class="hint" style="margin-top:6px">Un seul ordinateur par équipe. Pas de prénom : votre équipe porte le nom d'un animal de Forillon.</p>
      <form id="f-rejoindre" autocomplete="off">
        <label class="champ"><span>Code de la séance (au tableau)</span>
          <input id="code" name="code" inputmode="text" maxlength="5" required
            value="${esc(prerempli)}" placeholder="K7P2M" aria-describedby="code-aide"></label>
        <p id="code-aide" class="avert">Cinq caractères, lettres et chiffres.</p>
        <fieldset class="noms"><legend>Le nom de votre équipe</legend>
          <div class="noms-g">${NOMS_EQUIPES.map((n, i) => `<label class="nom-c">
            <input type="radio" name="nom" value="${esc(n)}" ${i === 0 ? 'required' : ''}><span>${esc(n)}</span></label>`).join('')}</div>
        </fieldset>
        ${erreur ? `<p class="erreur" role="alert">${esc(erreur)}</p>` : ''}
        <div class="p-actions"><button class="btn" type="submit">Commencer →</button></div>
      </form>
    </div></section>`);
  $('#f-rejoindre').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const cd = normaliserCode(f.get('code'));
    const nom = f.get('nom');
    if (!codeValide(cd)) return accueil(cd, 'Ce code ne ressemble pas à celui du tableau : cinq caractères, sans O ni I.');
    if (!nom) return accueil(cd, "Choisissez le nom de votre équipe.");
    ev.target.querySelector('button').disabled = true;
    try {
      const r = await rejoindre(c, cd, nom);
      const moi = await donnees.identite();
      try { localStorage.setItem(`${CLE}:${moi.uid}`, JSON.stringify({ code: cd, id: r.id })); } catch { /* vide */ }
      entrer(cd, r.id, r.etat);
    } catch (e) {
      accueil(cd, e.message || 'Impossible de rejoindre la séance.');
    }
  });
  $('#code')?.addEventListener('input', (ev) => { ev.target.value = normaliserCode(ev.target.value); });
}

let arretSeance = () => {};
function entrer(cd, id, etat) {
  code = cd; idEq = id; E = etat;
  E.compteurs ||= J.nouvelEtat(c, E.nom, E.appareil).compteurs;
  try { ui.signalFerme = Number(localStorage.getItem(`${CLE_SIGNAL}:${E.appareil}`) || 0); } catch { /* vide */ }
  $('#etat-envoi').hidden = false;
  document.body.dataset.ecran = 'jeu';
  $('#app').innerHTML = GABARIT;
  $('#equipe').textContent = `Équipe ${E.nom} · séance ${code}`;
  arretSeance();
  arretSeance = donnees.ecouter(cheminSeance(code), (s) => {
    S = s;
    if (appliquerReglages(s?.config)) rendre(); else majMinutes();
    rendreSignal();
  });
  rendre();
}

/* ------------------------------------------------------------ la sauvegarde */

const CHAMPS = ['maj', 'etape', 'atteinte', 'entree', 'temps', 'releves', 'docs', 'juge', 'zones',
  'comps', 'gespeg', 'gespegVu', 'historique', 'corridorRompu', 'mentions', 'reponses', 'fini', 'compteurs'];

/** Le voyant en haut à droite : enregistré, ou en attente du réseau. */
function etatEnvoi(ok) {
  const z = $('#etat-envoi');
  if (!z) return;
  z.setAttribute('data-ok', ok ? '1' : '0');
  z.textContent = ok ? 'Enregistré' : 'En attente du réseau';
}

async function envoyer() {
  if (!E) return;
  E.maj = Date.now();
  const champs = Object.fromEntries(CHAMPS.map((k) => [k, E[k] ?? null]));
  try {
    await donnees.majPartielle(cheminEquipe(code, idEq), champs);
    etatEnvoi(true);
  } catch (e) {
    console.warn('Envoi impossible pour le moment', e);
    etatEnvoi(false);
  }
}
const sauver = retarder(envoyer, 1200);   // un envoi par pause de 1,2 s : peu d'écritures, suivi presque en direct
const sauverTout = () => { sauver(); sauver.maintenant(); };

/* ------------------------------------------------------------ les questions */

function blocQuestion(q) {
  return `<div class="qe">
    <label class="qe-l" for="r-${esc(q.id)}"><span class="sur">Question pour l'équipe${q.requise ? '' : ' · facultative'}</span>${esc(q.eleve)}</label>
    <textarea id="r-${esc(q.id)}" data-rep="${esc(q.id)}" rows="2" maxlength="400"
      placeholder="Une ou deux phrases, écrites ensemble.">${esc(E.reponses?.[q.id] || '')}</textarea>
  </div>`;
}
/** Les questions écrites de l'étape que l'équipe peut déjà voir. */
const blocQuestions = (etapeId, filtre = () => true) =>
  Rg.questionsVisibles(c, E, etapeId).filter(filtre).map(blocQuestion).join('');
/** Toutes les questions requises visibles de l'étape ont une réponse. */
const ok = (etapeId) => Rg.requisesOK(c, E, etapeId);
const PAS_FINI = 'Répondez à la question avant de continuer.';
const R = (id) => J.repondu(E, id);

/** Les questions requises d'une étape déjà passée, restées sans réponse. */
function rattrapage() {
  const qs = Rg.aRattraper(c, E);
  if (!qs.length) return '';
  return `<div class="rattrapage"><p class="sur">À rattraper</p>
    <p class="hint">${qs.length > 1 ? 'Ces questions d\'une étape précédente attendent' : 'Cette question d\'une étape précédente attend'} votre réponse.</p>
    ${qs.map(blocQuestion).join('')}</div>`;
}

const MOTS = ['aucun', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];

/* ------------------------------------------------------------ les écrans */

const ECRANS = {
  arrivee: () => ({
    guide: `Bienvenue sur la presqu'île. Ce que vous voyez est réel — le territoire, les chiffres,
      les documents. <b>La décision, elle, est la vôtre.</b> On vous demande de tracer la limite
      d'une aire protégée. Ça a l'air simple. Ça ne le restera pas.`,
    h: `<p class="serif lead">En 1970, le gouvernement a tracé une ligne sur cette carte. À l'intérieur :
        un parc national. À l'extérieur : la vie qui continue.</p>
      <p class="serif lead" style="margin-top:12px">Vous n'êtes pas des camps qui s'affrontent.
        Vous êtes <b>une équipe</b>, et vous avez la même question devant vous.</p>
      <div class="paires">
        <div class="paire"><span class="v">7</span><span class="k">secteurs réels à zoner</span></div>
        <div class="paire"><span class="v">12</span><span class="k">documents, dont quatre qui ne servent pas</span></div>
        <div class="paire"><span class="v">1</span><span class="k">ligne à tracer : la vôtre</span></div>
      </div>
      ${blocQuestions('arrivee')}
      <p class="avert">Le lieu est réel : parc national Forillon, en Gaspésie, créé le 8 juin 1970,
        sur Gespe'gewa'gi. La limite que vous tracerez est la vôtre, pas la sienne.</p>`,
    carnet: [{ t: 'Le parcours', h: `<ol class="parcours">${etapesVisibles().filter((x) => x.id !== 'avis')
      .map((x) => `<li><span>${esc(x.t)}</span><small>${x.min} min</small></li>`).join('')}</ol>
      <p class="avert">Le temps est un repère : il reste affiché en haut de chaque étape.</p>` }],
    btn: 'Marcher avec la garde-parc', peut: ok('arrivee'),
    hint: ok('arrivee') ? '' : "Notez d'abord votre hypothèse."
  }),

  marche: () => {
    const reste = c.releves.length - E.releves.length;
    const dernier = E.releves.length ? c.releves[E.releves[E.releves.length - 1]] : null;
    const nq = (c.q?.ecrites || []).filter((q) => q.etape === 'marche' && /^F2\./.test(q.id)).length;
    const manque = [reste ? `encore ${reste} relevé${reste > 1 ? 's' : ''}` : '',
      ok('marche') ? '' : 'une question à répondre'].filter(Boolean);
    return {
      guide: reste === 0
        ? `Vous avez tout relevé. <b>Chacune de ces six choses va servir.</b> On rentre au bureau ouvrir le dossier.`
        : `On marche. <b>Six relevés à faire, numérotés sur la carte.</b> Je vous dis où aller${
           nq === 1 ? ' ; l\'un d\'entre eux pose une question' : nq > 1 ? ` ; ${MOTS[nq] || nq} d'entre eux posent une question` : ''}.`,
      h: (dernier ? `<div class="trouve" style="margin:0 0 16px">
            <p class="sur">Relevé ${E.releves.length} sur ${c.releves.length}</p>
            <h3>${esc(dernier.t)}</h3><p class="serif">${esc(dernier.x)}</p>
            <p class="trouve-s">${esc(dernier.s)}</p>${lienSource(dernier)}</div>`
          : (IMAGES ? `<p class="hint" style="margin-bottom:12px">Touchez une pastille numérotée pour vous arrêter.</p>` : ''))
        + carte(c, E, { releves: true, cliquable: false })
        + blocQuestions('marche'),
      carnet: [{ t: 'Carnet de terrain', h: `
        <div class="jauge-c"><div class="jauge-r" style="width:${(E.releves.length / c.releves.length) * 100}%"></div></div>
        <p class="compte">${E.releves.length} <span>sur ${c.releves.length}</span></p>
        ${E.releves.length ? `<ul class="carnet-l">${E.releves.map((i) => `<li>${esc(c.releves[i].t)}</li>`).join('')}</ul>` : ''}
        <p class="avert" style="margin-top:11px">Ce carnet n'est pas un score.</p>` }],
      btn: 'Ouvrir le dossier',
      peut: reste === 0 && ok('marche'),
      hint: manque.length ? manque.join(' · ').replace(/^./, (x) => x.toUpperCase()) + '.' : ''
    };
  },

  dossier: () => ({
    guide: E.juge
      ? `Regardez le verdict de chaque document. <b>Quatre ne servaient pas à cette question-là.</b>
         Savoir mettre de côté, c'est la moitié du travail.`
      : `Douze documents. <b>Retenez-en trois</b> : ceux qui aident vraiment à dire qui a le droit
         d'habiter ici. Certains sont vrais et ne servent à rien. Ce n'est pas un piège.`,
    h: `${E.juge ? `<div class="verdicts">${E.docs.map((id) => {
        const d = c.documents.find((x) => x.id === id);
        return `<div class="verdict verdict--${d.utile ? 'util' : 'hors'}"><i aria-hidden="true">${d.utile ? '✓' : '—'}</i>
          <span><b>${esc(d.t)}</b>${esc(d.v)}${lienSource(d)}</span></div>`;
      }).join('')}</div>${blocQuestions('dossier')}<h3 class="sous">Le dossier</h3>` : ''}
      <div class="docs">${c.documents.map((d) => `<button class="doc" data-doc="${d.id}"
          aria-pressed="${E.docs.includes(d.id)}" ${E.juge ? 'disabled' : ''}>
          <span class="doc-k">${esc(d.genre)}</span><span class="doc-t">${esc(d.t)}</span>
          <span class="doc-x">${esc(d.x)}</span><span class="doc-s">${esc(d.s)}</span></button>`).join('')}</div>`,
    carnet: [{ t: 'Retenus', h: E.docs.length
      ? `<ol class="carnet-l">${E.docs.map((id) => `<li>${esc(c.documents.find((x) => x.id === id).t)}</li>`).join('')}</ol>`
      : '<p class="hint">Aucun pour l\'instant. Trois au plus.</p>' },
    { t: 'La consigne', h: `<p class="serif" style="font-size:15px;line-height:1.6">${esc(B['F3.1'].eleve)}</p>
      <p class="avert" style="margin-top:9px">On ne demande pas de calculer : on demande de choisir, et de savoir dire pourquoi.</p>` }],
    btn: E.juge ? 'Tracer la ligne' : 'Soumettre les trois',
    peut: E.juge ? ok('dossier') : E.docs.length === 3,
    hint: E.juge ? (ok('dossier') ? '' : 'Répondez à la question.') : `${E.docs.length} sur 3 retenus.`
  }),

  trace: () => {
    const r = J.releve(c, E);
    return {
      guide: `À vous. <b>Choisissez une zone, puis touchez les secteurs.</b> Un vrai parc n'est pas
        « protégé » d'un bloc : il est zoné. Il n'y a pas de bonne réponse — il y a ce que vous
        protégez, qui peut venir, et qui peut rester.`,
      h: carte(c, E, { outil: ui.outil }) + effetRecent(c, ui.effet) + blocQuestions('trace'),
      carnet: [{ t: 'Votre relevé', h: blocReleve(c, E) }],
      btn: 'Arrêter cette ligne',
      peut: r.dans > 0 && ok('trace'),
      hint: r.dans === 0 ? 'Il faut au moins un secteur dans la ligne.' : ok('trace') ? '' : 'Dites pourquoi vous gardez cette ligne.'
    };
  },

  comp: () => {
    const vues = c.complications.slice(0, E.comps);
    const n = c.complications.length;
    const bloque = !ok('comp');
    return {
      guide: E.comps === 0 ? 'Votre ligne est arrêtée. <b>Maintenant, d\'autres points de vue.</b> Chacun voit le territoire à sa façon.'
        : E.comps < n ? `Ce n'est pas fini. <b>Votre carte est toujours vivante</b> : rezonez ici si l'information change votre idée.`
          : `Voilà les quatre. <b>Ce que vous décidez maintenant, vous le décidez en le sachant.</b>`,
      h: (vues.length
        ? vues.slice(0, -1).map((x) => `<details class="fige"><summary><span class="sur">${esc(x.sur)}</span>
            <b>${esc(x.t)}</b></summary><div class="corps-f"><p>${x.x}</p><p>${x.quoi}</p></div></details>`).join('')
          + vues.slice(-1).map((x) => `<div class="comp"><p class="sur">${esc(x.sur)}</p><h3>${esc(x.t)}</h3>
            <p class="serif">${x.x}</p><p class="trouve-s">${esc(x.s)}</p>${lienSource(x)}<p class="quoi">${x.quoi}</p></div>`).join('')
          + blocQuestions('comp')
          + '<h3 class="comp-sep">Votre carte, toujours modifiable</h3>'
        : '<p class="hint">Touchez le bouton pour entendre le premier.</p>')
        + carte(c, E, { outil: ui.outil }) + effetRecent(c, ui.effet),
      carnet: [{ t: 'Votre relevé', h: blocReleve(c, E, true)
        + '<p class="avert" style="margin-top:11px">Rezonez : le relevé bouge.</p>' }],
      btn: E.comps === 0 ? 'Entendre un premier point de vue' : E.comps < n ? 'Un autre point de vue' : 'Voir la décision de 1970',
      peut: !bloque,
      hint: bloque ? PAS_FINI : ''
    };
  },

  bilan: () => {
    const r = J.releve(c, E);
    const nv = J.nbVillages(c);
    const liste = (a) => a.map(esc).join(', ');
    const paires = (p) => p.length ? `<div class="paires">${p.map(([v, k]) =>
      `<div class="paire"><span class="v">${esc(v)}</span><span class="k">${esc(k)}</span></div>`).join('')}</div>` : '';
    const bloc = (b) => `<h3 class="sous">${esc(b.t)}</h3>${paires(b.paires)}
      <p class="serif texte">${esc(b.texte)}</p><p class="avert">${esc(b.src)}</p>`;
    return {
      guide: `Je ne vais pas vous dire si c'est bien. Je vais vous dire ce que ça fait — <b>et ce que la vraie ligne a fait.</b>`,
      h: `<h3 class="sous" style="margin-top:0;padding-top:0;border:0">Votre ligne</h3>
        ${paires([[`${r.dans} / ${r.total}`, 'secteurs dans la ligne'], [`${r.vides.length} / ${nv}`, 'villages à vider'],
          [String(r.gardes.length), r.gardes.length > 1 ? 'villages gardés dans le parc' : 'village gardé dans le parc'], [r.corridor, 'le corridor écologique']])}
        <p class="serif texte">${r.vides.length === nv ? 'Vous videz les six secteurs habités : c\'est ce qu\'a fait la ligne de 1970. '
          : r.vides.length ? `Vous videz ${liste(r.vides)}. ` : ''}${r.gardes.length ? `Vous gardez ${liste(r.gardes)} dans le parc, en zone village. ` : ''}${
          r.dehors.length ? `Vous laissez dehors ${liste(r.dehors)}, non ${r.dehors.length > 1 ? 'protégés' : 'protégé'}. ` : ''}</p>
        ${bloc(c.bilan[0])}
        ${blocQuestions('bilan')}
        ${c.bilan.slice(1).map(bloc).join('')}`,
      carnet: [{ t: 'La comparaison', h: `<p class="serif" style="font-size:14.5px;line-height:1.6">Ce n'est pas une
        correction. Votre ligne et celle de 1970 répondent à la même question avec des informations différentes.</p>` }],
      btn: 'Revenir sur notre démarche', peut: ok('bilan'), hint: ok('bilan') ? '' : 'Répondez à la question.'
    };
  },

  debrief: () => {
    const avis = avisActif();
    const ecrites = J.questionsEcrites(c).filter((q) => q.etape !== 'debrief' && R(q.id));
    const orales = c.q?.orales || [];
    const restent = Rg.aRattraper(c, E).filter((q) => q.requise).length;
    const pret = ok('debrief') && !restent;
    return {
      guide: `On range les cartes. <b>Ce qui reste, c'est ce que vous direz en classe.</b>`,
      h: `${orales.length ? `<h3 class="sous" style="margin-top:0;padding-top:0;border:0">Les questions, en classe entière</h3>
        <ol class="qlist">${orales.map((q) => `<li>${esc(q.eleve)}</li>`).join('')}</ol>` : ''}
        ${blocQuestions('debrief')}
        <details class="d-sources"><summary>Ce que votre équipe a écrit <span class="hint">— pour en parler</span></summary>
          <dl class="vos-rep">${ecrites.map((q) => `<dt>${esc(q.eleve)}</dt><dd>${esc(E.reponses[q.id])}</dd>`).join('')}</dl>
        </details>
        <details class="d-sources" id="d-sources"><summary>D'où viennent les chiffres <span class="hint">— chaque source</span></summary>
          ${c.sources.map((s) => `<p class="src"><b>${esc(s.t)}</b> — ${esc(s.x)}</p>`).join('')}
        </details>`,
      btn: avis ? 'Donner mon avis' : 'Terminer la partie', peut: pret,
      hint: pret ? '' : restent ? 'Une question d\'une étape précédente attend votre réponse.' : PAS_FINI
    };
  },

  avis: () => {
    const faites = c.avis.filter((q) => String(ui.avis[q.id] || '').trim()).length;
    if (ui.avisEnvoye) return {
      guide: 'Merci. <b>Ton avis va servir à améliorer le jeu.</b> Sans ton nom.',
      h: '<div class="merci"><p class="merci-t">Merci !</p><p>Passe l\'ordinateur à la prochaine personne de ton équipe.</p></div>',
      btn: 'Au tour de la personne suivante', peut: true
    };
    return {
      guide: `Dernière chose, et c'est pour toi seul·e. <b>Il n'y a pas de bonne réponse</b> : on veut savoir si
        le site t'a aidé ou t'a mêlé. Pas de nom.`,
      h: `<div class="avis">${c.avis.map((q, i) => `<fieldset class="q"><legend><span class="q-n">${i + 1}</span>${esc(q.t)}</legend>
        ${q.type === 'echelle' ? `<div class="ech">${c.echelle.map((x, j) => `<button type="button" data-avis="${q.id}"
            data-val="${j + 1}" aria-pressed="${ui.avis[q.id] === String(j + 1)}">${x}</button>`).join('')}</div>`
        : q.type === 'choix' ? `<div class="choix">${q.options.map((x) => `<button type="button" data-avis="${q.id}"
            data-val="${esc(x)}" aria-pressed="${ui.avis[q.id] === x}">${esc(x)}</button>`).join('')}</div>`
        : `<textarea data-avis-t="${q.id}" rows="2" maxlength="300" placeholder="Une phrase suffit.">${esc(ui.avis[q.id] || '')}</textarea>`}
        </fieldset>`).join('')}</div>`,
      btn: 'Envoyer mon avis', fleche: false, peut: true, hint: `${faites} sur ${c.avis.length} — tu peux en laisser vides.`
    };
  }
};

const avisActif = () => mesure && !!S?.questionnaire;
const etapesVisibles = () => c.etapes.filter((x) => x.id !== 'avis' || avisActif());

/* ------------------------------------------------------------ le rendu */

const GABARIT = `
  <div class="question"><span class="sur">La question</span><p>${esc(c.question)}</p></div>
  <div class="corps" id="corps">
    <main>
      <section class="scene">
        <div class="scene-h"><h2 id="titre">…</h2><span class="hint" id="minutes"></span></div>
        <div class="guide">${GARDE}<div class="bulle">
          <p class="nom">Jeanne Element <small>· garde-parc (personnage fictif)</small></p>
          <p id="guide-txt">…</p></div></div>
        <div class="scene-c" id="scene"></div>
      </section>
      <div class="pied">
        <button class="btn btn--f" id="retour">← Revenir</button>
        <span class="hint" id="hint"></span>
        <button class="btn" id="suivant">Continuer</button>
      </div>
    </main>
    <div class="carnet" id="carnet"></div>
  </div>`;

function rendreFin() {
  $('#prog').innerHTML = '';
  $('#app').innerHTML = typo(`<section class="scene fin"><div class="scene-c merci">
    <p class="merci-t">Partie terminée</p>
    <p>Merci, équipe ${esc(E.nom)}. ${donnees.mode === 'local'
      ? 'Votre ligne et vos réponses sont gardées dans ce navigateur.'
      : 'Votre ligne et vos réponses sont envoyées à votre enseignant·e.'}</p>
    <p class="avert">Vous pouvez fermer cette page.</p></div></section>`);
}

function rendre() {
  if (!E) return;
  if (E.fini && !ui.avisEnvoye && c.etapes[E.etape].id !== 'avis') return rendreFin();
  const vis = etapesVisibles();
  const e = c.etapes[E.etape];
  if (ui.rendue !== E.etape) { if (ui.rendue !== -1) window.scrollTo({ top: 0 }); ui.rendue = E.etape; }
  const v = ECRANS[e.id]();

  $('#prog').innerHTML = `<div class="prog-seg" style="grid-template-columns:repeat(${vis.length},1fr)">${
    vis.map((x) => { const i = idx(x.id); return `<button data-etape="${i}" class="${i < E.etape ? 'fait' : ''}"
      ${i === E.etape ? 'aria-current="step"' : ''} ${i > E.atteinte ? 'disabled' : ''}
      aria-label="Étape ${x.n} : ${esc(x.t)}" title="${x.n}. ${esc(x.t)}"></button>`; }).join('')}</div>
    <div class="prog-l"><span>Étape ${e.n} sur ${vis.length} · <b>${esc(e.t)}</b></span>
      <span>${E.etape < vis.length - 1 ? `Ensuite : ${esc(vis[E.etape + 1].t)}` : 'Dernière étape'}</span></div>`;

  // garder le curseur dans la réponse en cours si l'écran est redessiné (réglages changés en direct)
  const actif = document.activeElement?.dataset?.rep
    ? { id: document.activeElement.dataset.rep, a: document.activeElement.selectionStart, b: document.activeElement.selectionEnd } : null;

  $('#titre').textContent = e.t;
  majMinutes();
  $('#guide-txt').innerHTML = typo(v.guide);
  $('#scene').innerHTML = typo((e.id === 'avis' ? '' : rattrapage()) + v.h);
  if (actif) {
    const t = document.querySelector(`[data-rep="${CSS.escape(actif.id)}"]`);
    if (t) { t.focus(); try { t.setSelectionRange(actif.a, actif.b); } catch { /* vide */ } }
  }
  const mentions = (E.etape === 0 || e.id === 'avis') ? '' : `<div class="bloc"><h3>Ce que vous avez fait de bien</h3>
    ${E.mentions.length ? `<div class="mentions">${E.mentions.map((id) => `<div class="mention${ui.nouvelles.includes(id) ? ' mention--neuve' : ''}"
      title="${esc(c.mentions[id].q)}"><span class="mention-i" aria-hidden="true">✦</span>
      <span><b>${esc(c.mentions[id].nom)}</b><span>${esc(c.mentions[id].court)}</span></span></div>`).join('')}</div>`
      : '<p class="hint">Rien encore. Ça vient en faisant, pas en réussissant.</p>'}
    <p class="avert">Des gestes, pas des points : pas de total, pas de classement.</p></div>`;
  $('#carnet').innerHTML = typo([...(v.carnet || []).map((b) => `<div class="bloc"><h3>${esc(b.t)}</h3>${b.h}</div>`), mentions].join(''));
  $('#carnet').hidden = !$('#carnet').innerHTML.trim();
  $('#corps').classList.toggle('seul', $('#carnet').hidden);
  majPied(v);
  $('#retour').hidden = E.etape === 0;
  annoncer(ui.nouvelles);
  ui.nouvelles = [];
}

/** Le temps qui reste à l'étape : discret, jamais bloquant ; ocre une fois le temps prévu dépassé. */
function majMinutes() {
  const z = $('#minutes');
  if (!z || !E || E.fini) return;
  const e = c.etapes[E.etape];
  if (e.id === 'avis') { z.textContent = ''; return; }
  const reste = Rg.resteEtape(c, E, S?.chrono);
  const pause = !!S?.chrono?.pause;
  z.textContent = pause ? 'En pause'
    : reste <= 0 ? 'Temps prévu dépassé'
      : reste < 60000 ? 'Moins d\'une minute'
        : `Il reste environ ${Math.ceil(reste / 60000)} min`;
  z.toggleAttribute('data-depasse', !pause && reste <= 0);
  z.title = `Temps prévu pour cette étape : ${e.min} min`;
}
setInterval(majMinutes, 10000);

function majPied(v) {
  const bt = $('#suivant');
  if (!bt || !E) return;          // écran de fin : il n'y a plus de pied
  v ||= ECRANS[c.etapes[E.etape].id]();
  bt.textContent = v.btn + (v.fleche === false ? '' : ' →');
  bt.disabled = !v.peut;
  $('#hint').textContent = v.hint || '';
}

let minuterieBravo = null;
function annoncer(ids) {
  const z = $('#bravo');
  if (!z || !ids.length) return;
  z.innerHTML = `<div class="bravo"><p class="bravo-sur">Bravo</p>${ids.map((id) => `<p class="bravo-l">
    <span class="bravo-i" aria-hidden="true">✦</span><span><b>${esc(c.mentions[id].nom)}</b> — ${esc(c.mentions[id].court)}</span></p>`).join('')}</div>`;
  clearTimeout(minuterieBravo);
  minuterieBravo = setTimeout(() => { z.innerHTML = ''; }, 4600);
}

/* ------------------------------------------------------------ le signal de l'enseignant·e */

function rendreSignal() {
  const z = $('#signal');
  if (!z) return;
  if (S === null || S?.etat === 'fermee') {
    z.hidden = false;
    z.innerHTML = `<p><b>La séance est terminée.</b> Votre enseignant·e l'a fermée.</p>`;
    document.body.classList.add('avec-signal');
    return;
  }
  const sg = S?.signal;
  if (!sg || sg.t <= ui.signalFerme || !SIGNAUX[sg.type] || (E && sg.t < E.creeLe - 60000)) {
    z.hidden = true; z.innerHTML = ''; document.body.classList.remove('avec-signal'); return;
  }
  document.body.classList.add('avec-signal');
  const versDebrief = sg.type === 'debrief' && E && E.etape < idx('debrief');
  z.hidden = false;
  z.innerHTML = `<p><span class="sur">Message de votre enseignant·e</span> ${esc(SIGNAUX[sg.type].t)}</p>
    <div class="signal-a">${versDebrief ? `<button class="btn" data-vers-debrief="1">Y aller : ${esc(c.etapes[idx('debrief')].t.toLowerCase())} →</button>` : ''}
    <button class="btn btn--f" data-fermer-signal="${sg.t}">Compris</button></div>`;
  if (E) majPied();
}

/* ------------------------------------------------------------ les gestes */

function apres(nouvelles = []) { ui.nouvelles.push(...nouvelles); sauver(); rendre(); }

document.addEventListener('input', (ev) => {
  const t = ev.target.closest('[data-rep]');
  if (t && E) { E.reponses[t.dataset.rep] = t.value; sauver(); majPied(); return; }
  const a = ev.target.closest('[data-avis-t]');
  if (a) ui.avis[a.dataset.avisT] = a.value;
});

document.addEventListener('click', async (ev) => {
  if (!E) return;
  const fs = ev.target.closest('[data-fermer-signal]');
  if (fs) { signalLu(Number(fs.dataset.fermerSignal)); return rendreSignal(); }
  if (ev.target.closest('[data-vers-debrief]')) {
    signalLu(S?.signal?.t || Date.now());
    J.allerA(c, E, idx('debrief'));
    rendreSignal(); sauverTout(); return rendre();
  }
  const av = ev.target.closest('[data-avis]');
  if (av && !ui.avisEnvoye) { ui.avis[av.dataset.avis] = av.dataset.val; return rendre(); }

  const et = ev.target.closest('[data-etape]');
  if (et && !et.disabled) {
    const i = Number(et.dataset.etape);
    if (i !== E.etape && i <= E.atteinte) { E.compteurs.sauts += 1; J.allerA(c, E, i); sauverTout(); }
    return rendre();
  }
  const rl = ev.target.closest('[data-releve]');
  if (rl) return apres(J.basculerReleve(c, E, Number(rl.dataset.releve)));
  const doc = ev.target.closest('[data-doc]');
  if (doc) { J.basculerDoc(E, doc.dataset.doc); return apres(); }
  if (ev.target.closest('[data-gespeg]')) return apres(J.basculerGespeg(E));
  const outil = ev.target.closest('[data-outil]');
  if (outil) { ui.outil = outil.dataset.outil; return rendre(); }
  const sect = ev.target.closest('[data-sect]');
  if (sect) {
    const r = J.peindre(c, E, sect.dataset.sect, ui.outil);
    if (r) ui.effet = r.effet;
    return apres(r ? r.nouvelles : []);
  }
  if (ev.target.closest('.carte')) { E.compteurs.clicsVides += 1; sauver(); return; }

  if (ev.target.closest('#retour')) {
    if (E.etape > 0) { E.compteurs.retours += 1; J.allerA(c, E, E.etape - 1); sauverTout(); }
    return rendre();
  }

  if (ev.target.closest('#suivant')) {
    const e = c.etapes[E.etape];
    if (!ECRANS[e.id]().peut) return;
    if (e.id === 'dossier' && !E.juge) return apres(J.juger(c, E));
    if (e.id === 'trace' && J.releve(c, E).corridor === 'continu') ui.nouvelles.push(...J.mentionner(E, 'corridor'));
    if (e.id === 'comp' && E.comps < c.complications.length) { E.comps += 1; return apres(); }
    if (e.id === 'debrief') {
      if (avisActif()) { J.allerA(c, E, idx('avis')); }
      else { J.allerA(c, E, E.etape); E.fini = true; }
      sauverTout(); return rendre();
    }
    if (e.id === 'avis') {
      if (!ui.avisEnvoye) {
        ui.avisEnvoye = true;
        const rep = Object.fromEntries(c.avis.map((q) => [q.id, String(ui.avis[q.id] ?? '').slice(0, 300)]));
        try { await donnees.ecrire(`${cheminSeance(code)}/avis/${crypto.randomUUID().slice(0, 12)}`, { ...rep, t: Date.now() }); }
        catch (err) { console.warn('Avis non envoyé', err); }
        if (!E.fini) { E.fini = true; J.allerA(c, E, E.etape); sauverTout(); }
        return rendre();
      }
      ui.avis = {}; ui.avisEnvoye = false; window.scrollTo({ top: 0 });
      return rendre();
    }
    J.allerA(c, E, Math.min(E.etape + 1, c.etapes.length - 1));
    sauverTout();
    return rendre();
  }
});

document.addEventListener('toggle', (ev) => {
  if (ev.target.id === 'd-sources' && ev.target.open && E && !E.mentions.includes('origine')) apres(J.mentionner(E, 'origine'));
}, true);

// la carte au clavier : secteurs et pastilles sont des boutons
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const cible = ev.target.closest && ev.target.closest('[data-sect],[data-releve]');
  if (!cible || !E) return;
  ev.preventDefault();
  cible.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

// avant de quitter la page, on envoie ce qui attend
window.addEventListener('pagehide', () => sauver.maintenant());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sauver.maintenant(); });

demarrer();
