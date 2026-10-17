// eleve/ecrans.js — les écrans du jeu, une fonction par étape. Chacune rend :
//   guide   ce que dit la garde-parc ;        h       la scène (carte, documents, questions) ;
//   carnet  les blocs de la colonne de droite ; btn, peut, hint  le bouton du bas, et pourquoi il attend.
// Plus le gabarit de la page de jeu, et l'écran de fin.

import * as donnees from '../donnees.js';
import { $, esc, typo, GARDE, IMAGES } from '../outils.js';
import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { carte, blocReleve, effetRecent } from '../carte.js';
import { lienSource } from '../dossierdoc.js';
import { aUnBravo } from '../seance.js';
import { etat, ui, avisActif, etapesVisibles } from './etat.js';
import { blocQuestions, ok, R, PAS_FINI, questionsBravo } from './questions.js';

const MOTS = ['aucun', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];

/** Ce que le dernier geste vient de changer : en haut du carnet, à côté de la carte, toujours visible. */
const blocEffet = () => ({ brut: `<div class="bloc bloc--effet">${effetRecent(etat.c, ui.effet)}</div>` });

export const ECRANS = {
  arrivee: () => ({
    guide: `Bienvenue sur la presqu'île. Ce que vous voyez est réel — le territoire, les chiffres,
      les documents. <b>La décision, elle, est la vôtre.</b> On vous demande de tracer la limite
      d'une aire protégée. Ça a l'air simple. Ça ne le restera pas.`,
    // la question tout de suite sous la garde-parc : c'est ce qu'il y a à faire ; le reste se lit après
    h: `<p class="serif lead">En 1970, le gouvernement a tracé une ligne sur cette carte. À l'intérieur :
        un parc national. À l'extérieur : la vie qui continue.</p>
      ${blocQuestions('arrivee')}
      <p class="serif lead" style="margin-top:22px">Vous n'êtes pas des camps qui s'affrontent.
        Vous êtes <b>une équipe</b>, et vous avez la même question devant vous.</p>
      <div class="paires">
        <div class="paire"><span class="v">7</span><span class="k">secteurs réels à zoner</span></div>
        <div class="paire"><span class="v">12</span><span class="k">documents, dont quatre qui ne servent pas</span></div>
        <div class="paire"><span class="v">1</span><span class="k">ligne à tracer : la vôtre</span></div>
      </div>
      <p class="avert">Le lieu est réel : parc national Forillon, en Gaspésie, créé le 8 juin 1970,
        sur Gespe'gewa'gi. La limite que vous tracerez est la vôtre, pas la sienne.</p>`,
    carnet: [{ t: 'Le parcours', h: `<ol class="parcours">${etapesVisibles().filter((x) => x.id !== 'avis')
      .map((x) => `<li><span>${esc(x.t)}</span><small>${x.min} min</small></li>`).join('')}</ol>` }],
    btn: 'Marcher avec la garde-parc', peut: ok('arrivee'),
    hint: ok('arrivee') ? '' : "Notez d'abord votre hypothèse."
  }),

  marche: () => {
    const { c, E } = etat;
    const reste = c.releves.length - E.releves.length;
    // le relevé touché en dernier (même déjà lu) ; après un rafraîchissement, le dernier ouvert
    const iVu = E.releves.includes(ui.releveVu) ? ui.releveVu : E.releves[E.releves.length - 1];
    const dernier = iVu != null ? c.releves[iVu] : null;
    const nq = (c.q?.ecrites || []).filter((q) => q.etape === 'marche' && /^F2\./.test(q.id)).length;
    const manque = [reste ? `encore ${reste} relevé${reste > 1 ? 's' : ''}` : '',
      ok('marche') ? '' : 'une question à répondre'].filter(Boolean);
    return {
      guide: reste === 0
        ? `Vous avez tout relevé. <b>Chacune de ces six choses va servir.</b> On rentre au bureau ouvrir le dossier.`
        : `On marche. <b>Six relevés à faire, numérotés sur la carte.</b> Je vous dis où aller${
           nq === 1 ? ' ; l\'un d\'entre eux pose une question' : nq > 1 ? ` ; ${MOTS[nq] || nq} d'entre eux posent une question` : ''}.`,
      // la carte d'abord, toujours au même endroit ; ce qu'on y trouve s'affiche à côté, dans le carnet
      h: carte(c, E, { releves: true, cliquable: false }) + blocQuestions('marche'),
      carnet: [{ t: 'Carnet de terrain', h: dernier ? `<div class="trouve">
            <p class="sur">Relevé ${iVu + 1} · ${E.releves.length} sur ${c.releves.length} faits</p>
            <h3>${esc(dernier.t)}</h3><p class="serif">${esc(dernier.x)}</p>
            <p class="trouve-s">${esc(dernier.s)}</p>${lienSource(dernier)}</div>`
        : `<p class="hint">Touchez ${IMAGES ? 'une pastille numérotée' : 'un relevé'} sur la carte : ce que vous y trouvez s'affiche ici.</p>` }],
      btn: 'Ouvrir le dossier',
      peut: reste === 0 && ok('marche'),
      hint: manque.length ? manque.join(' · ').replace(/^./, (x) => x.toUpperCase()) + '.' : ''
    };
  },

  dossier: () => {
    const { c, E, B } = etat;
    return {
      guide: E.juge
        ? `Regardez le verdict de chaque document. <b>Quatre ne servaient pas à cette question-là.</b>
           Savoir mettre de côté, c'est la moitié du travail.`
        : `Douze documents. <b>Retenez-en trois</b> : ceux qui aident vraiment à dire qui a le droit
           d'habiter ici. Certains sont vrais et ne servent à rien. Ce n'est pas un piège.`,
      // Avant le tri : chaque document tient en deux lignes (sa nature, son titre) ; « Lire » ouvre le
      // reste. Après le tri : seulement les verdicts des trois retenus, et la question.
      h: E.juge ? `<div class="verdicts">${E.docs.map((id) => {
          const d = c.documents.find((x) => x.id === id);
          return `<div class="verdict verdict--${d.utile ? 'util' : 'hors'}"><i aria-hidden="true">${d.utile ? '✓' : '—'}</i>
            <span><b>${esc(d.t)}</b>${esc(d.v)}${lienSource(d)}</span></div>`;
        }).join('')}</div>${blocQuestions('dossier')}`
        : `<div class="docs">${c.documents.map((d) => `<div class="doc-c">
            <button class="doc" data-doc="${d.id}" aria-pressed="${E.docs.includes(d.id)}">
              <span class="doc-k">${esc(d.genre)}</span><span class="doc-t">${esc(d.t)}</span></button>
            <details class="doc-plus" data-lire="${d.id}" ${ui.lus.has(d.id) ? 'open' : ''}><summary>Lire</summary>
              <p class="doc-x">${esc(d.x)}</p><p class="doc-s">${esc(d.s)}</p></details></div>`).join('')}</div>`,
      carnet: E.juge ? [] : [{ t: 'Retenus', h: E.docs.length
        ? `<ol class="carnet-l">${E.docs.map((id) => `<li>${esc(c.documents.find((x) => x.id === id).t)}</li>`).join('')}</ol>`
        : '<p class="hint">Aucun pour l\'instant. Trois au plus.</p>' },
      { t: 'La consigne', h: `<p class="serif" style="font-size:15px;line-height:1.6">${esc(B['F3.1'].eleve)}</p>` }],
      btn: E.juge ? 'Tracer la ligne' : 'Soumettre les trois',
      peut: E.juge ? ok('dossier') : E.docs.length === 3,
      hint: E.juge ? (ok('dossier') ? '' : 'Répondez à la question.') : `${E.docs.length} sur 3 retenus.`
    };
  },

  trace: () => {
    const { c, E } = etat;
    const r = J.releve(c, E);
    return {
      guide: `À vous. <b>Choisissez une zone, puis touchez les secteurs.</b> Un vrai parc n'est pas
        « protégé » d'un bloc : il est zoné. Il n'y a pas de bonne réponse — il y a ce que vous
        protégez, qui peut venir, et qui peut rester.`,
      h: carte(c, E, { outil: ui.outil }) + blocQuestions('trace'),
      carnet: [blocEffet(), { t: 'Votre relevé', h: blocReleve(c, E) }],
      btn: 'Arrêter cette ligne',
      peut: r.dans > 0 && ok('trace'),
      hint: r.dans === 0 ? 'Il faut au moins un secteur dans la ligne.' : ok('trace') ? '' : 'Dites pourquoi vous gardez cette ligne.'
    };
  },

  comp: () => {
    const { c, E } = etat;
    const vues = c.complications.slice(0, E.comps);
    const lus = vues.slice(0, -1), neuf = vues[vues.length - 1];
    const n = c.complications.length;
    const bloque = !ok('comp');
    // Comme un relevé : le point de vue qui arrive s'affiche à droite, la garde-parc dit quoi en
    // faire (sa consigne, « quoi »), et la carte reste en place à gauche, prête à être retouchée.
    // Ceux déjà lus tiennent en une ligne ; la question vient sous la carte.
    return {
      guide: !neuf ? 'Votre ligne est arrêtée. <b>Maintenant, d\'autres points de vue.</b> Chacun voit le territoire à sa façon.'
        : (E.comps < n ? '' : 'Voilà les quatre. ') + neuf.quoi,
      h: (lus.length ? `<details class="fige"><summary><span class="sur">Déjà lus</span>
            <b>${lus.length > 1 ? `${MOTS[lus.length] || lus.length} points de vue` : esc(lus[0].t)}</b></summary><div class="corps-f">${lus.map((x) =>
              `<p><b>${esc(x.t)}</b> — ${x.x}</p><p>${x.quoi}</p>`).join('')}</div></details>` : '')
        + (neuf ? '' : '<p class="hint" style="margin-bottom:12px">Touchez le bouton pour entendre le premier.</p>')
        + carte(c, E, { outil: ui.outil }) + blocQuestions('comp'),
      carnet: [...(neuf ? [{ brut: `<div class="comp${ui.compNeuf ? ' comp--neuf' : ''}"><p class="sur">${esc(neuf.sur)}</p>
          <h3>${esc(neuf.t)}</h3><p class="serif">${neuf.x}</p><p class="trouve-s">${esc(neuf.s)}</p>${lienSource(neuf)}</div>` }] : []),
        blocEffet(), { t: 'Votre relevé', h: blocReleve(c, E, true) }],
      btn: E.comps === 0 ? 'Entendre un premier point de vue' : E.comps < n ? 'Un autre point de vue' : 'Voir la décision de 1970',
      peut: !bloque,
      hint: bloque ? PAS_FINI : ''
    };
  },

  bilan: () => {
    const { c, E } = etat;
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
        ${c.bilan.slice(1).map((b) => `<details class="d-sources d-plus"><summary>${esc(b.t)}</summary>${paires(b.paires)}
          <p class="serif texte">${esc(b.texte)}</p><p class="avert">${esc(b.src)}</p></details>`).join('')}`,
      btn: 'Revenir sur notre démarche', peut: ok('bilan'), hint: ok('bilan') ? '' : 'Répondez à la question.'
    };
  },

  debrief: () => {
    const { c, E, S, idEq } = etat;
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
          <dl class="vos-rep">${ecrites.map((q) => `<dt>${esc(q.eleve)}</dt><dd>${esc(E.reponses[q.id])}${
            aUnBravo(S, idEq, q.id) ? ' <span class="vos-bravo">✦ bravo de votre enseignant·e</span>' : ''}</dd>`).join('')}</dl>
        </details>
        <details class="d-sources" id="d-sources"><summary>D'où viennent les chiffres <span class="hint">— chaque source</span></summary>
          ${c.sources.map((s) => `<p class="src"><b>${esc(s.t)}</b> — ${esc(s.x)}</p>`).join('')}
        </details>`,
      btn: avis ? 'Donner mon avis' : 'Terminer la partie', peut: pret,
      hint: pret ? '' : restent ? 'Une question d\'une étape précédente attend votre réponse.' : PAS_FINI
    };
  },

  avis: () => {
    const { c } = etat;
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
            data-val="${j + 1}" aria-pressed="${ui.avis[q.id] === String(j + 1)}">${esc(x)}</button>`).join('')}</div>`
        : q.type === 'choix' ? `<div class="choix">${q.options.map((x) => `<button type="button" data-avis="${q.id}"
            data-val="${esc(x)}" aria-pressed="${ui.avis[q.id] === x}">${esc(x)}</button>`).join('')}</div>`
        : `<textarea data-avis-t="${q.id}" rows="2" maxlength="300" placeholder="Une phrase suffit.">${esc(ui.avis[q.id] || '')}</textarea>`}
        </fieldset>`).join('')}</div>`,
      btn: 'Envoyer mon avis', fleche: false, peut: true, hint: `${faites} sur ${c.avis.length} — tu peux en laisser vides.`
    };
  }
};

