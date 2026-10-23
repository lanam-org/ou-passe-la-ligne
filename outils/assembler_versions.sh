#!/usr/bin/env bash
# assembler_versions.sh — le site publié, avec toutes ses versions (appelé par .github/workflows/publier.yml) :
#
#   /               la dernière version publiée, la plus haute étiquette playtest-N : ce que voient les testeurs ;
#   /playtest-N/    chaque version publiée, figée : un lien qui ne change jamais ;
#   /dev/           le travail en cours (main, déjà vérifié par les tests), avec une bande « en développement ».
#
# Une version publiée = une étiquette git annotée « playtest-N », dont le message est son titre
# (« Playtest 0 — avec les professeurs »). La version en préparation est le titre « … · en préparation » de VERSIONS.md.
# Sans aucune étiquette, l'adresse principale montre main, comme avant les versions.
# Usage : bash outils/assembler_versions.sh [dossier de sortie, « site » par défaut]
set -euo pipefail
SORTIE="${1:-site}"
rm -rf "$SORTIE"
mkdir -p "$SORTIE"
court="$(git rev-parse --short HEAD)"

# le dossier public/ d'une référence git (une étiquette, ou HEAD), sans rien d'autre
extraire() {
  mkdir -p "$2"
  git archive "$1" public | tar -x --strip-components=1 -C "$2"
}
# la version affichée (pied de page, js/version.js) et le nom de la copie hors ligne (sw.js) ;
# le titre est nettoyé : ni apostrophe droite (chaîne JavaScript), ni caractère spécial pour sed
numeroter() {
  local titre
  # le nom court seulement (« Playtest 1 ») : ni le sous-titre après « — », ni numéro de commit
  titre="$(printf '%s' "$2" | sed -e 's/ — .*//' -e "s/'/’/g" -e 's/[\\/&|]/ /g')"
  # la copie hors ligne garde le commit dans son nom : chaque mise en ligne remplace l'ancienne copie
  sed -i "s|const VERSION = 'dev';|const VERSION = '$titre $court';|" "$1/sw.js"
  if [ -f "$1/js/version.js" ]; then sed -i "s|var VERSION = 'locale';|var VERSION = '$titre';|" "$1/js/version.js"; fi
}
titre() { git tag -l --format='%(contents:subject)' "$1"; }

versions="$(git tag -l 'playtest-*' --sort=version:refname)"
for v in $versions; do
  extraire "$v" "$SORTIE/$v"
  numeroter "$SORTIE/$v" "$(titre "$v")"
done

derniere="$(git tag -l 'playtest-*' --sort=-version:refname | head -n 1)"
if [ -n "$derniere" ]; then
  extraire "$derniere" "$SORTIE"
  numeroter "$SORTIE" "$(titre "$derniere")"
else
  extraire HEAD "$SORTIE"
  numeroter "$SORTIE" "main"
fi

# /dev/ : la version en préparation, d'après VERSIONS.md (« ## Playtest 1 — … · en préparation »)
prochaine="$(grep -m 1 -E '^## .+ · en préparation' VERSIONS.md 2>/dev/null | sed -E 's/^## (.+) · en préparation.*/\1/' || true)"
extraire HEAD "$SORTIE/dev"
numeroter "$SORTIE/dev" "dev · ${prochaine:-main} en préparation"

echo "Adresse principale : ${derniere:-main ($court)}"
echo "Versions figées    : $(echo ${versions:-aucune})"
echo "/dev/              : ${prochaine:+$prochaine, en préparation, }main ($court)"
