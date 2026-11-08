/* نظام التقدم والإنجازات وسلّم HSK — يعمل عبر كل الصفحات */
(function(){
  const STORAGE_KEY = 'cn-learn-profiles-v1';
  const CURRENT_KEY = 'cn-learn-current-v1';

  const XP_REWARDS = {
    testCorrect: 10,
    testPerfect: 25,
    audioPlay: 2,
    charWrite: 5,
    writeCorrect: 15,
    dailyFirst: 25,
    dailyPerfect: 50,
    tierUpgrade: 100
  };

  // سلّم مستويات HSK ومحطات الطلاقة
  const HSK_LADDER = [
    { level: 'HSK 1', chars: 174, name: 'الدرجة الأولى', desc: 'أساسيات التواصل والبقاء' },
    { level: 'HSK 2', chars: 347, name: 'الدرجة الثانية', desc: 'محادثات يومية بسيطة' },
    { level: 'HSK 3', chars: 617, name: 'الدرجة الثالثة', desc: 'استقلالية لغوية ومواقف متكررة' },
    { level: 'HSK 4', chars: 1064, name: 'الدرجة الرابعة', desc: 'طلاقة متوسطة ومناقشات متنوعة' },
    { level: 'HSK 5', chars: 1685, name: 'الدرجة الخامسة', desc: 'قراءة الصحف ومشاهدة الأفلام' },
    { level: 'HSK 6', chars: 2663, name: 'الدرجة السادسة', desc: 'تعبير فصيح وفهم شبه أصلي' },
    { level: 'الطلاقة', chars: 3500, name: 'الطلاقة الكاملة', desc: 'قراءة الأدب والكتابة الاحترافية' }
  ];

  function defaultProfile(name, avatar){
    return {
      name, avatar,
      xp: 0,
      coins: 50, // العملات تُكتسب حصرياً من الاختبارات وتُستخدم لإطلاق الأسماء وامتلاك المدن
      empireColor: '#b5622a', // لون إمبراطورية اللاعب على الخريطة
      serverAuth: null, // بيانات المصادقة السحابية عبر Google OTP
      stats: {
        totalActivities: 0, testsTaken: 0, testsCorrect: 0, testsTotal: 0,
        audioPlays: 0, charactersWritten: 0, writingCorrect: 0,
        bestStreak: 0, perfectRounds: 0, charsMastered: 36, sessions7Days: 0,
        dailyCompleted: 0, dailyStreak: 0, lastDailyDate: null
      },
      masteredChars: ['一','二','三','四','五','六','七','八','九','十','我','你','他','她','好','是','不','人','大','小','水','火','山','口','日','月','女','子','木','心','手','明','林','休','家','天'],
      achievements: [],
      tierLevel: 1,
      activity: [],
      lastSession: null,
      createdAt: Date.now()
    };
  }

  function getStore(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // ترقية الملفات القديمة لدعم الحروف المتقنة والمراحل والعملات
        Object.keys(parsed).forEach(k => {
          const p = parsed[k];
          if (!p.masteredChars) {
            p.masteredChars = ['一','二','三','四','五','六','七','八','九','十','我','你','他','她','好','是','不','人','大','小','水','火','山','口','日','月','女','子','木','心','手','明','林','休','家','天'];
          }
          if (!p.stats.charsMastered || p.stats.charsMastered < p.masteredChars.length) {
            p.stats.charsMastered = p.masteredChars.length;
          }
          if (!p.tierLevel) p.tierLevel = 1;
          if (p.coins === undefined) p.coins = 50;
          if (!p.empireColor) p.empireColor = '#b5622a';
        });
        return parsed;
      }
    }catch(e){}
    const init = {
      p1: defaultProfile('اللاعب الأول', '🐯'),
      p2: defaultProfile('اللاعب الثاني', '🦊')
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }

  function saveStore(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  function getCurrentId(){ return localStorage.getItem(CURRENT_KEY) || 'p1'; }
  function setCurrentId(id){ localStorage.setItem(CURRENT_KEY, id); }
  function getProfile(id){ return getStore()[id || getCurrentId()]; }
  function saveProfile(id, p){ const s = getStore(); s[id || getCurrentId()] = p; saveStore(s); }

  let _syncTimer = null;
  function scheduleServerSync(){
    if (typeof window === 'undefined') return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
      try {
        if (window.CNProgress && window.CNProgress.server && window.CNProgress.server.getAuthSession()) {
          window.CNProgress.server.syncToServer().catch(() => {});
        }
      } catch(e){}
    }, 1200);
  }

  function updateProfile(fn){
    const id = getCurrentId();
    const store = getStore();
    if (!store[id]) store[id] = defaultProfile('مستخدم', '🙂');
    fn(store[id]);
    saveStore(store);
    scheduleServerSync();
    return store[id];
  }

  // XP: level 1=0, 2=100, 3=300, 4=600, 5=1000 (triangular)
  function xpForLevel(n){ return 50 * (n - 1) * n; }
  function levelFromXP(xp){ let l = 1; while (xpForLevel(l + 1) <= xp) l++; return l; }
  function xpProgress(xp){
    const level = levelFromXP(xp);
    const cur = xp - xpForLevel(level);
    const total = xpForLevel(level + 1) - xpForLevel(level);
    return { level, current: cur, total, percent: total > 0 ? Math.min(100, (cur / total) * 100) : 100 };
  }

  // الأوسمة مقسمة إلى 3 مستويات متدرجة (Tiers)
  const ACHIEVEMENTS = [
    // ═══ المستوى الأول: التأسيس (Tier 1) ═══
    { id:'first-step',    tier:1, name:'الخطوة الأولى', desc:'أكمل أول نشاط في التعلم', colors:['#7ec850','#3d8b1f'], icon:'🌱', check:p=>p.stats.totalActivities>=1 },
    { id:'first-sound',   tier:1, name:'أول صوت',       desc:'استمع إلى 10 كلمات', colors:['#f39c12','#c87f0a'], icon:'🎧', check:p=>p.stats.audioPlays>=10 },
    { id:'first-write',   tier:1, name:'أول حرف',       desc:'ارسم 10 حروف صينية', colors:['#3498db','#1f6699'], icon:'✍️', check:p=>p.stats.charactersWritten>=10 },
    { id:'streak-10',     tier:1, name:'سلسلة 10',      desc:'10 إجابات صحيحة متتالية', colors:['#e74c3c','#a82c1c'], icon:'🔥', check:p=>p.stats.bestStreak>=10 },
    { id:'streak-50',     tier:1, name:'سلسلة 50',      desc:'50 إجابة صحيحة متتالية', colors:['#c0392b','#7b1f13'], icon:'🔥', check:p=>p.stats.bestStreak>=50 },
    { id:'perfect-round', tier:1, name:'جولة كاملة',    desc:'100% في اختبار واحد', colors:['#f1c40f','#b39209'], icon:'🎯', check:p=>p.stats.perfectRounds>=1 },
    { id:'hsk-1',         tier:1, name:'بداية HSK 1',   desc:'تعلم 36 حرفاً من أساسيات الصينية', colors:['#9b59b6','#663780'], icon:'📖', check:p=>p.stats.charsMastered>=36 },
    { id:'xp-100',        tier:1, name:'100 نقطة',      desc:'اجمع أول 100 نقطة خبرة', colors:['#f39c12','#8b5a02'], icon:'⭐', check:p=>p.xp>=100 },
    { id:'xp-500',        tier:1, name:'500 نقطة',      desc:'اجمع 500 نقطة خبرة', colors:['#e67e22','#8b3e02'], icon:'🌟', check:p=>p.xp>=500 },
    { id:'xp-1000',       tier:1, name:'1000 نقطة',     desc:'اجمع 1000 نقطة خبرة', colors:['#d4af37','#7a6210'], icon:'🏆', check:p=>p.xp>=1000 },
    { id:'daily-first',   tier:1, name:'أول تحدٍ يومي', desc:'أكمل أول تحدٍ يومي بنجاح', colors:['#f39c12','#d35400'], icon:'📅', check:p=>p.stats.dailyCompleted>=1 },

    // ═══ المستوى الثاني: الباحث المتقدم (Tier 2 — يفتح بعد جمع أوسمة المستوى الأول) ═══
    { id:'tier1-master',  tier:2, name:'سيد الأساس',    desc:'الحصول على جميع أوسمة المرحلة الأولى', colors:['#e67e22','#d35400'], icon:'🎖️', check:p=>allTierUnlocked(p, 1) },
    { id:'chars-50',      tier:2, name:'حافظ الـ 50',   desc:'أتقن 50 حرفاً صينياً حقيقياً', colors:['#16a085','#0e6251'], icon:'📚', check:p=>p.stats.charsMastered>=50 },
    { id:'audio-50',      tier:2, name:'الأذن المتيقظة', desc:'استمع إلى 50 كلمة ومثال', colors:['#2980b9','#1a5276'], icon:'📻', check:p=>p.stats.audioPlays>=50 },
    { id:'write-30',      tier:2, name:'الخطاط الماهر', desc:'ارسم 30 حرفاً بنجاح', colors:['#8e44ad','#5b2c6f'], icon:'🖌️', check:p=>p.stats.charactersWritten>=30 },
    { id:'streak-75',     tier:2, name:'لهيب المعرفة',  desc:'75 إجابة صحيحة دون خطأ', colors:['#d35400','#900c3f'], icon:'⚡', check:p=>p.stats.bestStreak>=75 },
    { id:'perfect-3',     tier:2, name:'الدقة العالية',  desc:'3 جولات كاملة 100%', colors:['#f39c12','#b7950b'], icon:'💎', check:p=>p.stats.perfectRounds>=3 },
    { id:'tests-15',      tier:2, name:'المختبر الصامد', desc:'أكمل 15 جولة اختبار', colors:['#27ae60','#196f3d'], icon:'🛡️', check:p=>p.stats.testsTaken>=15 },
    { id:'daily-streak-3', tier:2, name:'ثلاثية الأيام', desc:'3 أيام متتالية من التحدي اليومي', colors:['#27ae60','#196f3d'], icon:'🌟', check:p=>p.stats.dailyStreak>=3 },
    { id:'daily-streak-7', tier:2, name:'بطل الأسبوع',   desc:'7 أيام متتالية من التحدي اليومي', colors:['#2980b9','#1f618d'], icon:'🏅', check:p=>p.stats.dailyStreak>=7 },
    { id:'xp-2500',       tier:2, name:'2500 نقطة',     desc:'اجمع 2500 نقطة خبرة', colors:['#f1c40f','#b7950b'], icon:'👑', check:p=>p.xp>=2500 },

    // ═══ المستوى الثالث: تنين المعرفة (Tier 3 — قمة الإتقان والطلاقة) ═══
    { id:'tier2-master',  tier:3, name:'سيد المتقدم',   desc:'الحصول على جميع أوسمة المستوى الثاني', colors:['#9b59b6','#4a235a'], icon:'🏅', check:p=>allTierUnlocked(p, 2) },
    { id:'chars-75',      tier:3, name:'طليعة HSK 1',   desc:'إتقان 75 حرفاً (أكثر من 40% من الدرجة الأولى)', colors:['#2c3e50','#1a252f'], icon:'🏮', check:p=>p.stats.charsMastered>=75 },
    { id:'audio-150',     tier:3, name:'السمع المطلق',  desc:'استمع إلى 150 نطقاً صوتياً', colors:['#c0392b','#641e16'], icon:'🔊', check:p=>p.stats.audioPlays>=150 },
    { id:'write-60',      tier:3, name:'إتقان الريشة',  desc:'رسم 60 حرفاً بدقة عالية', colors:['#d4af37','#7a6210'], icon:'📜', check:p=>p.stats.charactersWritten>=60 },
    { id:'streak-100',    tier:3, name:'سلسلة المئة',   desc:'100 إجابة متتالية لا تشوبها شائبة', colors:['#e74c3c','#78281f'], icon:'🐉', check:p=>p.stats.bestStreak>=100 },
    { id:'perfect-10',    tier:3, name:'علامة كاملة ×10', desc:'10 جولات اختبار بدرجة 100%', colors:['#e67e22','#6e2c00'], icon:'🏆', check:p=>p.stats.perfectRounds>=10 },
    { id:'daily-streak-30', tier:3, name:'أسطورة الشهر', desc:'30 يوماً متتالياً من التحديات اليومية', colors:['#d4af37','#7a6210'], icon:'👑', check:p=>p.stats.dailyStreak>=30 },
    { id:'xp-5000',       tier:3, name:'تنين الحكمة',   desc:'تجاوز 5000 نقطة خبرة كاملة', colors:['#d4af37','#b5622a'], icon:'🐲', check:p=>p.xp>=5000 }
  ];

  function allTierUnlocked(p, tierNum){
    const tierAchievements = ACHIEVEMENTS.filter(a => a.tier === tierNum);
    return tierAchievements.every(a => p.achievements.includes(a.id));
  }

  function getTierStatus(profile){
    const p = profile || getProfile();
    const t1 = ACHIEVEMENTS.filter(a => a.tier === 1);
    const t2 = ACHIEVEMENTS.filter(a => a.tier === 2);
    const t3 = ACHIEVEMENTS.filter(a => a.tier === 3);
    const t1Unlocked = t1.filter(a => p.achievements.includes(a.id)).length;
    const t2Unlocked = t2.filter(a => p.achievements.includes(a.id)).length;
    const t3Unlocked = t3.filter(a => p.achievements.includes(a.id)).length;

    let currentTier = 1;
    if (t1Unlocked === t1.length) currentTier = 2;
    if (t1Unlocked === t1.length && t2Unlocked === t2.length) currentTier = 3;

    return {
      currentTier,
      tier1: { total: t1.length, unlocked: t1Unlocked, complete: t1Unlocked === t1.length, name:'المستوى الأول: التأسيس' },
      tier2: { total: t2.length, unlocked: t2Unlocked, complete: t2Unlocked === t2.length, name:'المستوى الثاني: الباحث المتقدم' },
      tier3: { total: t3.length, unlocked: t3Unlocked, complete: t3Unlocked === t3.length, name:'المستوى الثالث: تنين المعرفة' }
    };
  }

  function getLadderProgress(profile){
    const p = profile || getProfile();
    const count = (p.stats && p.stats.charsMastered) || (p.masteredChars ? p.masteredChars.length : 36);
    const pctHSK1 = Math.round((count / 174) * 100);
    const pctFluency = Math.max(1, Math.round((count / 3500) * 100));

    let stageIdx = 0;
    for (let i = 0; i < HSK_LADDER.length; i++) {
      if (count >= HSK_LADDER[i].chars) stageIdx = i;
    }

    return {
      count,
      pctHSK1,
      pctFluency,
      stageIndex: stageIdx,
      currentStage: HSK_LADDER[stageIdx],
      nextStage: HSK_LADDER[Math.min(stageIdx + 1, HSK_LADDER.length - 1)],
      ladder: HSK_LADDER
    };
  }

  function checkAchievements(){
    const profile = getProfile();
    const unlocked = [];
    ACHIEVEMENTS.forEach(a => {
      if (!profile.achievements.includes(a.id) && a.check(profile)){
        profile.achievements.push(a.id);
        unlocked.push(a);
      }
    });

    // فحص الترقية بين المستويات
    const tierStatus = getTierStatus(profile);
    if (tierStatus.currentTier > (profile.tierLevel || 1)) {
      profile.tierLevel = tierStatus.currentTier;
      profile.xp += XP_REWARDS.tierUpgrade;
    }

    if (unlocked.length) saveProfile(null, profile);
    return unlocked;
  }

  function addXP(amount){
    return updateProfile(p => { p.xp += amount; });
  }

  function recordActivity(type, data){
    data = data || {};
    return updateProfile(p => {
      p.stats.totalActivities++;

      // تسجيل الحرف الجديد
      if (data.char) {
        if (!p.masteredChars) p.masteredChars = [];
        if (!p.masteredChars.includes(data.char)) {
          p.masteredChars.push(data.char);
        }
        p.stats.charsMastered = p.masteredChars.length;
      }

      if (type === 'test'){
        p.stats.testsTaken++;
        p.stats.testsCorrect += data.correct || 0;
        p.stats.testsTotal += data.total || 0;
        if (data.streak && data.streak > p.stats.bestStreak) p.stats.bestStreak = data.streak;
        if (data.perfect) p.stats.perfectRounds++;
      } else if (type === 'audio'){
        p.stats.audioPlays++;
      } else if (type === 'write'){
        p.stats.charactersWritten++;
        if (data.correct) p.stats.writingCorrect++;
      } else if (type === 'daily'){
        p.stats.dailyCompleted = (p.stats.dailyCompleted || 0) + 1;
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        if (p.stats.lastDailyDate !== todayStr) {
          const yDate = new Date(Date.now() - 86400000);
          const yesterdayStr = yDate.getFullYear() + '-' + String(yDate.getMonth()+1).padStart(2,'0') + '-' + String(yDate.getDate()).padStart(2,'0');
          if (p.stats.lastDailyDate === yesterdayStr) {
            p.stats.dailyStreak = (p.stats.dailyStreak || 0) + 1;
          } else {
            p.stats.dailyStreak = 1;
          }
          p.stats.lastDailyDate = todayStr;
        }
      }

      const today = new Date().toDateString();
      if (p.lastSession !== today){
        p.lastSession = today;
        p.stats.sessions7Days = (p.stats.sessions7Days || 0) + 1;
      }

      p.activity.unshift({ type, data, time: Date.now() });
      if (p.activity.length > 100) p.activity = p.activity.slice(0, 100);
    });
  }

  function speakChinese(text, rate = 1.0){
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = rate;
    window.speechSynthesis.speak(u);
    return true;
  }

  // ═════════════════════════════════════════════════════════
  // إدارة العملات (Coins) — تُكتسب حصرياً من الاختبارات
  // ═════════════════════════════════════════════════════════
  function getCoins(profile){
    const p = profile || getProfile();
    return p.coins !== undefined ? p.coins : 50;
  }

  function addCoins(amount){
    const n = Math.max(0, parseInt(amount, 10) || 0);
    if (!n) return getCoins();
    return updateProfile(p => {
      p.coins = (p.coins !== undefined ? p.coins : 50) + n;
    }).coins;
  }

  function spendCoins(amount){
    const n = Math.max(0, parseInt(amount, 10) || 0);
    let ok = false;
    updateProfile(p => {
      const cur = p.coins !== undefined ? p.coins : 50;
      if (cur >= n) {
        p.coins = cur - n;
        ok = true;
      }
    });
    return ok;
  }

  function getEmpireColor(profile){
    const p = profile || getProfile();
    return p.empireColor || '#b5622a';
  }

  function setEmpireColor(hex){
    if (!hex || typeof hex !== 'string') return getEmpireColor();
    return updateProfile(p => {
      p.empireColor = hex;
    }).empireColor;
  }

  // ═════════════════════════════════════════════════════════
  // المصادقة السحابية عبر Google OTP ومزامنة الخادم
  // ═════════════════════════════════════════════════════════
  const SERVER_BASE_DEFAULT = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'http://localhost:8080';

  const server = {
    getBaseUrl(){
      return (typeof localStorage !== 'undefined' && localStorage.getItem('cn-server-url')) || SERVER_BASE_DEFAULT;
    },
    setBaseUrl(url){
      if (typeof localStorage !== 'undefined') localStorage.setItem('cn-server-url', url);
    },
    async otpSetup(userId){
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/auth/otp-setup?userId=${encodeURIComponent(userId)}`);
      return res.json();
    },
    async otpLogin(userId, otpCode){
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/auth/otp-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otpCode })
      });
      const data = await res.json();
      if (data.success && data.token) {
        const uId = data.userId;
        const store = getStore();
        if (!store[uId]) {
          store[uId] = defaultProfile(data.profile ? data.profile.name : uId, data.profile ? data.profile.avatar : '🐯');
        }
        setCurrentId(uId);
        updateProfile(p => {
          p.serverAuth = {
            userId: data.userId,
            token: data.token,
            lastLogin: Date.now()
          };
          if (data.profile) {
            if (data.profile.name) p.name = data.profile.name;
            if (data.profile.avatar) p.avatar = data.profile.avatar;
            if (data.profile.coins !== undefined) p.coins = data.profile.coins;
            if (data.profile.xp !== undefined) p.xp = Math.max(p.xp || 0, data.profile.xp);
            if (data.profile.empireColor) p.empireColor = data.profile.empireColor;
            if (data.profile.achievements) p.achievements = data.profile.achievements;
            if (data.profile.tierLevel) p.tierLevel = data.profile.tierLevel;
            if (data.profile.masteredChars && data.profile.masteredChars.length) p.masteredChars = data.profile.masteredChars;
            if (data.profile.stats) p.stats = Object.assign(p.stats || {}, data.profile.stats);
          }
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('player-changed', { detail: { userId: uId, profile: getProfile() } }));
        }
      }
      return data;
    },
    async pullProfile(){
      const session = this.getAuthSession();
      if (!session || !session.token) return null;
      try {
        const base = this.getBaseUrl();
        const res = await fetch(`${base}/api/profile/${encodeURIComponent(session.userId)}`);
        const data = await res.json();
        if (data && data.success && data.profile) {
          updateProfile(p => {
            if (data.profile.name) p.name = data.profile.name;
            if (data.profile.avatar) p.avatar = data.profile.avatar;
            if (data.profile.coins !== undefined) p.coins = data.profile.coins;
            if (data.profile.xp !== undefined) p.xp = Math.max(p.xp || 0, data.profile.xp);
            if (data.profile.empireColor) p.empireColor = data.profile.empireColor;
            if (data.profile.achievements) p.achievements = data.profile.achievements;
            if (data.profile.tierLevel) p.tierLevel = data.profile.tierLevel;
            if (data.profile.masteredChars && data.profile.masteredChars.length) p.masteredChars = data.profile.masteredChars;
            if (data.profile.stats) p.stats = Object.assign(p.stats || {}, data.profile.stats);
          });
          return getProfile();
        }
      } catch(e){}
      return null;
    },
    getAuthSession(){
      const p = getProfile();
      return p.serverAuth || null;
    },
    logout(){
      updateProfile(p => { p.serverAuth = null; });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('player-changed', { detail: { profile: getProfile() } }));
      }
    },
    async syncToServer(){
      const session = this.getAuthSession();
      if (!session || !session.token) return { success: false, error: 'غير مسجل الدخول بالسيرفر' };
      const base = this.getBaseUrl();
      const p = getProfile();
      const res = await fetch(`${base}/api/profile/${encodeURIComponent(session.userId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          name: p.name,
          avatar: p.avatar,
          xp: p.xp,
          coins: p.coins,
          empireColor: p.empireColor,
          achievements: p.achievements,
          tierLevel: p.tierLevel,
          masteredChars: p.masteredChars || [],
          stats: p.stats
        })
      });
      return res.json();
    },
    async getMapCities(){
      const base = this.getBaseUrl();
      try {
        const res = await fetch(`${base}/api/map/cities`);
        return res.json();
      } catch(e) {
        console.warn('Server offline, using fallback local map cities', e);
        return { success: true, cities: JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('cn-map-cities-local')) || '{}') };
      }
    },
    async claimCity(cityId, empireColor){
      const session = this.getAuthSession();
      const p = getProfile();
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/map/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.token}` : ''
        },
        body: JSON.stringify({
          cityId,
          userId: session ? session.userId : getCurrentId(),
          playerName: p.name,
          playerAvatar: p.avatar,
          playerTier: p.tierLevel || 1,
          emblemCount: (p.achievements || []).length,
          empireColor: empireColor || p.empireColor || '#b5622a',
          challengeScore: Math.max(50, Math.round((p.xp || 0) / 10) + 50)
        })
      });
      return res.json();
    },
    async nameCity(cityId, customArabicName){
      const session = this.getAuthSession();
      const p = getProfile();
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/map/name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.token}` : ''
        },
        body: JSON.stringify({
          cityId,
          userId: session ? session.userId : getCurrentId(),
          playerName: p.name,
          customArabicName
        })
      });
      const data = await res.json();
      if (data.success && data.remainingCoins !== undefined) {
        updateProfile(prof => { prof.coins = data.remainingCoins; });
      }
      return data;
    },
    async fortifyCity(cityId){
      const session = this.getAuthSession();
      const base = this.getBaseUrl();
      const res = await fetch(`${base}/api/map/fortify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.token}` : ''
        },
        body: JSON.stringify({
          cityId,
          userId: session ? session.userId : getCurrentId()
        })
      });
      return res.json();
    }
  };

  window.CNProgress = {
    getProfile, getAllProfiles: getStore, getCurrentId, setCurrentId,
    saveProfile, updateProfile, addXP, recordActivity, checkAchievements,
    getCoins, addCoins, spendCoins, getEmpireColor, setEmpireColor,
    server,
    getAchievements: () => ACHIEVEMENTS,
    getUnlockedAchievements: () => {
      const p = getProfile();
      return ACHIEVEMENTS.filter(a => p.achievements.includes(a.id));
    },
    getTierStatus,
    getLadderProgress,
    HSK_LADDER,
    speakChinese,
    levelFromXP, xpProgress, xpForLevel, XP_REWARDS
  };
})();