/** La page de jeu : la question, la scène et la garde-parc, la barre du bas, le carnet. */
export const gabarit = () => `
  <div class="question"><span class="sur">La question</span><p>${esc(etat.c.question)}</p></div>
  <div class="corps" id="corps">
    <div class="jeu">
      <section class="scene">
        <div class="scene-h"><h2 id="titre" tabindex="-1">…</h2><span class="hint" id="minutes"></span></div>
        <div class="guide${GARDE ? '' : ' guide--seul'}">${GARDE}<div class="bulle">
          <p class="nom">Jeanne Element <small>· garde-parc (personnage fictif)</small></p>
          <p id="guide-txt">…</p></div></div>
        <div class="scene-c" id="scene"></div>
      </section>
      <div class="pied">
        <button class="btn btn--f" id="retour">← Revenir</button>
        <span class="hint" id="hint"></span>
        <button class="btn" id="suivant">Continuer</button>
      </div>
    </div>
    <div class="carnet" id="carnet"></div>
  </div>`;

/** La fin : un merci, puis toute la partie de l'équipe, à relire, à capturer ou à imprimer. */
export function rendreFin() {
  const { c, E, S, idEq } = etat;
  $('#prog').innerHTML = '';
  const ecrites = J.questionsEcrites(c).filter((q) => R(q.id));
  const bravos = questionsBravo();
  $('#app').innerHTML = typo(`<section class="scene fin"><div class="scene-c merci">
    <p class="merci-t">Partie terminée</p>
    <p>Merci, équipe ${esc(E.nom)}. ${donnees.mode === 'local'
      ? 'Votre ligne et vos réponses sont gardées dans ce navigateur.'
      : 'Votre ligne et vos réponses sont envoyées à votre enseignant·e.'}</p>
    <div class="p-actions fin-actions"><button class="btn btn--f" type="button" data-imprimer-fin>Imprimer ou enregistrer en PDF</button></div>
    </div></section>
    <section class="scene recap"><div class="scene-c">
      <h2>Votre partie</h2>
      <div class="recap-g"><div>${carte(c, E, { cliquable: false })}</div><div>${blocReleve(c, E, true)}</div></div>
      ${bravos.length || E.mentions.length ? `<h3 class="sous">Ce que vous avez fait de bien</h3><div class="mentions">${
        bravos.map((q) => `<div class="mention mention--ens"><span class="mention-i" aria-hidden="true">✦</span>
          <span><b>Bravo de votre enseignant·e</b><span>« ${esc(q.eleve)} »</span></span></div>`).join('')}${
        E.mentions.map((id) => `<div class="mention"><span class="mention-i" aria-hidden="true">✦</span>
          <span><b>${esc(c.mentions[id].nom)}</b><span>${esc(c.mentions[id].court)}</span></span></div>`).join('')}</div>` : ''}
      ${ecrites.length ? `<h3 class="sous">Vos réponses</h3><dl class="vos-rep">${ecrites.map((q) => `<dt>${esc(q.eleve)}</dt>
        <dd>${esc(E.reponses[q.id])}${aUnBravo(S, idEq, q.id) ? ' <span class="vos-bravo">✦ bravo de votre enseignant·e</span>' : ''}</dd>`).join('')}</dl>` : ''}
    </div></section>`);
}
