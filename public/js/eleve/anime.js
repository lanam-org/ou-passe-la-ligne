// eleve/anime.js — un peu de mouvement côté équipe, inspiré de Kahoot, mais sans score ni course :
// une carte d'entrée (l'animal de l'équipe), une carte au début de chaque étape, des confettis pour un bravo.
//
// Tout est décoratif (aria-hidden) : le titre de l'étape et les annonces restent lus comme avant. Rien ne bloque
// un clic (pointer-events: none), et rien ne bouge si l'appareil demande moins d'animations.

import { esc } from '../outils.js';

export const calme = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

function carte(html, cls, ms) {
  if (calme()) return;
  document.querySelectorAll(`.anim-carte.${cls}`).forEach((x) => x.remove());
  const d = document.createElement('div');
  d.className = `anim-carte ${cls}`;
  d.setAttribute('aria-hidden', 'true');
  d.innerHTML = `<div>${html}</div>`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), ms);
}

/** L'équipe vient d'entrer : son animal, en grand, un instant. */
export const carteEntree = (emoji, nom) =>
  carte(`<p class="anim-e">${emoji || ''}</p><p class="anim-t">C'est parti</p><p class="anim-s">Équipe ${esc(nom)}</p>`, 'anim-carte--entree', 2700);

/** Une nouvelle étape : son numéro et son titre, le temps d'un coup d'œil. */
export const carteEtape = (n, titre) =>
  carte(`<p class="anim-n">Étape ${esc(n)}</p><p class="anim-t">${esc(titre)}</p>`, 'anim-carte--etape', 1600);

/** Des confettis, pour un bravo (couleurs des tuiles de réponse). */
export function confettis(n = 60) {
  if (calme()) return;
  const z = document.createElement('div');
  z.className = 'confettis';
  z.setAttribute('aria-hidden', 'true');
  const couleurs = ['#E21B3C', '#7A3E9D', '#D89E00', '#26890C', '#0C7365', '#F2C46B'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = couleurs[i % couleurs.length];
    s.style.animationDelay = `${Math.random() * 0.3}s`;
    s.style.animationDuration = `${1.4 + Math.random() * 0.9}s`;
    s.style.setProperty('--dx', `${Math.round((Math.random() * 2 - 1) * 120)}px`);
    s.style.setProperty('--r', `${Math.round(Math.random() * 720)}deg`);
    z.appendChild(s);
  }
  document.body.appendChild(z);
  setTimeout(() => z.remove(), 2800);
}

/** Un bouton qui vient de se débloquer (« Continuer ») : un petit saut, une fois. */
export function sautiller(el) {
  if (!el || calme()) return;
  el.classList.remove('pret');
  void el.offsetWidth;   // relancer l'animation
  el.classList.add('pret');
}
