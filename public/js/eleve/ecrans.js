// eleve/ecrans.js — les écrans du jeu, une fonction par étape. Chacune rend :
//   guide   la mission de l'étape (dite par la garde-parc) ;  h  la scène (carte, documents, questions) ;
//   carnet  les blocs de la colonne de droite ; btn, peut, hint  le bouton du bas, et pourquoi il attend.
// Plus le gabarit de la page de jeu, et l'écran de fin.
//
// Retours des enseignant·es (Playtest 2) : la question du jeu d'abord, puis rappelée partout ; on lit avant de
// répondre (le relevé ou le point de vue, puis la question qui s'en sert) ; chaque question dit ce qu'on attend ;
// la carte change à chaque choix ; pas de sources ni de compte à rebours à l'écran des équipes.

import * as donnees from '../donnees.js';
import { $, esc, typo, IMAGES, IMAGE_TEMPORAIRE } from '../outils.js';
import * as J from '../jeu.js';
import * as Rg from '../reglages.js';
import { carte, blocReleve, effetRecent, panneauSecteur } from '../carte.js';
import { aUnBravo, retourDe, texteRetour, EMOJIS_EQUIPES } from '../seance.js';
import { etat, ui, avisActif, etapesVisibles } from './etat.js';
import { blocQuestions, blocQuestion, ok, R, PAS_FINI, questionsBravo } from './questions.js';
import { confettis } from './anime.js';

// les quatre degrés de l'échelle : une couleur ET une forme chacun (comme les tuiles de Kahoot)
const FORMES = ['▲', '◆', '●', '■'];

const MOTS = ['aucun', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];
// le nombre de documents du dossier, et de ceux qui ne servent pas : douze et quatre, plus avec les documents en option
const EN_LETTRES = { 12: 'douze', 13: 'treize', 14: 'quatorze' };
const lettres = (n) => EN_LETTRES[n] || MOTS[n] || String(n);
const horsSujet = (c) => c.documents.filter((d) => !d.utile).length;

/** « Suivant : Se questionner » : le bouton du bas nomme toujours l'étape qui vient. */
function suivante() {
  const vis = etapesVisibles().filter((x) => x.id !== 'avis');
  const i = vis.findIndex((x) => x.id === etat.c.etapes[etat.E.etape].id);
  return vis[i + 1] ? `Suivant : ${vis[i + 1].t}` : 'Terminer la partie';
}

/** La ligne telle que la décision de 1970 l'a tracée : les sept secteurs dans le parc, les six villages vidés. */
const ligne1970 = (c, E) => ({ zones: Object.fromEntries(c.secteurs.map((s) => [s.id, 'sauvage'])),
  historique: Object.fromEntries(c.secteurs.map((s) => [s.id, ['sauvage']])), gespeg: E.gespeg, releves: [] });

/**
 * La carte et le panneau de choix, côte à côte : on touche un secteur, puis on choisit sa zone. Sous la carte, ce que
 * le dernier geste vient de changer : carte, choix, conséquence et (à droite) la question, d'un seul regard.
 */
const carteEtChoix = (c, E, effet) => `<div class="trace-g">
    <div class="trace-carte">${carte(c, E, { cliquable: true, choisi: ui.secteur, legendeCourte: true })}
      <div class="bloc bloc--effet trace-effet">${effet}</div></div>
    <div class="trace-choix">${panneauSecteur(c, E, ui.secteur)}</div>
  </div>`;

