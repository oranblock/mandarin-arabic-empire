#!/usr/bin/env bash
# ==============================================================================
# سكربت تشغيل خادم إمبراطورية المندرين مع دعم نفق Cloudflare
# Run script for Mandarin Learning Platform & Cloudflare Tunnel
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PORT="${PORT:-8080}"
ENABLE_TUNNEL=false

# معالجة المعاملات
for arg in "$@"; do
  case $arg in
    --tunnel|-t|--public)
      ENABLE_TUNNEL=true
      shift
      ;;
    --port=*|-p=*)
      PORT="${arg#*=}"
      shift
      ;;
    --help|-h)
      echo "الاستخدام:"
      echo "  ./start.sh              تشغيل الخادم محلياً على المنفذ 8080"
      echo "  ./start.sh --tunnel     تشغيل الخادم + فتح نفق سحابي عالمي عبر Cloudflare"
      echo "  ./start.sh --port=3000  تحديد منفذ مخصص"
      exit 0
      ;;
  esac
done

echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN} 🐉 إمبراطورية المندرين — منصة تعلم الصينية بالعربية 🐉 ${NC}"
echo -e "${CYAN}================================================================${NC}"

# التحقق من Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ خطأ: Node.js غير مثبت! يرجى تشغيل ./install.sh أولاً.${NC}"
  exit 1
fi

# التأكد من عدم وجود خادم قديم يعمل على نفس المنفذ
EXISTING_PID=$(lsof -ti :$PORT 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo -e "${YELLOW}🔄 جاري إيقاف العملية القديمة على المنفذ $PORT (PID: $EXISTING_PID)...${NC}"
  kill -9 $EXISTING_PID 2>/dev/null || true
  sleep 1
fi

# تشغيل خادم Node.js
export PORT="$PORT"
node "$SCRIPT_DIR/server.js" &
SERVER_PID=$!

sleep 1

# دالة التنظيف عند الخروج (Ctrl+C)
cleanup() {
  echo -e "\n${YELLOW}🛑 جاري إيقاف الخادم والعمليات التابعة...${NC}"
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  if [ -n "$TUNNEL_PID" ]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}✅ تم إيقاف جميع العمليات بنجاح. وداعاً!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo -e "${GREEN}🚀 الخادم المحلي يعمل الآن بنجاح:${NC}"
echo -e "   🌐 الرئيسية:       ${CYAN}http://localhost:${PORT}/index.html${NC}"
echo -e "   🗺️ خريطة المدن:    ${CYAN}http://localhost:${PORT}/map.html${NC}"
echo -e "   🎯 الاختبارات:     ${CYAN}http://localhost:${PORT}/tests.html${NC}"
echo -e "   📊 لوحة التقدم:    ${CYAN}http://localhost:${PORT}/dashboard.html${NC}"
echo -e "   🔥 التحدي اليومي:   ${CYAN}http://localhost:${PORT}/daily.html${NC}"

# تشغيل نفق Cloudflare إذا طُلب ذلك
if [ "$ENABLE_TUNNEL" = true ]; then
  if command -v cloudflared >/dev/null 2>&1; then
    echo -e "\n${YELLOW}🌐 جاري إنشاء نفق Cloudflare المشفر (HTTPS)...${NC}"
    TUNNEL_LOG=$(mktemp)
    cloudflared tunnel --url "http://127.0.0.1:${PORT}" > "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!

    # انتظار استخراج الرابط العام
    TUNNEL_URL=""
    for i in {1..30}; do
      if grep -q "trycloudflare.com" "$TUNNEL_LOG" 2>/dev/null; then
        TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9.]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -n1)
        break
      fi
      sleep 1
    done

    if [ -n "$TUNNEL_URL" ]; then
      echo -e "${GREEN}================================================================${NC}"
      echo -e "${GREEN}✨ تم إنشاء النفق العالمي بنجاح (متاح عبر الإنترنت):${NC}"
      echo -e "🔗 الرابط العام المباشر:  ${YELLOW}${TUNNEL_URL}${NC}"
      echo -e "🗺️ خريطة المدن العالمية: ${YELLOW}${TUNNEL_URL}/map.html${NC}"
      echo -e "${GREEN}================================================================${NC}"
      echo -e "${CYAN}💡 يمكنك الآن فتح الرابط من هاتفك ومسح Google Authenticator QR Code!${NC}\n"
    else
      echo -e "${YELLOW}⚠️ لم نتمكن من التقاط رابط النفق فورياً، تحقق من سجلات cloudflared.${NC}"
    fi
  else
    echo -e "${RED}⚠️ cloudflared غير مثبت! لتشغيل النفق، قم بتثبيت cloudflared أولاً أو استخدم السيرفر المحلي.${NC}"
  fi
else
  echo -e "\n${YELLOW}💡 نصيحة: لتوليد رابط عام عبر الإنترنت يمكن الوصول له من أي هاتف، شغل الأمر:${NC}"
  echo -e "   ${GREEN}./start.sh --tunnel${NC}\n"
fi

echo -e "${BLUE}اضغط [Ctrl+C] لإيقاف الخادم في أي وقت.${NC}"

# الانتظار حتى إنهاء الخادم
wait "$SERVER_PID"
