/* Test dosyalarının kaynak dosyaları nerede bulacağını tek yerden çözer.
   Eskiden her testte mutlak masaüstü yolu gömülüydü — depo başka bir makineye
   klonlandığında hepsi kırılırdı. Sıra: ortam değişkeni → depo içi → masaüstü. */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const HOME = process.env.HOME || '';

/* AÇIKÇA VERİLEN YOL YANLIŞSA SESSİZCE DEPOYA DÜŞME.
   Ortam değişkeni yalnız kasıtlı bozma turlarında veriliyor. Yol yanlışsa
   eski davranış onu atlayıp DEPODAKİ gerçek dosyayı sınıyordu: bozma hiç
   ölçülmüyor ama test "geçti" diyor. 2026-08-14 gecesi tam bu yüzden üç
   bozma "yakalanmadı" göründü; oysa bozma dosyaları hiç yazılmamıştı.
   Ölçmeyen kapı sınıfı — açıkça verilen yol VARSA doğru olmalı. */
function ilkVarOlan(adaylar, ad, acikYol) {
  if (acikYol && !fs.existsSync(acikYol))
    throw new Error('Verilen yol yok: ' + acikYol + ' (' + ad + ')\n' +
      'Ortam değişkeni yanlışsa bozma turu HİÇBİR ŞEY ölçmez.');
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
], 'telefon index.html', process.env.SUFLE_TELEFON);

/* SIRA DEPODAN BAŞLAR — 2026-08-13'te bu sıra tersti ve gerçekten yanılttı.
   Depodaki mac/ dosyası düzenlenip masaüstü kopyası eşitlenmeyince testler
   ESKİ dosyayı sınayıp 766/0 verdi; düzenlemem hiç ölçülmemişti. Kapı neyi
   yayınlıyorsa onu sınamalı, yayınlanan da depodaki kopya. Masaüstü
   kopyalarının bayatlığı ayrı bir kontrol (kapi.sh 5. adım). */
const macYolu = () => ilkVarOlan([
  process.env.SUFLE_MAC,
  path.join(REPO, 'mac/Teleprompter Pro.html'),
  path.join(HOME, 'Desktop/Teleprompter/Teleprompter Pro.html'),
], 'Mac Teleprompter Pro.html', process.env.SUFLE_MAC);

const oku = p => fs.readFileSync(p, 'utf8');

/* Kaynaktan gerçek fonksiyonu çıkarır. Testler kodun KOPYASINI değil
   kendisini sınasın diye — kopya test, kod değişince sessizce yalan söyler. */
function cikar(src, re, ad) {
  const m = src.match(re);
  if (!m) throw new Error('Kaynakta bulunamadı: ' + (ad || re));
  return m[0];
}

/* m('anahtar') → KULLANICININ GÖRDÜĞÜ Türkçe metin.

   A.2c'de Mac mesajları sözlüğe taşındı: `toast('Metin bitti')` artık
   `toast(m('textEnd'))`. Metin değişmedi, YERİ değişti. Ama on bir test
   kullanıcıya ne SÖYLENDİĞİNİ arıyordu ve hepsi kırmızıya döndü — CLAUDE.md'de
   yazılı "desene değil iddiaya bağlan" sınıfının bir örneği daha.

   İki yanlış çözüm vardı: (a) testleri gevşetip "bir şey söyleniyor" demek —
   o zaman BOŞ bir uyarı da geçerdi; (b) her teste anahtar listesi gömmek —
   sözlük değişince sessizce yalan söylerdi. Doğrusu: anahtarı GERÇEK sözlükten
   çözüp yerine koymak. İddia yine kullanıcının okuduğu cümleye bağlı kalıyor.

   Çözülemeyen anahtar OLDUĞU GİBİ bırakılmaz, atılmaz: sözlükte karşılığı
   olmayan bir anahtar sessizce "geçer" hâle gelmesin diye görünür bir işaretle
   (⟪anahtar⟫) değiştiriliyor — testte eşleşmez, kırmızı verir. */
function macSozlugu() {
  const s = fs.readFileSync(path.join(REPO, 'cekirdek/mac-mesajlar.js'), 'utf8');
  const kap = {};
  new Function('g', s + '\ng.MMSG=MMSG;')(kap);
  return kap.MMSG.tr;
}

/* TIRNAK METNE GÖRE SEÇİLİR, sabit değil. İlk yazımda hepsini tek tırnakla
   sarmıştım; "Mac'in Wi-Fi adresi bulunamadı" mesajı tezgâhı SyntaxError ile
   kesti. Kaçış eklemek de yanlış olurdu: `Mac\'in` yazan bir kaynakta metni
   arayan test artık metni bulamaz. Doğrusu, o metinde GEÇMEYEN bir tırnak
   seçmek — metin harfi harfine korunuyor. */
function sar(metin) {
  for (const q of ["'", '"', '`'])
    if (!metin.includes(q) && !(q === '`' && metin.includes('${'))) return q + metin + q;
  return JSON.stringify(metin);
}

function macCoz(src) {
  const tr = macSozlugu();
  return src.replace(/\bm\('([A-Za-z0-9_]+)'\)/g,
    (t, k) => tr[k] !== undefined ? sar(tr[k]) : "'\u27ea" + k + "\u27eb'");
}

/* Mac kaynağı, mesaj anahtarları çözülmüş hâlde. Metin arayan ya da çıkardığı
   kodu KOŞTURAN testler bunu kullanır (koşturanlar için m() zaten tanımsızdı,
   tezgâh çöküyordu). Anahtarın kendisini sayan testler (122) ham oku()'yu
   kullanmaya devam eder. */
const macMetni = () => macCoz(oku(macYolu()));

module.exports = { telefonYolu, macYolu, oku, cikar, REPO, macCoz, macMetni };

