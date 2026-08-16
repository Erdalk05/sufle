const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku, cozJeton}=require('./kaynak.js');

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

/* Çubuğun aritmetiği gerçek piksellerle yapılır; jetonlar çözülerek okunur
   (B.1'de gap `var(--sp-1)`e bağlandı ve hesap NaN'a düşmüştü). */
const s = cozJeton(oku(telefonYolu()));

/* ---------- ÇUBUĞUN İÇİNDEKİ DÜĞMELER ---------- */
const barHtml = (s.match(/<div id="bar"[\s\S]*?\n<\/div>/) || [''])[0];
ok('çubuk işaretlemesi bulundu', barHtml.length > 200);

const dugmeler = [...barHtml.matchAll(/<button\b[^>]*>/g)].map(m => m[0]);
const kayitDugmesi = dugmeler.filter(d => /id="recBtn"/.test(d)).length;
const normal = dugmeler.length - kayitDugmesi;
ok('çubukta düğmeler sayılabildi (ölçmeyen kapı değil) — ' + dugmeler.length,
   dugmeler.length >= 6 && kayitDugmesi === 1);

/* ---------- CSS SAYILARI ---------- */
/* `--cb` T53'te `body`'ye taşındı: çubuğun ÜSTÜNDEKİ katmanlar da çubuk
   yüksekliğini hesaplayabilsin diye. Aritmetik aynı; jetonlar iki bloktan
   toplanıyor. */
const barCss = (s.match(/body\{[^}]*--cb[^}]*\}/) || [''])[0]
              + (s.match(/#bar\{[^}]*\}/) || [''])[0];
ok('çubuk CSS bloğu bulundu', barCss.length > 60);

/* HER OKUMA GÖRÜNÜR OLSUN. Önce yalnız BAŞARISIZKEN satır basıyordu; iddia
   sayısı tabanı bu yüzden bir HATAYI sayıyordu ve okuma düzelince sayı düştü,
   kapı da "iddia azaldı" diye kırmızı verdi. Ölçen kapı, ölçtüğünü her koşuda
   söylemeli. */
const sayi = (re, ad) => {
  const m = barCss.match(re);
  const v = m ? parseFloat(m[1]) : NaN;
  ok('CSS değeri okunabildi: ' + ad + ' = ' + (m ? v : 'YOK'), Number.isFinite(v));
  return v;
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

/* ---------- MASAÜSTÜ DURUM ÇUBUĞU (2026-08-17, KULLANARAK bulundu) ----------

   Uygulamayı gerçek tarayıcıda gezdiren denetim turunda çıktı: Mac kabuğunda
   alt durum çubuğu (kısayollar + WPM + cihaz özeti + sürüm + dil) ÜÇ farklı
   pencere genişliğinde de 608 px kalıyor ve 151 PX YÜKSEKLİĞE kırılıyordu.
   Sebep: daralan kapsayıcıda satır kırma tek çare olarak kalıyordu, o yüzden
   her etiket KENDİ İÇİNDE bölünüyordu ("tam / ekran") ve cihaz özeti altı
   satıra iniyordu. Video görüntüsünün altını kaplayan, okunmayan bir blok.

   ÖLÇÜLEN (aynı tarayıcı, aynı sayfalar):
     genişlik      önce        sonra
     1152 px      608 × 151    549 × 87
     1280 px      608 × 151    672 × 66
     1440 px      608 × 151    826 × 66
     1680 px      608 × 151    940 × 66

   Kilitlenen kural: öge KENDİ İÇİNDE kırılmaz, çubuk ÖGELER ARASINDA kırılır. */
{
  const { macYolu } = require('./kaynak.js');
  const mac = oku(macYolu());
  const sb = (mac.match(/#statusbar\{[^}]*\}/) || [''])[0];
  ok('masaüstü durum çubuğu bulundu', !!sb);
  ok('çubuk ögeler arasında satır kırabiliyor', /flex-wrap:\s*wrap/.test(sb));
  ok('çubuk pencerenin genişliğini kullanıyor (max-content)', /width:\s*max-content/.test(sb));
  ok('çubuğun genişlik tavanı pencereye bağlı (dar pencerede taşmaz)',
     /max-width:\s*min\(/.test(sb));
  /* Asıl kusur buydu: etiketin kendi içinde kırılması. */
  ok('çubuk ögeleri kendi içinde kırılmıyor',
     /#statusbar>span,#statusbar>button\{white-space:nowrap\}/.test(mac));
  /* Cihaz özeti en uzun parça; taşarsa altı satır yerine üç nokta. */
  ok('cihaz özeti taşarsa kısalıyor (altı satıra inmiyor)',
     /#sbDev\{[^}]*text-overflow:ellipsis/.test(mac));
}
