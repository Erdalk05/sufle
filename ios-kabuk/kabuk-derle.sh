#!/bin/bash
# SUFLE iOS KABUĞU — SİMÜLATÖR DERLEMESİ (YAYIN YOK, İMZA YOK)
#
# NE YAPAR: depodaki GÜNCEL index.html'i kabuğun içine gömer, uygulamayı iOS
# simülatörü için derler ve açar. Böylece "mağaza kabuğu çalışıyor mu" sorusu
# Apple hesabı beklemeden ölçülebiliyor.
#
# NE YAPMAZ: imzalamaz, App Store'a hiçbir şey göndermez, cihaza kurmaz.
# Gerçek cihaz ve mağaza için Apple Developer hesabı gerekiyor — o karar
# Erdal'da ve bu betik o kararı BEKLETMEDEN kabuğun ayakta olduğunu kanıtlıyor.
#
# KULLANIM:
#   ./ios-kabuk/kabuk-derle.sh            # gerçek uygulamayı göm ve aç
#   ./ios-kabuk/kabuk-derle.sh olcum      # yetenek ölçüm sayfasını göm
set -euo pipefail
cd "$(dirname "$0")/.."

SAYFA="${1:-index}"
KABUK="ios-kabuk"
CIKTI="$(mktemp -d /tmp/sufle-kabuk.XXXXXX)"
APP="$CIKTI/Sufle.app"

echo "== 1/5 sürüm tutarlılığı =="
VER=$(grep -oE "VER='[0-9.]+'" index.html | head -1 | grep -oE "[0-9.]+")
PVER=$(grep -A1 CFBundleShortVersionString "$KABUK/Kabuk-Info.plist" | grep -oE "[0-9]+\.[0-9]+" | head -1)
if [ "$VER" != "$PVER" ]; then
  echo "  ✗ sürüm sapması: uygulama $VER, kabuk plist $PVER"
  echo "    (Kabuk-Info.plist içindeki CFBundleShortVersionString güncellenmeli)"
  exit 1
fi
echo "  ✓ uygulama ve kabuk aynı sürümde: $VER"

echo "== 2/5 SDK =="
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
echo "  ✓ $(basename "$SDK")"

echo "== 3/5 derleme =="
mkdir -p "$APP"
# Simülatör hedefi: gerçek cihaz için imza gerekiyor, simülatör için gerekmiyor.
# -parse-as-library ŞART: @UIApplicationMain ile üst düzey kod aynı dosyada
# olamıyor (derleyici bunu hata sayıyor). Ölçüldü, tahmin edilmedi.
xcrun -sdk iphonesimulator swiftc \
  -target arm64-apple-ios15.0-simulator \
  -sdk "$SDK" -parse-as-library \
  -o "$APP/Sufle" \
  "$KABUK/kabuk.swift" 2>&1 | grep -v "^$" || true
[ -f "$APP/Sufle" ] || { echo "  ✗ derleme çıktısı yok"; exit 1; }
echo "  ✓ ikili üretildi ($(du -h "$APP/Sufle" | cut -f1))"

echo "== 4/5 paketleme =="
cp "$KABUK/Kabuk-Info.plist" "$APP/Info.plist"
# Uygulamanın KENDİSİ pakete giriyor: tek dosya olduğu için başka bir şey gerekmiyor.
if [ "$SAYFA" = "olcum" ]; then
  cp "$KABUK/olcum-kabuk.html" "$APP/index.html"
else
  cp index.html "$APP/index.html"
fi
cp icon-180.png "$APP/AppIcon60x60@3x.png" 2>/dev/null || true
echo "  ✓ paket hazır: $APP ($(du -sh "$APP" | cut -f1))"

echo "== 5/5 simülatöre kur ve aç =="
CIHAZ=$(xcrun simctl list devices available | grep -m1 -oE "iPhone [0-9]+[^(]*\([0-9A-F-]{36}\)" | grep -oE "[0-9A-F-]{36}" || true)
if [ -z "$CIHAZ" ]; then
  echo "  — kullanılabilir simülatör yok, kurulum atlandı (derleme yine de geçti)"
  exit 0
fi
xcrun simctl boot "$CIHAZ" 2>/dev/null || true
xcrun simctl install "$CIHAZ" "$APP"
xcrun simctl launch "$CIHAZ" com.erdalkiziroglu.sufle >/dev/null
echo "  ✓ simülatörde açıldı (cihaz $CIHAZ)"
echo
echo "Paket: $APP"
echo "NOT: bu bir SİMÜLATÖR derlemesidir. Gerçek cihaz ve mağaza için Apple"
echo "     Developer hesabı gerekiyor; kod tarafında bekleyen bir iş yok."
