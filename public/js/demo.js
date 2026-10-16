// demo.js — une séance de démonstration, déjà en cours.
//
// Pour montrer l'espace enseignant·e sans faire jouer quatre onglets : une
// séance au format standard (50 minutes), ouverte depuis 40 minutes, avec quatre équipes
// à des endroits différents du jeu.
//   · Fou de Bassan : rapide, déjà au retour sur la démarche ;
//   · Phoque gris : dans les temps, au deuxième point de vue, a rezoné ;
//   · Orignal : bloquée à « Se questionner », temps prévu largement dépassé ;
//   · Castor : arrivée en retard, encore au portrait du territoire.
//
// Les états sont produits par les vraies règles (jeu.js) : villages, corridor,
// gestes reconnus et indicateurs sont ceux qu'une vraie partie aurait donnés.
// Réponses inventées, écrites comme des élèves ; aucun prénom.
//
// Mode local seulement : en ligne, les règles Firestore interdisent (avec
// raison) à l'enseignant·e d'écrire la fiche d'une équipe.

import * as donnees from './donnees.js';
import * as J from './jeu.js';
import { creerSeance, cheminEquipe, cheminSeance, idEquipe } from './seance.js';

const MIN = 60000;

/**
 * Rejoue une équipe : `etapes` = [[minutes passées dans l'étape, gestes], …].
 * La dernière étape est celle où l'équipe se trouve maintenant.
 */
function rejouer(c, nom, debut, etapes) {
  const e = J.nouvelEtat(c, nom, `demo-${idEquipe(nom)}`);
  e.creeLe = debut; e.entree = debut;
  let t = debut;
  etapes.forEach(([min, gestes], i) => {
    gestes?.(e, (f) => t + Math.round(f * min * MIN));
    t += min * MIN;
    if (i < etapes.length - 1) J.allerA(c, e, e.etape + 1, t);
  });
  e.maj = Date.now() - 15000;
  return e;
}

const releves = (c, e, liste) => liste.forEach((i) => J.ouvrirReleve(c, e, i));
const peindre = (c, e, quand, gestes) => gestes.forEach(([s, z], i) => J.peindre(c, e, s, z, quand((i + 1) / (gestes.length + 1))));

function equipes(c, maintenant) {
  const t0 = maintenant - 40 * MIN;
  const r = (e, id, x) => { e.reponses[id] = x; };
  return [
    rejouer(c, 'Fou de Bassan', t0, [
      [3, (e) => r(e, 'F1.2', 'Non, il y avait sûrement des villages de pêcheurs au bord de la mer.')],
      [7, (e) => {
        releves(c, e, [0, 1, 2, 3, 4, 5]);
        J.basculerGespeg(e); J.basculerGespeg(e);
        r(e, 'F2.1', "Gespe'gewa'gi, le territoire des Mi'gmaq. Ça veut dire là où la terre prend fin.");
        r(e, 'F2.4', '214 maisons, 2 écoles, 3 églises, des commerces. Après ils ont presque tout brûlé.');
      }],
      [9, (e) => {
        ['d3', 'd5', 'd4'].forEach((d) => J.basculerDoc(e, d)); J.juger(c, e);
        r(e, 'F3.2', "Les deux, elles comptent pas la même chose : ceux qui habitaient là ou ceux qui ont perdu un terrain.");
      }],
      [7, (e, q) => {
        peindre(c, e, q, [['rosiers', 'village'], ['anse', 'village'], ['ship', 'village'], ['grave', 'plein'], ['morris', 'sauvage']]);
        J.mentionner(e, 'corridor');
        r(e, 'F4.3', 'Elle vide Grande-Grave, Penouille et Rivière-Morris. Le corridor tient. On garde la forêt pour les animaux et trois villages au bord de la mer.');
      }],
      [10, (e, q) => {
        e.comps = 1; r(e, 'F5.1', 'Non, la route coupe la forêt en deux, les animaux passent moins.');
        e.comps = 2; peindre(c, e, q, [['penouille', 'plein']]);
        e.comps = 3; peindre(c, e, q, [['grave', 'village']]);
        e.comps = 4; r(e, 'F5.4', "Les Mi'gmaq, depuis bien avant 1970. Personne leur a demandé leur avis.");
      }],
      [4, (e) => r(e, 'F6.1', 'Ils ont pris tout le territoire et 225 familles ont dû partir. Nous on garde quatre villages.')],
      [0]
    ]),
    rejouer(c, 'Phoque gris', t0, [
      [4, (e) => r(e, 'F1.2', "On pense que oui, c'était juste de la forêt et des falaises.")],
      [10, (e) => {
        releves(c, e, [0, 1, 2, 3, 4, 5]);
        r(e, 'F2.1', "Gespeg. Les Mi'gmaq.");
        r(e, 'F2.4', 'Des villages avec des maisons et des églises.');
      }],
      [11, (e) => {
        ['d3', 'd7', 'd5'].forEach((d) => J.basculerDoc(e, d)); J.juger(c, e);
        r(e, 'F3.2', "Les deux peut-être ? 983 c'est les gens qui habitaient, 1 800 c'est plus large.");
      }],
      [9, (e, q) => {
        peindre(c, e, q, [['anse', 'village'], ['rosiers', 'village'], ['morris', 'village'], ['penouille', 'village'], ['grave', 'village'], ['ship', 'village']]);
        r(e, 'F4.3', 'On vide aucun village. On voulait que les familles restent chez elles.');
      }],
      [6, (e, q) => {
        e.comps = 1; peindre(c, e, q, [['morris', 'sauvage']]);
        r(e, 'F5.1', 'Moins bien, à cause des autos. On a changé Rivière-Morris pour le corridor.');
        e.comps = 2;
      }]
    ]),
    rejouer(c, 'Orignal', t0, [
      [5, (e) => r(e, 'F1.2', 'Peut-être quelques maisons mais pas beaucoup de monde.')],
      [13, (e) => {
        releves(c, e, [0, 1, 2, 3, 4, 5]);
        r(e, 'F2.1', "Gespe'gewa'gi, c'est aux Mi'gmaq");
        r(e, 'F2.4', 'Des maisons et des chalets');
        e.compteurs.clicsVides = 5;
      }],
      [22, (e) => { ['d1', 'd8'].forEach((d) => J.basculerDoc(e, d)); e.compteurs.retours = 3; }]
    ]),
    rejouer(c, 'Castor', maintenant - 12 * MIN, [
      [3, (e) => r(e, 'F1.2', 'Non, des gens vivaient là, comme des pêcheurs.')],
      [9, (e) => { releves(c, e, [0, 1, 2, 3]); r(e, 'F2.1', 'Gespeg, les Micmacs'); }]
    ])
  ];
}

/** Crée la séance de démonstration et renvoie son code. */
export async function creerSeanceDemo(c, reglages) {
  const code = await creerSeance({ reglages });
  for (const e of equipes(c, Date.now())) await donnees.ecrire(cheminEquipe(code, idEquipe(e.nom)), e);
  await donnees.majPartielle(cheminSeance(code), { demo: true });
  return code;
}
