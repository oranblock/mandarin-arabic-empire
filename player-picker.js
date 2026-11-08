/* player-picker.js — النظام الموحد للملف الشخصي والمصادقة السحابية عبر Google OTP */
(function(){
  const AVATARS = ['🐯','🦊','🐼','🦁','🐸','🐨','🦉','🐺','🦄','🐙','🐷','🐵','🐶','🐱','🐰','🐻','🐔','🦆','🦅','🐢'];
  const EMPIRE_COLORS = ['#b5622a','#27ae60','#2980b9','#8e44ad','#d35400','#c0392b','#16a085','#d4af37'];
  const FIRST_KEY = 'cn-picked-first-player-v3';

  function waitFor(cb){
    if (window.CNProgress) return cb();
    setTimeout(() => waitFor(cb), 50);
  }

  function injectStyles(){
    const css = `
      #pp-fab {
        position: fixed; top: 12px; left: 12px; z-index: 9998;
        background: #ffffff; border: 2px solid #e6e0d4; border-radius: 14px;
        padding: 6px 12px; cursor: pointer; font-family: inherit; font-size: .88rem;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 14px rgba(0,0,0,.08);
        transition: all .2s; direction: rtl;
      }
      #pp-fab:hover { border-color: #b5622a; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(181,98,42,.15); }
      #pp-fab .fab-avatar { font-size: 1.6rem; line-height: 1; }
      #pp-fab .fab-info { text-align: right; }
      #pp-fab .fab-name { font-weight: 700; color: #b5622a; font-size: .88rem; display: flex; align-items: center; gap: 6px; }
      #pp-fab .fab-stats { font-size: .75rem; color: #8a8375; }
      #pp-fab .fab-auth-badge {
        font-size: .72rem; padding: 2px 7px; border-radius: 999px;
        background: #eafaf0; color: #27ae60; font-weight: bold; border: 1px solid #a3e4d7;
      }
      #pp-fab .fab-auth-badge.offline {
        background: #fdf2e9; color: #d35400; border-color: #fad7a0;
      }

      #pp-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,.5);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none; transition: opacity .25s; padding: 16px;
      }
      #pp-overlay.open { opacity: 1; pointer-events: auto; }
      #pp-modal {
        background: #ffffff; border-radius: 22px; padding: 24px;
        max-width: 580px; width: 100%; max-height: 90vh; overflow-y: auto;
        font-family: inherit; direction: rtl; text-align: right;
        transform: scale(.94); transition: transform .25s;
        box-shadow: 0 12px 36px rgba(0,0,0,.25);
      }
      #pp-overlay.open #pp-modal { transform: scale(1); }

      .pp-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e6e0d4; padding-bottom: 12px; margin-bottom: 16px; }
      .pp-header h3 { margin: 0; color: #b5622a; font-size: 1.35rem; display: flex; align-items: center; gap: 8px; }
      .pp-btn-close { background: none; border: none; font-size: 1.4rem; color: #8a8375; cursor: pointer; }

      /* البطاقة النشطة */
      .pp-active-card {
        background: #fff8ef; border: 2px solid #b5622a; border-radius: 18px;
        padding: 16px; margin-bottom: 18px; display: flex; gap: 16px; align-items: center;
      }
      .pp-avatar-big {
        font-size: 3.4rem; line-height: 1; cursor: pointer; user-select: none;
        background: #fff; border: 2px solid #e6e0d4; border-radius: 50%;
        width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;
        transition: transform .15s;
      }
      .pp-avatar-big:hover { transform: scale(1.1) rotate(6deg); }
      .pp-identity-info { flex: 1; }
      .pp-name-edit {
        font-weight: 700; color: #2b2b2b; font-size: 1.25rem;
        padding: 2px 6px; border-radius: 6px; outline: none; border: 1px dashed transparent;
        display: inline-block; cursor: text;
      }
      .pp-name-edit:focus, .pp-name-edit:hover { border-color: #b5622a; background: #fff; }

      .pp-metrics-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 8px; margin-top: 10px;
      }
      .pp-metric-chip {
        background: #fff; border: 1px solid #e6e0d4; border-radius: 10px;
        padding: 6px 10px; font-size: .82rem; text-align: center;
      }
      .pp-metric-chip b { color: #b5622a; display: block; font-size: 1rem; }

      /* منتقي لون الإمبراطورية */
      .pp-color-row {
        display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: .85rem; color: #7d7568;
      }
      .pp-color-dot {
        width: 22px; height: 22px; border-radius: 50%; border: 2px solid #fff;
        box-shadow: 0 0 0 1px #ccc; cursor: pointer; transition: transform .15s;
      }
      .pp-color-dot:hover, .pp-color-dot.active { transform: scale(1.25); box-shadow: 0 0 0 2px #b5622a; }

      /* قسم Google Authenticator */
      .pp-auth-box {
        background: #faf8f5; border: 1px solid #e6e0d4; border-radius: 16px;
        padding: 16px; margin-bottom: 18px;
      }
      .pp-auth-box h4 { margin: 0 0 8px; color: #b5622a; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; }

      .pp-auth-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
      .pp-tab-btn {
        background: #fff; border: 1px solid #e6e0d4; border-radius: 8px;
        padding: 6px 14px; font-family: inherit; font-size: .88rem; font-weight: bold;
        color: #7d7568; cursor: pointer;
      }
      .pp-tab-btn.active { background: #b5622a; color: #fff; border-color: #b5622a; }

      .pp-input {
        width: 100%; padding: 10px 12px; border: 2px solid #e6e0d4; border-radius: 10px;
        font-family: inherit; font-size: .95rem; box-sizing: border-box; margin: 6px 0 10px;
      }
      .pp-input:focus { border-color: #b5622a; outline: none; }
      .pp-otp-input {
        letter-spacing: 6px; font-size: 1.5rem; text-align: center; font-weight: bold;
      }

      .pp-btn {
        padding: 9px 18px; border-radius: 10px; border: none; font-family: inherit;
        font-weight: 700; font-size: .92rem; cursor: pointer; transition: all .2s;
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      }
      .pp-btn-primary { background: #b5622a; color: #fff; width: 100%; }
      .pp-btn-primary:hover { background: #9c4f1e; }
      .pp-btn-green { background: #27ae60; color: #fff; width: 100%; }
      .pp-btn-green:hover { background: #219653; }
      .pp-btn-outline { background: #fff; border: 1px solid #e6e0d4; color: #7d7568; }
      .pp-btn-outline:hover { border-color: #b5622a; color: #b5622a; }

      .pp-secret-display {
        background: #f4f4f4; border: 1px dashed #ccc; padding: 8px;
        font-family: monospace; font-size: 1.1rem; text-align: center;
        border-radius: 8px; user-select: all; margin: 8px 0;
      }

      /* التبديل المحلي */
      .pp-local-row {
        display: flex; gap: 10px; margin-top: 14px; border-top: 1px dashed #e6e0d4; padding-top: 12px;
      }
      .pp-local-card {
        flex: 1; background: #fff; border: 1px solid #e6e0d4; border-radius: 12px;
        padding: 10px; text-align: center; cursor: pointer; transition: all .2s;
      }
      .pp-local-card:hover { border-color: #b5622a; }
      .pp-local-card.active { border-color: #b5622a; background: #fff8ef; }

      .pp-toast {
        position: fixed; bottom: 24px; left: 50%;
        transform: translateX(-50%) translateY(80px);
        background: #2c3e50; color: #fff; padding: 10px 22px; border-radius: 999px;
        font-weight: 700; box-shadow: 0 8px 24px rgba(0,0,0,.25);
        transition: transform .3s; z-index: 10001; font-size: .9rem;
      }
      .pp-toast.show { transform: translateX(-50%) translateY(0); }
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function injectHTML(){
    const html = `
      <button id="pp-fab" type="button" aria-label="الملف الشخصي والمصادقة">
        <span class="fab-avatar" id="pp-fab-avatar">🐯</span>
        <span class="fab-info">
          <span class="fab-name" id="pp-fab-name">اللاعب</span>
          <span class="fab-stats" id="pp-fab-stats">Lv 1 · 🪙 50</span>
        </span>
        <span class="fab-auth-badge offline" id="pp-fab-badge">🔐 محلي</span>
      </button>

      <div id="pp-overlay" role="dialog" aria-modal="true">
        <div id="pp-modal">
          <div class="pp-header">
            <h3>👤 الملف الشخصي الموحد (عبر كل الصفحات)</h3>
            <button class="pp-btn-close" id="pp-modal-close" type="button">✕</button>
          </div>

          <!-- البطاقة الشخصية الحالية -->
          <div class="pp-active-card">
            <div class="pp-avatar-big" id="pp-cur-avatar" title="اضغط لتغيير الأفاتار">🐯</div>
            <div class="pp-identity-info">
              <div>
                <span class="pp-name-edit" id="pp-cur-name" contenteditable="true" title="اضغط لتعديل الاسم">اللاعب</span>
              </div>
              <div class="pp-metrics-grid">
                <div class="pp-metric-chip">🪙 العملات<b id="pp-metric-coins">50</b></div>
                <div class="pp-metric-chip">⭐ الخبرة<b id="pp-metric-xp">0 XP</b></div>
                <div class="pp-metric-chip">🎖️ الأوسمة<b id="pp-metric-emblems">0</b></div>
                <div class="pp-metric-chip">📖 الحروف<b id="pp-metric-chars">36</b></div>
              </div>
              <div class="pp-color-row">
                <span>لونك في الخريطة:</span>
                <div id="pp-color-options" style="display:flex; gap:6px;"></div>
              </div>
            </div>
          </div>

          <!-- قسم Google Authenticator السحابي -->
          <div class="pp-auth-box">
            <h4>🔐 الحساب السحابي (Google Authenticator)</h4>

            <!-- في حال تسجيل الدخول مسبقاً -->
            <div id="pp-logged-view" style="display:none">
              <div style="background:#eafaf0; border:1px solid #a3e4d7; border-radius:10px; padding:10px 14px; margin-bottom:10px; font-size:.9rem; color:#145a32">
                🟢 أنت متصل بالسيرفر بالمعرف: <b id="pp-logged-user-id">--</b>
                <div style="font-size:.8rem; color:#27ae60; margin-top:2px">تقدمك، حروفك، عملاتك، ومدنك متزامنة عبر كل الصفحات تلقائياً.</div>
              </div>
              <div style="display:flex; gap:8px">
                <button class="pp-btn pp-btn-primary" id="pp-btn-sync-now" style="flex:1">🔄 مزامنة التقدم الآن</button>
                <button class="pp-btn pp-btn-outline" id="pp-btn-logout" style="color:#c0392b">🚪 خروج</button>
              </div>
            </div>

            <!-- في حال عدم تسجيل الدخول -->
            <div id="pp-guest-view">
              <div class="pp-auth-tabs">
                <button class="pp-tab-btn active" id="pp-tab-login-btn">تسجيل الدخول بالرمز (Login)</button>
                <button class="pp-tab-btn" id="pp-tab-signup-btn">إنشاء حساب جديد (Sign Up)</button>
              </div>

              <!-- تبويب الدخول -->
              <div id="pp-tab-login-pane">
                <label style="font-size:.85rem; font-weight:bold">معرف المستخدم (Username):</label>
                <input type="text" id="pp-login-user" class="pp-input" placeholder="مثال: player-1 أو ahmed" style="text-align:left; font-family:monospace">
                <label style="font-size:.85rem; font-weight:bold">رمز Google OTP المكون من 6 أرقام (بدون كلمة مرور):</label>
                <input type="text" id="pp-login-code" class="pp-input pp-otp-input" placeholder="000000" maxlength="6" inputmode="numeric">
                <button class="pp-btn pp-btn-green" id="pp-btn-do-login">🚀 تسجيل الدخول الفوري</button>
                <div id="pp-login-msg" style="font-size:.82rem; margin-top:6px; text-align:center"></div>
              </div>

              <!-- تبويب التسجيل -->
              <div id="pp-tab-signup-pane" style="display:none">
                <label style="font-size:.85rem; font-weight:bold">اختر معرفاً جديداً لحسابك:</label>
                <input type="text" id="pp-signup-user" class="pp-input" placeholder="اسم المستخدم بالإنجليزية..." style="text-align:left; font-family:monospace">
                <button class="pp-btn pp-btn-primary" id="pp-btn-do-signup">🔑 إنشاء حساب وتوليد مفتاح OTP</button>

                <div id="pp-signup-result" style="display:none; margin-top:12px; text-align:center; background:#fff; border:1px dashed #b5622a; border-radius:12px; padding:12px">
                  <div style="font-size:.82rem; color:#7d7568">انسخ المفتاح السري إلى Google Authenticator:</div>
                  <div class="pp-secret-display" id="pp-signup-secret">----</div>
                  <div id="pp-signup-qr" style="margin:8px 0"></div>
                  <div style="font-size:.82rem; color:#27ae60; font-weight:bold" id="pp-signup-hint"></div>
                  <button class="pp-btn pp-btn-green" id="pp-btn-quick-login-now" style="margin-top:8px">دخول بهذا الحساب الآن ←</button>
                </div>
              </div>
            </div>
          </div>

          <!-- تبديل سريع بين الملفات المحلية -->
          <div style="font-size:.82rem; color:#8a8375; margin-bottom:4px">تبديل محلي سريع (تنافس أخوين على نفس الجهاز):</div>
          <div class="pp-local-row" id="pp-local-switchers"></div>
        </div>
      </div>

      <div class="pp-toast" id="pp-toast"></div>
    `;
    const d = document.createElement('div');
    d.innerHTML = html;
    while (d.firstChild) document.body.appendChild(d.firstChild);
  }

  function toast(msg){
    const t = document.getElementById('pp-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  function renderColors(){
    const p = CNProgress.getProfile();
    const curColor = CNProgress.getEmpireColor(p);
    const box = document.getElementById('pp-color-options');
    if (!box) return;
    box.innerHTML = '';
    EMPIRE_COLORS.forEach(c => {
      const dot = document.createElement('div');
      dot.className = 'pp-color-dot' + (c === curColor ? ' active' : '');
      dot.style.background = c;
      dot.addEventListener('click', () => {
        CNProgress.setEmpireColor(c);
        renderFAB();
        renderColors();
        toast('تم تحديث لونك في الخريطة!');
      });
      box.appendChild(dot);
    });
  }

  function renderFAB(){
    const p = CNProgress.getProfile();
    const lv = CNProgress.levelFromXP(p.xp || 0);
    const coins = CNProgress.getCoins(p);
    const session = CNProgress.server.getAuthSession();

    const avatarEl = document.getElementById('pp-fab-avatar');
    const nameEl = document.getElementById('pp-fab-name');
    const statsEl = document.getElementById('pp-fab-stats');
    const badgeEl = document.getElementById('pp-fab-badge');

    if (avatarEl) avatarEl.textContent = p.avatar || '🐯';
    if (nameEl) nameEl.textContent = p.name || 'اللاعب';
    if (statsEl) statsEl.textContent = `Lv ${lv} · 🪙 ${coins}`;

    if (badgeEl) {
      if (session && session.token) {
        badgeEl.textContent = '🟢 ' + session.userId;
        badgeEl.className = 'fab-auth-badge';
      } else {
        badgeEl.textContent = '🔐 محلي';
        badgeEl.className = 'fab-auth-badge offline';
      }
    }
  }

  function renderModalContent(){
    const p = CNProgress.getProfile();
    const lv = CNProgress.levelFromXP(p.xp || 0);
    const coins = CNProgress.getCoins(p);
    const emblemsCount = (p.achievements || []).length;
    const charsCount = (p.masteredChars || []).length;
    const session = CNProgress.server.getAuthSession();

    // البطاقة النشطة
    const curAvatar = document.getElementById('pp-cur-avatar');
    const curName = document.getElementById('pp-cur-name');
    if (curAvatar) curAvatar.textContent = p.avatar || '🐯';
    if (curName) curName.textContent = p.name || 'اللاعب';

    document.getElementById('pp-metric-coins').textContent = coins;
    document.getElementById('pp-metric-xp').textContent = `${p.xp || 0} XP (Lv ${lv})`;
    document.getElementById('pp-metric-emblems').textContent = emblemsCount;
    document.getElementById('pp-metric-chars').textContent = `${charsCount}/174`;

    renderColors();

    // قسم المصادقة
    const loggedView = document.getElementById('pp-logged-view');
    const guestView = document.getElementById('pp-guest-view');
    if (session && session.token) {
      loggedView.style.display = 'block';
      guestView.style.display = 'none';
      document.getElementById('pp-logged-user-id').textContent = session.userId;
    } else {
      loggedView.style.display = 'none';
      guestView.style.display = 'block';
    }

    // التبديل المحلي
    const localBox = document.getElementById('pp-local-switchers');
    if (localBox) {
      localBox.innerHTML = '';
      const all = CNProgress.getAllProfiles();
      const curId = CNProgress.getCurrentId();
      Object.keys(all).slice(0, 3).forEach(id => {
        const pr = all[id];
        const card = document.createElement('div');
        card.className = 'pp-local-card' + (id === curId ? ' active' : '');
        card.innerHTML = `<span style="font-size:1.4rem">${pr.avatar}</span><div style="font-weight:bold; font-size:.85rem">${pr.name}</div><div style="font-size:.75rem; color:#8a8375">${pr.xp} XP · 🪙 ${CNProgress.getCoins(pr)}</div>`;
        card.addEventListener('click', () => {
          if (id === curId) return;
          CNProgress.setCurrentId(id);
          renderFAB();
          renderModalContent();
          toast('تم التحويل إلى: ' + pr.name);
          window.dispatchEvent(new CustomEvent('player-changed', { detail: { profile: CNProgress.getProfile() } }));
        });
        localBox.appendChild(card);
      });
    }
  }

  function setupAuthEvents(){
    // التبويبات
    const tabLoginBtn = document.getElementById('pp-tab-login-btn');
    const tabSignupBtn = document.getElementById('pp-tab-signup-btn');
    const tabLoginPane = document.getElementById('pp-tab-login-pane');
    const tabSignupPane = document.getElementById('pp-tab-signup-pane');

    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabSignupBtn.classList.remove('active');
      tabLoginPane.style.display = 'block';
      tabSignupPane.style.display = 'none';
    });

    tabSignupBtn.addEventListener('click', () => {
      tabSignupBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      tabSignupPane.style.display = 'block';
      tabLoginPane.style.display = 'none';
    });

    // توليد مفتاح جديد (Sign Up)
    let lastGenerated = null;
    document.getElementById('pp-btn-do-signup').addEventListener('click', async () => {
      const user = (document.getElementById('pp-signup-user').value || '').trim();
      if (!user) {
        alert('يرجى كتابة اسم مستخدم');
        return;
      }
      try {
        const res = await CNProgress.server.otpSetup(user);
        if (res.success) {
          lastGenerated = res;
          document.getElementById('pp-signup-result').style.display = 'block';
          document.getElementById('pp-signup-secret').textContent = res.secret;
          document.getElementById('pp-signup-qr').innerHTML = `<img src="${res.qrCodeUrl}" alt="QR" style="width:140px; height:140px; border-radius:8px; border:1px solid #ccc">`;
          document.getElementById('pp-signup-hint').textContent = `💡 رمز الدخول الحالي: ${res.currentTestCode}`;
          toast('تم إنشاء الحساب والمفتاح بنجاح!');
        } else {
          alert('تعذر إنشاء الحساب');
        }
      } catch(e) {
        alert('تعذر الاتصال بالسيرفر');
      }
    });

    // دخول سريع من التسجيل
    document.getElementById('pp-btn-quick-login-now').addEventListener('click', () => {
      if (!lastGenerated) return;
      document.getElementById('pp-login-user').value = lastGenerated.userId;
      document.getElementById('pp-login-code').value = lastGenerated.currentTestCode;
      tabLoginBtn.click();
      document.getElementById('pp-btn-do-login').click();
    });

    // تسجيل الدخول (Login)
    document.getElementById('pp-btn-do-login').addEventListener('click', async () => {
      const user = (document.getElementById('pp-login-user').value || '').trim();
      const code = (document.getElementById('pp-login-code').value || '').trim();
      const msg = document.getElementById('pp-login-msg');

      if (!user || !code) {
        msg.textContent = '❌ أدخل اسم المستخدم ورمز Google OTP المكون من 6 أرقام';
        msg.style.color = '#c0392b';
        return;
      }

      msg.textContent = 'جاري التحقق عبر السيرفر...';
      msg.style.color = '#7d7568';

      try {
        const res = await CNProgress.server.otpLogin(user, code);
        if (res.success) {
          msg.textContent = '✅ مرحباً بك! تم تسجيل الدخول بنجاح';
          msg.style.color = '#27ae60';
          toast('تم تسجيل الدخول: ' + user);
          renderFAB();
          renderModalContent();
          setTimeout(() => {
            document.getElementById('pp-overlay').classList.remove('open');
            window.location.reload();
          }, 800);
        } else {
          msg.textContent = res.error || 'رمز OTP غير صحيح';
          msg.style.color = '#c0392b';
        }
      } catch(e) {
        msg.textContent = 'تعذر الاتصال بالسيرفر';
        msg.style.color = '#c0392b';
      }
    });

    // مزامنة يدوية
    document.getElementById('pp-btn-sync-now').addEventListener('click', async () => {
      toast('جاري المزامنة مع السيرفر...');
      try {
        const res = await CNProgress.server.syncToServer();
        if (res.success) {
          toast('✅ تم تحديث بياناتك على السيرفر بنجاح!');
        } else {
          toast(res.error || 'تعذر إتمام المزامنة');
        }
      } catch(e) {
        toast('خطأ في الاتصال بالسيرفر');
      }
    });

    // تسجيل الخروج
    document.getElementById('pp-btn-logout').addEventListener('click', () => {
      CNProgress.server.logout();
      renderFAB();
      renderModalContent();
      toast('تم تسجيل الخروج من السيرفر');
      window.location.reload();
    });

    // تغيير الأفاتار بالنقر
    document.getElementById('pp-cur-avatar').addEventListener('click', () => {
      const p = CNProgress.getProfile();
      const idx = AVATARS.indexOf(p.avatar);
      const next = AVATARS[(idx + 1) % AVATARS.length];
      CNProgress.updateProfile(prof => { prof.avatar = next; });
      renderFAB();
      renderModalContent();
    });

    // تعديل الاسم بالنقر
    const nameInput = document.getElementById('pp-cur-name');
    nameInput.addEventListener('blur', () => {
      const newName = nameInput.textContent.trim().slice(0, 20) || 'لاعب';
      CNProgress.updateProfile(prof => { prof.name = newName; });
      renderFAB();
      toast('تم حفظ الاسم: ' + newName);
    });
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); nameInput.blur(); }
      if (e.key === 'Escape') { nameInput.textContent = CNProgress.getProfile().name; nameInput.blur(); }
    });
  }

  function openModal(){
    renderModalContent();
    document.getElementById('pp-overlay').classList.add('open');
  }

  function closeModal(){
    document.getElementById('pp-overlay').classList.remove('open');
  }

  async function init(){
    injectStyles();
    injectHTML();
    setupAuthEvents();
    renderFAB();

    document.getElementById('pp-fab').addEventListener('click', openModal);
    document.getElementById('pp-modal-close').addEventListener('click', closeModal);
    document.getElementById('pp-overlay').addEventListener('click', e => {
      if (e.target.id === 'pp-overlay') closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    // مزامنة خلفية عند فتح أي صفحة إذا كان المستخدم مسجلاً بالسيرفر
    if (CNProgress.server.getAuthSession()) {
      try {
        await CNProgress.server.pullProfile();
        renderFAB();
      } catch(e){}
    }

    // استماع للتحديثات بين النوافذ والصفحات
    window.addEventListener('storage', () => renderFAB());
    window.addEventListener('player-changed', () => renderFAB());
  }

  waitFor(init);
})();
