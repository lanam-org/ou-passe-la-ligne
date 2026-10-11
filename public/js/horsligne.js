// horsligne.js — quand le Wi-Fi décroche, le jeu continue.
//
// 1. Inscrit sw.js, qui garde une copie du site dans ce navigateur : une page
//    rechargée sans réseau s'ouvre quand même (voir sw.js).
// 2. Affiche un bandeau tant que l'appareil est hors ligne, pour que personne
//    ne s'inquiète : ce que l'équipe fait est gardé, et part au retour du réseau.
//
// Script classique, chargé avec « defer » sur chaque page.
(function () {
  var sur = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if ('serviceWorker' in navigator && sur) {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Copie hors ligne indisponible', e); });
  }

  var bandeau = null;
  var racine = document.documentElement;
  function hauteur() {
    if (bandeau && !bandeau.hidden) racine.style.setProperty('--hors-ligne-h', bandeau.offsetHeight + 'px');
    else racine.style.removeProperty('--hors-ligne-h');
  }
  function maj() {
    if (navigator.onLine) { if (bandeau) bandeau.hidden = true; return hauteur(); }
    if (!bandeau) {
      bandeau = document.createElement('p');
      bandeau.className = 'horsligne';
      bandeau.setAttribute('role', 'status');
      bandeau.textContent = 'Hors ligne. Le jeu continue sur cet appareil ; ce que vous faites part dès que le réseau revient.';
      document.body.appendChild(bandeau);
    }
    bandeau.hidden = false;
    hauteur();
  }
  window.addEventListener('online', maj);
  window.addEventListener('offline', maj);
  window.addEventListener('resize', hauteur);
  maj();
})();
