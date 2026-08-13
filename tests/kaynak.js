/* Test dosyalarının kaynak dosyaları nerede bulacağını tek yerden çözer.
   Eskiden her testte mutlak masaüstü yolu gömülüydü — depo başka bir makineye
   klonlandığında hepsi kırılırdı. Sıra: ortam değişkeni → depo içi → masaüstü. */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const HOME = process.env.HOME || '';

function ilkVarOlan(adaylar, ad) {
  for (const p of adaylar) if (p && fs.existsSync(p)) return p;
  throw new Error(
    'Kaynak bulunamadı: ' + ad + '\nBakılan yerler:\n  ' + adaylar.filter(Boolean).join('\n  ') +
    '\nÇözüm: SUFLE_TELEFON / SUFLE_MAC ortam değişkeniyle yolu ver.'
  );
}

const telefonYolu = () => ilkVarOlan([
  process.env.SUFLE_TELEFON,
  path.join(REPO, 'index.html'),
  path.join(HOME, 'Desktop/iPhone Teleprompter/index.html'),
], 'telefon index.html');

/* SIRA DEPODAN BAŞLAR — 2026-08-13'te bu sıra tersti ve gerçekten yanılttı.
   Depodaki mac/ dosyası düzenlenip masaüstü kopyası eşitlenmeyince testler
   ESKİ dosyayı sınayıp 766/0 verdi; düzenlemem hiç ölçülmemişti. Kapı neyi
   yayınlıyorsa onu sınamalı, yayınlanan da depodaki kopya. Masaüstü
   kopyalarının bayatlığı ayrı bir kontrol (kapi.sh 5. adım). */
const macYolu = () => ilkVarOlan([
  process.env.SUFLE_MAC,
  path.join(REPO, 'mac/Teleprompter Pro.html'),
  path.join(HOME, 'Desktop/Teleprompter/Teleprompter Pro.html'),
], 'Mac Teleprompter Pro.html');

const oku = p => fs.readFileSync(p, 'utf8');

/* Kaynaktan gerçek fonksiyonu çıkarır. Testler kodun KOPYASINI değil
   kendisini sınasın diye — kopya test, kod değişince sessizce yalan söyler. */
function cikar(src, re, ad) {
  const m = src.match(re);
  if (!m) throw new Error('Kaynakta bulunamadı: ' + (ad || re));
  return m[0];
}

module.exports = { telefonYolu, macYolu, oku, cikar, REPO };
