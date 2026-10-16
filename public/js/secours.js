// secours.js — quand quelque chose ne marche pas, le dire en clair.
//
// Les pages se dessinent en JavaScript. Si un fichier manque, si le filtre du
// réseau de l'école bloque une adresse (le code de Firebase, par exemple) ou si
// la base refuse une écriture, personne ne doit rester devant un « Chargement… »
// sans fin ou un bouton qui ne fait rien :
//   · la page n'a pas pu démarrer : le « Chargement… » (marqué data-chargement)
//     devient un message, avec quoi faire et un bouton pour recharger ;
//   · une action n'a pas abouti plus tard : une bande discrète le dit, quelques secondes.
//
// Rien n'est envoyé nulle part : le message reste sur cet écran.
// Script classique, chargé avec « defer » sur les pages qui ont un module.
(function () {
  var DELAI_DEMARRAGE = 25000;   // un réseau d'école lent a le temps de tout charger
  var bande = null, minuterie = null;

  function enChargement() { return document.querySelector('[data-chargement]'); }

  function echecDemarrage() {
    var z = enChargement();
    if (!z) return;
    var boite = document.createElement('div');
    boite.className = 'secours-demarrage';
    boite.setAttribute('role', 'alert');
    boite.innerHTML = '<p><b>Le site n’a pas pu démarrer sur cet appareil.</b></p>'
      + '<p>Vérifiez la connexion à Internet, puis rechargez la page. Si le problème revient à l’école, '
      + 'le filtre du réseau bloque peut-être une adresse dont le site a besoin : la liste est dans '
      + '<a href="confidentialite.html#reseau">Confidentialité et à propos</a>, pour le service informatique.</p>'
      + '<div class="p-actions"><button class="btn" type="button">Recharger la page</button></div>';
    boite.querySelector('button').addEventListener('click', function () { location.reload(); });
    z.replaceWith(boite);
  }

  function echecAction() {
    if (!bande) {
      bande = document.createElement('div');
      bande.className = 'secours';
      bande.setAttribute('role', 'alert');
      bande.innerHTML = '<span>Une action n’a pas abouti. Vérifiez la connexion, puis réessayez.</span>'
        + '<button type="button">OK</button>';
      bande.querySelector('button').addEventListener('click', function () { bande.hidden = true; });
      document.body.appendChild(bande);
    }
    bande.hidden = false;
    clearTimeout(minuterie);
    minuterie = setTimeout(function () { bande.hidden = true; }, 10000);
  }

  function probleme(message) {
    // bruit connu des navigateurs, sans conséquence pour la page
    if (/ResizeObserver loop/.test(String(message || ''))) return;
    if (enChargement()) echecDemarrage(); else echecAction();
  }

  window.addEventListener('error', function (e) { probleme(e.message); });
  window.addEventListener('unhandledrejection', function (e) { probleme(e.reason && e.reason.message); });
  // un module qui ne se charge pas (fichier introuvable, adresse bloquée) : l'erreur
  // reste sur la balise <script>, elle ne remonte pas jusqu'à window
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'SCRIPT' && enChargement()) echecDemarrage();
  }, true);
  setTimeout(function () { if (enChargement()) echecDemarrage(); }, DELAI_DEMARRAGE);
})();
