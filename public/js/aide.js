// aide.js — les bulles d'aide, la première fois.
//
// Une petite bulle à la fois, collée à ce qu'elle explique, quand cet élément
// apparaît à l'écran pour la première fois. Pas de voile, rien de bloqué : on
// peut jouer sans la lire. Un clic n'importe où, la flèche « → » ou Échap la ferme pour
// de bon ; « Arrêter l'aide » les coupe toutes. Le bouton « ? » en haut de la
// page les ramène.
//
// Seulement ce qui ne se devine pas : le reste de l'écran s'explique déjà seul.
// Et rien qui gâche un geste à découvrir (la carte avec ou sans Gespe'gewa'gi).
//
// Retenu dans ce navigateur seulement (localStorage) : rien n'est envoyé.
// Script classique, chargé avec « defer » sur chaque page.
(function () {
  var CLE = 'forillon:aide';
  var espace = document.body.getAttribute('data-espace') || 'accueil';

  // [identifiant, élément visé, texte] — dans l'ordre où on les montre
  var BULLES = {
    eleve: [
      ['el-prog', '#prog .prog-seg', 'Vos étapes. Touchez-en une pour y revenir.'],
      ['el-releve', '[data-releve]', 'Touchez un relevé pour l’ouvrir.'],
      ['el-rep', '[data-rep]', 'Écrit en équipe, enregistré tout seul.'],
      ['el-envoi', '#etat-envoi', 'Vert : l’enseignant·e a vos réponses.'],
      ['el-outil', '[data-outil]', 'Une zone, puis un secteur de la carte.']
    ],
    prof: [
      ['en-creer', '#creer', 'Donne le code à mettre au tableau.'],
      ['en-code', '#code-seance', 'Au tableau : les équipes l’entrent.'],
      ['en-equipe', '.eq[data-equipe]', 'Cliquez une équipe : ses réponses, et ✦ Bravo.'],
      ['en-signal', '[data-signal="temps"]', 'Un message sur l’écran de chaque équipe.'],
      ['en-reglages', '[data-onglet="reglages"]', 'Durée, questions, informations à mettre à jour : même en cours.'],
      ['en-dossier', '[data-onglet="dossier"]', 'Le dossier documentaire, à imprimer.'],
      ['en-rapport', '[data-rapport]', 'Imprimez-le avant d’effacer la séance.']
    ],
  };
  // une page sans bulle n'a pas non plus de bouton « ? » : rien à revoir
  if (!(BULLES[espace] || []).length) return;
  // pas de bulle pour expliquer le bouton « ? » lui-même : c'était souvent la première vue, avant ce qui compte
  var liste = BULLES[espace];

  /* ---- ce qui est déjà vu (et le stockage peut être bloqué : on garde en mémoire) */
  var etat = { vus: [], off: false };
  try { var l = JSON.parse(localStorage.getItem(CLE) || 'null'); if (l) etat = { vus: l.vus || [], off: !!l.off }; } catch (e) { /* vide */ }
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* cette page seulement */ } }
  function vu(id) { return etat.vus.indexOf(id) > -1; }

  /* ---- la bulle */
  var bulle = null, courante = null, attente = null, prochaine = 0;

  function visible(el) {
    if (!el || !el.getClientRects().length) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  }
  function cible() { return courante && document.querySelector(courante[1]); }

  function placer() {
    if (!bulle || bulle.hidden) return;
    var el = cible();
    if (!visible(el)) { bulle.style.visibility = 'hidden'; return; }
    bulle.style.visibility = '';
    var r = el.getBoundingClientRect(), b = bulle.getBoundingClientRect(), m = 16, ecart = 12;
    var dessous = r.bottom + ecart + b.height < innerHeight - 8 || r.top - ecart - b.height < 8;
    var top = dessous ? r.bottom + ecart : r.top - ecart - b.height;
    var centre = r.left + r.width / 2;
    var left = Math.max(m, Math.min(innerWidth - m - b.width, centre - b.width / 2));
    bulle.style.top = Math.round(top) + 'px';
    bulle.style.left = Math.round(left) + 'px';
    bulle.setAttribute('data-cote', dessous ? 'dessous' : 'dessus');
    bulle.style.setProperty('--fleche', Math.round(Math.max(18, Math.min(b.width - 18, centre - left))) + 'px');
  }

  function montrer(b) {
    courante = b;
    if (!bulle) {
      bulle = document.createElement('div');
      bulle.className = 'aide-bulle';
      bulle.setAttribute('role', 'dialog');
      bulle.setAttribute('aria-modal', 'false');
      bulle.setAttribute('aria-live', 'polite');
      bulle.setAttribute('aria-label', 'Aide');
      // pas de « OK » (conseil de l'experte UI/UX : un bouton dit ce qu'il fait) : une flèche, et où l'on en est
      bulle.innerHTML = '<p class="aide-t"></p><div class="aide-a"><span class="aide-n"></span>'
        + '<button type="button" class="aide-stop">Arrêter l’aide</button>'
        + '<button type="button" class="aide-ok" aria-label="Continuer" title="Continuer"><span aria-hidden="true">→</span></button></div>';
      bulle.querySelector('.aide-ok').addEventListener('click', function () { fermer(true); });
      bulle.querySelector('.aide-stop').addEventListener('click', function () { etat.off = true; garder(); fermer(true); });
      document.body.appendChild(bulle);
    }
    bulle.setAttribute('data-bulle', b[0]);
    bulle.querySelector('.aide-t').textContent = b[2];
    // la progression : combien de bulles de la page sont déjà lues (elles viennent quand leur élément apparaît, pas dans l'ordre)
    var lues = liste.filter(function (x) { return vu(x[0]); }).length;
    bulle.querySelector('.aide-n').textContent = (lues + 1) + ' sur ' + liste.length;
    bulle.hidden = false;
    placer();
  }

  function fermer(marquer) {
    if (!bulle || bulle.hidden) return;
    if (marquer && courante && !vu(courante[0])) { etat.vus.push(courante[0]); garder(); }
    bulle.hidden = true;
    courante = null;
    prochaine = Date.now() + 700;   // un temps entre deux bulles : jamais en rafale
    plusTard(750);
  }

  function suivante() {
    if (etat.off || document.body.classList.contains('imprime')) return;
    if (bulle && !bulle.hidden) return placer();
    if (Date.now() < prochaine) return plusTard(prochaine - Date.now() + 20);
    for (var i = 0; i < liste.length; i++) {
      if (vu(liste[i][0])) continue;
      if (visible(document.querySelector(liste[i][1]))) return montrer(liste[i]);
    }
  }
  function plusTard(ms) { clearTimeout(attente); attente = setTimeout(suivante, ms); }

  /* ---- le bouton « ? » : revoir l'aide de cette page */
  function monterBouton() {
    var z = document.querySelectorAll('[data-theme-ici]');
    for (var i = 0; i < z.length; i++) {
      if (z[i].querySelector('[data-aide]')) continue;
      var bt = document.createElement('button');
      // le « ? » seul (une icône suffit, conseil de l'experte UI/UX) ; son nom en infobulle : une bulle fermée par
      // erreur (ou « Arrêter l'aide ») se retrouve ici
      bt.type = 'button'; bt.className = 'aide-b';
      // « Guide de cette page », pas « Revoir » : on peut ne l'avoir jamais vu (experte UI/UX)
      bt.innerHTML = '<span aria-hidden="true">?</span><span class="aide-b-t">Guide de cette page</span>';
      bt.setAttribute('data-aide', '');
      bt.setAttribute('aria-label', 'Guide de cette page');
      bt.title = 'Guide de cette page';
      z[i].appendChild(bt);
    }
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-aide]')) return;
    var ici = liste.map(function (b) { return b[0]; });
    etat.vus = etat.vus.filter(function (id) { return ici.indexOf(id) < 0; });
    etat.off = false; garder();
    fermer(false); prochaine = 0; plusTard(50);
  });

  // un clic ailleurs ferme la bulle (lue ou pas : elle ne reviendra pas)
  document.addEventListener('pointerdown', function (e) {
    if (bulle && !bulle.hidden && !bulle.contains(e.target) && !(e.target.closest && e.target.closest('[data-aide]'))) fermer(true);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(true); });
  addEventListener('resize', placer);
  addEventListener('scroll', function () { if (bulle && !bulle.hidden) placer(); else plusTard(250); }, { passive: true, capture: true });

  function demarrer() {
    monterBouton();
    // les pages se dessinent en JavaScript : on guette l'arrivée des éléments
    new MutationObserver(function () { monterBouton(); if (bulle && !bulle.hidden) placer(); else plusTard(300); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    plusTard(900);
  }
  // après theme.js, qui remplit [data-theme-ici] au même moment
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
