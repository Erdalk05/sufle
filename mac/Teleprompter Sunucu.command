#!/bin/bash
# Teleprompter Pro — yerel sunucuyu başlatır, telefon uzaktan kumandayı açar.
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python3 bulunamadı. Lütfen Xcode Command Line Tools kurun:"
  echo "   xcode-select --install"
  read -p "Kapatmak için Enter..."
  exit 1
fi

# QR kodu için 'qrcode' (varsa) sessizce kurulmaya çalışılır (internet gerektirir)
python3 -m pip install --quiet "qrcode[pil]" >/dev/null 2>&1 || true

# Gösterim ekranını birazdan aç
( sleep 1.2; open "http://localhost:8080/" ) &

python3 "teleprompter_server.py"
