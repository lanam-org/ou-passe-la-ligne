// relais.js — les pages relais de l'espace enseignant (enseignant/…/index.html) : l'adresse
// …/enseignant/preparer/deroulement/ ouvre l'espace enseignant sur cet onglet (data-onglet de la page).
const onglet = document.documentElement.dataset.onglet;
location.replace(new URL(`../enseignant.html${onglet ? `?onglet=${encodeURIComponent(onglet)}` : ''}${location.hash}`,
  document.currentScript.src).href);
