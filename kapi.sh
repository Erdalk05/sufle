#!/bin/bash
# Sufle yeşil kapı — yayından ÖNCE koşturulur. Hepsi geçmeden yayınlanmaz.
# ⚠️ .son-yayin dosyasını YAYINDAN SONRA yaz. Önce yazarsan kapı yeni sürümü
#    "zaten yayınlanmış" sanıp kendini bloke eder (bir kez başıma geldi).
#   ./kapi.sh
# Çıkış kodu 0 = yayınlanabilir.
set -uo pipefail
cd "$(dirname "$0")"
KOD=0
say(){ printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

say "1/4 Statik denetim (telefon + Mac)"
MACF="$HOME/Desktop/Teleprompter/Teleprompter Pro.html"
[ -f "$MACF" ] || MACF="mac/Teleprompter Pro.html"
if [ -f "$MACF" ]; then
  python3 denetim.py index.html "$MACF" || KOD=1
else
  python3 denetim.py index.html || KOD=1
  echo "  (Mac dosyası bulunamadı, atlandı)"
fi

say "2/4 JS sözdizimi"
TMP=$(mktemp -d)
python3 - "$TMP" <<'PY' || KOD=1
import re, sys, os
tmp = sys.argv[1]
src = open('index.html', encoding='utf-8').read()
js = re.findall(r"<script>(.*?)</script>", src, re.S)[-1]
open(os.path.join(tmp, 'telefon.js'), 'w', encoding='utf-8').write(js)
print("  script bloğu çıkarıldı:", len(js), "karakter")
PY
node --check "$TMP/telefon.js" && echo "  telefon JS ✓" || KOD=1
if [ -f "$MACF" ]; then
  python3 - "$TMP" "$MACF" <<'PY'
import re, sys, os
tmp, mac = sys.argv[1], sys.argv[2]
js = re.findall(r"<script>(.*?)</script>", open(mac, encoding='utf-8').read(), re.S)[-1]
open(os.path.join(tmp, 'mac.js'), 'w', encoding='utf-8').write(js)
PY
  node --check "$TMP/mac.js" && echo "  Mac JS ✓" || KOD=1
else
  echo "  Mac dosyası yok, atlandı"
fi

say "3/4 Regresyon testleri"
node tests/kos.js || KOD=1

say "4/4 Sürüm tutarlılığı"
python3 - <<'PY' || KOD=1
import re, sys
ver = re.search(r"VER='([\d.]+)'", open('index.html', encoding='utf-8').read()).group(1)
cache = re.search(r"CACHE\s*=\s*'sufle-v(\d+)'", open('sw.js', encoding='utf-8').read()).group(1)
print("  index.html VER =", ver, "· sw.js cache = sufle-v" + cache)
try:
    prev = open('.son-yayin', encoding='utf-8').read().split()
except Exception:
    prev = None
if prev and prev[0] == ver:
    print("  ✗ VER artmamış — son yayınla aynı (%s). sw.js cache'ini de artır." % ver); sys.exit(1)
if prev and int(cache) <= int(prev[1]):
    print("  ✗ sw.js cache artmamış — eski sürüm cihazlarda kalır."); sys.exit(1)
print("  ✓ sürüm ve cache ileri gitmiş")
PY

rm -rf "$TMP"
echo
if [ $KOD -eq 0 ]; then
  echo -e "\033[32m✅ KAPI YEŞİL — yayınlanabilir\033[0m"
else
  echo -e "\033[31m⛔ KAPI KIRMIZI — yayınlama\033[0m"
fi
exit $KOD
