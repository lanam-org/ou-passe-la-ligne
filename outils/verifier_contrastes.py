"""verifier_contrastes.py — vérifie les contrastes des trois affichages.

    python outils/verifier_contrastes.py

Lit les jetons de couleur de public/css/site.css (clair, sombre, contraste
élevé) et calcule le rapport de contraste WCAG de chaque paire texte / fond
réellement utilisée dans le site. Seuils :
  · texte : 4,5:1 en clair et en sombre (WCAG AA), 7:1 en contraste élevé (AAA) ;
  · contours des champs et boutons : 3:1 (WCAG 1.4.11).
Aucune dépendance : Python 3 seulement.
"""
import re
import sys
from pathlib import Path

# la console de Windows n'écrit pas « ✓ » par défaut
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CSS =(Path(__file__).resolve().parent.parent / 'public' / 'css' / 'site.css').read_text(encoding='utf-8')


def blocs(selecteur):
    """Toutes les déclarations --x:… des blocs dont le sélecteur est exactement `selecteur`."""
    jetons = {}
    motif = re.compile(r'(?:^|[}\s])' + re.escape(selecteur) + r'\s*\{([^{}]*)\}', re.M)
    for m in motif.finditer(CSS):
        for k, v in re.findall(r'(--[\w-]+)\s*:\s*([^;]+);?', m.group(1)):
            jetons[k] = v.strip()
    return jetons


def hexa(v):
    v = v.lstrip('#')
    if len(v) == 3:
        v = ''.join(c * 2 for c in v)
    return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))


def resoudre(v, t, profondeur=0):
    v = v.strip()
    if profondeur > 10:
        raise ValueError(v)
    m = re.fullmatch(r'var\((--[\w-]+)\)', v)
    if m:
        return resoudre(t[m.group(1)], t, profondeur + 1)
    m = re.fullmatch(r'color-mix\(in srgb,\s*(.+?)\s+(\d+)%\s*,\s*(.+)\)', v)
    if m:
        a, p, b = resoudre(m.group(1), t, profondeur + 1), int(m.group(2)) / 100, resoudre(m.group(3), t, profondeur + 1)
        return tuple(round(a[i] * p + b[i] * (1 - p)) for i in range(3))
    if v.startswith('#'):
        return hexa(v)
    raise ValueError(v)


def lum(rgb):
    def c(x):
        x /= 255
        return x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = (c(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def rapport(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


clair = blocs(':root')
THEMES = {
    'clair': clair,
    'sombre': {**clair, **blocs(':root[data-theme="dark"]')},
    'contraste élevé': {**clair, **blocs(':root[data-theme="contrast"]')},
}
# les ambiances par espace (élèves plus vives, enseignant·e plus terne), posées sur <body>
sombre = THEMES['sombre']
THEMES['élève clair'] = {**clair, **blocs(':root[data-theme="light"] body[data-espace="eleve"]')}
THEMES['élève sombre'] = {**sombre, **blocs(':root[data-theme="dark"] body[data-espace="eleve"]')}
THEMES['enseignant clair'] = {**clair, **blocs(':root[data-theme="light"] body[data-espace="prof"]')}
THEMES['enseignant sombre'] = {**sombre, **blocs(':root[data-theme="dark"] body[data-espace="prof"]')}

FONDS = ['--fond', '--fond-2', '--surface', '--fond-prof', 'color-mix(in srgb,var(--primaire) 9%,var(--surface))']
TEXTES = ['--encre', '--doux', '--pale']
SENS = [  # couleur de sens, et les fonds où elle s'écrit
    ('--primaire', ['--fond', '--fond-2', '--surface', 'color-mix(in srgb,var(--primaire) 9%,var(--surface))']),
    ('--env', ['--fond', '--surface', 'color-mix(in srgb,var(--primaire) 9%,var(--surface))', '--fond-2']),
    ('--eco', ['--fond', '--surface', 'color-mix(in srgb,var(--eco) 7%,var(--surface))', 'color-mix(in srgb,var(--eco) 8%,var(--surface))']),
    ('--action', ['--fond', '--surface', 'color-mix(in srgb,var(--action) 6%,var(--surface))', 'color-mix(in srgb,var(--action) 8%,var(--surface))']),
    ('--gespeg', ['--surface', 'color-mix(in srgb,var(--gespeg) 8%,var(--surface))']),
    ('--roche', ['--mer', '--terre', '--surface']),
    # familles de questions du dossier documentaire (pastilles)
    ('--fam-hab', ['--surface', '--fond']), ('--fam-pro', ['--surface', '--fond']),
    ('--fam-dec', ['--surface', '--fond']), ('--fam-cpt', ['--surface', '--fond']),
]
INVERSES = [  # texte clair sur fond foncé
    ('--sur-primaire', '--primaire'), ('--sur-primaire', '--primaire-h'),
    ('--nuit-txt', '--nuit'), ('#F2C46B', '--nuit'), ('#F2C46B', '--prof-bande'), ('#D9BE88', '--prof-bande'),
    ('#C5D2DA', '--prof-bande'), ('--prof-txt', '--prof-bande'),
    ('--surface', '--primaire'), ('--surface', '--env'),   # chiffres des pastilles de la carte
]
CONTOURS = [('--bord', '--surface'), ('--bord', '--fond'), ('--bord', '--fond-2')]


def nom(x):
    return x if x.startswith('--') or x.startswith('#') else x.replace('color-mix(in srgb,var(', '').replace('),var(--surface))', '').replace(')', '')


echecs = 0
for theme, t in THEMES.items():
    seuil = 7 if theme == 'contraste élevé' else 4.5
    c = lambda x: resoudre(x if not x.startswith('--') else f'var({x})', t)
    lignes = []
    for f in FONDS:
        for x in TEXTES:
            lignes.append((x, f, seuil))
    for x, fonds in SENS:
        for f in fonds:
            lignes.append((x, f, seuil))
    for x, f in INVERSES:
        lignes.append((x, f, seuil))
    for x, f in CONTOURS:
        lignes.append((x, f, 3))
    pire, avant = None, echecs
    for x, f, s in lignes:
        r = rapport(c(x), c(f))
        if pire is None or r / s < pire[0] / pire[3]:
            pire = (r, x, f, s)
        if r < s:
            echecs += 1
            print(f'  ✗ {theme} : {nom(x)} sur {nom(f)} = {r:.2f}:1 (il faut {s}:1)')
    print(f'  {"✓" if echecs == avant else "✗"} {theme} : {len(lignes)} paires · la plus juste {nom(pire[1])} sur {nom(pire[2])} = {pire[0]:.2f}:1 (seuil {pire[3]}:1)')

print('\nTout passe.' if not echecs else f'\n{echecs} paire(s) sous le seuil.')
sys.exit(1 if echecs else 0)
