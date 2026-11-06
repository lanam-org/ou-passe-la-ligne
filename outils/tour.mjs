// tour.mjs — une partie entière en captures d'écran, pour relire l'interface (ce n'est pas un test).
//   node outils/tour.mjs [dossier] [largeur] [hauteur]     par défaut : outils/captures/tour, 1366 × 768 (un Chromebook)
// Joue une équipe de bout en bout (avec le geste du tracé : un secteur, puis sa zone), puis l'espace enseignant·e :
// le suivi en direct, la séance de démonstration, « Avancer ensemble » et le détail de deux équipes.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ICI = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ICI, '..', 'public');
const OUT = process.argv[2] || join(ICI, 'captures', 'tour');
const L = Number(process.argv[3] || 1366), H = Number(process.argv[4] || 768);
await mkdir(OUT, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const sansFb = (t) => t.replace(/export const firebase = \{[\s\S]*?\};/, 'export const firebase = {};');
const srv = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    let corps = p === '/js/config.js' ? sansFb(await readFile(join(PUBLIC, p), 'utf8')) : await readFile(join(PUBLIC, p));
    if (p === '/js/config.js' && process.env.TOUR_IMAGES) corps = corps.replace('export const images = false;', 'export const images = true;');
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(corps);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(0, r));
const BASE = `http://localhost:${srv.address().port}`;
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: L, height: H }, locale: 'fr-CA', serviceWorkers: 'block' });
await ctx.addInitScript((theme) => { try { localStorage.setItem('forillon:aide', '{"vus":[],"off":true}'); if (theme) localStorage.setItem('forillon:theme', theme); } catch {} }, process.env.TOUR_THEME || '');
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '' }));
const erreurs = [];
const ouvrir = async (chemin) => { const p = await ctx.newPage(); p.on('pageerror', (e) => erreurs.push(e.message)); await p.goto(BASE + chemin); return p; };
let n = 0;
const cap = async (p, nom, full = false) => { n++; await p.waitForTimeout(250); await p.screenshot({ path: join(OUT, `${String(n).padStart(2, '0')}-${nom}.png`), fullPage: full }); };

const prof = await ouvrir('/enseignant.html');
await prof.waitForSelector('#creer');
await prof.click('#creer');
await prof.waitForSelector('#code-seance');
const code = (await prof.textContent('#code-seance')).trim();
const el = await ouvrir(`/eleve.html?code=${code}`);
await el.waitForSelector('#f-rejoindre');
await el.check('input[name=nom][value="Orignal"]');
await el.click('button[type=submit]');
await el.waitForSelector('#titre');
await el.waitForTimeout(1800);
if (await el.locator('.grande-q').count()) { await cap(el, 'question'); await el.click('#suivant'); await el.waitForTimeout(300); }
await cap(el, 'arrivee');
await cap(el, 'arrivee-pleine', true);
const S = async () => { await el.click('#suivant'); await el.waitForTimeout(1600); };
const fill = async (id, t) => { const l = el.locator(`[data-rep="${id}"]`); if (await l.count()) await l.fill(t); };
await fill('F1.2', 'Non, des familles y vivaient.');
await S();
await cap(el, 'marche-debut');
for (let i = 0; i < 6; i++) { await el.click(`[data-releve="${i}"]`); await el.waitForTimeout(80); }
await fill('F2.1', "Gespe'gewa'gi."); await fill('F2.4', 'Des maisons.');
await cap(el, 'marche-fin'); await cap(el, 'marche-pleine', true);
await S();
await cap(el, 'dossier'); await cap(el, 'dossier-plein', true);
for (const d of ['d2', 'd3', 'd7']) await el.click(`[data-doc="${d}"]`);
await S();
await cap(el, 'verdicts'); await cap(el, 'verdicts-plein', true);
await fill('F3.2', 'Les deux.');
await S();
await cap(el, 'trace'); await cap(el, 'trace-plein', true);
{
  await el.click('[data-sect="rosiers"]'); await el.waitForTimeout(200); await cap(el, 'trace-secteur-choisi');
  await el.click('[data-zone="village"]'); await el.waitForTimeout(200);
  for (const [s, z] of [['anse', 'preservation'], ['morris', 'sauvage'], ['penouille', 'plein'], ['grave', 'village'], ['ship', 'hors'], ['foret', 'preservation']]) {
    await el.click(`.trace-carte [data-sect="${s}"]`); await el.waitForTimeout(80); await el.click(`[data-zone="${z}"]`); await el.waitForTimeout(80);
  }
}
await cap(el, 'trace-geste');
await fill('F4.3', 'On garde Cap-des-Rosiers.');
await S();
await cap(el, 'comp-0');
for (let i = 0; i < 4; i++) { await S(); await fill('F5.1', 'Moins bien.'); await fill('F5.4', "Les Mi'gmaq."); await cap(el, `comp-${i + 1}`); }
await cap(el, 'comp-plein', true);
await S();
await cap(el, 'bilan'); await cap(el, 'bilan-plein', true);
await fill('F6.1', 'Ils ont tout pris.');
await S();
await cap(el, 'debrief'); await cap(el, 'debrief-plein', true);
await S();
await cap(el, 'fin'); await cap(el, 'fin-pleine', true);
// l'enseignant·e
await prof.bringToFront();
await prof.waitForTimeout(800);
await cap(prof, 'prof-direct', true);
const eq = prof.locator('[data-equipe="orignal"]');
if (await eq.count()) { await eq.click(); await prof.waitForTimeout(500); await cap(prof, 'prof-detail', true); }
// la démonstration : quatre équipes à des étapes différentes ; le détail d'une équipe bloquée
await prof.click('[data-retour="1"]');
await prof.waitForSelector('[data-demo]');
await prof.click('[data-demo]');
await prof.waitForFunction(() => document.querySelectorAll('[data-equipe]').length >= 4, null, { timeout: 8000 });
await prof.click('input[data-rythme]'); await prof.waitForTimeout(500);
await prof.locator('.rythme').scrollIntoViewIfNeeded(); await cap(prof, 'prof-rythme');
for (const id of ['orignal', 'phoque-gris']) {
  await prof.click(`[data-equipe="${id}"]`); await prof.waitForSelector('#detail');
  await prof.locator('#detail').scrollIntoViewIfNeeded(); await prof.evaluate(() => document.querySelector('#detail').scrollIntoView({ block: 'start' }));
  await cap(prof, `prof-detail-${id}`);
}
console.log(erreurs.length ? 'ERREURS\n' + erreurs.join('\n') : 'ok', n, 'captures dans', OUT);
await nav.close(); srv.close();
