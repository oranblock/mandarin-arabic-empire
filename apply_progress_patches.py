#!/usr/bin/env python3
"""
apply_progress_patches.py
يطبّق تعديلات نظام progress على المشروع:
  1. index.html   → يستبدل <div class="cards">…</div> بخمس بطاقات
  2. tests.html   → يضيف <script src="progress.js"> في <head>
  3. tests.html   → hook في chooseOption() (XP لكل إجابة)
  4. tests.html   → hook في showResult() (تسجيل النتيجة)
  5. audio.html   → hook عند انتهاء تشغيل الصوت
  6. writing.html → hook عند إكمال اختبار الكتابة

آمن: idempotent (لا يكرر)، ينشئ .bak، يدعم --dry-run.
"""
import argparse
import re
import shutil
import sys
from pathlib import Path


# ============== helpers ==============

def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str, backup: bool):
    if backup:
        bak = path.with_suffix(path.suffix + '.bak')
        if not bak.exists():
            shutil.copy2(path, bak)
    path.write_text(text, encoding='utf-8')


def find_matching_div(text: str, start: int) -> int:
    """يرجع موضع </div> المقابل لـ <div…> بدءاً من start، أو -1."""
    depth = 0
    i = start
    while i < len(text):
        m_open = re.search(r'<div\b', text[i:])
        m_close = re.search(r'</div>', text[i:])
        if not m_close:
            return -1
        if m_open and m_open.start() < m_close.start():
            depth += 1
            i += m_open.end()
        else:
            depth -= 1
            i += m_close.end()
            if depth == 0:
                return i
    return -1


def log(name: str, ok: bool, msg: str):
    print(f"{'✅' if ok else '❌'} {name} — {msg}")


# ============== patch 1: index.html ==============

CARDS_NEW = '''<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
  <a href="audio.html" class="card"><div class="icon">🎧</div><h2>النطق</h2><p>استمع للنطق الأصلي</p></a>
  <a href="writing.html" class="card"><div class="icon">✍️</div><h2>الكتابة</h2><p>ترتيب الخطوط والمكونات</p></a>
  <a href="grammar.html" class="card"><div class="icon">📖</div><h2>القواعد</h2><p>قواعد أساسية مشروحة</p></a>
  <a href="tests.html" class="card"><div class="icon">🎯</div><h2>الاختبارات</h2><p>اختبر نفسك</p></a>
  <a href="dashboard.html" class="card"><div class="icon">🏆</div><h2>لوحة التقدم</h2><p>الإنجازات والمنافسة</p></a>
</div>'''


def patch_index(base: Path, dry: bool, backup: bool):
    path = base / 'index.html'
    if not path.exists():
        return False, 'الملف غير موجود'
    text = read(path)
    if 'href="dashboard.html"' in text:
        return True, 'موجود مسبقاً (dashboard card)'
    m = re.search(r'<div\s+class="cards"', text)
    if not m:
        return False, 'لم أجد <div class="cards">'
    end = find_matching_div(text, m.start())
    if end == -1:
        return False, 'div غير متوازن — راجع الملف يدوياً'
    if not dry:
        write(path, text[:m.start()] + CARDS_NEW + text[end:], backup)
    return True, f'استُبدل {end - m.start()} حرفاً'


# ============== patch 2: tests.html head ==============

def patch_tests_head(base: Path, dry: bool, backup: bool):
    path = base / 'tests.html'
    if not path.exists():
        return False, 'الملف غير موجود'
    text = read(path)
    if 'src="progress.js"' in text:
        return True, 'موجود مسبقاً'
    if '</head>' not in text:
        return False, 'لم أجد </head>'
    new = text.replace('</head>', '  <script src="progress.js"></script>\n</head>', 1)
    if not dry:
        write(path, new, backup)
    return True, 'أُضيف progress.js في <head>'


# ============== patch 3: tests.html chooseOption ==============

def patch_tests_choose(base: Path, dry: bool, backup: bool):
    path = base / 'tests.html'
    if not path.exists():
        return False, 'الملف غير موجود'
    text = read(path)
    if 'CNProgress.XP_REWARDS.testCorrect' in text:
        return True, 'موجود مسبقاً'
    anchor = 'state.answers.push({ q, isCorrect, chosen: value });'
    if anchor not in text:
        return False, 'لم أجد سطر state.answers.push في chooseOption'
    insert = anchor + '''

    // --- progress tracking ---
    CNProgress.addXP(CNProgress.XP_REWARDS.testCorrect);
    CNProgress.updateProfile(p => {
      if (state.streak > p.stats.bestStreak) p.stats.bestStreak = state.streak;
    });'''
    if not dry:
        write(path, text.replace(anchor, insert, 1), backup)
    return True, 'أُضيف تتبع XP في chooseOption'


