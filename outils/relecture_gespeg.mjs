// relecture_gespeg.mjs — le dossier de relecture pour la Nation Micmac de Gespeg.
//
//   node outils/relecture_gespeg.mjs      (ou : npm run relecture)
//
// Rassemble, tels que les élèves et l'enseignant·e les lisent, tous les passages du jeu qui parlent
// des Mi'gmaq, de Gespe'gewa'gi ou de la Nation : relevés, documents, point de vue, bilan, questions
// et réponses attendues, notes pour l'enseignant·e, textes de l'interface. Chaque passage est numéroté
// et suivi d'un cadre « Vos remarques ». Sortie : outils/relecture/relecture-gespeg.html et .pdf.
//
// Le contenu vient de public/contenu/ : après une correction, relancer pour un dossier à jour.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ICI, '..', 'public');
const SORTIE = join(ICI, 'relecture');
const lireJSON = async (f) => JSON.parse(await readFile(join(PUBLIC, 'contenu', f), 'utf8'));
const c = await lireJSON('forillon.json');
const guide = await lireJSON('guide.json');
c.banque = c.banque.map((q) => ({ ...q, ...guide.banque[q.id] }));

// Ce qui fait entrer un passage dans le dossier, et ce qui y est surligné
const REPERES = /mi.?gmaq|micmac|mi.?kmaq|gespe.?gewa.?gi|gespeg|autochtones?|premières nations|\bnations?\b|ancestra\w*|non cédé|ancêtres?|temps immémoriaux/gi;
const touche = (o) => { REPERES.lastIndex = 0; return REPERES.test(JSON.stringify(o)); };

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
const texte = (t) => String(t ?? '').replace(/<[^>]+>/g, '');          // le HTML d'origine (<b>…) devient du texte
const surligne = (t) => esc(texte(t)).replace(REPERES, (m) => `<mark>${m}</mark>`);
const norme = (t) => texte(t).replace(/\s+/g, ' ').trim();   // deux formulations qui ne diffèrent que par les espaces
const etape = (id) => { const x = c.etapes.find((e) => e.id === id); return x ? `Étape ${x.n} · ${x.t}` : ''; };
const etapeQuestion = (q) => q.etape || c.etapes[Number(q.id[1]) - 1]?.id;

const remarques = '<div class="rem"><p>Vos remarques</p><div class="lignes"></div></div>';
const copies = (l = []) => !l.length ? '' : `<div class="copie"><p class="sur">Ce que dit la source</p>${l.map((q) =>
  `<blockquote><p>« ${surligne(q.q)} »</p>${q.trad ? `<p class="trad">Traduction libre : « ${surligne(q.trad)} »</p>` : ''}
    <p class="cite">— ${esc(q.src)}${q.url ? ` · <span class="url">${esc(q.url)}</span>` : ''}</p></blockquote>`).join('')}</div>`;
const questionsLiees = (ids = []) => {
  const qs = ids.map((id) => c.banque.find((q) => q.id === id)).filter(Boolean);
  return !qs.length ? '' : `<p class="lie">Sert aux questions : ${qs.map((q) => `${esc(q.id)} (« ${surligne(q.eleve || q.q)} »)`).join(' · ')}</p>`;
};
// Un passage : son lieu dans le jeu, son titre, son texte. Numéroté au rendu, dans l'ordre du dossier.
const passage = (p) => p;
let numero = 0;
const rendu = ({ ou, titre, corps }) => `<article class="item"><p class="ou"><span class="n">${++numero}</span>${esc(ou)}</p>
  ${titre ? `<h3>${surligne(titre)}</h3>` : ''}${corps}${remarques}</article>`;

