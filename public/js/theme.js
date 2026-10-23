// theme.js — l'affichage : comme l'ordinateur (par défaut), clair, sombre ou contraste élevé.
//
// Chargé dans <head>, avant le reste : la page s'affiche tout de suite dans le
// bon thème, sans éclair blanc. Script classique (pas un module) pour cette raison.
//
// Par défaut : comme l'ordinateur (choix d'Ana, après le premier essai).
// « Comme l'ordinateur » (auto) suit l'ordinateur : sombre s'il est en mode sombre,
// contraste élevé s'il demande plus de contraste, clair sinon. Le choix reste dans ce
// navigateur seulement (localStorage) : rien n'est envoyé, rien n'est lié à l'équipe.
//
// Le thème effectif est posé sur <html data-theme="light|dark|contrast"> ;
// le choix de la personne sur <html data-theme-choix="auto|light|dark|contrast">.
(function () {
  var CLE = 'forillon:theme';
  var CHOIX = [['auto', 'Comme l’ordinateur'], ['light', 'Clair'], ['dark', 'Sombre'], ['contrast', 'Contraste élevé']];
  var mm = function (q) { try { return window.matchMedia(q); } catch (e) { return null; } };
  var sombre = mm('(prefers-color-scheme: dark)');
  var plus = mm('(prefers-contrast: more)');

  var memoire = null;   // si le navigateur bloque le stockage, le choix tient le temps de la page
  function lire() {
    var t = memoire;
    if (t == null) try { t = localStorage.getItem(CLE); } catch (e) { /* stockage bloqué : automatique */ }
    for (var i = 0; i < CHOIX.length; i++) if (CHOIX[i][0] === t) return t;
    return 'auto';   // par défaut : comme l'ordinateur (clair, sombre ou plus de contraste)
  }
  function effectif(choix) {
    if (choix !== 'auto') return choix;
    if (plus && plus.matches) return 'contrast';
    return sombre && sombre.matches ? 'dark' : 'light';
  }
  function appliquer() {
    var choix = lire(), r = document.documentElement, t = effectif(choix);
    // pendant l'impression du rapport, le papier reste clair (voir enseignant/rapport.js)
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
  // une icône, pas de texte (conseil de l'experte UI/UX) : elle montre l'affichage choisi ; la liste garde ses libellés
  var ICONES = {
    auto: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'
  };
  function monter() {
    var z = document.querySelectorAll('[data-theme-ici]');
    for (var i = 0; i < z.length; i++) {
      z[i].innerHTML = '<label class="theme-c" title="Affichage">'
        + CHOIX.map(function (c) {
          return '<svg class="theme-i theme-i--' + c[0] + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONES[c[0]] + '</svg>';
        }).join('')
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
