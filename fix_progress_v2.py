#!/usr/bin/env python3
"""fix_progress_v2.py — يكمل تعديلات progress الناقصة بأمان."""
import re
import shutil
import sys
from pathlib import Path


def read(p): return p.read_text(encoding='utf-8')

def write(p, t):
    bak = p.with_suffix(p.suffix + '.bak2')
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding='utf-8')


def ensure_progress_script(p):
    """يضمن <script src='progress.js'> في <head>."""
    t = read(p)
    if 'src="progress.js"' in t:
        return True, 'موجود مسبقاً'
    if '</head>' not in t:
        return False, 'لم أجد </head>'
    write(p, t.replace('</head>', '  <script src="progress.js"></script>\n</head>', 1))
    return True, 'أُضيف في <head>'


def patch_audio(p):
    """يضيف hook في نهاية playCard (يعمل مع النسخة الجديدة)."""
    t = read(p)
    if 'CNProgress.XP_REWARDS.audioPlay' in t:
        return True, 'موجود مسبقاً'
    # آخر ظهور لـ card.classList.remove (يخص playCard)
    matches = list(re.finditer(r"card\.classList\.remove\('playing'\);", t))
    if not matches:
        return False, 'لم أجد card.classList.remove(...)'
    m = matches[-1]
    insert = """

    // --- progress tracking ---
    if (ok) {
      CNProgress.addXP(CNProgress.XP_REWARDS.audioPlay);
      CNProgress.recordActivity('audio', {});
      CNProgress.checkAchievements();
    }"""
    write(p, t[:m.end()] + insert + t[m.end():])
    return True, 'أُضيف hook بعد آخر card.classList.remove'


def check_all(base):
    """فحص شامل: هل كل التعديلات موجودة؟"""
    files = ['index.html', 'audio.html', 'writing.html', 'tests.html']
    out = []
    for f in files:
        p = base / f
        if not p.exists():
            out.append((f, False, 'غير موجود')); continue
        t = read(p)
        needs = []
        if f in ('audio.html', 'writing.html', 'tests.html') and 'src="progress.js"' not in t:
            needs.append('progress.js في head')
        if f == 'audio.html' and 'CNProgress.XP_REWARDS.audioPlay' not in t:
            needs.append('hook playCard')
        if f == 'writing.html' and 'CNProgress.XP_REWARDS.charWrite' not in t:
            needs.append('hook onComplete')
        if f == 'tests.html':
            if 'CNProgress.XP_REWARDS.testCorrect' not in t: needs.append('hook chooseOption')
            if "recordActivity('test'" not in t: needs.append('hook showResult')
        if f == 'index.html' and 'dashboard.html' not in t:
            needs.append('dashboard card')
        out.append((f, not needs, 'مكتمل' if not needs else 'ينقص: ' + '، '.join(needs)))
    return out


def main():
    base = Path('.').expanduser().resolve()

    if '--check' in sys.argv:
        for f, ok, msg in check_all(base):
            print(f"{'✅' if ok else '❌'} {f} — {msg}")
        return

    print(f'📁 {base}\n')

    results = []

    # 1) progress.js في head (audio + writing)
    for fname in ['audio.html', 'writing.html']:
        p = base / fname
        if p.exists():
            results.append((f'{fname} :: head', *ensure_progress_script(p)))
        else:
            results.append((f'{fname} :: head', False, 'غير موجود'))

    # 2) hook في audio
    p = base / 'audio.html'
    if p.exists():
        results.append(('audio.html :: playCard', *patch_audio(p)))

    print()
    for name, ok, msg in results:
        print(f"{'✅' if ok else '❌'} {name} — {msg}")

    print('\n🔍 فحص نهائي:')
    checks = check_all(base)
    for f, ok, msg in checks:
        print(f"{'✅' if ok else '❌'} {f} — {msg}")

    sys.exit(0 if all(ok for _, ok, _ in checks) else 1)


if __name__ == '__main__':
    main()
