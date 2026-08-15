#!/usr/bin/env bash
# iOS YETENEK ÖLÇÜMÜ — Safari VE WKWebView.
#
# NEDEN VAR: yol haritası aylarca "SpeechRecognition WKWebView'da YOK, mağaza
# kabuğu iOS'ta sesle takibi kaybeder" diyordu ve bu, mağaza kabuğunu bloke
# eden TEK maddeydi. 2026-08-15'te ÖLÇÜLDÜ ve iddia çürüdü (iOS 18.6'da ikisi
# de var). Varsayımın yerini ölçüm alsın diye betik burada duruyor:
# iOS sürümü değişince tek komutla yeniden ölçülür.
#
# Kullanım: ./ios-olcum/olc.sh   (Xcode + iOS simülatörü gerekir)
set -e
KOK="$(cd "$(dirname "$0")" && pwd)"
CIHAZ="${1:-iPhone 16 Pro}"

python3 -m http.server 8899 --bind 127.0.0.1 --directory "$KOK" >/dev/null 2>&1 &
SUNUCU=$!
trap 'kill $SUNUCU 2>/dev/null || true' EXIT
sleep 2

xcrun simctl boot "$CIHAZ" 2>/dev/null || true
sleep 20

echo "== 1/2 Mobile Safari =="
xcrun simctl openurl booted "http://127.0.0.1:8899/olcum.html"
sleep 10
xcrun simctl io booted screenshot "$KOK/sonuc-safari.png"

echo "== 2/2 WKWebView =="
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
APP="$KOK/.build/WKProbe.app"
mkdir -p "$APP"
xcrun -sdk iphonesimulator swiftc -target arm64-apple-ios17.0-simulator -sdk "$SDK" \
  "$KOK/wkprobe.swift" -o "$APP/WKProbe"
cp "$KOK/WKProbe-Info.plist" "$APP/Info.plist"
xcrun simctl install booted "$APP"
xcrun simctl launch booted com.sufle.wkprobe
sleep 10
xcrun simctl io booted screenshot "$KOK/sonuc-wkwebview.png"

echo
echo "Kareler: $KOK/sonuc-safari.png · $KOK/sonuc-wkwebview.png"
echo "WKWebView'ı Safari'den ayırt etmek için UA satırına bak:"
echo "  Safari    -> ... Mobile/15E148 Safari/604.1"
echo "  WKWebView -> ... Mobile/15E148        (Safari eki YOK)"
