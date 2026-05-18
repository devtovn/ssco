import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
for p in root.rglob('*.tsx'):
    t = p.read_text(encoding='utf-8')
    n = t.replace('<' + 'motion-search', '<' + 'div').replace('</' + 'motion-search' + '>', '</' + 'div' + '>')
    if n != t:
        p.write_text(n, encoding='utf-8')
        print('fixed', p.relative_to(root))
