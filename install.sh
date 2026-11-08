#!/usr/bin/env bash
# ==============================================================================
# تثبيت وإعداد منصة تعلم الصينية بالعربية وإمبراطورية المندرين
# Setup script for Mandarin Learning Platform & Empire Map
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN} 🐉 جاري تثبيت وإعداد منصة تعلم الصينية بالعربية 🐉 ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. التحقق من بيئة التشغيل
IS_TERMUX=false
if [ -d "/data/data/com.termux" ]; then
  IS_TERMUX=true
  echo -e "${YELLOW}📱 تم اكتشاف بيئة Termux على نظام Android${NC}"
fi

# 2. التحقق من Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️ Node.js غير مثبت. جاري التثبيت التلقائي...${NC}"
  if [ "$IS_TERMUX" = true ]; then
    pkg update -y && pkg install -y nodejs
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nodejs
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -S --noconfirm nodejs
  elif command -v brew >/dev/null 2>&1; then
    brew install node
  else
    echo -e "${RED}❌ تعذر التثبيت التلقائي لـ Node.js. يرجى تثبيت Node.js v16+ يدوياً.${NC}"
    exit 1
  fi
else
  NODE_VER=$(node -v)
  echo -e "${GREEN}✅ Node.js متوفر: ${NODE_VER}${NC}"
fi

# 3. التحقق من cloudflared (اختياري للنفق العام)
if ! command -v cloudflared >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️ cloudflared غير مثبت. محاولة التثبيت لدعم الأنفاق العامة...${NC}"
  if [ "$IS_TERMUX" = true ]; then
    pkg install -y cloudflared || echo -e "${YELLOW}يمكن تشغيل السيرفر محلياً بدون cloudflared${NC}"
  elif command -v apt-get >/dev/null 2>&1; then
    echo -e "${YELLOW}لتثبيت cloudflared على دبيان/أوبنتو:${NC} sudo apt install cloudflared"
  fi
else
  CF_VER=$(cloudflared --version | head -n1)
  echo -e "${GREEN}✅ Cloudflared متوفر: ${CF_VER}${NC}"
fi

# 4. التحقق من بنية المجلدات وملفات البيانات
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p server-data hanzi-data

# التأكد من وجود ملف خريطة الصين
if [ ! -f "china-provinces.json" ]; then
  echo -e "${YELLOW}📥 جاري تحميل بيانات خريطة الصين (GeoJSON)...${NC}"
  curl -sSL "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json" -o "china-provinces.json" || true
fi

# إعطاء صلاحيات التشغيل للسكربتات
chmod +x run.sh start.sh install.sh 2>/dev/null || true

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}✨ اكتمل التثبيت والإعداد بنجاح!${NC}"
echo -e "${BLUE}لتشغيل المنصة مباشرة، نفذ الأمر التالي:${NC}"
echo -e "   ${YELLOW}./start.sh${NC}          (تشغيل محلي على المنفذ 8080)"
echo -e "   ${YELLOW}./start.sh --tunnel${NC} (تشغيل محلي + إنشاء نفق عام عبر Cloudflare)"
echo -e "${GREEN}======================================================${NC}"
