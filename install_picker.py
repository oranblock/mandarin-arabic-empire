#!/usr/bin/env python3
"""يحذف المفتاح القديم ويضيف player-picker.js إلى كل الصفحات."""
import re
import shutil
import sys
from pathlib import Path

PAGES = ['index.html', 'audio.html', 'writing.html', 'grammar.html', 'tests.html']

def remove_old_switcher(text):
    pattern = r'<!-- player switcher -->.*?<script>.*?</script>\s*'
    return re.sub(pattern, '', text, count=1, flags=re.DOTALL)

def patch(path: Path):
    if not path.exists():
        return False, 'غير موجود'
    text = path.read_text(encoding='utf-8')
    original = text

    # 1) احذف المفتاح القديم
    text = remove_old_switcher(text)
    removed = text != original

    # 2) أضف script الجديد قبل </body>
    added = False
    if 'player-picker.js' not in text:
        if '</body>' in text:
            text = text.replace('</body>',
                '  <script src="player-picker.js"></script>\n</body>', 1)
            added = True

    if text == original:
        return True, 'لا تغيير'

    bak = path.with_suffix(path.suffix + '.bak5')
    if not bak.exists():
        shutil.copy2(path, bak)
    path.write_text(text, encoding='utf-8')

    parts = []
    if removed: parts.append('حُذف المفتاح القديم')
    if added: parts.append('أُضيف player-picker.js')
    return True, ' — '.join(parts) or 'لا تغيير'

def main():
    base = Path('.')
    for fname in PAGES:
        ok, msg = patch(base / fname)
        print(f"{'✅' if ok else '❌'} {fname} — {msg}")
    print()
    print('💡 افتح أي صفحة — سيظهر زر اللاعب أعلى اليسار')

if __name__ == '__main__':
    main()
