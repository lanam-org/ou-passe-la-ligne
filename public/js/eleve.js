// eleve.js — la page des équipes : rejoindre une séance, puis jouer.
//
// L'élève ne voit que le jeu : aucune note de conception, aucune mesure, aucun
// lien au programme. Tout ce qui sert l'enseignant·e vit dans enseignant.html.
//
// Un seul Chromebook par équipe. L'état de l'équipe est enregistré à chaque
// geste (avec un court délai), ce qui permet deux choses : l'enseignant·e suit
// la classe en direct, et une équipe qui rafraîchit la page reprend où elle était.
//
// Ce fichier fait entrer l'équipe, dessine l'étape en cours et répond aux gestes.
// Le reste est rangé dans eleve/ :
//   etat.js       l'état partagé (la séance, la fiche de l'équipe, le contenu réglé)
//   ecrans.js     une fonction par étape, le gabarit de la page, l'écran de fin
//   questions.js  les questions écrites, « À rattraper », ce qui manque encore
//   annonces.js   gestes reconnus, « bravos », message de l'enseignant·e, lecteur d'écran
//   envoi.js      l'enregistrement de la fiche, et le voyant « Enregistré »

import * as donnees from './donnees.js';
import { $, esc, typo, messageErreur, validationEnFrancais } from './outils.js';
import * as J from './jeu.js';
import * as Rg from './reglages.js';
import { NOMS_EQUIPES, EMOJIS_EQUIPES, rejoindre, cheminSeance, cheminEquipe, normaliserCode, codeValide, expiration, CLE_APERCU } from './seance.js';
import { etat, ui, page, appliquerReglages, idx, avisActif, etapesVisibles } from './eleve/etat.js';
import { ECRANS, gabarit, rendreFin } from './eleve/ecrans.js';
import { MAX_REPONSE, rattrapage, questionsBravo, reponseManquante } from './eleve/questions.js';
import { signalLu, relireAnnonces, dire, direEffet, sansBalises, fermerBravo, annoncer, bravosRecus, rendreSignal } from './eleve/annonces.js';
import { sauver, sauverTout } from './eleve/envoi.js';

validationEnFrancais();

const CLE = 'forillon:equipe';

/* ------------------------------------------------------------ l'arrivée */

const params = new URLSearchParams(location.search);
const codeUrl = normaliserCode(params.get('code'));

async function demarrer() {
  if (params.get('apercu') === '1') return entrerApercu();
  if (donnees.mode === 'local') $('#mode-local').hidden = false;
  // L'équipe en cours est rangée sous l'identifiant de l'appareil : en mode
  // local, deux onglets (deux équipes) ne se marchent donc pas dessus.
  const moi = await donnees.attendreUtilisateur();
  let garde = null;
  try { if (moi) garde = JSON.parse(localStorage.getItem(`${CLE}:${moi.uid}`) || 'null'); } catch { /* vide */ }
  if (garde && (!codeUrl || codeUrl === garde.code)) {
    try {
      const fiche = await donnees.lire(cheminEquipe(garde.code, garde.id));
      if (fiche && fiche.appareil === moi.uid) return entrer(garde.code, garde.id, fiche);
    } catch { /* on repasse par l'accueil */ }
  }
  accueil(codeUrl);
}