// ---------------------------------------------------------------- ce que lisent les élèves
const releves = c.releves.map((r, i) => [r, i]).filter(([r]) => touche(r)).map(([r, i]) => passage({
  ou: `${etape('marche')} · relevé ${i + 1} sur ${c.releves.length}${r.surprise ? ' · surprise' : ''}`, titre: r.t,
  corps: `<p class="x">${surligne(r.x)}</p><p class="src">Source citée : ${esc(r.s)}</p>${copies(r.copie)}${questionsLiees(r.sert)}`
}));
const documents = c.documents.filter(touche).map((d) => passage({
  ou: `${etape('dossier')} · document ${d.id.slice(1)} sur ${c.documents.length} (${d.genre})${d.surprise ? ' · surprise' : ''}`, titre: d.t,
  corps: `<p class="x">${surligne(d.x)}</p><p class="src">Source citée : ${esc(d.s)}</p>
    <p class="verdict"><b>Verdict affiché après le tri (${d.utile ? 'utile' : 'hors sujet'})</b> : ${surligne(d.v)}</p>${copies(d.copie)}${questionsLiees(d.sert)}`
}));
const pointsDeVue = c.complications.filter(touche).map((x) => passage({
  ou: `${etape('comp')} · ${texte(x.sur)}`, titre: x.t,
  corps: `<p class="x">${surligne(x.x)}</p><p class="consigne"><b>La consigne</b> : ${surligne(x.quoi)}</p>
    <p class="src">Source citée : ${esc(x.s)}</p>${copies(x.copie)}${questionsLiees(x.sert)}`
}));
const bilan = c.bilan.filter(touche).map((b) => passage({
  ou: etape('bilan'), titre: b.t,
  corps: `${b.paires ? `<ul class="paires">${b.paires.map(([v, k]) => `<li><b>${surligne(v)}</b> ${surligne(k)}</li>`).join('')}</ul>` : ''}
    <p class="x">${surligne(b.texte)}</p>${b.src ? `<p class="src">Source citée : ${esc(texte(b.src))}</p>` : ''}`
}));
const mentions = Object.values(c.mentions).filter(touche).map((m) => passage({
  ou: 'Un geste reconnu, affiché à l\'équipe quand elle le fait', titre: m.nom, corps: `<p class="x">${surligne(m.q)}</p>`
}));

// Les textes écrits dans le code de l'interface (pas dans le contenu). Chaque « preuve » doit se trouver
// telle quelle dans son fichier : sinon le générateur le dit, et ce passage est à revoir ici.
const INTERFACE = [
  { ou: `${etape('arrivee')} · l'écran d'accueil de l'équipe`, fichier: 'js/eleve/ecrans.js',
    texte: 'Le lieu est réel : parc national Forillon, en Gaspésie, créé le 8 juin 1970, sur Gespe\'gewa\'gi. La limite que vous tracerez est la vôtre, pas la sienne.',
    preuves: ['sur Gespe\'gewa\'gi. La limite que vous tracerez est la vôtre, pas la sienne.'] },
  { ou: 'La carte, étapes 2 à 5 : la couche Gespe\'gewa\'gi, affichée au départ', fichier: 'js/carte.js',
    texte: 'Sur la carte dessinée : « GESPE\'GEWA\'GI — territoire mi\'gmaq · depuis des temps immémoriaux », un trait qui entoure les sept secteurs. Tant que la carte est à venir : « Gespe\'gewa\'gi couvre les sept secteurs, dedans comme dehors de la ligne. » Un bouton l\'affiche ou la masque : « Gespe\'gewa\'gi : affiché » / « masqué ».',
    preuves: ['GESPE\'GEWA\'GI', 'territoire mi\'gmaq · depuis des temps immémoriaux', 'Gespe\'gewa\'gi couvre les sept secteurs, dedans comme dehors de la ligne.', 'Gespe\'gewa\'gi : '] },
  { ou: 'Le relevé de la ligne, à côté de la carte (étapes 4 et 5)', fichier: 'js/carte.js',
    texte: 'Une ligne du relevé : « Territoire ancestral mi\'gmaq : non découpé ». Dessous : « La dernière ligne ne bouge jamais : Gespe\'gewa\'gi couvre les sept secteurs, dedans comme dehors. »',
    preuves: ['Territoire ancestral mi\'gmaq', 'Gespe\'gewa\'gi couvre les sept secteurs, dedans comme dehors.'] }
];
const manquent = [];
for (const it of INTERFACE) {
  const source = (await readFile(join(PUBLIC, it.fichier), 'utf8')).replace(/\s+/g, ' ');
  for (const p of it.preuves) if (!source.includes(p)) manquent.push(`${it.fichier} : « ${p} »`);
}
const interfaceJeu = INTERFACE.map((it) => passage({ ou: it.ou, corps: `<p class="x">${surligne(it.texte)}</p>` }));

