const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku}=require('./kaynak.js');

/* B — KUMANDA ÇUBUĞU HER TELEFONA SIĞMALI.

   ÖLÇÜLEREK BULUNDU (2026-08-15, Chrome CDP, gerçek viewport):
   `.cbtn` 54 px, `#recBtn` 74 px ve ikisi de `flex:none`; çubuk `nowrap`.
   Gereken genişlik düğme + boşluk + iç kenar:

     kayıt yokken (6 düğme)      410 px
     KAYIT SÜRERKEN (7 düğme)    470 px   <- ⏸ kayıtta ekleniyor

   Ölçülen sonuç: 430 px'lik EN BÜYÜK iPhone'da bile kayıt başlar başlamaz
   ▶ düğmesinin sağ kenarı 452 px'e taşıyordu; 393 ve 375 px'te kayıt olmadan
   da taşıyordu. Ekranın dışına çıkan düğmeye dokunulamaz — bu deponun 2
   numaralı hata sınıfı: TAM DA GEREKTİĞİ ANDA kaybolan kumanda. Üstelik
   kaybolan düğme, kaydı yönetmek için gereken düğmeydi.

   Bu test o aritmetiği kaynaktan yeniden kuruyor. BİÇİME değil İDDİAYA
   bağlı: "en dar durumda bütün kumandalar 375 px'e sığar". Sekizinci bir
   düğme eklenirse ya da sabit piksel boyları geri gelirse hesap tutmaz ve
   kapı kırılır — tarayıcı açmadan.

   Not: `ekran.py` her karede viewport dışına taşan öge SAYIYOR; gerçek
   tarayıcı ölçümü orada. Burası o ölçümün ucuz ve her koşuda çalışan hâli. */

const s = oku(telefonYolu());

/* ---------- ÇUBUĞUN İÇİNDEKİ DÜĞMELER ---------- */
const barHtml = (s.match(/<div id="bar"[\s\S]*?\n<\/div>/) || [''])[0];
ok('çubuk işaretlemesi bulundu', barHtml.length > 200);

const dugmeler = [...barHtml.matchAll(/<button\b[^>]*>/g)].map(m => m[0]);
const kayitDugmesi = dugmeler.filter(d => /id="recBtn"/.test(d)).length;
const normal = dugmeler.length - kayitDugmesi;
ok('çubukta düğmeler sayılabildi (ölçmeyen kapı değil) — ' + dugmeler.length,
   dugmeler.length >= 6 && kayitDugmesi === 1);

/* ---------- CSS SAYILARI ---------- */
const barCss = (s.match(/#bar\{[^}]*--cb[^}]*\}/) || [''])[0];
ok('çubuk CSS bloğu bulundu', barCss.length > 60);

const sayi = (re, ad) => {
  const m = barCss.match(re);
  if (!m) { ok('CSS değeri okunabildi: ' + ad, false); return NaN; }
  return parseFloat(m[1]);
};
const cbMin  = sayi(/--cb:\s*clamp\(\s*([\d.]+)px/, '--cb alt sınır');
const cbMax  = sayi(/--cb:\s*clamp\([^,]+,[^,]+,\s*([\d.]+)px\s*\)/, '--cb üst sınır');
const cbPay  = sayi(/--cb:[^;]*100vw\s*-\s*([\d.]+)px/, '--cb payı');
const cbBol  = sayi(/--cb:[^;]*\)\s*\/\s*([\d.]+)\s*\)/, '--cb böleni');
const gap    = sayi(/gap:\s*([\d.]+)px/, 'gap');
const padYan = sayi(/padding:\s*[\d.]+px\s+([\d.]+)px/, 'yan iç kenar');

const recOran = parseFloat(
  (s.match(/#recBtn\{width:calc\(var\(--cb[^)]*\)\s*\*\s*([\d.]+)\)/) || [])[1]);
ok('kayıt düğmesi de --cb ile ölçekleniyor (sabit piksel değil)',
   Number.isFinite(recOran) && recOran > 1);

/* Sabit piksel boyu GERİ GELMESİN: eski kusur tam buydu. */
ok('.cbtn boyu --cb değişkeninden geliyor',
   /\.cbtn\{width:var\(--cb/.test(s));

/* ---------- EN DAR DURUM SIĞIYOR MU ---------- */
function gereken(vp) {
  const ham = (vp - cbPay) / cbBol;
  const cb = Math.min(Math.max(ham, cbMin), cbMax);
  const n = dugmeler.length;                    // kayıttaki EN DAR durum
  return { cb, genislik: normal * cb + cb * recOran + (n - 1) * gap + 2 * padYan };
}

/* 375 px = iPhone SE/8 · 393 = iPhone 15/16 · 430 = 15/16 Pro Max.
   Hepsi gerçek cihaz; "en büyük ekranda sığıyor" yetmez. */
for (const vp of [430, 393, 375]) {
  const { cb, genislik } = gereken(vp);
  ok('kayıtta ' + vp + ' px ekrana sığıyor (gereken ' + genislik.toFixed(1) +
     ' px · düğme ' + cb.toFixed(1) + ' px)', genislik <= vp);
}

/* Dokunma hedefi: Apple 44 px istiyor. 42'ye inmek BİLEREK kabul edildi —
   360 px'lik Android'de seçenek "2 px küçük düğme" ile "ekran dışında
   düğme" arasındaydı. Daha aşağısı kabul değil. */
ok('en küçük düğme 42 px altına inmiyor — ' + cbMin, cbMin >= 42);
ok('geniş ekranda düğme büyümeye devam etmiyor (üst sınır ' + cbMax + ')',
   cbMax >= 50 && cbMax <= 60);

/* Son emniyet: aritmetik bir gün yine tutmazsa bile hiçbir kumanda ekranın
   DIŞINA çıkmasın; çubuk iki satıra insin. `nowrap` geri gelirse kusur da
   geri gelir. */
ok('çubuk son çare olarak satır kırabiliyor (nowrap değil)',
   /flex-wrap:\s*wrap/.test(barCss));