# ============== patch 4: tests.html showResult ==============

def patch_tests_show(base: Path, dry: bool, backup: bool):
    path = base / 'tests.html'
    if not path.exists():
        return False, 'الملف غير موجود'
    text = read(path)
    if "recordActivity('test'" in text:
        return True, 'موجود مسبقاً'
    anchor = "document.getElementById('result-percent').textContent = pct + '%';"
    if anchor not in text:
        return False, 'لم أجد سطر result-percent في showResult'
    insert = anchor + '''

    // --- progress tracking ---
    CNProgress.recordActivity('test', {
      correct: score,
      total: total,
      streak: state.bestStreak,
      perfect: score === total
    });
    if (score === total){
      CNProgress.addXP(CNProgress.XP_REWARDS.testPerfect);
    }
    const newly = CNProgress.checkAchievements();
    if (newly.length){
      setTimeout(() => alert('🏆 إنجاز جديد: ' + newly.map(a => a.name).join('، ')), 300);
    }'''
    if not dry:
        write(path, text.replace(anchor, insert, 1), backup)
    return True, 'أُضيف تتبع XP في showResult'


# ============== patch 5: audio.html ==============

def patch_audio(base: Path, dry: bool, backup: bool):
    path = base / 'audio.html'
    if not path.exists():
        return False, 'الملف غير موجود'
    text = read(path)
    if 'CNProgress.XP_REWARDS.audioPlay' in text:
        return True, 'موجود مسبقاً'
    # anchor: card.classList.remove('playing'); return;
    pattern = r"(\s*card\.classList\.remove\('playing'\);\s*return;)"
    m = re.search(pattern, text)
    if not m:
        return False, "لم أجد card.classList.remove('playing'); return;"
    insert = m.group(1) + '''

        // --- progress tracking ---
        CNProgress.addXP(CNProgress.XP_REWARDS.audioPlay);
        CNProgress.recordActivity('audio', {});
        CNProgress.checkAchievements();'''
    new = text[:m.start()] + insert + text[m.end():]
    if not dry:
        write(path, new, backup)
    return True, 'أُضيف تتبع XP في audio.html'


# ============== patch 6: writing.html ==============

def patch_writing(base: Path, dry: bool, backup: bool):
    path = base / 'writing.html'
    if not path.exists():
        return False, 'الملف غير موجود'
    text = read(path)
    if 'CNProgress.XP_REWARDS.charWrite' in text:
        return True, 'موجود مسبقاً'
    anchor = "document.getElementById('quiz-result').textContent = '🎉 أحسنت!';"
    if anchor not in text:
        return False, "لم أجد '🎉 أحسنت!' في onComplete"
    insert = anchor + '''

          // --- progress tracking ---
          CNProgress.addXP(CNProgress.XP_REWARDS.charWrite);
          CNProgress.recordActivity('write', { correct: true });
          CNProgress.checkAchievements();'''
    if not dry:
        write(path, text.replace(anchor, insert, 1), backup)
    return True, 'أُضيف تتبع XP في writing.html'


# ============== main ==============

def main():
    ap = argparse.ArgumentParser(description='يطبّق تعديلات progress على مشروع الصينية')
    ap.add_argument('--base', default='.', help='مجلد المشروع (افتراضي: .)')
    ap.add_argument('-n', '--dry-run', action='store_true', help='معاينة فقط بدون كتابة')
    ap.add_argument('--no-backup', action='store_true', help='بدون نسخ .bak')
    args = ap.parse_args()

    base = Path(args.base).expanduser().resolve()
    if not base.exists():
        sys.exit(f'❌ المجلد غير موجود: {base}')

    print(f'📁 {base}')
    if args.dry_run:
        print('🔍 وضع المعاينة — لن يُكتب شيء\n')
    else:
        print()

    backup = not args.no_backup

    patches = [
        ('index.html :: 5 بطاقات',        patch_index),
        ('tests.html :: head',            patch_tests_head),
        ('tests.html :: chooseOption',    patch_tests_choose),
        ('tests.html :: showResult',      patch_tests_show),
        ('audio.html :: playCard',        patch_audio),
        ('writing.html :: onComplete',    patch_writing),
    ]

    results = []
    for name, fn in patches:
        try:
            ok, msg = fn(base, args.dry_run, backup)
        except Exception as e:
            ok, msg = False, f'استثناء: {e}'
        results.append((name, ok, msg))
        log(name, ok, msg)

    ok_count = sum(1 for _, ok, _ in results if ok)
    print(f'\n📊 {ok_count}/{len(results)} نجحت')
    if args.dry_run:
        print('💡 أعد بدون --dry-run لتطبيق التغييرات')
    sys.exit(0 if ok_count == len(results) else 1)


if __name__ == '__main__':
    main()
