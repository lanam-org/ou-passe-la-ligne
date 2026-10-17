// imprimer.js — un bouton « Imprimer » sur une page d'information (ecoles.html).
// La politique de sécurité (CSP) refuse les scripts écrits dans la page : d'où ce petit fichier.

document.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-imprimer-page]')) window.print();
});
