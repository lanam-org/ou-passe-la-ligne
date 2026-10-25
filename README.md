# Où passe la ligne — le site

Un jeu de géographie en équipe pour le 1er cycle du secondaire : tracer la limite d'une aire protégée
à Forillon, en 1970, puis voir l'information arriver. Par défaut, une période de 50 minutes ; l'enseignant·e
peut aussi choisir 35 minutes, deux périodes (100 minutes) ou une durée sur mesure, et tout régler.

Prototype de recherche, en prévalidation : le contenu et les questions sont encore discutés,
et une image « temporaire » marque la place des images à venir.

**Essayer en ligne** : la page GitHub Pages de ce dépôt (lien dans la colonne « About »). C'est le mode
démonstration : tout reste dans le navigateur de la personne qui essaie, rien n'est envoyé nulle part.

| Page | Pour qui | Ce qu'on y fait |
|---|---|---|
| `index.html` | tout le monde | Choisir : équipe ou enseignant·e |
| `eleve.html` | une équipe, un Chromebook | Entrer le code, choisir un nom d'animal, jouer les 7 étapes : Arriver, Faire le portrait du territoire, Se questionner, Prendre position, D'autres points de vue, La décision de 1970, Revenir sur sa démarche |
| `dossier.html` | les élèves, avant la séance | Le dossier élève (le dossier documentaire à lire avant la séance) : le portrait et les documents, sans les surprises ; imprimable |
| `enseignant.html` | l'enseignant·e | Se connecter (Google, facultatif), retrouver ses séances, en créer une, suivre en direct, afficher le code et son code QR, chrono de classe, envoyer un message, réglages, débrief, questions, dossier documentaire, mesures, rapport imprimable, trousse d'essai (« Démarrer en 5 minutes », grille d'observation) |
| `confidentialite.html` | tout le monde (parents, écoles, service informatique) | Ce que le site enregistre, pourquoi, où, combien de temps ; la responsable et ses coordonnées ; les droits ; les adresses à autoriser dans le filtre de l'école. Liée en bas de chaque page |
| `ecoles.html` | la direction, la ou le responsable de la vie privée, le service informatique | La fiche pour l'école : les éléments factuels d'une ÉFVP (inventaire des données, cycle de vie, fournisseurs et lieux, sécurité, risques), imprimable. Liée depuis Confidentialité et l'accueil de l'espace enseignant·e |

## Le dossier documentaire

Le jeu ne dépend d'aucun lien extérieur : chaque relevé, document, point de vue et bloc de la décision de 1970 garde,
dans `forillon.json`, la phrase exacte de sa source (`copie`, avec sa traduction si elle est en anglais), le lien et la date
de vérification. Dans le jeu, chaque relevé, verdict et point de vue donne le lien de sa source.

- Onglet « Dossier » (espace enseignant·e) : tout le dossier, surprises signalées ; impression complète ou dossier élève.
- D'avance, sans créer de séance : l'accueil de l'espace enseignant·e, « Avant la séance » → « Imprimer le dossier
  élève » (sans les surprises ni les pastilles) ou « Dossier complet, version enseignant·e ». La version du jeu de l'enseignant·e
  (ses corrections) s'y applique.
- `dossier.html?code=XXXXX` : le dossier élève, avec les corrections de la séance. Les éléments marqués `surprise`
  (ceux qui servent à contredire ce que l'équipe croyait) n'y sont jamais.
- Pastilles : à quelle question sert chaque document (`sert`), dans la couleur de sa famille (`dossier.questions`).
  L'identifiant est toujours écrit. Elles révèlent quels documents servent : le dossier élève les cache par défaut.

## Ce que l'enseignant·e peut régler

Dans l'onglet « Réglages » d'une séance, avant ou pendant la partie (« Appliquer à la séance »). Un sommaire en haut
mène à chaque section ; les onglets Questions et Dossier y mènent aussi, ouverts au bon endroit :

- La durée. Trois formats : courte (35 min), standard (50 min, par défaut), deux périodes (100 min, les
  28 questions, coupure après le tracé) ; ou « Sur mesure » : la durée totale tapée à l'accueil, répartie
  comme le standard, puis l'onglet Réglages s'ouvre pour choisir les questions. Ensuite chaque étape à la
  minute près. En direct, « +5 min », « −5 min » (jusqu'à 1 min) ou « Terminer l'étape maintenant » pour
  l'étape où se trouvent la plupart des équipes.
- Les questions. Chacune des 28 questions de la banque : requise, facultative ou retirée, trois choix visibles
  (et, sous chaque question de l'onglet Questions, « Rendre facultative ou retirer »). Et jusqu'à
  douze questions ajoutées (écrites en équipe ou orales au débrief). Une équipe déjà plus loin retrouve
  une nouvelle question requise dans « À rattraper ». Une réponse déjà écrite n'est jamais effacée.
- Corriger un texte ou un chiffre du jeu. Un chiffre, un texte ou une source se corrige, avec sa raison ;
  l'original est gardé et « Rétablir l'original » le remet. « Chercher un mot ou un chiffre » (« 983 ») ouvre le bon
  texte ; « Corriger ce texte », sous chaque document de l'onglet Dossier et chaque question, mène au bon champ.
- Le chrono. Il démarre avec la première équipe et avance à la seconde ; Pause, Reprendre, Remettre à
  zéro ; « Le détail, étape par étape » donne les minutes et le nombre de questions de chaque étape.
  Chaque équipe voit le temps qui reste à son étape (en ocre une fois dépassé, sans jamais bloquer).
- Les messages à la classe : « 5 minutes restantes », « 2 minutes restantes », « Pause », « Bloqués ?
  Levez la main », « Au retour en classe », ou un message écrit (140 caractères, affiché tel quel).

« Votre version du jeu » (à l'accueil, ou « Enregistrer aussi comme votre version ») garde ces réglages et les
reprend à chaque nouvelle séance. « Exporter (JSON) » sort les questions ajoutées et les corrections, sans
aucune donnée d'élève, pour les intégrer ensuite à `forillon.json`.

## Les images : à venir

`images = false` dans `public/js/config.js` : la carte dessinée et la garde-parc attendent leurs vraies images
(prévalidation du contenu). À leur place, toujours la même image, `public/images/temporaire.png` (« TEMPORAIRE ») :
dans le cadre « Carte à venir », sous les boutons, à la largeur du cadre ; à la place du portrait de la garde-parc,
assez grande pour se lire. Mise à l'échelle de sa place, jamais rognée ni déformée (le test le vérifie). La carte
reste jouable : les relevés et les sept secteurs deviennent de simples boutons, avec les mêmes gestes et les mêmes
mesures. `images = true` ramène les dessins. Test : `node outils/verifier_site.mjs images`.

## L'affichage : clair, sombre, contraste élevé

En haut de chaque page, le menu « Affichage » : Comme l'ordinateur (par défaut : suit le mode sombre
et « plus de contraste »), Clair, Sombre, Contraste élevé. Le choix reste dans ce navigateur seulement ;
rien n'est envoyé. Le rapport s'imprime toujours en clair. Deux ambiances : la page des équipes, plus
vive et plus verte ; l'espace enseignant·e, plus terne (en clair et en sombre ; le contraste élevé ne
change pas). Le nom du site et « ← Accueil », en haut, ramènent à l'accueil.

À l'impression (rapport de séance, dossier documentaire, questionnaire papier) : un style neutre,
noir et gris, filets fins, aucun aplat de couleur. Seules restent les couleurs qui portent un sens
(zones de la carte, avec leur motif ; familles de questions du dossier, avec leur identifiant écrit).

- Clair et sombre : tout texte ≥ 4,5:1 (WCAG AA). Contraste élevé : noir sur blanc, tout texte ≥ 7:1 (AAA).
- Contours des champs et boutons ≥ 3:1 dans les trois affichages.
- Windows en contraste élevé (couleurs forcées) : la carte garde ses zones.
- `python outils/verifier_contrastes.py` recalcule chaque paire texte / fond depuis `site.css`.

## Les polices : sur le site

Atkinson Hyperlegible Next et Mono vivent dans `public/polices/` (66 Ko, licence libre OFL : `polices/OFL.txt`),
déclarées en tête de `site.css`. Aucune page ne demande rien à Google Fonts : l'adresse IP d'un élève ne part
pas chez Google juste pour afficher du texte. Le test vérifie qu'aucune page n'y fait appel.

## Lancer le site sur ton ordinateur

Double-clique `demarrer.bat`. Le site s'ouvre sur `http://localhost:8080`.

Il faut Python (python.org) ou l'extension « Live Server » de VS Code. Un double-clic
sur `index.html` ne suffit pas : les navigateurs refusent les modules JavaScript
ouverts comme un simple fichier.

### Jouer une démonstration, sans compte

Tant que `public/js/config.js` est vide, le site est en **mode local** (bandeau jaune).
Tout reste dans ton navigateur.

1. Onglet 1 : `enseignant.html` → « Créer la séance ». Note le code.
2. Onglets 2, 3… : `eleve.html` → le code → un nom d'équipe.
3. Joue dans les onglets d'équipe ; l'onglet enseignant·e suit en direct.

Utilise des onglets normaux, pas des fenêtres privées.

### La séance de démonstration

En mode local, l'accueil de l'espace enseignant·e propose « Ouvrir une séance de démonstration » :
une séance de 75 minutes déjà en cours depuis 40 minutes, avec quatre équipes à des endroits
différents (une au retour sur la démarche, une aux points de vue, une bloquée au-delà du temps prévu,
une arrivée en retard). Pour montrer le suivi en direct, le débrief, les mesures et le rapport sans
faire jouer quatre onglets. Les états sont produits par les vraies règles du jeu (`public/js/demo.js`) ;
les réponses sont inventées. En ligne avec Firebase, ce bouton n'apparaît pas : les règles interdisent,
avec raison, à l'enseignant·e d'écrire la fiche d'une équipe.

## Féliciter une bonne réponse : le « bravo » de l'enseignant·e

Les réponses écrites sont libres : aucune machine ne peut dire, à coup sûr, si elles sont bonnes. C'est
donc l'enseignant·e qui félicite, comme dans ClassDojo (des retours positifs donnés par l'adulte) et
Nearpod (une bonne réponse mise en lumière devant la classe), sans points ni classement :

- En direct, dans le détail d'une équipe, « ✦ Bravo » sous une réponse. Un second clic le reprend.
- L'équipe le voit tout de suite, à n'importe quelle étape : une bulle « Bravo de votre enseignant·e »
  qui nomme la question, puis une marque ✦ sur la réponse ; au retour sur la démarche, il rejoint
  « Ce que vous avez fait de bien ».
- Au débrief, les réponses saluées passent en premier, marquées ✦, prêtes à être projetées ;
  le rapport imprimé les marque aussi.
- Rangé dans la séance (`bravos`, une date par équipe et par question) : il part avec elle.

## La trousse d'essai

Pour un essai du jeu (playtest), deux pages à imprimer depuis l'accueil de l'espace enseignant·e (« Avant la séance ») :

- **Démarrer en 5 minutes** : une page pour l'enseignant·e qui découvre le jeu, de la création de la séance à
  l'effacement, et où trouver le reste (onglets).
- **La grille d'observation**, pour la personne qui observe : les « À observer » de chaque étape (Oui, Non,
  Pas vu, notes), les fonctions que l'enseignant·e doit trouver seul·e (Seul·e, Avec aide, Pas trouvée), le plan
  de mesure (qui mesure quoi : le site, l'observation ou le questionnaire), et quatre questions pour l'entretien
  d'après. Aucun prénom d'élève. Aussi imprimable depuis l'onglet « Déroulement » d'une séance ouverte.

Les deux se construisent à partir du contenu (`observer`, `plan`) et des réglages (durées, format) : rien à
mettre à jour à la main. Le test les imprime en PDF dans `outils/captures/`.

## Retours d'essai, pris en compte

Les essais avec des enseignant·es (18 fonctions à trouver seul·e, la liste de la grille d'observation) ont changé :
- clé en main d'abord : l'onglet Réglages montre la durée ; minutes par étape, questions une à une, ajouts, corrections
  et partage sont repliés sous « Réglages avancés » (les liens des onglets Questions et Dossier les ouvrent) ;
- la barre d'onglets suit l'ordre d'une séance, chaque groupe titré au-dessus de ses onglets (Avant la classe :
  Réglages, Questions, Dossier, Déroulement · Pendant la classe : En direct, Débrief · Après, pour la recherche :
  Mesures, Questionnaire) et commence par « ← Vos séances » ; la case du questionnaire de recherche n'apparaît à
  l'accueil qu'en mode recherche ;
- les états d'une question sont trois choix visibles, et chaque question, chaque document mène à son réglage ;
- la démonstration est sous « Créer la séance » ; « Les équipes » annonce le « ✦ Bravo » ;
- l'espace enseignant·e dit « vous », comme le reste du site, et nomme ce qui est réservé à l'enseignant·e
  (« Dossier complet, version enseignant·e ») ; la version à lire d'avance s'appelle partout « dossier élève » ;
- le dossier documentaire distingue les documents de terrain (les relevés, étape 2) des documents du dossier (étape 3).
- « less is more » : ce qui s'affiche d'abord est réduit, rien n'est retiré. À l'accueil, le dossier élève reste en vue ;
  dossier complet, version du jeu, trousse d'essai et fiche pour l'école attendent sous « Plus d'outils ». En direct,
  « Écrire votre propre message » et le minutage détaillé sont repliés. Le groupe « pour la recherche » (Mesures,
  Questionnaire) se replie derrière son titre ;
- **l'aperçu élève** : « Voir le jeu comme une équipe » (accueil, avec la durée choisie), « Voir comme une équipe »
  (En direct) et « Aperçu élève » (Réglages, même avant d'appliquer) ouvrent la page des équipes en aperçu
  (`eleve.html?apercu=1`) : ni séance ni équipe, rien n'est enregistré, toutes les étapes s'ouvrent d'un clic. Les
  réglages passent par le stockage du navigateur de l'enseignant·e (`ouvrirApercu`, `seance.js`).

## Un écran, une chose à faire

Règle de mise en page côté équipe : **ce qu'il y a à faire maintenant se voit sans défiler**, sur un
Chromebook (1366 × 768). La carte reste à gauche, toujours au même endroit ; ce qui arrive (un relevé, un
point de vue, la conséquence d'un geste) s'affiche à droite, dans le carnet ; les questions viennent sous la
carte, et la phrase sous « Continuer » mène à la réponse qui manque. Les textes longs s'ouvrent à la demande
(« Lire » sur chaque document, les trois derniers blocs de la décision de 1970). Les gestes reconnus
s'annoncent d'un « Bravo » en jouant ; leur liste attend le retour sur la démarche. Sans images
(`images = false`), l'image temporaire de la carte vient sous les boutons : les gestes restent en haut. Le test
vérifie la règle à chaque étape.

## Les bulles d'aide, la première fois

La première fois qu'un élément important apparaît à l'écran, une petite bulle l'explique en une phrase
(`public/js/aide.js`). Une seule à la fois, sans voile ni blocage : on peut jouer sans la lire. Un clic
n'importe où, « OK » ou Échap la ferme ; « Arrêter l'aide » les coupe toutes ; le bouton « ? » en haut de la
page les ramène. Seulement ce qui ne se devine pas (5 bulles côté équipe, 7 côté enseignant·e),
et rien qui gâche un geste à découvrir. Retenu dans ce navigateur seulement ; rien n'est envoyé.
Pour changer un texte : la liste `BULLES` en haut de `aide.js`.

## Quand le Wi-Fi décroche

- Le site garde une copie de lui-même dans le navigateur dès la première visite (`public/sw.js`) :
  une page rechargée sans réseau s'ouvre quand même. Le réseau passe d'abord, pour servir toujours
  la dernière version ; la copie prend le relais s'il ne répond pas en 3 secondes.
- Avec Firebase, les réponses écrites hors ligne attendent dans le navigateur et partent au retour
  du réseau (`donnees.js`, cache persistant de Firestore).
- Un bandeau « Hors ligne » le dit aux équipes, sans cacher le bouton « Suivant ».
- Rien de personnel dans la copie : seulement les fichiers publics du site.

## Mettre en ligne

### Sur GitHub Pages (maintenant : démonstration et prévalidation)

Dépôt : [lanam-org/ou-passe-la-ligne](https://github.com/lanam-org/ou-passe-la-ligne) ;
site : <https://lanam-org.github.io/ou-passe-la-ligne/>. Travailler dans un clone du dépôt, pas dans un
ZIP téléchargé : un dossier sans `.git` perd le lien avec GitHub (et le dossier caché `.github/`).

Chaque envoi sur `main` lance `.github/workflows/publier.yml` : les quatre parcours de test et les
contrastes tournent dans un vrai navigateur, et rien n'est mis en ligne si une vérification échoue
(la version d'avant reste, les captures d'écran sont jointes à l'exécution, onglet « Actions »).
Réglage du dépôt, une seule fois : Settings → Pages → Source : « GitHub Actions ».

### Versions : ce que voient les testeurs ne bouge pas

Le site en ligne porte toutes ses versions (`outils/assembler_versions.sh`) :

| Adresse | Ce qu'elle montre |
|---|---|
| `…/ou-passe-la-ligne/` | la dernière version publiée (la plus haute étiquette `playtest-N`) : ce que voient les testeurs |
| `…/ou-passe-la-ligne/playtest-0/` | chaque version publiée, figée pour toujours : le lien à donner pour un essai précis |
| `…/ou-passe-la-ligne/dev/` | le travail en cours (`main`, après les tests), avec une bande « en cours de développement » |

Un envoi sur `main` met à jour `…/dev/` seulement. La version s'affiche en bas de chaque page (`js/version.js`) :
les testeurs la citent dans leurs retours. Chaque version garde ses propres séances de démonstration et sa propre
copie hors ligne : deux versions ouvertes dans le même navigateur ne se mélangent pas.

Publier une nouvelle version pour les testeurs :

La version en préparation a son titre dans `VERSIONS.md` (« ## Playtest 1 — avec les professeurs · en préparation ») :
`…/dev/` l'affiche dans sa bande et son pied de page. Quand elle est prête pour les testeurs :

1. Dans `VERSIONS.md`, remplacer « en préparation » par la date, et ajouter le titre de la suivante
   (« ## Playtest 2 — … · en préparation ») ; fusionner ce changement dans `main` par une PR, comme le reste.
2. Poser l'étiquette annotée sur la tête de `main` (son message est le titre de la version), puis l'envoyer seule :

   ```
   git switch main
   git pull
   git log -1 --oneline
   git tag -a playtest-1 -m "Playtest 1 — avec les professeurs"
   git push origin playtest-1
   ```

   `git log` montre le commit qui sera publié : le dernier fusionné dans `main`. L'étiquette relance la mise en ligne
   (`.github/workflows/versions.yml`) : Playtest 1 à l'adresse principale et à `…/playtest-1/` ; Playtest 0 reste à
   `…/playtest-0/`.
3. Vérifier quelques minutes plus tard. Dans l'onglet Actions, « Vérifier et publier » (lancé par github-actions)
   doit finir en vert, et le pied de page de l'adresse principale doit afficher « Version Playtest 1 — … » (recharger
   la page ; l'ancienne copie peut rester visible une dizaine de minutes). Une relance qui échoue n'avertit personne :
   si l'exécution est rouge, ou absente, la relancer à la main (Actions → « Vérifier et publier » → Run workflow).

L'étiquette ne relance rien dans deux cas, où il faut relancer à la main : une étiquette posée sur un commit plus
ancien que `versions.yml` (avant le 20 octobre 2026), et plus de trois étiquettes envoyées d'un coup (d'où une à la
fois). Et tant que `main` est en échec, rien ne part, ni nouvelle version ni retour en arrière : la relance vérifie la
tête de `main` avant de publier.

Revenir en arrière : supprimer l'étiquette fautive (`git push --delete origin playtest-1`, puis `git tag -d playtest-1`).
La mise en ligne repart d'elle-même (vérifier comme à l'étape 3) : l'adresse principale revient à la version d'avant,
et `…/playtest-1/` disparaît avec l'étiquette. Supprimer aussi l'étiquette sur chaque autre ordinateur qui a le dépôt
(`git fetch --prune --prune-tags`) : sinon, un `git push --follow-tags` depuis là-bas la renverrait.

### Travailler par PR : chaque changement est revu avant `main`

C'est une règle de travail : GitHub ne l'impose pas tant que `main` n'est pas protégée (Settings → Rules → Rulesets :
exiger une PR et la réussite de « Vérifier le site »). Chaque changement passe par une branche et une demande de
fusion (PR) vers `main` :

1. une branche par sujet (`git switch -c nom-du-sujet`), des commits, puis `git push -u origin nom-du-sujet` ;
2. la PR s'ouvre avec sa liste de contrôle (`.github/pull_request_template.md`) ; « Vérifier le site » la joue de bout
   en bout, sans rien mettre en ligne ;
3. un agent relecteur, lancé depuis Claude Code, publie sa revue en commentaire ; les points retenus sont corrigés
   dans la même branche ;
4. la fusion envoie `main` à `…/dev/`. Les testeurs ne voient rien avant la prochaine étiquette.

Une limite, le jour où Firebase sera branché : toutes les versions partagent la même base. Une version publiée doit
rester compatible avec les règles Firestore en vigueur ; pour un changement de structure, prévoir un projet Firebase
à part pour `…/dev/` (son propre `config.js`).

Tant que `public/js/config.js` est vide, le site en ligne est en mode démonstration : chaque
navigateur est sa propre classe. Parfait pour faire essayer le jeu ; pas pour une vraie classe,
où chaque Chromebook doit voir la même séance.

### Avec Firebase (ensuite : une vraie classe, plusieurs Chromebooks)

Tout est dans le guide d'hébergement (document Word, à part). En bref : un projet Firebase gratuit
(plan Spark), connexion anonyme, base Firestore à Montréal, les valeurs de la console collées dans
`public/js/config.js`, les règles publiées. Aucun autre fichier ne change.

- **La région se choisit à la création de la base et ne se change plus** : `northamerica-northeast1` (Montréal).
  La page Confidentialité dit que les données sont à Montréal : c'est ce choix qui le rend vrai.
- **Effacement automatique (une fois)** : Firestore → *Durée de vie (TTL)* → quatre politiques sur le champ
  `expireLe`, pour les groupes de collections `seances`, `equipes`, `avis` et `prive`. Ou, avec la CLI Google Cloud :

  ```
  gcloud firestore fields ttls update expireLe --collection-group=seances --enable-ttl
  gcloud firestore fields ttls update expireLe --collection-group=equipes --enable-ttl
  gcloud firestore fields ttls update expireLe --collection-group=avis --enable-ttl
  gcloud firestore fields ttls update expireLe --collection-group=prive --enable-ttl
  ```

  Firestore efface les documents expirés peu après la date (en général dans les 24 heures).
  Sans ces politiques, rien ne s'efface tout seul et la page Confidentialité ne dit plus vrai.

Le site peut rester sur GitHub Pages et parler à Firebase : dans la console Firebase,
Authentication → Paramètres → Domaines autorisés, ajouter `<compte>.github.io`. Les valeurs de
`config.js` deviennent alors publiques dans ce dépôt ; c'est prévu ainsi par Firebase : ce sont
les règles de sécurité (`firestore.rules`) qui protègent les données, pas le secret de ces valeurs.
On peut aussi tout héberger chez Firebase (`firebase deploy`).

## Comment c'est rangé

| Fichier | Rôle |
|---|---|
| `public/contenu/forillon.json` | Tout le contenu du jeu : secteurs, relevés, documents, complications, les 28 questions, le bilan, les sources |
| `public/contenu/guide.json` | Le guide de l'enseignant·e : la réponse attendue et les notes de chaque question. Seul l'espace enseignant·e le charge |
| `public/js/jeu.js` | Les règles, sans affichage : ce que la ligne protège, les villages, le corridor, les gestes reconnus, les indicateurs |
| `public/js/reglages.js` | Les formats, les questions posées ou ajoutées, les corrections, le chrono : le contenu « réglé » d'une séance |
| `public/js/carte.js` | La carte et le relevé |
| `public/js/eleve.js` | La page des équipes : faire entrer l'équipe, dessiner l'étape en cours, répondre aux gestes |
| `public/js/eleve/` | `ecrans.js` (une fonction par étape, l'écran de fin), `questions.js` (questions écrites, « À rattraper »), `annonces.js` (gestes reconnus, « bravos », message de l'enseignant·e, lecteur d'écran), `envoi.js` (l'enregistrement et le voyant « Enregistré ») ; `etat.js`, l'état qu'ils partagent |
| `public/js/vendor/uqr.js` | L'encodeur de codes QR (uqr 0.1.3, licence MIT), copié tel quel : aucun service extérieur |
| `public/js/enseignant.js` | L'espace enseignant·e : ouvrir une séance, l'écouter en direct, choisir l'onglet, les gestes en séance |
| `public/js/enseignant/` | Un fichier par écran de l'espace : `accueil.js` (Vos séances), `direct.js`, `debrief.js`, `editeur.js` (Réglages, Votre version du jeu), `preparer.js` (Questions, Dossier, Déroulement), `apres.js` (Mesures, Questionnaire), `rapport.js` (rapport, impression), `trousse.js` (la trousse d'essai) ; `etat.js`, l'état qu'ils partagent |
| `public/js/seance.js` | Créer, rejoindre, effacer une séance ; ses réponses attendues, à part ; la version du jeu de l'enseignant·e |
| `public/js/dossierdoc.js` | Le dossier documentaire, à l'écran et sur papier ; le lien de source dans le jeu |
| `public/js/dossier.js` | La page du dossier élève |
| `public/js/donnees.js` | La seule porte vers le stockage (Firestore ou local) |
| `public/js/theme.js` | Le menu « Affichage » : clair, sombre, contraste élevé, comme l'ordinateur |
| `public/js/version.js` | La version du site en bas de chaque page, et la bande de la version en développement (`…/dev/`) |
| `public/js/local.js` | Le stockage local, pour la démonstration |
| `public/js/config.js` | Le seul fichier à modifier pour passer en ligne |
| `public/js/demo.js` | La séance de démonstration (mode local) |
| `public/sw.js`, `public/js/horsligne.js` | La copie hors ligne et le bandeau « Hors ligne » |
| `public/js/aide.js` | Les bulles d'aide, la première fois, et le bouton « ? » |
| `public/js/secours.js` | Le message clair quand une page ne peut pas démarrer ou qu'une action échoue |
| `public/confidentialite.html` | Confidentialité et à propos (Loi 25) |
| `public/ecoles.html`, `public/js/imprimer.js` | La fiche pour l'école (ÉFVP), et son bouton « Imprimer » |
| `public/polices/` | Les polices, hébergées sur le site, et leur licence OFL |
| `.github/workflows/publier.yml` | Vérifier, puis mettre en ligne sur GitHub Pages |
| `firestore.rules` | Les règles de sécurité de la base |
| `outils/verifier_site.mjs` | Le test de bout en bout |
| `outils/verifier_contrastes.py` | Les contrastes des trois affichages |
| `outils/assembler_versions.sh`, `VERSIONS.md` | Le site publié avec toutes ses versions ; le journal des versions |
| `outils/relecture_gespeg.mjs` | Le dossier de relecture pour la Nation Micmac de Gespeg (`outils/relecture/`, HTML et PDF) |

## Changer le contenu

Pour une classe : l'onglet « Réglages » suffit (corrections, questions ajoutées), sans toucher aux fichiers.

Pour tout le monde : ouvre `public/contenu/forillon.json`. Un texte, un chiffre ou une source se change là,
sans toucher au code. Garde les guillemets et les virgules du format JSON. Un fichier exporté depuis
« Réglages » liste chaque correction avec l'original, la valeur corrigée et la raison.

Les réponses attendues et les notes pour l'enseignant·e sont dans `public/contenu/guide.json`, sous le même
identifiant que la question (`F2.1`…). Une question ajoutée à la banque prend sa réponse là, jamais dans
`forillon.json` : ce fichier-là est lu par chaque Chromebook. Le test vérifie que chaque question a sa réponse.

## La vie privée, tenue dans le code

- Aucun prénom d'élève, nulle part. Une équipe est un nom d'animal ; un appareil est un
  identifiant technique anonyme. Les élèves n'ont jamais de compte.
- L'enseignant·e peut se connecter avec Google (`googleEnseignant` dans `config.js`) pour retrouver
  ses séances sur n'importe quel ordinateur. Son nom et son courriel restent dans Firebase
  Authentication : ils ne sont jamais écrits dans la base. Une séance créée avant la connexion
  reste à elle ou lui : l'identité anonyme est reliée au compte Google.
- Une équipe ne lit que sa propre fiche. Seul·e l'enseignant·e qui a créé la séance lit
  toutes les fiches (`firestore.rules`). Sa version du jeu (`enseignants/…`) n'est lue que par elle ou lui.
- « Imprimer le rapport de séance » garde une trace sur papier ou en PDF (choisir « Enregistrer au format PDF ») :
  la classe, le temps par étape, les indicateurs, puis une page par équipe avec sa ligne et ses réponses. Rien ne
  reste en ligne.
- « Effacer la séance » supprime ensuite les équipes, leurs réponses et la séance.
- `mesure = false` dans `config.js` : pas de questionnaire à l'écran, pas d'export CSV.
  À passer à `true` seulement avec le certificat d'éthique et les autorisations en main.
- **Effacement automatique** (Loi 25 : on ne garde pas plus longtemps que nécessaire) : chaque séance, fiche
  d'équipe, avis et document de réponses attendues porte un champ `expireLe` (création + `conservationJours`,
  30 par défaut, dans `config.js`).
  La politique TTL de Firestore efface le document après cette date, même si personne ne clique « Effacer ».
  Elle s'active une fois dans la console (voir « Avec Firebase »). Changer le nombre de jours : `config.js`
  **et** le texte de `confidentialite.html` et de `ecoles.html` (et la phrase de `index.html`).
- **La page « Confidentialité et à propos »** (`confidentialite.html`) répond à la Loi 25 : responsable et
  coordonnées, ce qui est recueilli et pourquoi, où (Firestore à Montréal, Firebase Authentication chez Google,
  hors Québec), combien de temps, les droits, la plainte à la Commission d'accès à l'information. À mettre à jour
  si le site change (nouveau champ, nouvel hébergeur, collecte allumée).
- **La fiche pour l'école** (`ecoles.html`) donne à une école ou à un centre de services les éléments de son ÉFVP.
  Elle se tient à jour avec `confidentialite.html` : un nouveau champ, un nouveau fournisseur ou un nouvel hébergeur
  change les deux pages. À la mise en service de Firebase, retirer l'encadré « État actuel » (prototype, démonstration seulement).
- La consigne aux équipes le dit : pas de prénom, ni dans le nom de l'équipe, ni dans les réponses.
- « Votre version du jeu » se supprime d'un bouton (« Supprimer votre version »).

## La sécurité, tenue dans le code

- **Une politique de sécurité du contenu (CSP)** dans chaque page (`<meta http-equiv="Content-Security-Policy">`) :
  le navigateur n'exécute que les scripts du site et ceux de Firebase (`www.gstatic.com`, et `apis.google.com`
  pour la connexion Google), ne se connecte qu'au site et à `*.googleapis.com`, et refuse tout script glissé
  dans le texte. `index.html` et `confidentialite.html`, sans base de données, ont une politique plus stricte.
  Si la connexion Google échoue un jour avec, dans la console, « Refused to … because it violates the
  Content Security Policy », l'adresse refusée est à ajouter à la directive nommée, dans les trois pages qui
  ont un module (`eleve.html`, `enseignant.html`, `dossier.html` : la même ligne partout). Avec un `authDomain`
  personnalisé (autre que `…firebaseapp.com`), l'ajouter à `frame-src` et `connect-src`.
- `404.html` garde un petit script dans la page : sa CSP l'autorise par son empreinte (`sha256-…`). Changer ce
  script change l'empreinte (le navigateur donne la bonne dans la console).
- **Les réponses attendues restent chez l'enseignant·e.** La page des équipes ne télécharge jamais
  `contenu/guide.json`, et le service worker ne le garde pas d'avance sur les Chromebooks : un élève curieux
  qui ouvre les outils du navigateur (F12) n'y trouve aucune réponse. Celles que l'enseignant·e écrit (question
  ajoutée, réponse corrigée) ne vont pas dans le document de la séance, que toute équipe lit, mais dans
  `seances/{code}/prive/reponses`, que les règles réservent à l'enseignant·e de la séance. Limite assumée : l'espace
  enseignant·e est une page publique, sans mot de passe ; un élève qui l'ouvre exprès y voit les réponses, comme
  dans un guide laissé sur un bureau. Le verdict de chaque document (« utile », « hors sujet ») reste dans le jeu :
  l'équipe le voit juste après son tri.
- **Les corrections ne touchent que les champs prévus** (`CHAMPS` dans `reglages.js`) : une correction venue
  d'un fichier importé ou de la base qui viserait un lien, le tracé d'un secteur ou un identifiant est ignorée,
  et le texte des points de vue reste échappé. Les liens de sources ne sont suivis que s'ils sont en
  `https:` ou `http:`, et s'ouvrent avec `noopener noreferrer`.
- Les règles Firestore limitent aussi la taille : 40 réponses au plus par équipe, 300 caractères par réponse au
  questionnaire, et `expireLe` est toujours une vraie date.
- `js/secours.js` : si la page ne peut pas démarrer (fichier bloqué par le filtre de l'école, réseau coupé),
  « Chargement… » devient un message clair, avec un bouton « Recharger » et le lien vers la liste des adresses à
  autoriser ; une action qui échoue plus tard le dit dans une bande discrète. Rien n'est envoyé.
- Avec Firebase Hosting, `firebase.json` ajoute les en-têtes que GitHub Pages ne permet pas (`frame-ancestors`,
  `X-Frame-Options`, `Permissions-Policy`).

## Vérifier que tout marche

Une fois : installe Node.js, puis dans ce dossier `npm install` et `npx playwright install chromium`.

```
node outils/verifier_site.mjs                  mode local
node outils/verifier_site.mjs images           mode local, avec les dessins
node outils/verifier_site.mjs firebase         double de Firestore, deux navigateurs
node outils/verifier_site.mjs firebase mesure  idem, collecte allumée
python3 outils/verifier_contrastes.py          contrastes des trois affichages
npm run verifier:tout                          tout, comme GitHub avant chaque mise en ligne
npm run relecture                              le dossier de relecture pour Gespeg, à jour du contenu
```

Le test crée une séance, fait jouer une équipe de bout en bout, vérifie le suivi en
direct, le message à la classe, les réglages changés en pleine partie (question ajoutée, question
rendue facultative, correction, minutes, rattrapage, pause du chrono, « +5 min »), les réponses attendues
jamais lisibles par les équipes (ni dans le contenu, ni dans la séance, ni gardées sur leur Chromebook), l'export des
réglages, le dossier documentaire (complet, devoir, pastilles, corrections), les trois affichages (clair par défaut, et « Comme l'ordinateur » qui le suit), la reprise après un rafraîchissement, le rapport, l'effacement, la version du jeu reprise
dans une nouvelle séance, la séance de démonstration, les bulles d'aide, le hors-ligne (serveur éteint, page rechargée,
séance créée et rejointe sans réseau), le code QR (décodé comme le ferait une caméra, avec jsQR : il mène au lien
direct) et l'absence d'erreur, puis la connexion Google de l'enseignant·e (séances retrouvées sur un autre ordinateur,
compte relié, rien de personnel dans la base). Les captures vont dans `outils/captures/`.

**L'accessibilité, écran par écran.** En mode local, axe-core audite 39 écrans (chaque étape de l'équipe, chaque onglet
de l'enseignant·e, les affichages sombre et contraste élevé, les bulles d'aide, les pages d'information en clair et en
sombre) selon les critères WCAG 2.2 de niveaux A et AA. Un seul écart, et rien n'est mis en ligne : le message dit
quel écran, quelle règle et quel élément. axe ne voit pas tout (l'ordre de lecture, la clarté d'un texte) : un essai au
clavier et avec un lecteur d'écran reste utile à chaque grand changement.

Ce que le double ne prouve pas : les règles de sécurité et les quotas réels. Les règles
se vérifient dans la console Firebase (Firestore → Règles → Terrain de jeu des règles).

## Ce qui reste à faire

- [x] Brancher Firebase : projet `ou-passe-la-ligne`, connexion anonyme, domaine `lanam-org.github.io` autorisé,
      règles publiées, configuration dans `config.js` (24 octobre 2026). Les tests, eux, ne touchent jamais la vraie base.
- [x] Créer la base Firestore à Montréal (`northamerica-northeast1`)
- [ ] Connexion Google des enseignant·es : créer une adresse dédiée au projet (l'adresse d'assistance s'affiche sur
      l'écran de connexion Google), activer Google dans la console, puis `googleEnseignant = true` dans `config.js`
- [ ] Activer les quatre politiques TTL sur `expireLe` (voir « Avec Firebase ») : sans elles, rien ne s'efface tout seul.
      Elles demandent la facturation (forfait Blaze, avec une alerte de budget) : à faire avant la première classe
- [ ] Firebase branché : se connecter une fois avec Google sur le site en ligne, et vérifier dans la console
      du navigateur qu'aucune ligne « Refused to … Content Security Policy » n'apparaît
- [ ] Transmettre la fiche pour l'école (`ecoles.html`) à l'école ou au centre de services scolaire, pour son ÉFVP,
      avant la version en classe ; à la mise en service de Firebase, mettre à jour son encadré « État actuel »
- [ ] Essayer sur un vrai Chromebook d'école, sur le Wi-Fi de l'école
- [ ] Vérifier les règles dans le terrain de jeu de la console (quatre cas listés dans le guide)
- [ ] Après chaque nouvelle version du site : republier les règles (`firebase deploy`)
- [ ] Relecture du contenu par la Nation Micmac de Gespeg : envoyer `outils/relecture/relecture-gespeg.pdf`
      (regénéré avec `npm run relecture`), puis corriger le contenu selon ses remarques
