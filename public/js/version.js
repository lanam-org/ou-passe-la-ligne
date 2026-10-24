// version.js — la version du site, en bas de chaque page : les testeurs la citent dans leurs retours.
//
// VERSION est remplacée à la mise en ligne (outils/assembler_versions.sh) : « Playtest 0 — avec les professeurs »
// pour une version publiée, « dev · Playtest 1 — … en préparation · 1a2b3c4 » pour le travail en cours (…/dev/).
// Cette version-là affiche aussi une bande en haut de page,
// pour ne jamais la confondre avec celle que voient les testeurs. Sur l'ordinateur de travail : « locale ».
(function () {
  var VERSION = 'locale';
  window.FORILLON_VERSION = VERSION;
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-version]').forEach(function (z) { z.textContent = 'Version ' + VERSION; });
    if (VERSION.indexOf('dev') !== 0) return;
    var bande = document.createElement('p'), fort = document.createElement('b');
    bande.className = 'bande-dev';
    fort.textContent = 'Version en cours de développement';
    bande.append(fort);
    document.body.insertBefore(bande, document.body.firstChild);
  });
})();
