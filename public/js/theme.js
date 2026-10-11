// theme.js — l'affichage : automatique, clair, sombre ou contraste élevé.
//
// Chargé dans <head>, avant le reste : la page s'affiche tout de suite dans le
// bon thème, sans éclair blanc. Script classique (pas un module) pour cette raison.
//
// « Automatique » suit l'ordinateur : sombre s'il est en mode sombre, contraste
// élevé s'il demande plus de contraste, clair sinon. Le choix reste dans ce
// navigateur seulement (localStorage) : rien n'est envoyé, rien n'est lié à l'équipe.
//
// Le thème effectif est posé sur <html data-theme="light|dark|contrast"> ;
// le choix de la personne sur <html data-theme-choix="auto|light|dark|contrast">.
(function () {
  var CLE = 'forillon:theme';
  var CHOIX = [['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre'], ['contrast', 'Contraste élevé']];
  var mm = function (q) { try { return window.matchMedia(q); } catch (e) { return null; } };
  var sombre = mm('(prefers-color-scheme: dark)');
  var plus = mm('(prefers-contrast: more)');

  var memoire = null;   // si le navigateur bloque le stockage, le choix tient le temps de la page
  function lire() {
    var t = memoire;
    if (t == null) try { t = localStorage.getItem(CLE); } catch (e) { /* stockage bloqué : automatique */ }
    for (var i = 0; i < CHOIX.length; i++) if (CHOIX[i][0] === t) return t;
    return 'auto';
  }
  function effectif(choix) {
    if (choix !== 'auto') return choix;
    if (plus && plus.matches) return 'contrast';
    return sombre && sombre.matches ? 'dark' : 'light';
  }
  function appliquer() {
    var choix = lire(), r = document.documentElement, t = effectif(choix);
    // pendant l'impression du rapport, le papier reste clair (voir enseignant.js)
    if (document.body && document.body.classList.contains('imprime')) { r.setAttribute('data-theme-choix', choix); return; }
    if (r.getAttribute('data-theme') !== t) {
      // changer d'affichage d'un coup : pas de fondu de couleurs d'un thème à l'autre
      r.classList.add('sans-transition');
      r.setAttribute('data-theme', t);
      setTimeout(function () { r.classList.remove('sans-transition'); }, 60);
    }
    r.setAttribute('data-theme-choix', choix);
  }
  function synchro() {
    var l = document.querySelectorAll('select[data-theme-select]');
    for (var i = 0; i < l.length; i++) l[i].value = lire();
  }
  function monter() {
    var z = document.querySelectorAll('[data-theme-ici]');
    for (var i = 0; i < z.length; i++) {
      z[i].innerHTML = '<label class="theme-c"><span>Affichage</span>'
        + '<select data-theme-select aria-label="Affichage : thème de couleurs">'
        + CHOIX.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('')
        + '</select></label>';
    }
    synchro();
  }

  appliquer();
  [sombre, plus].forEach(function (m) {
    if (m && m.addEventListener) m.addEventListener('change', appliquer);
    else if (m && m.addListener) m.addListener(appliquer);
  });
  // un autre onglet du même navigateur a changé d'affichage
  window.addEventListener('storage', function (e) { if (e.key === CLE) { memoire = null; appliquer(); synchro(); } });
  document.addEventListener('change', function (e) {
    var s = e.target;
    if (!s || !s.matches || !s.matches('[data-theme-select]')) return;
    memoire = s.value;
    try { localStorage.setItem(CLE, s.value); } catch (err) { /* le choix vaut pour cette page seulement */ }
    appliquer(); synchro();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter);
  else monter();
  window.forillonTheme = { appliquer: appliquer };
})();