/** Ce qu'il faut avant d'arrêter la ligne, coché au fur et à mesure (le minimum demandé par les enseignant·es). */
function minimum(c, E) {
  const reste = J.aDecider(c, E).length, n = c.secteurs.length;
  const pres = c.secteurs.some((s) => E.zones[s.id] === 'preservation');
  const lignes = [[reste === 0, `Les ${n} secteurs ont une zone`, `${n - reste} sur ${n}`],
    [pres, 'Au moins un secteur en préservation', ''],
    ...Rg.questionsVisibles(c, E, 'trace').filter((q) => q.requise).map((q) => [R(q.id), 'Vous avez répondu à la question', ''])];
  return `<ul class="minimum">${lignes.map(([fait, t, k]) => `<li class="${fait ? 'fait' : ''}"><span class="minimum-i" aria-hidden="true">${fait ? '✓' : '○'}</span>
    <span>${esc(t)}${k ? ` <small>(${esc(k)})</small>` : ''}<span class="cache-visuel">${fait ? ' : fait' : ' : à faire'}</span></span></li>`).join('')}</ul>`;
}

export const ECRANS = {
  arrivee: () => {
    const { c, E } = etat;
    // La question du jeu, AVANT l'arrivée (Playtest 2) : lue à voix haute, en équipe, puis on entre.
    if (!ui.questionLue && E.atteinte === 0 && !R('F1.2') && !etat.apercu) return {
      titre: 'La question du jeu', sansBandeau: true,
      guide: 'Avant de commencer, <b>lisez cette question à voix haute, en équipe.</b> Tout le jeu sert à y répondre.',
      h: `<div class="grande-q"><p class="grande-q-t">${esc(c.question)}</p>
        <p class="hint">Elle reviendra en haut de l'écran, à chaque étape.</p></div>`,
      btn: 'Nous avons lu la question', peut: true, hint: ''
    };
    return {
      guide: `Bienvenue à Forillon, en Gaspésie. <b>Tout est réel ici</b> : le territoire, les chiffres, les documents.
        Votre équipe va tracer la limite d'un parc. <b>D'abord, écrivez une hypothèse.</b>`,
      // la question tout de suite sous la mission : c'est ce qu'il y a à faire ; le reste se lit après.
      h: `<p class="serif lead">En 1970, le gouvernement a tracé une ligne sur ce territoire. À l'intérieur :
          un parc national. À l'extérieur : la vie continue.</p>
        ${blocQuestions('arrivee')}
        ${IMAGES ? '' : `<img class="banniere" src="${IMAGE_TEMPORAIRE}" alt="" width="306" height="175">`}
        <p class="serif lead" style="margin-top:22px">Vous n'êtes pas des camps qui s'affrontent.
          Vous êtes <b>une équipe</b>. Vous avez la même question devant vous.</p>
        <div class="paires">
          <div class="paire"><span class="v">7</span><span class="k">secteurs réels à zoner</span></div>
          <div class="paire"><span class="v">${c.documents.length}</span><span class="k">documents, dont ${lettres(horsSujet(c))} qui ne servent pas</span></div>
          <div class="paire"><span class="v">1</span><span class="k">ligne à tracer : la vôtre</span></div>
        </div>
        <p class="avert">Le lieu est réel : le parc national Forillon, en Gaspésie, créé le 8 juin 1970,
          sur Gespe'gewa'gi. La limite que vous tracerez est la vôtre.</p>`,
      carnet: [{ t: 'Le parcours', h: `<ol class="parcours">${etapesVisibles().filter((x) => x.id !== 'avis')
        .map((x) => `<li><span>${esc(x.t)}</span></li>`).join('')}</ol>` }],
      btn: suivante(), peut: ok('arrivee'),
      hint: ok('arrivee') ? '' : "Écrivez d'abord votre hypothèse."
    };
  },

  marche: () => {
    const { c, E } = etat;
    const reste = c.releves.length - E.releves.length;
    // le relevé touché en dernier (même déjà lu) ; après un rafraîchissement, le dernier ouvert
    const iVu = E.releves.includes(ui.releveVu) ? ui.releveVu : E.releves[E.releves.length - 1];
    const dernier = iVu != null ? c.releves[iVu] : null;
    // On lit d'abord, on répond ensuite : la question d'un relevé vient sous ce relevé, à droite de la carte.
    const qs = Rg.questionsVisibles(c, E, 'marche');
    const ici = qs.filter((q) => (dernier?.sert || []).includes(q.id));
    const ailleurs = qs.filter((q) => !ici.includes(q));
    const manque = [reste ? `Encore ${reste} relevé${reste > 1 ? 's' : ''}` : '', ok('marche') ? '' : 'une question à répondre'].filter(Boolean);
    return {
      guide: reste === 0
        ? 'Vous avez fait les six relevés. <b>Chacun va servir.</b> Répondez aux questions, puis passez à la suite.'
        : `Votre mission : <b>faire les six relevés.</b> Touchez un numéro sur la carte. Lisez ce que vous trouvez, à droite.
           <b>Ensuite, répondez à la question qui l'accompagne.</b>`,
      // la carte d'abord, toujours au même endroit ; ce qu'on y trouve s'affiche à côté, avec sa question
      h: carte(c, E, { releves: true, neutre: true }) + (ailleurs.length ? `<div class="q-autres">
          <p class="sur">Les questions des autres relevés</p>${ailleurs.map((q) => blocQuestion(q)).join('')}</div>` : ''),
      carnet: [{ brut: dernier ? `<div class="bloc"><div class="trouve">
            <p class="sur">Relevé ${iVu + 1} · ${E.releves.length} sur ${c.releves.length} faits</p>
            <h3>${esc(dernier.t)}</h3><p class="serif">${esc(dernier.x)}</p></div>
            ${ici.map((q) => blocQuestion(q, { court: true })).join('')}</div>`
        : `<div class="bloc"><h3>Carnet de terrain</h3><p class="hint">Touchez le relevé 1 sur la carte : ce que vous y trouvez s'affiche ici.</p></div>` },
      { t: 'Vos relevés', h: `<ol class="releves-l">${c.releves.map((r, i) => {
        const lu = E.releves.includes(i);
        return `<li><button type="button" class="lien${i === iVu ? ' lien--ici' : ''}" data-releve="${i}" ${i === iVu ? 'aria-current="true"' : ''}>
          <span class="rl-i" aria-hidden="true">${lu ? '✓' : i + 1}</span>${lu ? esc(r.t) : `Relevé ${i + 1}`}</button></li>`;
      }).join('')}</ol>` }],
      btn: suivante(),
      peut: reste === 0 && ok('marche'),
      hint: manque.length ? manque.join(' · ') + '.' : ''
    };
  },

  dossier: () => {
    const { c, E, B } = etat;
    if (!E.juge) return {
      guide: `Votre mission : <b>choisir les trois documents les plus utiles</b> pour répondre à la question du jeu.
        Ouvrez-les avec « Lire ». Certains sont vrais, mais ne servent pas à cette question. Ce n'est pas un piège.`,
      // chaque document tient en deux lignes (sa nature, son titre) ; « Lire » ouvre le reste
      h: `<div class="docs">${c.documents.map((d) => `<div class="doc-c">
            <button class="doc" data-doc="${d.id}" aria-pressed="${E.docs.includes(d.id)}">
              <span class="doc-k">${esc(d.genre)}</span><span class="doc-t">${esc(d.t)}</span></button>
            <details class="doc-plus" data-lire="${d.id}" ${ui.lus.has(d.id) ? 'open' : ''}><summary>Lire</summary>
              <p class="doc-x">${esc(d.x)}</p></details></div>`).join('')}</div>`,
      carnet: [{ t: 'Vos trois choix', h: E.docs.length
        ? `<ol class="carnet-l">${E.docs.map((id) => `<li>${esc(J.docParId(c, id)?.t || '')}</li>`).join('')}</ol>`
        : '<p class="hint">Aucun pour l\'instant. Touchez un document pour le choisir.</p>' },
      { t: 'La consigne', h: `<p class="serif" style="font-size:15px;line-height:1.6">${esc(B['F3.1'].eleve)}</p>` }],
      btn: 'Voir le verdict', fleche: false,
      peut: E.docs.length === 3,
      hint: `${E.docs.length} sur 3 choisis.`
    };
    // Après le tri : un verdict net pour chacun des trois (bon choix ou pas), puis les bons documents manqués,
    // et les douze à relire, chacun avec son verdict. Le vert dit « bon choix », et rien d'autre.
    const pris = E.docs.map((id) => J.docParId(c, id)).filter(Boolean);
    const manques = c.documents.filter((d) => d.utile && !E.docs.includes(d.id));
    const marque = (d) => d.utile
      ? '<p class="verdict-m"><span aria-hidden="true">✓</span> Bon choix : ce document aide à répondre.</p>'
      : '<p class="verdict-m"><span aria-hidden="true">✗</span> Pas utile pour cette question.</p>';
    return {
      guide: `Voici le verdict. <b>✓ : un bon choix. ✗ : un document qui ne sert pas à cette question.</b>
        Savoir mettre de côté, c'est la moitié du travail.`,
      h: `<div class="verdicts">${pris.map((d) => `<div class="verdict verdict--${d.utile ? 'util' : 'hors'}">
            ${marque(d)}<p class="verdict-t">${esc(d.t)}</p><p>${esc(d.v)}</p></div>`).join('')}</div>
        ${manques.length ? `<p class="manques"><b>D'autres documents étaient utiles :</b> ${manques.map((d) => `« ${esc(d.t)} »`).join(', ')}.</p>` : ''}
        <details class="d-sources d-tous"><summary>Relire les ${lettres(c.documents.length)} documents, avec leur verdict</summary>
          <div class="verdicts verdicts--tous">${c.documents.map((d) => `<div class="verdict verdict--${d.utile ? 'util' : 'hors'}">
            ${marque(d)}<p class="verdict-t">${esc(d.t)}${E.docs.includes(d.id) ? ' <small>(votre choix)</small>' : ''}</p>
            <p>${esc(d.x)}</p><p class="verdict-v">${esc(d.v)}</p></div>`).join('')}</div></details>
        ${blocQuestions('dossier')}`,
      btn: suivante(),
      peut: ok('dossier'),
      hint: ok('dossier') ? '' : 'Répondez à la question.'
    };
  },

  trace: () => {
    const { c, E } = etat;
    const manque = J.manqueLigne(c, E);
    const reste = J.aDecider(c, E).length;
    const pres = c.secteurs.some((s) => E.zones[s.id] === 'preservation');
    return {
      guide: `Votre mission : <b>tracer la limite du parc.</b> Touchez un secteur, puis choisissez sa zone.
        Il n'y a pas de bonne réponse. <b>Mais chaque secteur doit avoir une zone, et au moins un doit être en préservation.</b>`,
      h: carteEtChoix(c, E, effetRecent(c, ui.effet)),
      // à droite, sans défiler : ce qu'il faut pour arrêter la ligne, puis la question
      carnet: [{ t: 'Avant d\'arrêter votre ligne', h: minimum(c, E) },
        ...(Rg.questionsVisibles(c, E, 'trace').length ? [{ brut: `<div class="bloc">${blocQuestions('trace', undefined, { court: true })}</div>` }] : []),
        { t: 'Votre ligne', h: blocReleve(c, E, true) }],
      btn: 'Arrêter cette ligne',
      peut: !manque.length && ok('trace'),
      // la phrase sous le bouton : courte ; elle ne mène à la case de la réponse que si c'est elle qui manque
      hint: reste ? `Encore ${reste} secteur${reste > 1 ? 's' : ''} à décider.` : !pres ? 'Mettez au moins un secteur en préservation.'
        : ok('trace') ? '' : 'Répondez à la question.',
      lien: !reste && pres
    };
  },

  comp: () => {
    const { c, E } = etat;
    const n = c.complications.length;
    const bloque = !ok('comp');
    // Le point de vue affiché : le dernier arrivé, ou celui qu'on relit (1, 2, 3, 4 : on peut revenir).
    const iVoir = E.comps ? Math.min(ui.povVoir ?? E.comps - 1, E.comps - 1) : -1;
    const pv = iVoir >= 0 ? c.complications[iVoir] : null;
    const neuf = E.comps ? c.complications[E.comps - 1] : null;
    const qs = Rg.questionsVisibles(c, E, 'comp');
    const ici = qs.filter((q) => (pv?.sert || []).includes(q.id));
    const ailleurs = qs.filter((q) => !ici.includes(q));
    // « Ce que ça vient de changer » : seulement un geste fait après le point de vue affiché ; sinon, la consigne.
    const effet = ui.effet && ui.effet.etape === 'comp' && ui.effet.comps === E.comps ? ui.effet : null;
    const sansProtection = !c.secteurs.some((s) => E.zones[s.id] === 'preservation');
    return {
      guide: !neuf ? 'Votre ligne est arrêtée. <b>Maintenant, quatre autres points de vue.</b> Après chacun, regardez votre carte : vous pouvez la changer.'
        : (E.comps < n ? '' : 'Voilà les quatre. ') + neuf.quoi,
      h: (neuf ? '' : '<p class="hint" style="margin-bottom:12px">Touchez le bouton du bas pour entendre le premier.</p>')
        + carteEtChoix(c, E, effet ? effetRecent(c, effet)
          : '<p class="avert">Ce point de vue change-t-il votre ligne ? Touchez un secteur pour le modifier, ou passez au suivant.</p>')
        + (ailleurs.length ? `<div class="q-autres"><p class="sur">Les questions des autres points de vue</p>${ailleurs.map((q) => blocQuestion(q)).join('')}</div>` : ''),
      carnet: [...(pv ? [{ brut: `<div class="comp${ui.compNeuf && iVoir === E.comps - 1 ? ' comp--neuf' : ''}">
          ${E.comps > 1 ? `<div class="pov-nav" role="group" aria-label="Relire un point de vue">${c.complications.slice(0, E.comps).map((x, i) =>
            `<button type="button" class="pov-b" data-pov="${i}" aria-pressed="${i === iVoir}" aria-label="Point de vue ${i + 1} : ${esc(x.t)}">${i + 1}</button>`).join('')}</div>` : ''}
          <p class="sur">Point de vue ${iVoir + 1} sur ${n} · ${esc(pv.qui || '')}</p>
          <h3>${esc(pv.t)}</h3><p class="serif">${pv.x}</p>
          ${iVoir === E.comps - 1 ? '' : `<p class="quoi">${pv.quoi}</p>`}
          ${ici.map((q) => blocQuestion(q, { court: true })).join('')}</div>` }] : []),
        { t: 'Votre ligne', h: blocReleve(c, E, true) }],
      btn: E.comps === 0 ? 'Entendre le premier point de vue' : E.comps < n ? 'Point de vue suivant' : suivante(),
      // la ligne redessinée garde le minimum du tracé : au moins un secteur en préservation
      peut: !bloque && !sansProtection,
      hint: sansProtection ? 'Gardez au moins un secteur en préservation.' : bloque ? PAS_FINI : '',
      lien: !sansProtection
    };
  },

  bilan: () => {
    const { c, E } = etat;
    const r = J.releve(c, E);
    const nv = J.nbVillages(c);
    const liste = (a) => a.map(esc).join(', ');
    const paires = (p) => p.length ? `<div class="paires">${p.map(([v, k]) =>
      `<div class="paire"><span class="v">${esc(v)}</span><span class="k">${esc(k)}</span></div>`).join('')}</div>` : '';
    const b0 = c.bilan[0];
    return {
      guide: `Je ne vais pas vous dire si votre ligne est bonne. <b>Je vais vous montrer ce que la vraie ligne a fait, en 1970.</b>`,
      h: `<div class="deux-cartes">
          <figure><figcaption>Votre ligne</figcaption>${carte(c, E, { sansLegende: true })}
            <p class="serif texte">${r.vides.length === nv ? 'Vous videz les six villages, comme en 1970. '
              : r.vides.length ? `Vous videz ${liste(r.vides)}. ` : 'Vous ne videz aucun village. '}${r.gardes.length ? `Vous gardez ${liste(r.gardes)} dans le parc. ` : ''}${
              r.dehors.length ? `Vous laissez ${liste(r.dehors)} hors du parc. ` : ''}Votre corridor : ${esc(r.corridor)}.</p></figure>
          <figure><figcaption>La ligne de 1970</figcaption>${carte(c, ligne1970(c, E), { sansLegende: true,
            titre: 'Carte schématique de la ligne de 1970 : les sept secteurs dans le parc, les six villages vidés' })}
            <p class="serif texte">Les sept secteurs entrent dans le parc. Les six villages sont vidés : 225 familles partent.
              Le corridor reste continu, puisque tout est protégé.</p></figure>
        </div>
        <h3 class="sous">De 1970 à 1975</h3>
        <ol class="chrono">${(b0.chrono || []).map((x) => `<li><span class="chrono-d">${esc(x.d)}</span><span>${esc(x.t)}</span></li>`).join('')}</ol>
        <h3 class="sous">${esc(b0.t)}</h3>${paires(b0.paires)}<p class="serif texte">${esc(b0.texte)}</p>
        ${blocQuestions('bilan')}
        ${c.bilan.slice(1).map((b) => `<details class="d-sources d-plus"><summary>${esc(b.t)}</summary>${paires(b.paires)}
          <p class="serif texte">${esc(b.texte)}</p></details>`).join('')}`,
      btn: suivante(), peut: ok('bilan'), hint: ok('bilan') ? '' : 'Répondez à la question.'
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
      guide: `On range les cartes. <b>Ce qui reste, c'est ce que vous direz en classe.</b> Rappel de la question : ${esc(c.question)}`,
      h: `${orales.length ? `<h3 class="sous" style="margin-top:0;padding-top:0;border:0">Les questions, en classe entière</h3>
        <ol class="qlist">${orales.map((q) => `<li>${esc(q.eleve)}</li>`).join('')}</ol>` : ''}
        ${blocQuestions('debrief')}
        <details class="d-sources"><summary>Ce que votre équipe a écrit <span class="hint">(pour en parler)</span></summary>
          <dl class="vos-rep">${ecrites.map((q) => `<dt>${esc(q.eleve)}</dt><dd>${esc(E.reponses[q.id])}${
            aUnBravo(S, idEq, q.id) ? ` <span class="vos-bravo">✦ ${esc(texteRetour(retourDe(S, idEq, q.id).k, true))}</span>` : ''}</dd>`).join('')}</dl>
        </details>
        <details class="d-sources" id="d-sources"><summary>D'où viennent les chiffres <span class="hint">(chaque source)</span></summary>
          ${c.sources.map((s) => `<p class="src"><b>${esc(s.t)}</b><br>${esc(s.x)}</p>`).join('')}
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
        ${q.type === 'echelle' ? `<div class="ech">${c.echelle.map((x, j) => `<button type="button" class="ech-${j + 1}" data-avis="${q.id}"
            data-val="${j + 1}" aria-pressed="${ui.avis[q.id] === String(j + 1)}"><span class="ech-f" aria-hidden="true">${FORMES[j] || ''}</span>${esc(x)}</button>`).join('')}</div>`
        : q.type === 'choix' ? `<div class="choix">${q.options.map((x) => `<button type="button" data-avis="${q.id}"
            data-val="${esc(x)}" aria-pressed="${ui.avis[q.id] === x}">${esc(x)}</button>`).join('')}</div>`
        : `<textarea data-avis-t="${q.id}" rows="2" maxlength="300" placeholder="Une phrase suffit.">${esc(ui.avis[q.id] || '')}</textarea>`}
        </fieldset>`).join('')}</div>`,
      btn: 'Envoyer mon avis', fleche: false, peut: true, hint: `${faites} sur ${c.avis.length}. Tu peux en laisser vides.`
    };
  }
};

/**
 * La page de jeu : la question, la scène et la mission, la barre du bas, le carnet. Plus de portrait à côté de la
 * mission (la vignette ne disait rien de ce qu'il faut faire) : la garde-parc est nommée, sa consigne prend la place.
 */
export const gabarit = () => `
  <div class="question" id="bandeau-q"><span class="sur">La question</span><p>${esc(etat.c.question)}</p></div>
  <div class="corps" id="corps">
    <div class="jeu">
      <section class="scene">
        <div class="scene-h"><h2 id="titre" tabindex="-1">…</h2>
          <span class="temps-z" id="temps-z"><span class="hint" id="minutes"></span><span class="temps-barre" aria-hidden="true"><i id="temps-i"></i></span></span></div>
        <div class="guide"><div class="bulle">
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

/** La fin : un merci, le rappel de quitter la séance, puis toute la partie de l'équipe, à relire ou à imprimer. */
export function rendreFin() {
  const { c, E, S, idEq } = etat;
  $('#prog').innerHTML = '';
  const ecrites = J.questionsEcrites(c).filter((q) => R(q.id));
  const bravos = questionsBravo();
  if (!ui.finFetee) { ui.finFetee = true; confettis(90); }   // la fin de la partie se fête une fois
  $('#app').innerHTML = typo(`<section class="scene fin"><div class="scene-c merci">
    <p class="merci-e" aria-hidden="true">${EMOJIS_EQUIPES[E.nom] || ''}</p>
    <p class="merci-t">Partie terminée</p>
    <p>Merci, équipe ${esc(E.nom)}. ${donnees.mode === 'local'
      ? 'Votre ligne et vos réponses sont gardées dans ce navigateur.'
      : 'Votre ligne et vos réponses sont envoyées à votre enseignant·e.'}</p>
    ${etat.apercu ? '' : `<div class="rappel-fin" role="note"><p><b>Dernière chose : quittez la séance.</b> L'ordinateur sera libre pour la
      prochaine équipe. ${donnees.mode === 'local' ? 'Votre partie reste gardée.' : 'Vos réponses restent chez votre enseignant·e.'}</p>
      <button class="btn" type="button" data-quitter-demander>Quitter la séance</button></div>`}
    <div class="p-actions fin-actions"><button class="btn btn--f" type="button" data-imprimer-fin>Imprimer ou enregistrer en PDF</button></div>
    </div></section>
    <section class="scene recap"><div class="scene-c">
      <h2><span class="nom-e" aria-hidden="true">${EMOJIS_EQUIPES[E.nom] || ''}</span> Votre partie, équipe ${esc(E.nom)}</h2>
      <div class="recap-g"><div>${carte(c, E)}</div><div>${blocReleve(c, E, true)}</div></div>
      ${bravos.length || E.mentions.length ? `<h3 class="sous">Ce que vous avez fait de bien</h3><div class="mentions">${
        bravos.map((q) => `<div class="mention mention--ens"><span class="mention-i" aria-hidden="true">✦</span>
          <span><b>${esc(texteRetour(retourDe(S, idEq, q.id).k))}</b><span>« ${esc(q.eleve)} »</span></span></div>`).join('')}${
        E.mentions.map((id) => `<div class="mention"><span class="mention-i" aria-hidden="true">✦</span>
          <span><b>${esc(c.mentions[id].nom)}</b><span>${esc(c.mentions[id].court)}</span></span></div>`).join('')}</div>` : ''}
      ${ecrites.length ? `<h3 class="sous">Vos réponses</h3><dl class="vos-rep">${ecrites.map((q) => `<dt>${esc(q.eleve)}</dt>
        <dd>${esc(E.reponses[q.id])}${aUnBravo(S, idEq, q.id) ? ` <span class="vos-bravo">✦ ${esc(texteRetour(retourDe(S, idEq, q.id).k, true))}</span>` : ''}</dd>`).join('')}</dl>` : ''}
    </div></section>`);
}

