# Les versions du site

Les testeurs voient toujours la **dernière version publiée**, à l'adresse principale du site. Chaque version
reste aussi en ligne, figée, à sa propre adresse (par exemple `…/ou-passe-la-ligne/playtest-0/`) : un lien à donner
pour une séance d'essai précise, qui ne changera jamais. Le travail en cours est à `…/ou-passe-la-ligne/dev/`, avec
une bande « version en cours de développement ». La version s'affiche en bas de chaque page.

Une version publiée = une étiquette git `playtest-N`, dont le message est le titre de la version. La version en
préparation est le titre « … · en préparation » ci-dessous : `…/dev/` l'affiche. Publier : README, « Versions ».

## Playtest 1 — avec les professeurs · en préparation

À `…/dev/` seulement : pas encore publiée. Retours des premiers essais avec des enseignant·es, et de la rencontre
avec Chantal et Alexandra :

- **Clé en main d'abord (« less is more »)** : l'onglet Réglages montre la durée ; minutes, questions une à une,
  ajouts, corrections et partage attendent sous « Réglages avancés ». À l'accueil, « Plus d'outils » ; en direct,
  le message écrit et le minutage détaillé sont repliés ; le groupe « pour la recherche » se replie. Rien n'est retiré.
- **Aperçu élève** : voir le jeu comme une équipe, avec ses réglages, sans séance ni équipe ; rien n'est enregistré.
- **Trouver ses fonctions** : chaque question (onglet Questions) et chaque document (onglet Dossier) mène à son
  réglage (« Rendre facultative ou retirer », « Corriger ce texte ») ; l'étiquette d'état d'une question aussi ;
  recherche d'un mot ou d'un chiffre à corriger ; trois choix visibles « Requise / Facultative / Retirée ».
- **Navigation** : onglets dans l'ordre d'une séance, titrés (Avant la classe · Pendant la classe · Après, pour la
  recherche) ; « ← Vos séances » au début ; la démonstration sous « Créer la séance » ; le « ✦ Bravo » annoncé.
- **Le ton** : l'espace enseignant dit « vous » ; « Dossier complet, version enseignant·e », « dossier élève ».
- **Dossier documentaire** : documents de terrain (les relevés, étape 2) et documents du dossier (étape 3).
- **Versions** : l'adresse principale ne bouge plus à chaque modification ; `…/dev/` montre le travail en cours ;
  la version s'affiche en bas de chaque page.
- **Retours de l'experte UI/UX (Alexandra)** :
  - accueil : « Où passe la ligne ? », une grande image, une couleur et une icône pour chaque porte, l'affichage et le
    guide en icônes, l'avis sur les données à côté de « Confidentialité » ;
  - plus de tirets cadratins dans les textes ; « Espace enseignant » ;
  - le chrono en lecteur de musique (gros bouton démarrer / pause, −5 / +5, terminer l'étape), plus gros, sur un fond
    à lui ; le code de la séance plus gros ; lien et copie en icônes ; les messages en bulles ;
  - onglets « Préparer · Animer · Pour la recherche », « Rétroaction » au lieu de « Débrief » ;
  - deux durées (Standard ou Sur mesure), le questionnaire en interrupteur, « Historique », des vignettes pour
    préparer la séance, des icônes d'imprimante ;
  - « Mettre à jour les informations », Q2.1 au lieu de F2.1, une légende des états de question, une seule « forme »
    pour une question ajoutée, le total au bout des minutes ;
  - bulles du guide : une flèche et « 2 sur 7 » au lieu de « OK » ;
  - côté équipe : une bannière à l'arrivée, l'animal de l'équipe à la fin.

## Playtest 0 — avec les professeurs · 17 octobre 2026

Étiquette `playtest-0` (commit `89dc85a`). La version des premiers essais avec des enseignant·es : le jeu complet
en sept étapes (Forillon, 1970) et l'espace enseignant·e, en version de démonstration.

- séance par code ou code QR, suivi en direct, messages à la classe, chrono, « ✦ Bravo », débrief, rapport imprimable ;
- réglages de durée (35, 50, 100 min ou sur mesure), de questions et de corrections ; version du jeu de l'enseignant·e ;
- dossier documentaire (dossier élève et dossier complet) ; trousse d'essai (« Démarrer en 5 minutes », grille
  d'observation) ; fiche pour l'école (ÉFVP) ;
- réponses attendues jamais lisibles par les équipes ; accessibilité vérifiée (WCAG 2.2 AA) ; images temporaires.
