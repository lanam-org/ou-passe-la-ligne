// verifier_site.mjs — joue une séance entière dans un vrai navigateur.
//
//   node outils/verifier_site.mjs            mode local (un navigateur, plusieurs onglets)
//   node outils/verifier_site.mjs firebase   double de Firestore : deux navigateurs séparés,
//                                            comme le poste de l'enseignant·e et un Chromebook
//   node outils/verifier_site.mjs firebase mesure   idem, collecte allumée (questionnaire, export)
//
// Prérequis : Node.js, puis `npm install playwright` dans ce dossier (une fois).
// Le test crée une séance, fait jouer une équipe de bout en bout, vérifie que
// l'enseignant·e la suit en direct, envoie un message, puis efface la séance.
// Il enregistre des captures dans outils/captures/.

import { createServer } from 'node:http';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerFauxFirebase, MODULES } from './faux-firebase/serveur.mjs';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Playwright manque : lance « npm install » puis « npx playwright install chromium » dans ce dossier.'); process.exit(1); }

const ICI = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ICI, '..', 'public');
const CAPTURES = join(ICI, 'captures');
const MODE = process.argv[2] === 'firebase' ? 'firebase' : 'local';
const MESURE = process.argv.includes('mesure');
// « images » : les dessins (carte, garde-parc) au lieu des cadres vides « Image à venir »
const IMAGES = process.argv.includes('images');
await mkdir(CAPTURES, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const fauxFb = creerFauxFirebase();
const servir = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (await fauxFb.router(req, res, url)) return;
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const corps = await readFile(join(PUBLIC, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(corps);
  } catch { res.writeHead(404); res.end('introuvable'); }
};
const serveur = createServer(servir);
await new Promise((r) => serveur.listen(0, r));
const BASE = `http://localhost:${serveur.address().port}`;

let echecs = 0;
const dit = (ok, quoi) => { console.log(`${ok ? '  ✓' : '  ✗'} ${quoi}`); if (!ok) echecs++; };

const navigateur = await chromium.launch();
const CONFIG_FB = `export const firebase = { apiKey:"faux", authDomain:"faux", projectId:"faux", appId:"faux" };
export const versionFirebase = '12.19.0'; export const mesure = ${MESURE}; export const estLocal = false;
export const googleEnseignant = true; export const images = ${IMAGES};`;

const SANS_AIDE = () => { try { localStorage.setItem('forillon:aide', '{"vus":[],"off":true}'); } catch { /* vide */ } };
async function contexte(largeur = 1366, hauteur = 768) {
  // sans service worker : le test « hors ligne » plus bas a son propre contexte
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-CA', serviceWorkers: 'block' });
  // les bulles d'aide ont leur propre test, plus bas : ici, elles ne gênent pas les clics
  await ctx.addInitScript(SANS_AIDE);
  // les polices Google ne sont pas nécessaires au test
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '' }));
  if (MODE === 'local' && IMAGES) {
    const local = (await readFile(join(PUBLIC, 'js', 'config.js'), 'utf8')).replace('export const images = false;', 'export const images = true;');
    await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: local }));
  }
  if (MODE === 'firebase') {
    await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: CONFIG_FB }));
    await ctx.route('**/www.gstatic.com/firebasejs/**', (r) => {
      const corps = MODULES[r.request().url().split('/').pop()];
      return corps ? r.fulfill({ contentType: 'text/javascript', body: corps }) : r.fulfill({ status: 404, body: '' });
    });
  }
  return ctx;
}
const erreurs = [];
async function page(ctx, chemin, nom) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erreurs.push(`${nom} : ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts/.test(m.text())) erreurs.push(`${nom} : ${m.text()}`); });
  await p.goto(BASE + chemin);
  return p;
}
const capture = (p, nom) => p.screenshot({ path: join(CAPTURES, `${MODE}-${nom}.png`), fullPage: false });

console.log(`\nMode ${MODE}${MESURE ? ' + mesure' : ''}${IMAGES ? ' + images' : ''} — ${BASE}`);
const ctxProf = await contexte();
const ctxEleve = MODE === 'local' ? ctxProf : await contexte();

// ---------------------------------------------------------------- l'enseignant·e crée la séance
const prof = await page(ctxProf, '/enseignant.html', 'enseignant');
await prof.waitForSelector('#creer');
if (MESURE) await prof.check('#opt-avis');
dit(MESURE ? !(await prof.isDisabled('#opt-avis')) : await prof.isDisabled('#opt-avis'),
  MESURE ? 'collecte allumée : le questionnaire peut être activé' : 'collecte éteinte : le questionnaire est verrouillé');
await prof.click('#creer');
await prof.waitForSelector('#code-seance');
const code = (await prof.textContent('#code-seance')).trim();
dit(/^[A-HJ-KM-NP-Z2-9]{5}$/.test(code), `séance créée, code ${code}`);
await capture(prof, '01-enseignant-vide');

// ---------------------------------------------------------------- une équipe rejoint
const eleve = await page(ctxEleve, `/eleve.html?code=${code}`, 'équipe');
await eleve.waitForSelector('#f-rejoindre');
dit(await eleve.inputValue('#code') === code, 'le code est prérempli depuis le lien');
await capture(eleve, '02-rejoindre');
await eleve.check('input[name=nom][value="Orignal"]');
await eleve.click('button[type=submit]');
await eleve.waitForSelector('#titre');
dit((await eleve.textContent('#titre')).includes('Arriver'), "l'équipe Orignal entre à l'étape 1 : Arriver");

await prof.waitForSelector('[data-equipe="orignal"]', { timeout: 5000 });
dit(true, "l'enseignant·e voit l'équipe apparaître en direct");

// ---------------------------------------------------------------- un deuxième Chromebook prend le même nom
const ctxAutre = MODE === 'local' ? ctxProf : await contexte();
const autre = await page(ctxAutre, `/eleve.html?code=${code}`, 'autre équipe');
await autre.waitForSelector('#f-rejoindre');
await autre.check('input[name=nom][value="Orignal"]');
await autre.click('button[type=submit]');
await autre.waitForSelector('.erreur');
dit(/déjà pris/.test(await autre.textContent('.erreur')), 'un même nom ne peut pas être pris deux fois');
await autre.check('input[name=nom][value="Phoque gris"]');
await autre.click('button[type=submit]');
await autre.waitForSelector('#titre');
dit(true, 'la deuxième équipe entre sous un autre nom');

// ---------------------------------------------------------------- étape 1
const suivant = async (p) => { await p.click('#suivant'); await p.waitForTimeout(120); };
const ecrire = async (p, id, texte) => { await p.fill(`[data-rep="${id}"]`, texte); await p.waitForTimeout(60); };
dit(await eleve.isDisabled('#suivant'), "étape 1 : on ne passe pas sans l'hypothèse");
await ecrire(eleve, 'F1.2', 'Non, des familles y vivaient sûrement.');
dit(!(await eleve.isDisabled('#suivant')), "étape 1 : l'hypothèse écrite débloque la suite");
await capture(eleve, '03-arrivee');
await suivant(eleve);

// ---------------------------------------------------------------- étape 2
for (let i = 0; i < 6; i++) { await eleve.click(`[data-releve="${i}"]`); await eleve.waitForTimeout(50); }
dit(/^https:\/\//.test(await eleve.getAttribute('.trouve .src-l', 'href') || ''), 'étape 2 : chaque relevé donne le lien de sa source');
dit(IMAGES ? await eleve.locator('svg.carte').count() === 1
  : await eleve.locator('.carte--vide').count() === 1 && !(await eleve.locator('svg.carte').count()) && await eleve.locator('.guide .image-vide').count() === 1,
  IMAGES ? 'images : la carte dessinée est là' : 'images à venir : cadres vides pour la carte et la garde-parc, relevés en boutons');
dit(await eleve.isDisabled('#suivant'), 'étape 2 : six relevés ne suffisent pas sans les deux réponses');
await ecrire(eleve, 'F2.1', "Gespe'gewa'gi, le territoire des Mi'gmaq.");
await ecrire(eleve, 'F2.4', 'Des maisons, des chalets, des commerces, des églises et des écoles.');
dit(!(await eleve.isDisabled('#suivant')), 'étape 2 : relevés et réponses débloquent le dossier');
await capture(eleve, '04-exploration');
await suivant(eleve);

// ---------------------------------------------------------------- étape 3
for (const d of ['d2', 'd3', 'd5']) await eleve.click(`[data-doc="${d}"]`);
await suivant(eleve);
dit(await eleve.locator('.verdict').count() === 3, 'étape 3 : trois verdicts affichés');
dit(await eleve.locator('.bravo').count() === 1, 'étape 3 : un « bravo » nomme le geste, sans score');
await ecrire(eleve, 'F3.2', 'Les deux : elles ne comptent pas la même chose.');
await capture(eleve, '05-dossier');
await suivant(eleve);

// ---------------------------------------------------------------- étape 4
await eleve.click('[data-outil="village"]');
await eleve.click('[data-sect="rosiers"]');
await eleve.click('[data-outil="sauvage"]');
await eleve.click('[data-sect="foret"]');
dit(await eleve.locator('.effet').count() === 1, 'étape 4 : le geste affiche aussitôt sa conséquence');
await ecrire(eleve, 'F4.3', 'On garde Cap-des-Rosiers en zone village, le corridor reste continu.');
await capture(eleve, '06-trace');
await suivant(eleve);

// ---------------------------------------------------------------- étape 5
await suivant(eleve); // complication 1
dit(!(await eleve.textContent('#app')).toLowerCase().includes('complication')
  && (await eleve.textContent('.comp .sur')).includes('points de vue'), 'étape 5 : « D\'autres points de vue », le mot « complication » n\'apparaît plus');
dit(await eleve.isDisabled('#suivant'), 'étape 5 : la question de la route bloque la complication suivante');
await ecrire(eleve, 'F5.1', 'Moins bien : la route coupe les passages des animaux.');
await suivant(eleve); await suivant(eleve); await suivant(eleve); // complications 2 à 4
await eleve.click('[data-outil="plein"]');
await eleve.click('[data-sect="penouille"]');
await ecrire(eleve, 'F5.4', "Les Mi'gmaq, depuis des temps immémoriaux.");
await capture(eleve, '07-complications');
await suivant(eleve);

// ---------------------------------------------------------------- l'enseignant·e suit, et envoie un message
await prof.click('[data-equipe="orignal"]');
await prof.waitForSelector('#detail');
const detail = await prof.textContent('#detail');
dit(detail.includes('la route coupe les passages'), "l'enseignant·e lit les réponses de l'équipe en direct");
await capture(prof, '08-enseignant-direct');
await prof.click('[data-signal="temps"]');
await eleve.waitForSelector('#signal:not([hidden])', { timeout: 5000 });
dit((await eleve.textContent('#signal')).includes('5 minutes'), 'le message de l’enseignant·e arrive chez l’équipe');
await capture(eleve, '09-signal');
await eleve.click('[data-fermer-signal]');

// ---------------------------------------------------------------- les réglages, en pleine partie
// Orignal est au bilan (étape 6), Phoque gris encore à l'arrivée (étape 1).
await prof.click('[data-onglet="reglages"]');
await prof.waitForSelector('.rg-barre');
dit(await prof.inputValue('[data-min="dossier"]') === '12', 'réglages : la séance part du format standard (12 min au dossier)');
await prof.selectOption('[data-etatq="F1.2"]', 'facultative');
await prof.selectOption('#f-ajout select[name=etape]', 'arrivee');
await prof.fill('#f-ajout textarea[name=q]', 'Quel animal de Forillon choisiriez-vous comme emblème ?');
await prof.fill('#f-ajout textarea[name=reponse]', 'Toute réponse justifiée.');
await prof.click('#f-ajout button[type=submit]');
await prof.waitForSelector('.rg-q--ajout');
await prof.fill('[data-min="arrivee"]', '2');
await prof.click('details.rg-groupe[data-k="rg|Relevés de terrain"] > summary');
await prof.click('details.rg-item[data-k="rg|releves|0"] > summary');
await prof.fill('[data-corr="releves|0|t"]', 'Relevé corrigé pour le test');
await prof.fill('[data-raison="releves|0|t"]', 'Essai de correction');
dit((await prof.textContent('#ed-etat')).includes('pas encore appliqués'), 'réglages : rien ne part avant « Appliquer »');
await capture(prof, '08b-reglages');
await prof.click('[data-ed="appliquer"]');
await prof.waitForFunction(() => document.querySelector('#ed-etat')?.textContent.includes('Appliqué'));
dit(true, 'réglages appliqués à la séance');

await autre.waitForSelector('text=Quel animal de Forillon', { timeout: 5000 });
dit(true, 'la question ajoutée arrive en direct chez l’équipe à l’arrivée');
dit((await autre.textContent('#scene')).includes('facultative'), 'la question rendue facultative est marquée comme telle');
dit(await autre.isDisabled('#suivant'), 'la question ajoutée, requise, retient l’équipe');
dit(/Il reste environ|Moins d.une minute|Temps prévu dépassé/.test(await autre.textContent('#minutes'))
  && (await autre.getAttribute('#minutes', 'title')).includes('2 min'), 'l’équipe voit le temps qui reste, selon les nouvelles minutes');
await autre.fill('[data-rep^="A"]', 'Le fou de Bassan, il est partout sur les falaises.');
await autre.waitForTimeout(80);
dit(!(await autre.isDisabled('#suivant')), 'répondre à la question ajoutée suffit (F1.2 est facultative)');
await suivant(autre);
await autre.click('[data-releve="0"]');
await autre.waitForTimeout(100);
dit((await autre.textContent('.trouve h3')).includes('Relevé corrigé pour le test'), 'la correction du contenu s’affiche chez l’équipe');
await capture(autre, '09b-reglages-eleve');

await eleve.waitForSelector('.rattrapage', { timeout: 5000 });
dit((await eleve.textContent('.rattrapage')).includes('Quel animal'), 'l’équipe déjà plus loin la retrouve dans « À rattraper »');
await capture(eleve, '09c-rattrapage');
await eleve.fill('.rattrapage [data-rep^="A"]', "L'orignal.");

await prof.click('[data-ed="garder"]');
await prof.waitForFunction(() => document.querySelector('#ed-etat')?.textContent.includes('ta version'));
dit(true, 'les réglages s’enregistrent aussi comme version de l’enseignant·e');
const [dlR] = await Promise.all([prof.waitForEvent('download'), prof.click('[data-ed="exporter"]')]);
const exporte = JSON.parse(await (await import('node:fs/promises')).readFile(await dlR.path(), 'utf8'));
dit(exporte.ajouts.length === 1 && exporte.corrections[0]?.original && exporte.corrections[0].raison === 'Essai de correction'
  && !/Orignal|Phoque|fou de Bassan/.test(JSON.stringify(exporte)), 'l’export garde ajouts et corrections (avec l’original), sans réponse d’équipe');

// le chrono de la classe
await prof.click('[data-onglet="direct"]');
await prof.waitForSelector('[data-chrono="pause"]', { timeout: 8000 });
dit(true, 'le chrono de la classe a démarré avec la première équipe');
await prof.click('[data-chrono="pause"]');
await autre.waitForFunction(() => document.querySelector('#minutes')?.textContent.includes('En pause'), null, { timeout: 5000 });
dit(true, 'pause : les équipes voient « En pause »');
await prof.waitForSelector('[data-chrono="reprendre"]');
await prof.click('[data-chrono="reprendre"]');
await autre.waitForFunction(() => !document.querySelector('#minutes')?.textContent.includes('En pause'), null, { timeout: 5000 });
dit(true, 'reprise : le compte à rebours repart');
await prof.waitForSelector('[data-minutes="marche"][data-delta="5"]');
await prof.click('[data-minutes="marche"][data-delta="5"]');
await autre.waitForFunction(() => document.querySelector('#minutes')?.title.includes('15 min'), null, { timeout: 5000 });
dit(true, '« +5 min » allonge l’étape de la classe, chez les équipes aussi');
await capture(prof, '09d-chrono');

// ---------------------------------------------------------------- le dossier documentaire
await prof.click('[data-onglet="dossier"]');
await prof.waitForSelector('.dossier');
const nDossier = await prof.locator('.dossier .dd-item').count();
dit(nDossier === 26 && await prof.locator('.dossier .dd-item--surprise').count() === 9,
  `dossier complet : ${nDossier} éléments, les surprises signalées`);
dit(await prof.locator('.dossier .dd-cite a[href^="https://"]').count() >= 30 && (await prof.textContent('.dossier')).includes('Traduction libre'),
  'chaque source a sa copie, son lien, et sa traduction si elle est en anglais');
dit((await prof.textContent('.dossier')).includes('Relevé corrigé pour le test'), 'les corrections de la séance s’appliquent au dossier');
await prof.evaluate(() => { window.__printAvant = window.print; window.print = () => { window.__dossierImprime = (window.__dossierImprime || 0) + 1; }; });
await prof.click('[data-dossier-imprimer="devoir"]');
const papierDevoir = await prof.textContent('#papier');
dit(await prof.evaluate(() => window.__dossierImprime) === 1 && papierDevoir.includes('Version devoir')
  && !papierDevoir.includes('La route 132 traverse le parc') && papierDevoir.includes('Le passage vers'),
  'version devoir imprimée : le portrait et le dossier, sans les points de vue');
await prof.evaluate(() => window.dispatchEvent(new Event('afterprint')));
await prof.click('[data-dossier-imprimer="complet"]');
dit((await prof.textContent('#papier')).includes('La route 132 traverse le parc'), 'dossier complet imprimé, points de vue compris');
await prof.emulateMedia({ media: 'print' });
await prof.pdf({ path: join(CAPTURES, `${MODE}-dossier-complet.pdf`), format: 'Letter', printBackground: true });
await prof.emulateMedia({ media: 'screen' });
await prof.evaluate(() => { window.dispatchEvent(new Event('afterprint')); window.print = window.__printAvant; });
const lienDossier = (await prof.textContent('#lien-dossier')).trim();
dit(lienDossier.endsWith(`dossier.html?code=${code}`), 'le lien de la version devoir porte le code de la séance');
const dd = await page(ctxEleve, `/dossier.html?code=${code}`, 'dossier devoir');
await dd.waitForSelector('.dossier');
const ddTexte = await dd.textContent('.dossier');
dit(ddTexte.includes('Version devoir') && !ddTexte.includes('La route 132 traverse le parc') && ddTexte.includes('Relevé corrigé pour le test')
  && !(await dd.locator('.dd-leg').count()), 'la page devoir : sans surprises, corrigée, sans pastilles par défaut');
await dd.check('#pastilles');
dit(await dd.locator('.dd-leg .pastille').count() > 4 && await dd.locator('.dd-item .pastille').count() > 4, 'pastilles : chaque document dit à quelle question il sert');
await capture(dd, '09e-dossier-devoir');
await dd.close();
await prof.click('[data-onglet="direct"]');

// ---------------------------------------------------------------- l'affichage : clair, sombre, contraste élevé
const theme = (p) => p.evaluate(() => document.documentElement.dataset.theme);
dit(await theme(autre) === 'light' && await autre.inputValue('[data-theme-select]') === 'auto', 'affichage automatique par défaut (ordinateur en clair)');
await autre.emulateMedia({ colorScheme: 'dark' });
await autre.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
dit(true, 'en automatique, l’ordinateur passe en sombre : la page aussi');
await autre.emulateMedia({ colorScheme: 'light', contrast: 'more' });
await autre.waitForFunction(() => document.documentElement.dataset.theme === 'contrast');
dit(true, 'en automatique, l’ordinateur demande plus de contraste : contraste élevé');
await autre.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
for (const [t, nomT] of [['light', 'clair'], ['dark', 'sombre'], ['contrast', 'contraste']]) {
  await autre.selectOption('[data-theme-select]', t);
  await prof.selectOption('[data-theme-select]', t);
  dit(await theme(autre) === t && await theme(prof) === t, `affichage ${nomT} choisi, chez l’équipe et chez l’enseignant·e`);
  const fond = await autre.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await capture(autre, `16-${nomT}-eleve`); await capture(prof, `16-${nomT}-prof`);
  if (t === 'contrast') dit(fond === 'rgb(255, 255, 255)', 'contraste élevé : fond blanc, texte noir');
}
await autre.emulateMedia({ colorScheme: 'dark' });
await autre.waitForTimeout(100);
dit(await theme(autre) === 'contrast', 'un choix fait à la main ne bouge plus avec l’ordinateur');
await autre.reload();
await autre.waitForSelector('#titre');
dit(await theme(autre) === 'contrast', 'le choix d’affichage tient après un rafraîchissement');
await prof.evaluate(() => { window.__printTheme = null; window.__printAvant = window.print;
  window.print = () => { window.__printTheme = document.documentElement.dataset.theme; }; });
await prof.click('[data-rapport]');
await prof.evaluate(() => window.dispatchEvent(new Event('afterprint')));
dit(await prof.evaluate(() => window.__printTheme) === 'light' && await theme(prof) === 'contrast',
  'le rapport s’imprime en clair, puis l’écran revient au contraste élevé');
await prof.evaluate(() => { window.print = window.__printAvant; });
for (const p of [autre, prof]) await p.selectOption('[data-theme-select]', 'auto');
await autre.emulateMedia({ colorScheme: 'light' });

// ---------------------------------------------------------------- étape 6, puis rafraîchissement : la partie reprend
await ecrire(eleve, 'F6.1', "Tout le territoire ; nous, on garde un village.");
await eleve.waitForTimeout(1600); // laisse partir l'envoi différé
await eleve.reload();
await eleve.waitForSelector('#titre');
dit((await eleve.textContent('#titre')).includes('La décision de 1970'), 'après un rafraîchissement, l’équipe reprend à « La décision de 1970 »');
dit((await eleve.inputValue('[data-rep="F6.1"]')).includes('Tout le territoire'), 'et retrouve sa réponse');
await capture(eleve, '10-bilan');
await suivant(eleve);

// ---------------------------------------------------------------- étape 7
await eleve.click('#d-sources summary');
await eleve.waitForTimeout(150);
await capture(eleve, '11-debrief');
await suivant(eleve);
if (MESURE) {
  await eleve.waitForSelector('[data-avis="q1"]');
  dit(true, 'collecte allumée : l’étape « Ton avis » suit le débrief');
  for (const q of ['q1', 'q2', 'q4', 'q5']) await eleve.click(`[data-avis="${q}"][data-val="4"]`);
  await eleve.click('[data-avis="q3"][data-val="1"]');
  await eleve.fill('[data-avis-t="q7"]', 'La route 132.');
  await suivant(eleve);
  await eleve.waitForSelector('.merci-t');
  dit(true, 'un avis est envoyé, sans nom');
} else {
  await eleve.waitForSelector('.merci-t');
  dit(true, 'la partie se termine sur un écran de fin');
}

// ---------------------------------------------------------------- l'espace enseignant·e
if (MODE === 'firebase') console.log(`  · une partie complète a écrit ${fauxFb.etat().ecritures} fois dans la base`);
await prof.click('[data-onglet="debrief"]');
await prof.waitForTimeout(300);
const db = await prof.textContent('#prof');
dit(db.includes("Les Mi'gmaq, depuis des temps immémoriaux"), 'le débrief rassemble les réponses des équipes');
await capture(prof, '12-enseignant-debrief');
for (const o of ['questions', 'deroulement', 'mesures', 'questionnaire']) {
  await prof.click(`[data-onglet="${o}"]`); await prof.waitForTimeout(150);
}
await prof.click('[data-onglet="questions"]');
dit(await prof.locator('.bq').count() === 29, 'les 28 questions de la banque et la question ajoutée sont dans l’onglet Questions');
await capture(prof, '13-enseignant-questions');
await prof.click('[data-onglet="mesures"]');
dit(await prof.locator('.tab').first().locator('th').count() === 3, 'les mesures montrent une colonne par équipe');
dit(MESURE ? !(await prof.isDisabled('[data-export]')) : await prof.isDisabled('[data-export]'),
  MESURE ? 'export CSV disponible' : 'export CSV verrouillé tant que la collecte est éteinte');
if (MESURE) {
  const [dl] = await Promise.all([prof.waitForEvent('download'), prof.click('[data-export]')]);
  const csv = await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8');
  dit(csv.split('\n').length === 3 && !/Orignal|Phoque/.test(csv), 'le CSV a une ligne par équipe et aucun nom');
  await prof.click('[data-onglet="questionnaire"]');
  await prof.waitForTimeout(300);
  dit((await prof.textContent('#prof')).includes('4,0 / 4 (1)'), 'l’enseignant·e voit le résultat du questionnaire');
}

// ---------------------------------------------------------------- le rapport de séance
await prof.evaluate(() => { window.print = () => { window.__imprime = (window.__imprime || 0) + 1; }; });
await prof.click('[data-onglet="direct"]');
await prof.click('[data-rapport]');
dit(await prof.evaluate(() => window.__imprime) === 1, 'le rapport de séance part à l’impression');
const rapport = await prof.textContent('#papier');
dit(rapport.includes('Équipe Orignal') && rapport.includes("Les Mi'gmaq, depuis des temps immémoriaux")
  && rapport.includes('Le temps, étape par étape'), 'le rapport contient la classe, le temps et les réponses de chaque équipe');
dit(rapport.includes('Réglages de la séance') && rapport.includes('Essai de correction') && rapport.includes('Quel animal'),
  'le rapport dit dans quels réglages on a joué (questions ajoutées, corrections)');
await prof.emulateMedia({ media: 'print' });
await prof.pdf({ path: join(CAPTURES, `${MODE}-rapport.pdf`), format: 'Letter', printBackground: true });
await prof.emulateMedia({ media: 'screen' });
await prof.evaluate(() => window.dispatchEvent(new Event('afterprint')));
dit(!(await prof.evaluate(() => document.body.classList.contains('imprime'))), 'après l’impression, l’écran revient');

// ---------------------------------------------------------------- petit écran
const ctxPetit = await contexte(400, 820);
if (MODE === 'local') {
  // en local, la séance vit dans le stockage du premier contexte : on vérifie seulement la mise en page
}
const petit = await page(ctxPetit, '/eleve.html', 'petit écran');
await petit.waitForSelector('#f-rejoindre');
const deborde = await petit.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
dit(!deborde, 'à 400 px de large, la page ne déborde pas');
await capture(petit, '14-petit-ecran');

// ---------------------------------------------------------------- effacer la séance
await prof.click('[data-onglet="direct"]');
await prof.click('[data-effacer="demander"]');
await prof.click('[data-effacer="oui"]');
await prof.waitForSelector('#creer', { timeout: 8000 });
dit(true, 'la séance est effacée ; l’espace propose d’en créer une nouvelle');
await autre.waitForSelector('#signal:not([hidden])', { timeout: 5000 });
dit((await autre.textContent('#signal')).includes('terminée'), 'les équipes encore en jeu voient « séance terminée »');
if (MODE === 'firebase') dit(fauxFb.etat().documents === fauxFb.lireCollection('enseignants').length,
  'plus aucune donnée de séance dans la base (reste la version du jeu de l’enseignant·e)');
await prof.waitForSelector('#creer');

// ---------------------------------------------------------------- la version de l'enseignant·e sert à la séance suivante
dit((await prof.textContent('#prof')).includes('1 question ajoutée'), 'l’accueil résume la version du jeu de l’enseignant·e');
await prof.check('input[name=format][value="courte"]');
await prof.click('#creer');
await prof.waitForSelector('#code-seance');
const code2 = (await prof.textContent('#code-seance')).trim();
await prof.click('[data-onglet="reglages"]');
await prof.waitForSelector('.rg-barre');
dit(await prof.inputValue('[data-min="marche"]') === '7' && (await prof.textContent('#prof')).includes('Quel animal')
  && (await prof.textContent('#prof')).includes('1 corrigé'), 'nouvelle séance en 50 min : minutes du format, questions ajoutées et corrections reprises');
await capture(prof, '14b-nouvelle-seance-courte');
// rétablir l'original : la correction doit disparaître pour de bon (pas une fusion qui la garderait)
await prof.evaluate(() => document.querySelectorAll('details.rg-groupe, details.rg-item').forEach((d) => { d.open = true; }));
await prof.click('[data-retablir="releves|0|t"]');
await prof.click('[data-ed="appliquer"]');
await prof.waitForFunction(() => document.querySelector('#ed-etat')?.textContent.includes('Appliqué'));
await prof.click('[data-ed="garder"]');
await prof.waitForFunction(() => document.querySelector('#ed-etat')?.textContent.includes('ta version'));
if (MODE === 'firebase') dit(Object.keys(fauxFb.lire(`seances/${code2}`).config.corrections).length === 0
  && Object.keys(fauxFb.lireCollection('enseignants')[0].reglages.corrections).length === 0,
  'une correction retirée disparaît vraiment de la séance et de la version');
await prof.click('[data-onglet="direct"]');
await prof.click('[data-effacer="demander"]');
await prof.click('[data-effacer="oui"]');
await prof.waitForSelector('#creer', { timeout: 8000 });
dit(!(await prof.locator(`[data-ouvrir="${code2}"]`).count()), 'et elle s’efface comme les autres');
dit((await prof.textContent('#prof')).includes('0 correction'), 'l’accueil voit la correction retirée de la version');
await prof.click('[data-ma-version]');
await prof.waitForSelector('[data-ed="enregistrer"]');
await prof.fill('[data-min="debrief"]', '20');
await capture(prof, '14c-ma-version');
await prof.click('[data-ed="enregistrer"]');
await prof.waitForFunction(() => document.querySelector('#ed-etat')?.textContent.includes('Enregistré'));
await prof.click('[data-retour]');
await prof.waitForSelector('#creer');
dit((await prof.textContent('#prof')).includes('61 min en tout'), '« Ma version » se modifie depuis l’accueil (50 min + 11 au débrief)');

// ---------------------------------------------------------------- la séance de démonstration (mode local)
if (MODE === 'local') {
  await prof.click('[data-demo]');
  await prof.waitForSelector('#code-seance');
  await prof.waitForFunction(() => document.querySelectorAll('[data-equipe]').length === 4, null, { timeout: 8000 });
  const codeDemo = (await prof.textContent('#code-seance')).trim();
  const ligne = (id) => prof.textContent(`[data-equipe="${id}"]`);
  dit((await ligne('fou-de-bassan')).includes('Revenir sur sa démarche') && (await ligne('castor')).includes('Faire le portrait'),
    'démonstration : quatre équipes, à des étapes différentes');
  dit(await prof.locator('[data-equipe="orignal"] .t--alerte').count() === 1, 'démonstration : une équipe au-delà du temps prévu, signalée');
  dit(/^(39|40|41) min/.test((await prof.textContent('#chrono')).trim()), 'démonstration : le chrono de la classe tourne depuis 40 min');
  await capture(prof, '16-demonstration');
  await prof.click('[data-onglet="debrief"]');
  dit((await prof.textContent('#prof')).includes('Personne leur a demandé leur avis'), 'démonstration : le débrief montre les réponses des équipes');
  await capture(prof, '16b-demonstration-debrief');
  const ve = await page(ctxEleve, `/eleve.html?code=${codeDemo}`, 'équipe de démonstration');
  await ve.waitForSelector('#f-rejoindre');
  await ve.check('input[name=nom][value="Lynx"]');
  await ve.click('button[type=submit]');
  await ve.waitForSelector('#titre');
  await prof.click('[data-onglet="direct"]');
  await prof.waitForSelector('[data-equipe="lynx"]', { timeout: 5000 });
  dit(true, 'démonstration : une vraie équipe peut la rejoindre');
  await ve.close();
  await prof.click('[data-effacer="demander"]');
  await prof.click('[data-effacer="oui"]');
  await prof.waitForSelector('#creer', { timeout: 8000 });
} else {
  dit(!(await prof.locator('[data-demo]').count()), 'en ligne, pas de séance de démonstration (les règles l’interdiraient)');
}

// ---------------------------------------------------------------- l'enseignant·e et son compte Google
if (MODE === 'local') {
  dit((await prof.textContent('#prof')).includes('pas de compte. La connexion Google'), 'en local, pas de connexion Google proposée');
} else {
  const ctxA = await contexte(), ctxB = await contexte(), ctxC = await contexte();
  const pa = await page(ctxA, '/enseignant.html', 'ordinateur 1');
  await pa.click('[data-google]');
  await pa.waitForSelector('[data-deconnexion]');
  dit((await pa.textContent('#prof')).includes('Connecté·e avec Google'), 'l’enseignant·e se connecte avec Google');
  await pa.click('#creer');
  await pa.waitForSelector('#code-seance');
  const code1 = (await pa.textContent('#code-seance')).trim();
  await pa.click('[data-retour]');
  await pa.waitForSelector('#mes-seances');
  dit((await pa.textContent('#mes-seances')).includes(code1), 'la séance apparaît dans « Tes séances »');
  await capture(pa, '15-tes-seances');

  const pb = await page(ctxB, '/enseignant.html', 'ordinateur 2');
  await pb.waitForSelector('[data-google]');
  dit(!(await pb.locator('#mes-seances').count()), 'sur un autre ordinateur, sans compte : aucune séance');
  await pb.click('[data-google]');
  await pb.waitForSelector('#mes-seances');
  dit((await pb.textContent('#mes-seances')).includes(code1), 'avec le même compte Google : la séance est retrouvée');
  await pb.click(`[data-ouvrir="${code1}"]`);
  await pb.waitForSelector('#code-seance');
  dit((await pb.textContent('#code-seance')).trim() === code1, 'et elle s’ouvre, avec le suivi en direct');

  const pc = await page(ctxC, '/enseignant.html', 'ordinateur 3');
  await pc.click('#creer');
  await pc.waitForSelector('#code-seance');
  const code3 = (await pc.textContent('#code-seance')).trim();
  await pc.click('[data-retour]');
  await pc.click('[data-google]');
  await pc.waitForSelector('#mes-seances');
  dit((await pc.textContent('#mes-seances')).includes(code3), 'une séance créée avant la connexion reste à l’enseignant·e (compte relié)');

  const base = JSON.stringify(fauxFb.lireCollection('seances'));
  dit(!/enseignante@exemple|Enseignante Test/.test(base), 'ni le nom ni le courriel de l’enseignant·e ne sont dans la base');

  for (const [p, cd] of [[pb, code1], [pc, code3]]) {
    if (p === pb) await p.click('[data-retour]');
    await p.waitForSelector(`[data-effacer-liste="${cd}"]`);
    await p.click(`[data-effacer-liste="${cd}"]`);
    await p.click(`[data-effacer-liste="${cd}"][data-confirme]`);
    await p.waitForFunction((x) => !document.querySelector(`[data-ouvrir="${x}"]`), cd);
  }
  dit(fauxFb.lireCollection('seances').length === 0, 'les séances s’effacent depuis la liste');
  await pc.click('[data-deconnexion]');
  await pc.waitForSelector('[data-google]');
  dit(true, 'la déconnexion ramène au bouton Google');
}

// ---------------------------------------------------------------- les bulles d'aide, la première fois
if (MODE === 'local') {
  const ctxA = await navigateur.newContext({ viewport: { width: 1366, height: 768 }, locale: 'fr-CA', serviceWorkers: 'block' });
  await ctxA.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '' }));
  const pa = await page(ctxA, '/index.html', 'aide');
  await pa.waitForTimeout(1500);
  dit(!(await pa.locator('.aide-bulle:not([hidden]), [data-aide]').count()), 'aide : l’accueil s’explique seul, ni bulle ni bouton « ? »');
  await pa.goto(BASE + '/enseignant.html');
  const bulle = (id) => pa.waitForSelector(`.aide-bulle[data-bulle="${id}"]:not([hidden])`, { timeout: 5000 });
  await bulle('aide');           // « Créer la séance » est plus bas : d'abord le bouton « ? », visible
  dit((await pa.textContent('.aide-t')).includes('ce bouton'), 'aide : la première bulle montre le bouton « ? » qui les ramène');
  await pa.click('.aide-ok');
  await pa.locator('#creer').scrollIntoViewIfNeeded();
  await bulle('en-creer');       // elle attend que l'élément soit à l'écran
  const [b, cr] = await Promise.all([pa.locator('.aide-bulle').boundingBox(), pa.locator('#creer').boundingBox()]);
  const chevauche = !(b.y >= cr.y + cr.height || b.y + b.height <= cr.y || b.x >= cr.x + cr.width || b.x + b.width <= cr.x);
  dit(!chevauche && (await pa.textContent('.aide-t')).split(/\s+/).length <= 8,
    'aide : une bulle courte, collée au bouton qu’elle explique, sans le cacher');
  await capture(pa, '18-aide-premiere-fois');
  await pa.click('#creer');     // la bulle ne bloque rien : on agit, elle s’efface
  await pa.waitForSelector('#code-seance');
  dit(!(await pa.locator('.aide-bulle[data-bulle="en-creer"]:not([hidden])').count()), 'aide : agir ferme la bulle');
  await bulle('en-code');
  dit(true, 'aide : la bulle suivante vient seule, sur le nouvel écran');
  await capture(pa, '18b-aide-seance');
  await pa.click('.aide-ok');
  await bulle('en-signal');
  await pa.keyboard.press('Escape');
  await bulle('en-reglages');
  await pa.click('.aide-stop');
  await pa.waitForTimeout(1600);
  dit(!(await pa.locator('.aide-bulle:not([hidden])').count()), 'aide : « Arrêter l’aide » les coupe toutes');
  await pa.reload();
  await pa.waitForSelector('#code-seance');
  await pa.waitForTimeout(1600);
  dit(!(await pa.locator('.aide-bulle:not([hidden])').count()), 'aide : coupée, elle le reste après un rechargement');
  await pa.click('[data-aide]');
  await bulle('en-code');
  dit(true, 'aide : le bouton « ? » ramène les bulles de la page');
  const codeA = (await pa.textContent('#code-seance')).trim();
  const ea = await page(ctxA, `/eleve.html?code=${codeA}`, 'aide équipe');
  await ea.waitForSelector('#f-rejoindre');
  await ea.check('input[name=nom][value="Lynx"]');
  await ea.click('button[type=submit]');
  await ea.waitForSelector('.aide-bulle[data-bulle="el-prog"]:not([hidden])', { timeout: 5000 });
  const [bp, sv] = await Promise.all([ea.locator('.aide-bulle').boundingBox(), ea.locator('#suivant').boundingBox()]);
  dit(bp.y + bp.height <= sv.y || bp.y >= sv.y + sv.height, 'aide : côté équipe, la première bulle ne cache pas « Continuer »');
  await capture(ea, '18c-aide-equipe');
  await ctxA.close();
}

// ---------------------------------------------------------------- hors ligne : le Wi-Fi décroche
{
  const sw = await readFile(join(PUBLIC, 'sw.js'), 'utf8');
  const coquille = new Set(JSON.parse(sw.match(/const COQUILLE = (\[[^\]]*\])/)[1].replace(/'/g, '"')));
  const fichiers = (await readdir(PUBLIC, { recursive: true, withFileTypes: true }))
    .filter((f) => f.isFile()).map((f) => join(f.parentPath ?? f.path, f.name).slice(PUBLIC.length + 1).replace(/\\/g, '/'))
    .filter((f) => !['sw.js', 'robots.txt', '.nojekyll'].includes(f));
  const oublis = fichiers.filter((f) => !coquille.has(f));
  dit(!oublis.length && fichiers.length + 1 === coquille.size,
    `chaque fichier du site est gardé pour le hors-ligne (sw.js)${oublis.length ? ' — manquent : ' + oublis.join(', ') : ''}`);
}
if (MODE === 'local') {
  // un serveur à part, qu'on éteint : la preuve que la page vient bien de la copie gardée
  const s2 = createServer(servir);
  await new Promise((r) => s2.listen(0, r));
  const B2 = `http://localhost:${s2.address().port}`;
  const ctxHL = await navigateur.newContext({ viewport: { width: 1366, height: 768 }, locale: 'fr-CA', serviceWorkers: 'allow' });
  await ctxHL.addInitScript(SANS_AIDE);
  await ctxHL.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '' }));
  const hl = await ctxHL.newPage();
  hl.on('pageerror', (e) => erreurs.push(`hors ligne : ${e.message}`));
  await hl.goto(B2 + '/eleve.html');
  await hl.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await hl.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 8000 });
  const gardes = await hl.evaluate(async () => (await (await caches.open('olp-dev')).keys()).length);
  dit(gardes >= 24, `la première visite garde une copie du site (${gardes} fichiers)`);
  s2.closeAllConnections(); s2.close();
  await ctxHL.setOffline(true);
  await hl.reload();
  await hl.waitForSelector('#f-rejoindre', { timeout: 8000 });
  dit(await hl.isVisible('.horsligne'), 'sans réseau ni serveur, la page des équipes se recharge, avec le bandeau « Hors ligne »');
  await capture(hl, '17-hors-ligne');
  await hl.goto(B2 + '/enseignant.html');
  await hl.click('#creer');
  await hl.waitForSelector('#code-seance', { timeout: 8000 });
  const codeHL = (await hl.textContent('#code-seance')).trim();
  await hl.goto(`${B2}/eleve.html?code=${codeHL}`);
  await hl.check('input[name=nom][value="Castor"]');
  await hl.click('button[type=submit]');
  await hl.waitForSelector('#titre', { timeout: 8000 });
  dit((await hl.textContent('#titre')).includes('Arriver'), 'hors ligne, une séance se crée et une équipe la rejoint (démonstration)');
  const [pied, bande] = await Promise.all(['.pied', '.horsligne'].map((x) => hl.locator(x).boundingBox()));
  dit(pied && bande && pied.y + pied.height <= bande.y + 1, 'le bandeau ne cache pas la barre « Suivant »');
  await capture(hl, '17b-hors-ligne-jeu');
  await ctxHL.setOffline(false);
  await hl.waitForFunction(() => document.querySelector('.horsligne')?.hidden === true);
  dit(true, 'le réseau revient : le bandeau disparaît');
  await ctxHL.close();
}

dit(erreurs.length === 0, `aucune erreur dans la console${erreurs.length ? ' :\n    ' + erreurs.join('\n    ') : ''}`);
await navigateur.close();
serveur.close(); fauxFb.fermer();
console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nTout passe.');
process.exit(echecs ? 1 : 0);