// ---------------------------------------------------------------- questions et réponses attendues
const questions = c.banque.filter(touche).map((q) => passage({
  ou: `${etape(etapeQuestion(q))} · question ${q.id}`, titre: q.eleve || q.q,
  corps: `${q.eleve && norme(q.q) !== norme(q.eleve) ? `<p class="lie">Formulée pour l'enseignant·e : « ${surligne(q.q)} »</p>` : ''}
    ${q.reponse ? `<p class="x"><b>Réponse attendue (vue par l'enseignant·e seulement)</b> : ${surligne(q.reponse)}</p>` : ''}
    ${q.note ? `<p class="lie">Note : ${surligne(q.note)}</p>` : ''}`
}));

// ---------------------------------------------------------------- ce que lit l'enseignant·e
const pourEnseignant = [
  ...Object.entries(c.notes).filter(([, n]) => touche(n)).map(([id, n]) => passage({ ou: `${etape(id)} · intention, pour l'enseignant·e`,
    titre: n.t, corps: `<p class="x">${surligne(n.p)}</p>${n.l?.length ? `<ul>${n.l.map((y) => `<li>${surligne(y)}</li>`).join('')}</ul>` : ''}` })),
  ...Object.entries(c.programme).filter(([, p]) => touche(p)).map(([id, p]) => passage({ ou: `${etape(id)} · lien avec le programme`,
    titre: p.c, corps: `<p class="x">Concepts : ${p.m.map(surligne).join(', ')}</p>` })),
  ...Object.entries(c.observer).filter(([, l]) => touche(l)).map(([id, l]) => passage({ ou: `${etape(id)} · à observer, pour l'enseignant·e`,
    corps: `<ul>${l.map((y) => `<li>${surligne(y)}</li>`).join('')}</ul>` })),
  ...c.visees.filter(touche).map((v) => passage({ ou: 'Ce qu\'on vise à faire apprendre (débrief)', corps: `<p class="x">${surligne(v)}</p>` }))
];
const sources = c.sources.filter(touche).map((s) => passage({ ou: 'La liste des sources, montrée aux élèves à la fin', titre: s.t,
  corps: `<p class="x">${surligne(s.x)}</p>` }));

