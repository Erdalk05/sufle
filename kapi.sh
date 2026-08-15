#!/bin/bash
# Sufle yeşil kapı — yayından ÖNCE koşturulur. Hepsi geçmeden yayınlanmaz.
# 8 adım: derleme · denetim · sözdizimi · testler · sürüm · aynalar · kapsam · bozma turu
# ⚠️ .son-yayin dosyasını YAYINDAN SONRA yaz. Önce yazarsan kapı yeni sürümü
#    "zaten yayınlanmış" sanıp kendini bloke eder (bir kez başıma geldi).
#   ./kapi.sh
# Çıkış kodu 0 = yayınlanabilir.
set -uo pipefail
cd "$(dirname "$0")"
KOD=0
say(){ printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

say "1/9 Derleme tazeliği"
# EN BAŞTA, çünkü çıktı bayatsa sonraki YEDİ ADIM DA yanlış dosyayı ölçer:
# denetim bayat kabuğu denetler, testler bayat kabuğu sınar, kapı yeşil der ve
# yayınlanan kod kaynaktan farklı olur. Erdal'ın diğer depolarında bu sınıf
# ("bayat dist") iki kez pahalıya patladı.
python3 derle.py --denetle || KOD=1

say "2/9 Statik denetim (telefon + Mac)"
# DEPO ÖNCE. Ters sıra 2026-08-13'te yanılttı: depodaki dosya düzenlendi,
# masaüstü kopyası eski kaldı, kapı eski dosyayı denetleyip yeşil dedi.
MACF="mac/Teleprompter Pro.html"
[ -f "$MACF" ] || MACF="$HOME/Desktop/Teleprompter/Teleprompter Pro.html"
if [ -f "$MACF" ]; then
  python3 denetim.py index.html "$MACF" || KOD=1
else
  python3 denetim.py index.html || KOD=1
  echo "  (Mac dosyası bulunamadı, atlandı)"
fi

say "3/9 JS sözdizimi"
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

say "4/9 Regresyon testleri"
node tests/kos.js || KOD=1

say "5/9 Sürüm tutarlılığı"
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

say "6/9 Platformlar arası tutarlılık"
python3 - "$MACF" <<'PY2' || KOD=1
import re, sys, hashlib, os
mac = sys.argv[1]
tel_ver = re.search(r"VER='([\d.]+)'", open('index.html', encoding='utf-8').read()).group(1)
ok = True
if os.path.exists(mac):
    mac_ver = re.search(r"VER='([\d.]+)'", open(mac, encoding='utf-8').read()).group(1)
    # SURUM SAPMASI: elle iki dosyayi ayri ayri artiriyordum, bir kez kacirdim
    # (telefon 7.5 / Mac 7.4). Rapor "uc platform da ayni surumde" diyordu ama degildi.
    if tel_ver != mac_ver:
        print("  ✗ sürüm sapması: telefon %s, Mac %s" % (tel_ver, mac_ver)); ok = False
    else:
        print("  ✓ telefon ve Mac aynı sürümde: %s" % tel_ver)
else:
    print("  — Mac dosyası yok, atlandı")

# AYNA KOPYALARI BAYAT MI (2026-08-13'te bu boşluk kanıtlandı)
# Depo kanondur; ama kullanıcının çift tıkladığı dosya masaüstündeki kopya.
# Depo düzeltilip ayna eşitlenmezse kapı yeşil der, kullanıcı eski sürümü
# kullanmaya devam eder. Yayın öncesi hepsi birebir olmalı.
h = lambda p: hashlib.md5(open(p, 'rb').read()).hexdigest()
AYNALAR = [
    ("telefon master", "index.html", "~/Desktop/iPhone Teleprompter/index.html"),
    # denetim.py de ikiye ayrılmıştı: master kopyası 41 satır geride kalmış,
    # olay-işleyicisi dedektörü ve Mac desteği orada yoktu. Denetim betiği
    # bayatlarsa kapı sessizce zayıflar — bulunmayan hata "yok" sanılır.
    ("denetim.py",     "denetim.py", "~/Desktop/iPhone Teleprompter/denetim.py"),
    ("Mac masaüstü",   mac,          "~/Desktop/Teleprompter/Teleprompter Pro.html"),
    ("Windows kopyası", mac,         "~/Desktop/Teleprompter-Windows/Teleprompter Pro.html"),
]
for ad, kanon, ayna in AYNALAR:
    ayna = os.path.expanduser(ayna)
    if not os.path.exists(kanon):
        continue
    if not os.path.exists(ayna):
        print("  — %s bu makinede yok, atlandı" % ad); continue
    if os.path.abspath(ayna) == os.path.abspath(kanon):
        continue
    if h(ayna) != h(kanon):
        print("  ✗ %s depodakiyle aynı değil (bayat ayna)" % ad); ok = False
    else:
        print("  ✓ %s birebir" % ad)

sys.exit(0 if ok else 1)
PY2

say "7/9 Fonksiyon kapsamı"
# TESTİN HİÇ ANMADIĞI FONKSİYON SAYISI DÜŞMELİ, ARTMAMALI.
# Ölçüt bilerek "kapsanmayan sayısı": yüzde ile ölçseydik testsiz bir
# fonksiyonu SİLMEK kapsamı iyileştirmiş gibi görünürdü. Gerekçenin
# tamamı kapsam.py başında.
python3 kapsam.py index.html "$MACF" || KOD=1

say "8/9 Kasıtlı bozma turu"
# HER TESTİN AYIRT ETTİĞİ TEKRARLANABİLİR OLARAK KANITLANIYOR.
# Eskiden bozmalar geçici betiklerdi: kanıt yalnız commit mesajında
# kalıyordu ve testi sonradan gevşeten kimse yakalanmıyordu.
python3 bozma.py || KOD=1

say "9/9 Kontrast denetimi (çizilmiş arayüz)"
# B.8'in kalan kalemi. tests/121 jeton ÇİFTLERİNİ hesaplıyor ama bir jetonun
# hangi zeminin üstünde kullanıldığını kaynaktan bilmek mümkün değil; gerçek
# soru "bu metin ardındaki zeminin üstünde okunuyor mu" ve buna ancak tarayıcı
# cevap verir. Chrome yoksa ADIM ATLANIR ve bunu SÖYLER — sessizce yeşil
# geçmek, ölçmeyen kapı olurdu.
if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  python3 kontrast.py || KOD=1
else
  echo "  ATLANDI: Chrome yok — kontrast denetimi koşturulamadı"
fi

rm -rf "$TMP"
echo
if [ $KOD -eq 0 ]; then
  echo -e "\033[32m✅ KAPI YEŞİL — yayınlanabilir\033[0m"
else
  echo -e "\033[31m⛔ KAPI KIRMIZI — yayınlama\033[0m"
fi
exit $KOD
