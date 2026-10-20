// dossier.js — le dossier élève (la version « devoir »), à lire avant la séance.
//
// Une page sans jeu : le portrait du territoire et les documents à trier, avec
// la copie de chaque source et son lien. Les documents « surprise » n'y sont
// jamais (voir dossierdoc.js). Avec ?code=XXXXX, les corrections faites par
// l'enseignant·e pour cette séance s'appliquent ; sans code, le contenu d'origine.
// ?pastilles=1 montre à quelles questions sert chaque document.

import * as donnees from './donnees.js';
import { $, typo, chargerContenu } from './outils.js';
import { appliquer } from './reglages.js';
import { dossierHTML } from './dossierdoc.js';
import { cheminSeance, normaliserCode, codeValide } from './seance.js';

const params = new URLSearchParams(location.search);
const code = normaliserCode(params.get('code'));
const base = await chargerContenu();
let config = null;
if (codeValide(code)) {
  try {
    await donnees.identite();
    config = (await donnees.lire(cheminSeance(code)))?.config || null;
  } catch (e) { console.warn('Réglages de la séance indisponibles : contenu d\'origine', e); }
}
const c = appliquer(base, config);
const boite = $('#pastilles');
boite.checked = params.get('pastilles') === '1';

function rendre() {
  $('#dossier').innerHTML = typo(dossierHTML(c, { version: 'devoir', pastilles: boite.checked }));
}
boite.addEventListener('change', rendre);
$('#imprimer').addEventListener('click', () => window.print());
rendre();
