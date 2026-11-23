#!/usr/bin/env python3
"""Собирает ноутбук выпуска «Котейка читает» из ячеек Python на странице разбора.
   Источник один — textarea ячеек .cell на странице (их же запускает /signal/py.js в браузере):
   заголовок ячейки (data-title) и пояснение (data-note) становятся markdown-ячейкой, код — кодовой.
     python3 tools/build-book-notebook.py kohavi-trustworthy
   → shelf/notebooks/kohavi-trustworthy.ipynb. Проверка: jupyter nbconvert --to notebook --execute --stdout <файл> > /dev/null
   Запускать после node tools/bake-i18n.js (заголовки и пояснения вписываются туда из i18n/books.js)."""
import html, json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
INTRO = {
    'kohavi-trustworthy': (
        '# «Trustworthy Online Controlled Experiments»\n\n'
        'Ron Kohavi, Diane Tang, Ya Xu, 2020.\n\nНоутбук к разбору книги: '
        'https://dilyakhakimova.com/shelf/kohavi-trustworthy/\n\n'
        'Симуляции ко всем визуализациям разбора, по главам: сколько идей срабатывает, выручка и интервалы в примере с промокодом, '
        'калькулятор MDE до и после эксперимента, закон Твимена, подглядывание, почему мерить при 50 на 50, сто метрик и три порога, '
        'тысяча A/A делением платформы и проверка SRM.\n\n'
        'Перед каждой ячейкой написано, что она делает и что в ней поменять. Код и числа наши, по описанию методов из книги; '
        'нужны только Python и numpy. Ячейки независимые: запускай любую.'),
}

def build(slug):
    page = (ROOT / 'shelf' / slug / 'index.html').read_text(encoding='utf-8')
    cells = [{'cell_type': 'markdown', 'metadata': {}, 'source': INTRO[slug]}]
    # ячейки страницы и ячейки только для ноутбука (<template class="nb-cell" data-title data-note>) — в порядке на странице
    for m in re.finditer(r'<div class="cell"([^>]*)>\s*<textarea[^>]*>(.*?)</textarea>|<template class="nb-cell"([^>]*)>(.*?)</template>', page, re.S):
        if m.group(3) is not None: m = type('M', (), {'group': lambda self, k, mm=m: mm.group(k + 2)})()
        attrs, code = m.group(1), html.unescape(m.group(2))
        get = lambda a: html.unescape((re.search(a + r'="([^"]*)"', attrs) or [None, ''])[1]).replace('\xa0', ' ')
        title, note = get('data-nb-title') or get('data-title'), get('data-nb-note') or get('data-note')   # data-nb-* — только для ноутбука
        cells.append({'cell_type': 'markdown', 'metadata': {}, 'source': f'## {title}\n\n{note}'})
        cells.append({'cell_type': 'code', 'metadata': {}, 'execution_count': None, 'outputs': [], 'source': code.replace('\xa0', ' ').replace('\u2011', '-').strip('\n')})   # типограф страницы ставит неразрывные пробелы и дефисы и в код
    nb = {'nbformat': 4, 'nbformat_minor': 5, 'cells': cells,
          'metadata': {'kernelspec': {'name': 'python3', 'display_name': 'Python 3', 'language': 'python'},
                       'language_info': {'name': 'python'}}}
    for c in nb['cells']:
        c['id'] = f'c{nb["cells"].index(c)}'
    out = ROOT / 'shelf' / 'notebooks' / f'{slug}.ipynb'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('notebook:', out.relative_to(ROOT), (len(cells) - 1) // 2, 'ячейки')

if __name__ == '__main__':
    for s in sys.argv[1:] or ['kohavi-trustworthy']:
        build(s)
