# Où passe la ligne — le site

Un jeu de géographie en équipe pour le 1er cycle du secondaire : tracer la limite d'une aire protégée
à Forillon, en 1970, puis voir l'information arriver. Par défaut, une période de 50 minutes ; l'enseignant·e
peut aussi choisir 35 minutes, deux périodes (100 minutes) ou une durée sur mesure, et tout régler.

Prototype de recherche, en prévalidation : le contenu et les questions sont encore discutés,
et les images sont volontairement des cadres vides.

**Essayer en ligne** : la page GitHub Pages de ce dépôt (lien dans la colonne « About »). C'est le mode
démonstration : tout reste dans le navigateur de la personne qui essaie, rien n'est envoyé nulle part.

| Page | Pour qui | Ce qu'on y fait |
|---|---|---|
| `index.html` | tout le monde | Choisir : équipe ou enseignant·e |
| `eleve.html` | une équipe, un Chromebook | Entrer le code, choisir un nom d'animal, jouer les 7 étapes : Arriver, Faire le portrait du territoire, Se questionner, Prendre position, D'autres points de vue, La décision de 1970, Revenir sur sa démarche |
| `dossier.html` | les élèves, avant la séance | La version devoir du dossier documentaire : le portrait et les documents, sans les surprises ; imprimable |
| `enseignant.html` | l'enseignant·e | Se connecter (Google, facultatif), retrouver ses séances, en créer une, suivre en direct, chrono de classe, envoyer un message, réglages, débrief, questions, dossier documentaire, mesures, rapport imprimable |
| `confidentialite.html` | tout le monde (parents, écoles, service informatique) | Ce que le site enregistre, pourquoi, où, combien de temps ; la responsable et ses coordonnées ; les droits ; les adresses à autoriser dans le filtre de l'école. Liée en bas de chaque page |

## Le dossier documentaire

Le jeu ne dépend d'aucun lien extérieur : chaque relevé, document, point de vue et bloc de la décision de 1970 garde,
dans `forillon.json`, la phrase exacte de sa source (`copie`, avec sa traduction si elle est en anglais), le lien et la date
de vérification. Dans le jeu, chaque relevé, verdict et point de vue donne le lien de sa source.

- Onglet « Dossier » (espace enseignant·e) : tout le dossier, surprises signalées ; impression complète ou version devoir.
- D'avance, sans créer de séance : l'accueil de l'espace enseignant·e, « Avant la séance » → « Imprimer le dossier
  élève » (sans les surprises ni les pastilles) ou « Dossier complet, pour toi ». La version du jeu de l'enseignant·e
  (ses corrections) s'y applique.
