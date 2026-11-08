#!/usr/bin/env python3
"""يضيف زر تبديل اللاعب إلى audio.html / writing.html / tests.html."""
import shutil
import sys
from pathlib import Path

SNIPPET = '''
<!-- player switcher -->
<div id="player-switch" style="
  position:fixed; top:10px; left:10px; z-index:9999;
  background:#fff; border:1px solid #e6e0d4; border-radius:12px;
  padding:6px 10px; font-family:inherit; font-size:.85rem;
  display:flex; align-items:center; gap:8px;
  box-shadow:0 2px 8px rgba(0,0,0,.06);
">
  <span id="ps-avatar" style="font-size:1.4rem">🐯</span>
  <span id="ps-name" style="font-weight:700; color:#b5622a">اللاعب الأول</span>
  <button id="ps-toggle" style="
    background:#b5622a; color:#fff; border:none; border-radius:8px;
    padding:4px 10px; cursor:pointer; font-family:inherit; font-size:.8rem;
  ">تبديل</button>
</div>
<script>
(function(){
  function refresh(){
    if (!window.CNProgress) return;
    const p = CNProgress.getProfile();
    document.getElementById('ps-avatar').textContent = p.avatar;
    document.getElementById('ps-name').textContent = p.name;
  }
  document.getElementById('ps-toggle').addEventListener('click', () => {
    if (!window.CNProgress) return;
    const cur = CNProgress.getCurrentId();
    CNProgress.setCurrentId(cur === 'p1' ? 'p2' : 'p1');
    refresh();
  });
  // انتظر تحميل progress.js
  if (window.CNProgress) refresh();
  else window.addEventListener('load', refresh);
})();
</script>
'''

def patch(path: Path) -> tuple:
    if not path.exists():
        return False, 'غير موجود'
    text = path.read_text(encoding='utf-8')
    if 'id="player-switch"' in text:
        return True, 'موجود مسبقاً'
    if '<body>' not in text:
        return False, 'لم أجد <body>'
    bak = path.with_suffix(path.suffix + '.bak3')
    if not bak.exists():
        shutil.copy2(path, bak)
    text = text.replace('<body>', '<body>\n' + SNIPPET, 1)
    path.write_text(text, encoding='utf-8')
    return True, 'أُضيف زر التبديل'


def main():
    base = Path('.')
    for fname in ['audio.html', 'writing.html', 'tests.html']:
        ok, msg = patch(base / fname)
        print(f"{'✅' if ok else '❌'} {fname} — {msg}")

if __name__ == '__main__':
    main()