function accueil(prerempli = '', erreur = '', nomChoisi = '') {   // le nom choisi reste coché après une erreur
  document.body.dataset.ecran = 'accueil';
  $('#retour-accueil').hidden = false;   // une erreur de porte ? on revient à l'accueil du site
  $('#app').innerHTML = typo(`<section class="rejoindre scene">
    <div class="scene-c">
      <h2>Rejoindre la séance</h2>
      <p class="hint" style="margin-top:6px">Un seul ordinateur par équipe. Pas de prénom, ni ici ni dans vos réponses :
        votre équipe porte le nom d'un animal de Forillon.</p>
      <form id="f-rejoindre" autocomplete="off" novalidate>
        <label class="champ champ-code"><span>Code de la séance (au tableau)</span>
          <input id="code" name="code" inputmode="text" maxlength="5" required
            value="${esc(prerempli)}" placeholder="K7P2M" aria-describedby="code-aide"></label>
        <p id="code-aide" class="avert">Les cinq caractères écrits au tableau.</p>
        <fieldset class="noms-equipe"><legend>Le nom de votre équipe</legend>
          <div class="noms-g">${NOMS_EQUIPES.map((n, i) => `<label class="nom-c">
            <input type="radio" name="nom" value="${esc(n)}" ${i === 0 ? 'required' : ''} ${n === nomChoisi ? 'checked' : ''}>
            <span><span class="nom-e" aria-hidden="true">${EMOJIS_EQUIPES[n] || ''}</span>${esc(n)}</span></label>`).join('')}</div>
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
    // les messages sont les nôtres, en français (novalidate : pas les bulles du navigateur)
    if (!codeValide(cd)) return accueil(cd, 'Ce code ne ressemble pas à celui du tableau : cinq caractères, sans O ni I.', nom);
    if (!nom) return accueil(cd, 'Choisissez le nom de votre équipe.');
    ev.target.querySelector('button').disabled = true;
    try {
      const r = await rejoindre(etat.c, cd, nom);
      const moi = await donnees.identite();
      try { localStorage.setItem(`${CLE}:${moi.uid}`, JSON.stringify({ code: cd, id: r.id })); } catch { /* vide */ }
      entrer(cd, r.id, r.etat);
    } catch (e) {
      accueil(cd, messageErreur(e, 'Impossible de rejoindre la séance pour le moment. Réessayez.'), nom);
    }
  });
  $('#code')?.addEventListener('input', (ev) => { ev.target.value = normaliserCode(ev.target.value); });
}

let arretSeance = () => {};
function entrer(cd, id, fiche) {
  Object.assign(etat, { code: cd, idEq: id, E: fiche });
  const { E } = etat;
  E.compteurs ||= J.nouvelEtat(etat.c, E.nom, E.appareil).compteurs;
  relireAnnonces();
  $('#etat-envoi').hidden = false;
  $('#retour-accueil').hidden = true;    // en jeu, pas de sortie par erreur (le nom du site reste un lien)
  document.body.dataset.ecran = 'jeu';
  $('#app').innerHTML = gabarit();
  $('#equipe').textContent = `Équipe ${E.nom} · séance ${cd}`;
  arretSeance();
  arretSeance = donnees.ecouter(cheminSeance(cd), (s) => {
    etat.S = s;
    const bravos = JSON.stringify(s?.bravos?.[id] || {}), changes = bravos !== ui.bravos;
    ui.bravos = bravos;
    if (appliquerReglages(s?.config) || changes) rendre(); else majMinutes();
    rendreSignal();
    bravosRecus();
  });
  rendre();
}

/**
 * L'aperçu de l'enseignant·e (eleve.html?apercu=1, ouvert depuis l'espace enseignant) : le jeu tel qu'une équipe le
 * voit, avec les réglages laissés dans le stockage du navigateur (ouvrirApercu, seance.js). Ni séance ni équipe :
 * rien n'est enregistré (envoi.js), et toutes les étapes s'ouvrent d'un clic dans la barre du haut.
 */
function entrerApercu() {
  let lu = null;
  try { lu = JSON.parse(localStorage.getItem(CLE_APERCU) || 'null'); } catch { /* vide : le jeu d'origine */ }
  etat.apercu = true;
  appliquerReglages(lu?.config || null);
  const E = J.nouvelEtat(etat.c, 'Aperçu', 'apercu');
  E.atteinte = etat.c.etapes.length - 1;
  Object.assign(etat, { code: null, idEq: 'apercu', E, S: { etat: 'ouverte', config: lu?.config || null, chrono: null } });
  $('#retour-accueil').hidden = true;
  document.body.dataset.ecran = 'jeu';
  $('#app').innerHTML = `<div class="apercu-bande" role="status"><p><b>Aperçu enseignant·e</b> : le jeu tel que les équipes le
      voient, avec vos réglages. Rien n'est enregistré. Toutes les étapes sont ouvertes : touchez la barre du haut pour y aller.</p>
      <button class="btn btn--f btn--s" type="button" data-fermer-apercu>Fermer l'aperçu</button></div>` + gabarit();
  $('#equipe').textContent = 'Aperçu enseignant·e';
  rendre();
}

/* ------------------------------------------------------------ le rendu */

function rendre() {
  const { c, E } = etat;
  if (!E) return;
  if (E.fini && !ui.avisEnvoye && c.etapes[E.etape].id !== 'avis') return rendreFin();
  const vis = etapesVisibles();
  const e = c.etapes[E.etape];
  // Nouvelle étape : en haut de la page, et le focus sur son titre (le clavier et le lecteur d'écran
  // repartent du début de l'étape, pas du bouton « Continuer » resté en bas).
  let focusTitre = false;
  if (ui.rendue !== E.etape) { if (ui.rendue !== -1) { window.scrollTo({ top: 0 }); focusTitre = true; } ui.rendue = E.etape; }
  ui.compNeuf = E.comps > ui.compVu; ui.compVu = E.comps;   // un point de vue qui vient d'arriver se signale, une fois
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
  if (focusTitre) $('#titre').focus({ preventScroll: true });
  else if (actif) {
    const t = document.querySelector(`[data-rep="${CSS.escape(actif.id)}"]`);
    if (t) { t.focus(); try { t.setSelectionRange(actif.a, actif.b); } catch { /* vide */ } }
  }
  // Les gestes reconnus : le « Bravo » les annonce en jouant ; la liste entière attend le retour sur la démarche.
  // Les bravos de l'enseignant·e y figurent aussi, avec la question qu'ils saluent.
  const bravos = e.id === 'debrief' ? questionsBravo() : [];
  const mentions = e.id !== 'debrief' ? '' : `<div class="bloc"><h3>Ce que vous avez fait de bien</h3>
    ${E.mentions.length || bravos.length ? `<div class="mentions">${bravos.map((q) => `<div class="mention mention--ens">
      <span class="mention-i" aria-hidden="true">✦</span><span><b>Bravo de votre enseignant·e</b><span>« ${esc(q.eleve)} »</span></span></div>`).join('')}${
      E.mentions.map((id) => `<div class="mention${ui.nouvelles.includes(id) ? ' mention--neuve' : ''}"
      title="${esc(c.mentions[id].q)}"><span class="mention-i" aria-hidden="true">✦</span>
      <span><b>${esc(c.mentions[id].nom)}</b><span>${esc(c.mentions[id].court)}</span></span></div>`).join('')}</div>`
      : '<p class="hint">Aucun cette fois-ci : ils viennent en faisant, pas en réussissant.</p>'}</div>`;
  $('#carnet').innerHTML = typo([...(v.carnet || []).map((b) => b.brut ?? `<div class="bloc"><h3>${esc(b.t)}</h3>${b.h}</div>`), mentions].join(''));
  $('#carnet').hidden = !$('#carnet').innerHTML.trim();
  $('#corps').classList.toggle('seul', $('#carnet').hidden);
  majPied(v);
  $('#retour').hidden = E.etape === 0;
  annoncer(ui.nouvelles);
  ui.nouvelles = [];
}

/** Le temps qui reste à l'étape : discret, jamais bloquant ; ocre une fois le temps prévu dépassé. */
function majMinutes() {
  const { c, E, S } = etat;
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
  if (!bt || !etat.E) return;          // écran de fin : il n'y a plus de pied
  v ||= ECRANS[etat.c.etapes[etat.E.etape].id]();
  bt.textContent = v.btn + (v.fleche === false ? '' : ' →');
  bt.disabled = !v.peut;
  // Une réponse requise manque : la phrase sous le bouton devient un lien qui y mène.
  const manque = !v.peut && v.hint && reponseManquante();
  $('#hint').innerHTML = manque
    ? `<button type="button" class="lien lien-manque" data-aller="${esc(manque.id)}">${esc(v.hint)}</button>`
    : esc(v.hint || '');
}

Object.assign(page, { rendre, majPied });

/* ------------------------------------------------------------ les gestes */

function apres(nouvelles = []) { ui.nouvelles.push(...nouvelles); sauver(); rendre(); }

document.addEventListener('input', (ev) => {
  const t = ev.target.closest('[data-rep]');
  if (t && etat.E) {
    etat.E.reponses[t.dataset.rep] = t.value.slice(0, MAX_REPONSE);
    const k = document.querySelector(`[data-compte="${CSS.escape(t.dataset.rep)}"]`);
    if (k) k.textContent = `${t.value.length} / ${MAX_REPONSE}`;
    sauver(); majPied(); return;
  }
  const a = ev.target.closest('[data-avis-t]');
  if (a) ui.avis[a.dataset.avisT] = a.value;
});

document.addEventListener('click', async (ev) => {
  const { c, E, S, code } = etat;
  if (!E) return;
  if (ev.target.closest('[data-fermer-bravo]')) return fermerBravo();
  // fermer l'onglet de l'aperçu ; si le navigateur refuse, revenir à l'espace enseignant
  if (ev.target.closest('[data-fermer-apercu]')) { window.close(); setTimeout(() => { location.href = 'enseignant.html'; }, 300); return; }
  if (ev.target.closest('[data-imprimer-fin]')) return window.print();
  const al = ev.target.closest('[data-aller]');
  if (al) {
    const t = document.querySelector(`[data-rep="${CSS.escape(al.dataset.aller)}"]`);
    if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.focus({ preventScroll: true }); }
    return;
  }
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
  if (rl) {
    const i = Number(rl.dataset.releve), nouvelles = J.ouvrirReleve(c, E, i);
    ui.releveVu = i;   // le carnet montre CE relevé, même déjà lu
    dire(`Relevé ${i + 1}, ${c.releves[i].t} : ${c.releves[i].x}`);
    return apres(nouvelles);
  }
  const doc = ev.target.closest('[data-doc]');
  if (doc) { J.basculerDoc(E, doc.dataset.doc); return apres(); }
  if (ev.target.closest('[data-gespeg]')) return apres(J.basculerGespeg(E));
  const outil = ev.target.closest('[data-outil]');
  if (outil) { ui.outil = outil.dataset.outil; return rendre(); }
  const sect = ev.target.closest('[data-sect]');
  if (sect) {
    const r = J.peindre(c, E, sect.dataset.sect, ui.outil);
    if (r) { ui.effet = r.effet; direEffet(r.effet); }
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
    if (e.id === 'comp' && E.comps < c.complications.length) {
      E.comps += 1;
      const x = c.complications[E.comps - 1];
      dire(`Point de vue ${E.comps} sur ${c.complications.length}, ${x.t} : ${sansBalises(x.x)} ${sansBalises(x.quoi)}`);
      return apres();
    }
    if (e.id === 'debrief') {
      if (avisActif()) { J.allerA(c, E, idx('avis')); }
      else { J.allerA(c, E, E.etape); E.fini = true; }
      sauverTout(); return rendre();
    }
    if (e.id === 'avis') {
      if (!ui.avisEnvoye) {
        ui.avisEnvoye = true;
        const rep = Object.fromEntries(c.avis.map((q) => [q.id, String(ui.avis[q.id] ?? '').slice(0, 300)]));
        try { await donnees.ecrire(`${cheminSeance(code)}/avis/${crypto.randomUUID().slice(0, 12)}`, { ...rep, t: Date.now(), expireLe: expiration(S) }); }
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
  // un document ouvert avec « Lire » le reste quand l'écran se redessine (un autre document coché)
  const lu = ev.target.dataset?.lire;
  if (lu) { if (ev.target.open) ui.lus.add(lu); else ui.lus.delete(lu); return; }
  const { E } = etat;
  if (ev.target.id === 'd-sources' && ev.target.open && E && !E.mentions.includes('origine')) apres(J.mentionner(E, 'origine'));
}, true);

// la carte au clavier : secteurs et pastilles sont des boutons
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const cible = ev.target.closest && ev.target.closest('[data-sect],[data-releve]');
  if (!cible || !etat.E) return;
  ev.preventDefault();
  cible.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

// avant de quitter la page, on envoie ce qui attend
window.addEventListener('pagehide', () => sauver.maintenant());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sauver.maintenant(); });

demarrer();
