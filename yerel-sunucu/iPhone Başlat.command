#!/bin/bash
# iPhone Sufle — HTTPS sunucusunu başlatır. Telefon QR/adresten bağlanır.
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python3 yok. Kurmak için:  xcode-select --install"
  read -p "Enter..."; exit 1
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo "OpenSSL bulunamadı."; read -p "Enter..."; exit 1
fi

# QR'ı terminalde göstermek için (varsa) qrcode kurulmaya çalışılır
python3 -m pip install --quiet qrcode >/dev/null 2>&1 || true

python3 iphone_server.py