// ---------------------------------------------------------------- le document
const eleves = [...interfaceJeu.slice(0, 1), ...releves, ...interfaceJeu.slice(1), ...documents, ...pointsDeVue, ...bilan, ...mentions, ...sources];
const total = eleves.length + questions.length + pourEnseignant.length;
const section = (t, intro, items) => !items.length ? '' : `<section><h2>${t}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}${items.map(rendu).join('')}</section>`;
const aujourdhui = new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
const polices = '../../public/polices';   // relatif à outils/relecture/ : aucun chemin de l'ordinateur dans le fichier
const html = `<!doctype html>
<html lang="fr-CA"><head><meta charset="utf-8"><title>Où passe la ligne — dossier de relecture pour la Nation Micmac de Gespeg</title>
<style>
@font-face{font-family:Atkinson;src:url("${polices}/atkinson-hyperlegible-next.woff2") format("woff2");font-weight:200 800}
@page{size:letter;margin:18mm 17mm 20mm}
body{font-family:Atkinson,Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111;margin:0}
h1{font-size:21pt;margin:0 0 6pt;line-height:1.15} h2{font-size:14pt;margin:22pt 0 8pt;padding-bottom:3pt;border-bottom:1pt solid #111;break-after:avoid}
h3{font-size:12pt;margin:2pt 0 5pt} .meta{color:#444;font-size:10pt} .intro{color:#333}
.couv{break-after:page} .couv h2{border:0;margin-top:16pt} .couv ul{padding-left:16pt} .couv li{margin:3pt 0}
.item{border:.75pt solid #999;border-radius:4pt;padding:9pt 11pt;margin:0 0 10pt;break-inside:avoid}
.ou{font-size:9.5pt;color:#444;margin:0 0 3pt;text-transform:none} .n{display:inline-block;min-width:18pt;font-weight:700;color:#111}
.x{margin:4pt 0} .src,.lie,.cite,.trad{font-size:9.5pt;color:#444;margin:3pt 0} .url{word-break:break-all}
.verdict,.consigne{margin:5pt 0;font-size:10.5pt}
.copie{margin:6pt 0;padding:5pt 9pt;background:#f3f3f3;border-left:2.5pt solid #777} .copie .sur{font-size:9pt;font-weight:700;margin:0 0 2pt;color:#333}
blockquote{margin:3pt 0} blockquote p{margin:1pt 0} .paires{padding-left:14pt;margin:4pt 0}
mark{background:#ffe9a8;color:inherit;padding:0 1pt}
.rem{margin-top:8pt;border-top:.5pt dashed #999;padding-top:4pt} .rem p{font-size:9.5pt;font-weight:700;margin:0;color:#333}
.lignes{height:44pt;background:repeating-linear-gradient(#fff 0 21pt,#bbb 21pt 21.6pt)}
</style></head><body>
<div class="couv">
  <h1>Où passe la ligne — dossier de relecture</h1>
  <p class="meta">Pour la Nation Micmac de Gespeg · préparé le ${esc(aujourdhui)} · version du contenu : ${esc(c.version || '')}</p>
  <p>« Où passe la ligne » est un jeu de géographie en équipe pour les élèves de 12 à 14 ans (1<sup>er</sup> cycle du secondaire,
    au Québec). Les équipes tracent la limite d'une aire protégée à Forillon, en 1970, puis l'information arrive : les familles
    expropriées, la région, et, en dernier, Gespe'gewa'gi et la Nation Micmac de Gespeg. La question du jeu change alors de sens :
    « Qui a réellement le droit d'habiter sur un territoire protégé — et qui doit partir ? » supposait que l'histoire commençait en 1970.</p>
  <p>Ce dossier rassemble <b>${total} passages</b> : tout ce que le jeu dit des Mi'gmaq, de Gespe'gewa'gi et de la Nation, tel que
    les élèves et l'enseignant·e le lisent, avec la source citée et la phrase exacte de cette source. Les mots repérés sont
    <mark>surlignés</mark>. La garde-parc qui guide les équipes, Jeanne Element, est un personnage fictif : c'est le seul
    élément inventé du jeu.</p>
  <h2>Ce que nous vous demandons</h2>
  <ul>
    <li><b>L'exactitude</b> : les faits, les dates, les nombres.</li>
    <li><b>Les mots</b> : les noms et leur orthographe (Mi'gmaq, Gespe'gewa'gi, Nation Micmac de Gespeg), les expressions à préférer ou à éviter.</li>
    <li><b>La façon dont la Nation est présentée</b> : ce qui serait réducteur, mal placé ou blessant.</li>
    <li><b>Ce qui manque</b>, ou ce qui devrait être retiré.</li>
    <li><b>Les sources</b> : celles que vous recommanderiez à la place ou en plus.</li>
  </ul>
  <h2>Comment répondre</h2>
  <p>Écrivez dans les cadres « Vos remarques » (sur papier, ou en annotant le PDF), en citant le numéro du passage, ou écrivez
    directement à la responsable du projet : Ana Lucia Munteanu, étudiante à la maîtrise à l'École de technologie supérieure (ÉTS),
    a-lmunteanu@hotmail.ca. Chaque correction sera faite dans le jeu avant son utilisation en classe.</p>
</div>
${section('Ce que lisent les élèves', 'Dans l\'ordre où les équipes les rencontrent.', eleves)}
${section('Les questions, et leurs réponses attendues', 'Les élèves voient la question ; la réponse attendue n\'est montrée qu\'à l\'enseignant·e, pour animer le retour en classe.', questions)}
${section('Ce que lit l\'enseignant·e', 'Les notes de l\'espace enseignant·e, qui orientent la façon de présenter le jeu en classe.', pourEnseignant)}
</body></html>`;

await mkdir(SORTIE, { recursive: true });
const fHtml = join(SORTIE, 'relecture-gespeg.html');
await writeFile(fHtml, html);
let pdf = '';
try {
  const { chromium } = await import('playwright');
  const nav = await chromium.launch();
  const p = await nav.newPage();
  await p.goto(pathToFileURL(fHtml).href);
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: join(SORTIE, 'relecture-gespeg.pdf'), format: 'Letter', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8pt;color:#555;width:100%;text-align:center;font-family:Arial">Où passe la ligne — relecture · page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>' });
  await nav.close();
  pdf = ' et relecture-gespeg.pdf';
} catch (e) { console.warn('PDF non produit (Playwright manque ?) :', e.message); }
console.log(`${total} passages · outils/relecture/relecture-gespeg.html${pdf}`);
if (manquent.length) {
  console.error(`\nTextes de l'interface introuvables (le code a changé : mettre à jour INTERFACE dans ce fichier) :\n  ${manquent.join('\n  ')}`);
  process.exit(1);
}
