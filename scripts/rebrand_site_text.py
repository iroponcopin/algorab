#!/usr/bin/env python3
"""Corvus -> Algorab in everything the site shows (owner 2026-11-02: 「WebサイトからCorvusを完全抹消し、Algorabへ置き換え」).

Idempotent, so it also runs inside site_publish.sh: data/recipes.json is regenerated from the jars at each release and would
bring the names back. Only capitalised words change: ids, file names, icons and storage keys are lower-case and stay.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KO = {'가': '이', '는': '은', '를': '을', '와': '과', '로': '으로'}

def base(t):
    t = t.replace("Corvus Dev'in", "Algorab Developer Program'ın").replace("Corvus'un", "Algorab'ın").replace("Corvus'ın", "Algorab'ın")
    t = t.replace("Corvus'tan", "Algorab'dan").replace("Corvus'ta", "Algorab'da").replace("Corvus'a", "Algorab'a").replace("Corvus'u", "Algorab'ı")
    t = re.sub(r'Corvus Dev([가는를와로])', lambda m: 'Algorab Developer Program' + KO[m.group(1)], t)
    t = re.sub(r'Corvus([가는를와로])', lambda m: 'Algorab' + KO[m.group(1)], t)
    for a, b in (('Corvus Dev', 'Algorab Developer Program'), ('Corvus Studio', 'Algorab Server'), ('Corvus NEXT', 'Algorab'),
                 ('Corvus', 'Algorab'), ('CORVUS', 'ALGORAB'), ('コルヴス', 'アルゴラブ'), ('Корвус', 'Алгораб')):
        t = t.replace(a, b)
    return t

def fr(t): return re.sub(r"\b([Dd]e|[Qq]ue|[Ll]e|[Ll]a|[Nn]e|[Ss]e|[Jj]e|[Ll]orsque|[Pp]uisque|[Jj]usque) Algorab", lambda m: m.group(1)[:-1] + "'Algorab", t)
def en(t): return re.sub(r"\b([Aa]) Algorab", r"\1n Algorab", t)

def walk(x, f):
    if isinstance(x, str): return f(x)
    if isinstance(x, list): return [walk(v, f) for v in x]
    if isinstance(x, dict): return {k: walk(v, f) for k, v in x.items()}
    return x

def write(path, old, new):
    if new != old:
        with open(path, 'w', encoding='utf-8') as h: h.write(new)
        return 1
    return 0

def main():
    os.chdir(ROOT); n = 0
    for p in glob.glob('data/i18n/*.json'):
        s = open(p, encoding='utf-8').read(); t = base(s)
        if p.endswith('/fr.json'): t = fr(t)
        if p.endswith('/en.json'): t = en(t)
        n += write(p, s, t)
    p = 'data/launcher_notes_i18n.json'; s = open(p, encoding='utf-8').read(); d = json.loads(s)
    for lang in d:
        if lang == '_comment': continue
        d[lang] = walk(d[lang], (lambda x: fr(base(x))) if lang == 'fr' else base)
    t = json.dumps(d, ensure_ascii=False, indent=1) + ('\n' if s.endswith('\n') else '')
    n += write(p, s, t)
    p = 'data/launcher_notes.json'; s = open(p, encoding='utf-8').read(); n += write(p, s, en(base(s)))
    for p in glob.glob('data/*.json') + ['data/halia_icons/index.json']:
        if p.endswith(('launcher_notes.json', 'launcher_notes_i18n.json')): continue
        s = open(p, encoding='utf-8').read(); n += write(p, s, base(s))
    for p in glob.glob('web/src/**/*', recursive=True):
        if not p.endswith(('.ts', '.tsx', '.css', '.json')) or '.test.' in p or not os.path.isfile(p): continue
        s = open(p, encoding='utf-8').read(); lines = s.split('\n')
        cur = None
        for i, ln in enumerate(lines):
            m = re.match(r"""^\s*["']?(en|ja|de|fr|es|it|pt-br|ru|ko|zh|ar|tr|id)["']?\s*:""", ln)
            if m: cur = m.group(1)
            t = base(ln)
            if cur == 'fr': t = fr(t)
            if cur == 'en': t = en(t)
            lines[i] = t
        n += write(p, s, '\n'.join(lines))
    # legacy.json holds its languages at varying depth, so its French and English are found by the JSON path.
    p = 'web/src/i18n/legacy.json'; s = open(p, encoding='utf-8').read(); d = json.loads(s)
    def langs(x, cur=None):
        if isinstance(x, str): return fr(x) if cur == 'fr' else en(x) if cur == 'en' else x
        if isinstance(x, list): return [langs(v, cur) for v in x]
        if isinstance(x, dict): return {k: langs(v, k if k in ('en', 'fr', 'es', 'it', 'de', 'ja', 'ko', 'zh', 'ru', 'ar', 'tr', 'id', 'pt-br') else cur) for k, v in x.items()}
        return x
    t = json.dumps(langs(d), ensure_ascii=False, indent=1) + ('\n' if s.endswith('\n') else '')
    n += write(p, s, t)
    print('rebrand_site_text: %d file(s) changed' % n)

if __name__ == '__main__': main()