- `dossier.html?code=XXXXX` : la version devoir, avec les corrections de la séance. Les éléments marqués `surprise`
  (ceux qui servent à contredire ce que l'équipe croyait) n'y sont jamais.
- Pastilles : à quelle question sert chaque document (`sert`), dans la couleur de sa famille (`dossier.questions`).
  L'identifiant est toujours écrit. Elles révèlent quels documents servent : la version devoir les cache par défaut.

## Ce que l'enseignant·e peut régler

Dans l'onglet « Réglages » d'une séance, avant ou pendant la partie (« Appliquer à la séance ») :

- La durée. Trois formats : courte (35 min), standard (50 min, par défaut), deux périodes (100 min, les
  28 questions, coupure après le tracé) ; ou « Sur mesure » : la durée totale tapée à l'accueil, répartie
  comme le standard, puis l'onglet Réglages s'ouvre pour choisir les questions. Ensuite chaque étape à la
  minute près. En direct, « +5 min », « −5 min » (jusqu'à 1 min) ou « Terminer l'étape maintenant » pour
  l'étape où se trouvent la plupart des équipes.
- Les questions. Chacune des 28 questions de la banque : requise, facultative ou pas posée. Et jusqu'à
  douze questions ajoutées (écrites en équipe ou orales au débrief). Une équipe déjà plus loin retrouve
  une nouvelle question requise dans « À rattraper ». Une réponse déjà écrite n'est jamais effacée.
- Les corrections. Un chiffre, un texte ou une source du jeu se corrige, avec sa raison ; l'original
  est gardé et « Rétablir l'original » le remet.
- Le chrono. Il démarre avec la première équipe et avance à la seconde ; Pause, Reprendre, Remettre à
  zéro ; « Le détail, étape par étape » donne les minutes et le nombre de questions de chaque étape.
  Chaque équipe voit le temps qui reste à son étape (en ocre une fois dépassé, sans jamais bloquer).
- Les messages à la classe : « 5 minutes restantes », « 2 minutes restantes », « Pause », « Bloqués ?
  Levez la main », « Au retour en classe », ou un message écrit (140 caractères, affiché tel quel).

« Ta version du jeu » (à l'accueil, ou « Enregistrer aussi comme ma version ») garde ces réglages et les
reprend à chaque nouvelle séance. « Exporter (JSON) » sort les questions ajoutées et les corrections, sans
aucune donnée d'élève, pour les intégrer ensuite à `forillon.json`.

## Les images : à venir

`images = false` dans `public/js/config.js` : la carte dessinée et la garde-parc sont remplacées par des cadres
vides « Image à venir », pour décider ensemble de ce qui ira là (prévalidation du contenu). La carte reste jouable :
les relevés et les sept secteurs deviennent de simples boutons, avec les mêmes gestes et les mêmes mesures.
`images = true` ramène les dessins. Test : `node outils/verifier_site.mjs images`.

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

## Un écran, une chose à faire

Règle de mise en page côté équipe : **ce qu'il y a à faire maintenant se voit sans défiler**, sur un
Chromebook (1366 × 768). La carte reste à gauche, toujours au même endroit ; ce qui arrive (un relevé, un
point de vue, la conséquence d'un geste) s'affiche à droite, dans le carnet ; les questions viennent sous la
carte, et la phrase sous « Continuer » mène à la réponse qui manque. Les textes longs s'ouvrent à la demande
(« Lire » sur chaque document, les trois derniers blocs de la décision de 1970). Les gestes reconnus
s'annoncent d'un « Bravo » en jouant ; leur liste attend le retour sur la démarche. Sans images
(`images = false`), la garde-parc n'a pas de cadre vide. Le test vérifie la règle à chaque étape.

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
contrastes tournent dans un vrai navigateur, et `public/` n'est mis en ligne que si tout passe.
Sinon, la version d'avant reste en ligne et les captures d'écran sont jointes à l'exécution
(onglet « Actions »). Réglage du dépôt, une seule fois : Settings → Pages → Source : « GitHub Actions ».

Tant que `public/js/config.js` est vide, le site en ligne est en mode démonstration : chaque
navigateur est sa propre classe. Parfait pour faire essayer le jeu ; pas pour une vraie classe,
où chaque Chromebook doit voir la même séance.

### Avec Firebase (ensuite : une vraie classe, plusieurs Chromebooks)

Tout est dans le guide d'hébergement (document Word, à part). En bref : un projet Firebase gratuit
(plan Spark), connexion anonyme, base Firestore à Montréal, les valeurs de la console collées dans
`public/js/config.js`, les règles publiées. Aucun autre fichier ne change.

- **La région se choisit à la création de la base et ne se change plus** : `northamerica-northeast1` (Montréal).
  La page Confidentialité dit que les données sont à Montréal : c'est ce choix qui le rend vrai.
- **Effacement automatique (une fois)** : Firestore → *Durée de vie (TTL)* → trois politiques sur le champ
  `expireLe`, pour les groupes de collections `seances`, `equipes` et `avis`. Ou, avec la CLI Google Cloud :

  ```
  gcloud firestore fields ttls update expireLe --collection-group=seances --enable-ttl
  gcloud firestore fields ttls update expireLe --collection-group=equipes --enable-ttl
  gcloud firestore fields ttls update expireLe --collection-group=avis --enable-ttl
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
| `public/contenu/forillon.json` | Tout le contenu : secteurs, relevés, documents, complications, les 28 questions et leurs réponses attendues, le bilan, les sources |
| `public/js/jeu.js` | Les règles, sans affichage : ce que la ligne protège, les villages, le corridor, les gestes reconnus, les indicateurs |
| `public/js/reglages.js` | Les formats, les questions posées ou ajoutées, les corrections, le chrono : le contenu « réglé » d'une séance |
| `public/js/carte.js` | La carte et le relevé |
| `public/js/eleve.js` | La page des équipes |
| `public/js/enseignant.js` | L'espace enseignant·e : ouvrir une séance, l'écouter en direct, choisir l'onglet, les gestes en séance |
| `public/js/enseignant/` | Un fichier par écran de l'espace : `accueil.js` (Tes séances), `direct.js`, `debrief.js`, `editeur.js` (Réglages, Ta version), `preparer.js` (Questions, Dossier, Déroulement), `apres.js` (Mesures, Questionnaire), `rapport.js` (rapport, impression) ; `etat.js`, l'état qu'ils partagent |
| `public/js/seance.js` | Créer, rejoindre, effacer une séance ; la version du jeu de l'enseignant·e |
| `public/js/dossierdoc.js` | Le dossier documentaire, à l'écran et sur papier ; le lien de source dans le jeu |
| `public/js/dossier.js` | La page de la version devoir |
| `public/js/donnees.js` | La seule porte vers le stockage (Firestore ou local) |
| `public/js/theme.js` | Le menu « Affichage » : clair, sombre, contraste élevé, comme l'ordinateur |
| `public/js/local.js` | Le stockage local, pour la démonstration |
| `public/js/config.js` | Le seul fichier à modifier pour passer en ligne |
| `public/js/demo.js` | La séance de démonstration (mode local) |
| `public/sw.js`, `public/js/horsligne.js` | La copie hors ligne et le bandeau « Hors ligne » |
| `public/js/aide.js` | Les bulles d'aide, la première fois, et le bouton « ? » |
| `public/js/secours.js` | Le message clair quand une page ne peut pas démarrer ou qu'une action échoue |
| `public/confidentialite.html` | Confidentialité et à propos (Loi 25) |
| `public/polices/` | Les polices, hébergées sur le site, et leur licence OFL |
| `.github/workflows/publier.yml` | Vérifier, puis mettre en ligne sur GitHub Pages |
| `firestore.rules` | Les règles de sécurité de la base |
| `outils/verifier_site.mjs` | Le test de bout en bout |
| `outils/verifier_contrastes.py` | Les contrastes des trois affichages |

## Changer le contenu

Pour une classe : l'onglet « Réglages » suffit (corrections, questions ajoutées), sans toucher aux fichiers.

Pour tout le monde : ouvre `public/contenu/forillon.json`. Un texte, un chiffre ou une source se change là,
sans toucher au code. Garde les guillemets et les virgules du format JSON. Un fichier exporté depuis
« Réglages » liste chaque correction avec l'original, la valeur corrigée et la raison.

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
  d'équipe et avis porte un champ `expireLe` (création + `conservationJours`, 30 par défaut, dans `config.js`).
  La politique TTL de Firestore efface le document après cette date, même si personne ne clique « Effacer ».
  Elle s'active une fois dans la console (voir « Avec Firebase »). Changer le nombre de jours : `config.js`
  **et** le texte de `confidentialite.html` (et la phrase de `index.html`).
- **La page « Confidentialité et à propos »** (`confidentialite.html`) répond à la Loi 25 : responsable et
  coordonnées, ce qui est recueilli et pourquoi, où (Firestore à Montréal, Firebase Authentication chez Google,
  hors Québec), combien de temps, les droits, la plainte à la Commission d'accès à l'information. À mettre à jour
  si le site change (nouveau champ, nouvel hébergeur, collecte allumée).
- La consigne aux équipes le dit : pas de prénom, ni dans le nom de l'équipe, ni dans les réponses.
- « Ta version du jeu » se supprime d'un bouton (« Supprimer ma version »).

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
```

Le test crée une séance, fait jouer une équipe de bout en bout, vérifie le suivi en
direct, le message à la classe, les réglages changés en pleine partie (question ajoutée, question
rendue facultative, correction, minutes, rattrapage, pause du chrono, « +5 min »), l'export des
réglages, le dossier documentaire (complet, devoir, pastilles, corrections), les trois affichages (clair par défaut, et « Comme l'ordinateur » qui le suit), la reprise après un rafraîchissement, le rapport, l'effacement, la version du jeu reprise
dans une nouvelle séance, la séance de démonstration, les bulles d'aide, le hors-ligne (serveur éteint, page rechargée,
séance créée et rejointe sans réseau), et l'absence d'erreur, puis la connexion Google de l'enseignant·e (séances
retrouvées sur un autre ordinateur, compte relié, rien de personnel dans la base). Les captures vont
dans `outils/captures/`.

Ce que le double ne prouve pas : les règles de sécurité et les quotas réels. Les règles
se vérifient dans la console Firebase (Firestore → Règles → Terrain de jeu des règles).

## Ce qui reste à faire

- [ ] Brancher Firebase avant la première classe (et ajouter le domaine github.io aux domaines autorisés)
- [ ] Créer la base Firestore à Montréal (`northamerica-northeast1`)
- [ ] Activer les trois politiques TTL sur `expireLe` (voir « Avec Firebase ») : sans elles, rien ne s'efface tout seul
- [ ] Firebase branché : se connecter une fois avec Google sur le site en ligne, et vérifier dans la console
      du navigateur qu'aucune ligne « Refused to … Content Security Policy » n'apparaît
- [ ] Proposer à l'école ou au centre de services scolaire les détails pour son ÉFVP (évaluation des facteurs
      relatifs à la vie privée), avant la version en classe
- [ ] Essayer sur un vrai Chromebook d'école, sur le Wi-Fi de l'école
- [ ] Vérifier les règles dans le terrain de jeu de la console (quatre cas listés dans le guide)
- [ ] Après chaque nouvelle version du site : republier les règles (`firebase deploy`)
- [ ] Relecture du contenu par la Nation Micmac de Gespeg
- [ ] Un code QR pour rejoindre la séance (aujourd'hui : le code et le lien)
- [ ] Le deuxième dossier (Beauharnois) dans un second fichier de contenu
