/**
 * خادم لعبة إمبراطورية المندرين والمصادقة عبر Google OTP
 * Node.js Native HTTP Server (No external npm dependencies)
 * Port: 8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'server-data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const CITIES_FILE = path.join(DATA_DIR, 'cities.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// تأكد من وجود مجلد البيانات
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e);
  }
  return fallback;
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${file}:`, e);
  }
}

// -------------------------------------------------------------
// قاعدة بيانات المدن الصينية ومستوياتها المطلوبة
// -------------------------------------------------------------
const CITY_CATALOG = {
  // Tier 3: المدن المركزية العظمى (Megacities)
  'beijing':   { nameZh: '北京市', nameAr: 'بكين', tierRequired: 3, minEmblems: 12, coords: [116.4074, 39.9042], title: 'العاصمة الإمبراطورية' },
  'shanghai':  { nameZh: '上海市', nameAr: 'شانغهاي', tierRequired: 3, minEmblems: 12, coords: [121.4737, 31.2304], title: 'العاصمة المالية' },
  'guangzhou': { nameZh: '广州市', nameAr: 'قوانغتشو', tierRequired: 3, minEmblems: 12, coords: [113.2644, 23.1291], title: 'بوابة الجنوب' },
  'shenzhen':  { nameZh: '深圳市', nameAr: 'شنتشن', tierRequired: 3, minEmblems: 12, coords: [114.0579, 22.5431], title: 'وادي التكنولوجيا' },
  'chongqing': { nameZh: '重庆市', nameAr: 'تشونغتشينغ', tierRequired: 3, minEmblems: 12, coords: [106.5516, 29.5630], title: 'حاضرة الجبال' },
  'tianjin':   { nameZh: '天津市', nameAr: 'تيانجين', tierRequired: 3, minEmblems: 12, coords: [117.2008, 39.0842], title: 'حامية الشمال' },

  // Tier 2: عواصم المقاطعات الكبرى (Provincial Capitals)
  'chengdu':   { nameZh: '成都市', nameAr: 'تشنغدو', tierRequired: 2, minEmblems: 6, coords: [104.0665, 30.5723], title: 'أرض الباندا وسيتشوان' },
  'wuhan':     { nameZh: '武汉市', nameAr: 'ووهان', tierRequired: 2, minEmblems: 6, coords: [114.3055, 30.5928], title: 'ملتقى الأنهار الكبرى' },
  'xian':      { nameZh: '西安市', nameAr: 'شيآن', tierRequired: 2, minEmblems: 6, coords: [108.9398, 34.3416], title: 'بداية طريق الحرير القديم' },
  'hangzhou':  { nameZh: '杭州市', nameAr: 'هانغتشو', tierRequired: 2, minEmblems: 6, coords: [120.1551, 30.2741], title: 'جنة البحيرة الغربية' },
  'nanjing':   { nameZh: '南京市', nameAr: 'نانجينغ', tierRequired: 2, minEmblems: 6, coords: [118.7969, 32.0603], title: 'العاصمة الجنوبية العريقة' },
  'changsha':  { nameZh: '长沙市', nameAr: 'تشانغشا', tierRequired: 2, minEmblems: 6, coords: [112.9388, 28.2282], title: 'قلب هونان النابض' },
  'zhengzhou': { nameZh: '郑州市', nameAr: 'تشنغتشو', tierRequired: 2, minEmblems: 6, coords: [113.6253, 34.7466], title: 'مهد النهر الأصفر' },
  'kunming':   { nameZh: '昆明市', nameAr: 'كونمينغ', tierRequired: 2, minEmblems: 6, coords: [102.8329, 24.8801], title: 'مدينة الربيع الدائم' },

  // Tier 1: المدن الإقليمية والتأسيسية (Regional / Coastal Cities)
  'suzhou':    { nameZh: '苏州市', nameAr: 'سوتشو', tierRequired: 1, minEmblems: 1, coords: [120.5853, 31.2989], title: 'مدينة الحرير والحدائق' },
  'qingdao':   { nameZh: '青岛市', nameAr: 'تشينغداو', tierRequired: 1, minEmblems: 1, coords: [120.3826, 36.0671], title: 'لؤلؤة البحر الأصفر' },
  'shenyang':  { nameZh: '沈阳市', nameAr: 'شنيانغ', tierRequired: 1, minEmblems: 1, coords: [123.4315, 41.8057], title: 'حاضرة منشوريا' },
  'dalian':    { nameZh: '大连市', nameAr: 'داليان', tierRequired: 1, minEmblems: 1, coords: [121.6147, 38.9140], title: 'ميناء الشمال الرومانسي' },
  'xiamen':    { nameZh: '厦门市', nameAr: 'شيامن', tierRequired: 1, minEmblems: 1, coords: [118.0894, 24.4798], title: 'جزيرة اللوتس' },
  'fuzhou':    { nameZh: '福州市', nameAr: 'فوتشو', tierRequired: 1, minEmblems: 1, coords: [119.2965, 26.0745], title: 'مدينة شجر البانيان' },
  'harbin':    { nameZh: '哈尔滨市', nameAr: 'هاربين', tierRequired: 1, minEmblems: 1, coords: [126.5350, 45.8038], title: 'عاصمة الجليد والثلج' },
  'guilin':    { nameZh: '桂林市', nameAr: 'غويلين', tierRequired: 1, minEmblems: 1, coords: [110.2902, 25.2736], title: 'أعجوبة التضاريس الكارستية' },
  'sanya':     { nameZh: '三亚市', nameAr: 'سانيا', tierRequired: 1, minEmblems: 1, coords: [109.5119, 18.2528], title: 'شواطئ هاينان الاستوائية' },
  'lhasa':     { nameZh: '拉萨市', nameAr: 'لاسا', tierRequired: 1, minEmblems: 1, coords: [91.1409, 29.6456], title: 'مدينة الشمس الساطعة' },
  'urumqi':    { nameZh: '乌鲁木齐市', nameAr: 'أورومتشي', tierRequired: 1, minEmblems: 1, coords: [87.6168, 43.8256], title: 'حاضرة شينجيانغ' },
  'luoyang':   { nameZh: '洛阳市', nameAr: 'لويانغ', tierRequired: 1, minEmblems: 1, coords: [112.4540, 34.6197], title: 'عاصمة الفاوانيا التاريخية' }
};

// تهيئة المدن المخزنة
let storedCities = readJson(CITIES_FILE, {});
Object.keys(CITY_CATALOG).forEach(key => {
  if (!storedCities[key]) {
    storedCities[key] = {
      cityId: key,
      nameZh: CITY_CATALOG[key].nameZh,
      nameAr: CITY_CATALOG[key].nameAr,
      title: CITY_CATALOG[key].title,
      tierRequired: CITY_CATALOG[key].tierRequired,
      minEmblems: CITY_CATALOG[key].minEmblems,
      coords: CITY_CATALOG[key].coords,
      ownerId: null,
      ownerName: null,
      ownerAvatar: null,
      empireColor: null,
      challengeScore: 50,
      customArabicName: null,
      namedBy: null,
      claimedAt: null
    };
  }
});
writeJson(CITIES_FILE, storedCities);

// -------------------------------------------------------------
// محرك RFC 6238 TOTP (Google Authenticator Compatible)
// -------------------------------------------------------------
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str) {
  str = (str || '').toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, value = 0, output = [];
  for (let i = 0; i < str.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(str[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTOTP(secretBase32, timeStepOffset = 0) {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000 / 30) + timeStepOffset;
  const timeBuf = Buffer.alloc(8);
  timeBuf.writeBigUInt64BE(BigInt(epoch));

  const hmac = crypto.createHmac('sha1', key).update(timeBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

function verifyTOTP(secretBase32, token) {
  if (!token || typeof token !== 'string') return false;
  const clean = token.trim();
  if (clean.length !== 6 || !/^\d{6}$/.test(clean)) return false;
  for (let offset of [0, -1, 1]) {
    if (generateTOTP(secretBase32, offset) === clean) return true;
  }
  return false;
}

// -------------------------------------------------------------
// MIME Types للملفات الثابتة
// -------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ico':  'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data, isHead = false) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD'
  });
  if (isHead) return res.end();
  res.end(JSON.stringify(data));
}

// -------------------------------------------------------------
// خادم HTTP الرئيسي
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // ═════════════════════════════════════════════════════════
  // API Routes
  // ═════════════════════════════════════════════════════════

  // 1. إعداد Google OTP (Setup) — بدون كلمة مرور
  if (pathname === '/api/auth/otp-setup' && req.method === 'GET') {
    const userId = (parsedUrl.searchParams.get('userId') || 'player-1').trim().toLowerCase();
    const profiles = readJson(PROFILES_FILE, {});

    if (!profiles[userId]) {
      // مستخدم جديد — إنشاء سر TOTP جديد
      const secret = base32Encode(crypto.randomBytes(10)); // 16 Base32 chars
      profiles[userId] = {
        userId,
        name: parsedUrl.searchParams.get('name') || `اللاعب (${userId})`,
        avatar: parsedUrl.searchParams.get('avatar') || '🐯',
        secret,
        xp: 0,
        coins: 50,
        empireColor: '#b5622a',
        achievements: [],
        tierLevel: 1,
        stats: {},
        createdAt: Date.now(),
        lastLogin: null
      };
      writeJson(PROFILES_FILE, profiles);
    }

    const secret = profiles[userId].secret;
    const otpauthUri = `otpauth://totp/MandarinEmpire:${encodeURIComponent(userId)}?secret=${secret}&issuer=MandarinEmpire`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;

    return sendJson(res, 200, {
      success: true,
      userId,
      secret,
      otpauthUri,
      qrCodeUrl,
      // كود اختباري مباشر للتطوير والتحقق الفوري
      currentTestCode: generateTOTP(secret),
      message: 'تم توليد مفتاح Google Authenticator بنجاح. أضف المفتاح إلى تطبيق OTP ثم أدخل الرمز المكون من 6 أرقام لتسجيل الدخول.'
    });
  }

  // 2. تسجيل الدخول عبر Google OTP حصرياً (بدون أي كلمة مرور)
  if (pathname === '/api/auth/otp-login' && req.method === 'POST') {
    const body = await parseBody(req);
    const userId = (body.userId || '').trim().toLowerCase();
    const otpCode = (body.otpCode || '').trim();

    if (!userId || !otpCode) {
      return sendJson(res, 400, { success: false, error: 'يرجى إدخال اسم المستخدم ورمز Google OTP المكون من 6 أرقام.' });
    }

    const profiles = readJson(PROFILES_FILE, {});
    let user = profiles[userId];

    if (!user) {
      return sendJson(res, 404, { success: false, error: 'المستخدم غير موجود. يرجى طلب إعداد رمز OTP أولاً.' });
    }

    const isValid = verifyTOTP(user.secret, otpCode);
    if (!isValid) {
      return sendJson(res, 401, {
        success: false,
        error: '❌ رمز Google OTP غير صحيح أو منتهي الصلاحية! يرجى التحقق من تطبيق Google Authenticator وإعادة المحاولة.'
      });
    }

    // نجاح المصادقة — توليد رمز جلسة
    const token = crypto.randomBytes(24).toString('hex');
    const sessions = readJson(SESSIONS_FILE, {});
    sessions[token] = { userId, createdAt: Date.now() };
    writeJson(SESSIONS_FILE, sessions);

    user.lastLogin = Date.now();
    writeJson(PROFILES_FILE, profiles);

    return sendJson(res, 200, {
      success: true,
      token,
      userId,
      profile: {
        userId: user.userId,
        name: user.name,
        avatar: user.avatar,
        xp: user.xp,
        coins: user.coins,
        empireColor: user.empireColor,
        achievements: user.achievements,
        tierLevel: user.tierLevel,
        masteredChars: user.masteredChars || [],
        stats: user.stats
      },
      message: 'تم تسجيل الدخول بنجاح عبر Google OTP!'
    });
  }

  // 3. جلب / تحديث الملف الشخصي على السيرفر
  if (pathname.startsWith('/api/profile/') && req.method === 'GET') {
    const userId = pathname.replace('/api/profile/', '').trim().toLowerCase();
    const profiles = readJson(PROFILES_FILE, {});
    const user = profiles[userId];
    if (!user) return sendJson(res, 404, { success: false, error: 'المستخدم غير موجود' });
    const { secret, ...safeUser } = user;
    return sendJson(res, 200, { success: true, profile: safeUser });
  }

  if (pathname.startsWith('/api/profile/') && req.method === 'POST') {
    const userId = pathname.replace('/api/profile/', '').trim().toLowerCase();
    const body = await parseBody(req);
    const profiles = readJson(PROFILES_FILE, {});

    if (!profiles[userId]) {
      return sendJson(res, 404, { success: false, error: 'المستخدم غير موجود' });
    }

    // تحديث البيانات مع حماية السر الخاص بـ OTP
    const current = profiles[userId];
    if (body.name) current.name = body.name;
    if (body.avatar) current.avatar = body.avatar;
    if (body.xp !== undefined) current.xp = Math.max(current.xp || 0, body.xp);
    if (body.coins !== undefined) current.coins = body.coins;
    if (body.empireColor) current.empireColor = body.empireColor;
    if (body.achievements) current.achievements = body.achievements;
    if (body.tierLevel) current.tierLevel = body.tierLevel;
    if (body.masteredChars && Array.isArray(body.masteredChars)) current.masteredChars = body.masteredChars;
    if (body.stats) current.stats = Object.assign(current.stats || {}, body.stats);

    writeJson(PROFILES_FILE, profiles);
    const { secret, ...safeUser } = current;
    return sendJson(res, 200, { success: true, profile: safeUser });
  }

  // 4. خريطة المدن: جلب جميع المدن وحالتها
  if (pathname === '/api/map/cities' && req.method === 'GET') {
    const cities = readJson(CITIES_FILE, {});
    return sendJson(res, 200, { success: true, cities, catalog: CITY_CATALOG });
  }

  // 5. امتلاك مدينة — التحقق من رتبة اللاعب وأوسمته
  if (pathname === '/api/map/claim' && req.method === 'POST') {
    const body = await parseBody(req);
    const cityId = (body.cityId || '').toLowerCase();
    const userId = (body.userId || 'player-1').toLowerCase();
    const playerName = body.playerName || 'إمبراطور مجهول';
    const playerAvatar = body.playerAvatar || '🐯';
    const playerTier = parseInt(body.playerTier, 10) || 1;
    const emblemCount = parseInt(body.emblemCount, 10) || 0;
    const empireColor = body.empireColor || '#b5622a';
    const challengeScore = Math.max(50, parseInt(body.challengeScore, 10) || 50);

    const catalogEntry = CITY_CATALOG[cityId];
    if (!catalogEntry) {
      return sendJson(res, 400, { success: false, error: 'المدينة غير موجودة في السجل!' });
    }

    // ─── التحقق الصارم من المستوى المطلوب ───
    if (playerTier < catalogEntry.tierRequired || emblemCount < catalogEntry.minEmblems) {
      let tierArabic = 'المستوى الأول (التأسيس)';
      if (catalogEntry.tierRequired === 2) tierArabic = 'المستوى الثاني (الباحث المتقدم)';
      if (catalogEntry.tierRequired === 3) tierArabic = 'المستوى الثالث (تنين المعرفة)';

      return sendJson(res, 403, {
        success: false,
        error: `⚠️ لا يمكنك امتلاك ${catalogEntry.nameAr} (${catalogEntry.nameZh})! تتطلب الوصول إلى ${tierArabic} ولديك على الأقل ${catalogEntry.minEmblems} أوسمة (لديك حالياً: ${emblemCount} أوسمة).`
      });
    }

    const cities = readJson(CITIES_FILE, {});
    const city = cities[cityId] || {
      cityId,
      nameZh: catalogEntry.nameZh,
      nameAr: catalogEntry.nameAr,
      title: catalogEntry.title,
      tierRequired: catalogEntry.tierRequired,
      minEmblems: catalogEntry.minEmblems,
      coords: catalogEntry.coords
    };

    city.ownerId = userId;
    city.ownerName = playerName;
    city.ownerAvatar = playerAvatar;
    city.empireColor = empireColor;
    city.challengeScore = Math.max(city.challengeScore || 50, challengeScore);
    city.claimedAt = Date.now();

    cities[cityId] = city;
    writeJson(CITIES_FILE, cities);

    return sendJson(res, 200, {
      success: true,
      city,
      message: `🎉 مبارك! تم امتلاك ${city.nameAr} وضمها إلى إمبراطوريتك باللون ${empireColor}!`
    });
  }

  // 6. إطلاق اسم عربي على المدينة (يكلف 50 عملة مكتسبة من الاختبارات فقط)
  if (pathname === '/api/map/name' && req.method === 'POST') {
    const body = await parseBody(req);
    const cityId = (body.cityId || '').toLowerCase();
    const userId = (body.userId || '').toLowerCase();
    const playerName = body.playerName || 'مجهول';
    const customArabicName = (body.customArabicName || '').trim();

    // ─── 1. التحقق اللغوي: حروف عربية فقط (Arabic Only) ───
    // يسمح بالأحرف العربية، والمسافات، والأرقام، ورموز الترقيم البسيطة
    const arabicOnlyRegex = /^[\u0600-\u06FF0-9\s\-_،.]{2,40}$/;
    const containsArabicChar = /[\u0600-\u06FF]/;

    if (!customArabicName || !arabicOnlyRegex.test(customArabicName) || !containsArabicChar.test(customArabicName)) {
      return sendJson(res, 400, {
        success: false,
        error: '❌ الاسم المرفوض! يُسمح بالأسماء المكتوبة باللغة العربية فقط (دون أي حروف إنجليزية أو صينية أو رموز خاصة غريبة).'
      });
    }

    // ─── 2. التحقق المالي: العملات تُكتسب حصرياً من الاختبارات ───
    const NAMING_COST = 50;
    const profiles = readJson(PROFILES_FILE, {});
    const user = profiles[userId];

    if (!user) {
      return sendJson(res, 404, { success: false, error: 'المستخدم غير مسجل على السيرفر.' });
    }

    if ((user.coins || 0) < NAMING_COST) {
      return sendJson(res, 403, {
        success: false,
        error: `🪙 رصيدك الحالي (${user.coins || 0} عملة) غير كافٍ! تكلفة إطلاق اسم عربي هي ${NAMING_COST} عملة. يمكنك كسب المزيد من العملات عبر اجتياز الاختبارات في صفحة (tests.html).`
      });
    }

    const cities = readJson(CITIES_FILE, {});
    const city = cities[cityId];
    if (!city) {
      return sendJson(res, 404, { success: false, error: 'المدينة غير موجودة في السجل!' });
    }

    // خصم العملات
    user.coins -= NAMING_COST;
    writeJson(PROFILES_FILE, profiles);

    // تسجيل الاسم المخصص واسم اللاعب الذي سماها
    city.customArabicName = customArabicName;
    city.namedBy = playerName;
    city.namedAt = Date.now();
    writeJson(CITIES_FILE, cities);

    return sendJson(res, 200, {
      success: true,
      city,
      remainingCoins: user.coins,
      message: `✨ تم إطلاق الاسم العربي "${customArabicName}" على المدينة بنجاح! نُسبت التسمية إلى [${playerName}]. تبقى لديك ${user.coins} عملة.`
    });
  }

  // 7. تحصين المدينة (زيادة قوة التحدي)
  if (pathname === '/api/map/fortify' && req.method === 'POST') {
    const body = await parseBody(req);
    const cityId = (body.cityId || '').toLowerCase();
    const cities = readJson(CITIES_FILE, {});
    const city = cities[cityId];

    if (!city) return sendJson(res, 404, { success: false, error: 'المدينة غير موجودة!' });

    city.challengeScore = (city.challengeScore || 50) + 25;
    writeJson(CITIES_FILE, cities);

    return sendJson(res, 200, {
      success: true,
      city,
      message: `🛡️ تم تحصين ${city.nameAr}! قوة التحدي الحالية: ${city.challengeScore}`
    });
  }

  // ═════════════════════════════════════════════════════════
  // Static File Serving
  // ═════════════════════════════════════════════════════════
  let safePath = path.normalize(pathname);
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(__dirname, safePath);

  // حماية المسار من Directory Traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404 — الصفحة غير موجودة</h1><a href="/index.html">العودة للرئيسية</a>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 خادم إمبراطورية المندرين يعمل على المنفذ: http://localhost:${PORT}`);
  console.log(`🔐 مصادقة Google Authenticator (TOTP RFC 6238) مفعلة بدون كلمات مرور.`);
});
