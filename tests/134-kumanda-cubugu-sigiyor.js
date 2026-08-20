const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku, cozJeton,esnek}=require('./kaynak.js');

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
const s = cozJeton(esnek(oku(telefonYolu())));

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
/* Desen 2026-08-17'de gevşetildi: kuralın başına `position:relative` girdi
   (etiket düğmenin altında konumlanıyor). Kilitlenen şey BİÇİM değil KURAL —
   boy sabit piksel değil, `--cb` değişkeninden gelir. */
ok('.cbtn boyu --cb değişkeninden geliyor',
   /\.cbtn\{[^}]*width:var\(--cb/.test(s));

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
  const mac = esnek(oku(macYolu()));
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

/* ---------- ÇUBUK DÜĞMELERİNİN ADI VAR MI (2026-08-17) ----------
   Alt çubukta altı yuvarlak ikon vardı ve hiçbirinin yazısı yoktu; kullanıcı
   ne yaptıklarını ancak tek tek basarak öğreniyordu. Bu deponun 4 numaralı
   hata sınıfının (jargon = görünmezlik) ikon hâli.

   Kilitlenen kural üç parçalı:
   ① beş yardımcı düğmenin de görünür bir adı var ve adı SÖZLÜKTEN geliyor
     (dil değişince etiket de değişmeli),
   ② etiket `::after` ile çiziliyor — düğmenin kutusu ve dokunma hedefi
     değişmiyor, yani yukarıdaki sığma aritmetiği geçerli kalıyor,
   ③ `#recBtn::after` ETİKET İÇİN KULLANILAMAZ: o sözde-öge kırmızı kayıt
     noktasıdır. İlk yazımda oraya bağladım ve noktayı düğmenin altına
     ittim — çekim ekranının en tanınır ögesi bozuldu. */
{
  const src2 = esnek(oku(telefonYolu()));
  const kod2 = src2.replace(/\/\*[\s\S]*?\*\//g, '');
  const dugmeler = ['settingsBtn', 'scriptsBtn', 'readyBtn', 'voiceBtn', 'playBtn'];
  for (const id of dugmeler) {
    const m = src2.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'));
    ok(id + ' düğmesinin görünür adı var', !!m && /data-etiket="[^"]+"/.test(m[0]));
    ok(id + ' adı sözlükten geliyor (dil değişince değişir)',
       !!m && /data-i18n-etiket="\w+"/.test(m[0]));
  }
  ok('etiketler dil değişiminde yenileniyor',
     /\$\$\('\[data-i18n-etiket\]'\)\.forEach/.test(kod2));
  /* DESEN SEÇİCİNİN TAMAMINA DEĞİL İDDİAYA BAĞLI. Kayıt düğmesi de etiket
     alınca kural `.cbtn::after,#recBtn::before{…}` oldu; birebir eşleşme
     arayan eski desen DAVRANIŞ HİÇ DEĞİŞMEDEN kırmızı verdi (CLAUDE.mddeki
     beş vakayla ölçülmüş ders). İddia şu: etiket bir sözde-ögeyle çiziliyor,
     yani düğmenin kutusu ve dokunma hedefi değişmiyor. */
  ok('etiket düğmenin KUTUSUNU değiştirmiyor (sözde-öge ile çiziliyor)',
     /\.cbtn::after[^{]*\{content:attr\(data-etiket\)/.test(src2));
  ok('etiket dokunuşu yutmuyor',
     /\.cbtn::after[^{]*\{[^}]*pointer-events:none/.test(src2));
  /* Kayıt noktası korunuyor: etiket kuralı ona DOKUNMAMALI. */
  ok('kırmızı kayıt noktası hâlâ #recBtn::after ile çiziliyor',
     /#recBtn::after\{content:"";[^}]*background:#ff3b30/.test(src2));
  ok('etiket kuralı kayıt düğmesini kapsamıyor',
     !/#recBtn::after\{content:attr\(data-etiket\)/.test(src2));
  /* Odak kipi (kayıtta düğmeleri gizle) etiketleri de gizlemeli. */
  ok('odak kipinde etiketler de gizleniyor',
     /body\.hideUI \.cbtn::after[^{]*\{content:''\}/.test(src2));

  /* ---- KAYIT DÜĞMESİNİN ADI (2026-08-17) ----
     Alt çubuktaki altı düğmeden yalnız kaydınkinin etiketi yoktu. Eski
     gerekçe "kırmızı yuvarlak evrensel"di; ölçüldü ve çürüdü: kamerasız
     kipte düğme SÖNÜK, adsız ve dokununca hiçbir şey söylemiyordu — sönük
     bir kırmızı yuvarlak hiçbir şey demiyor. */
  ok('kayıt düğmesinin de adı var', /id="recBtn"[^>]*data-i18n-etiket="cbCek"/.test(src2));
  ok('adı ::before ile çiziliyor (::after kayıt noktası)',
     /#recBtn::before/.test(src2) && /\.cbtn::after,#recBtn::before\{content:attr\(data-etiket\)/.test(src2));
  ok('kayıt sürerken ad yazılmıyor (o an yapılacak iş DURDURMAK)',
     /body\.rec #recBtn::before\{content:''\}/.test(src2));
  ok('odak kipinde kaydın adı da gizleniyor',
     /body\.hideUI #recBtn::before\{content:''\}/.test(src2));
  /* ⚠️ Sönüklük DÜĞMEYE uygulanır, ETİKETE değil: düğmenin tamamına opacity
     vermek adı da %35'e indiriyordu ve çizilmiş ekranda okunmuyordu — oysa
     düğmenin neden kapalı olduğunu anlatan tek şey o yazı. */
  ok('kapalı görünüm opacity ile DEĞİL dolguyla veriliyor',
     !/#recBtn:disabled,#recBtn\.kapali\{opacity:/.test(src2) &&
     /#recBtn:disabled,#recBtn\.kapali\{background:/.test(src2));
  /* Kapalıyken de dokunuş ALIR: `disabled` bir düğme dokunuşu yutar ve
     sebebini söyleyemez. Deponun 3 numaralı sınıfı. */
  ok('kayıt düğmesi disabled DEĞİL, aria-disabled',
     /id="recBtn"[^>]*aria-disabled="true"/.test(src2) &&
     !/id="recBtn"[^>]*\sdisabled(\s|>)/.test(src2));
  /* GEVŞEK DESEN TUZAĞI (kasıtlı bozma turunda yakalandı): yalnız
     `recNeedsCam` aramak yetmiyor — anahtar MSG sözlüğünde de duruyor, yani
     `toast` çağrısını tümden silsen bile desen eşleşiyor ve bozma sessizce
     geçiyordu. Aranan şey ÇAĞRININ KENDİSİ. */
  ok('kapalıyken dokununca sebebi söylüyor ve kamerayı açmayı deniyor',
     /toast\(m\('recNeedsCam'\)\);/.test(kod2) &&
     /if\(b\.classList\.contains\('kapali'\)\)/.test(kod2) &&
     /await openCam\(\);/.test(kod2));
  ok('kamera akınca üç işaret birden kalkıyor',
     /\$\('#recBtn'\)\.classList\.remove\('kapali'\)/.test(kod2) &&
     /\$\('#recBtn'\)\.setAttribute\('aria-disabled','false'\)/.test(kod2) &&
     /\$\('#recBtn'\)\.disabled=false/.test(kod2));
  /* Duraklat düğmesi kayıt sırasında görünüyor; adsız kalırsa o an ekrandaki
     TEK adsız düğme olurdu — aynı kusurun ikizi. */
  ok('duraklat düğmesinin de adı var', /id="pauseBtn"[^>]*data-i18n-etiket="cbDurakla"/.test(src2));

  /* ---- DURUM ŞERİDİNDE EMOJİ YOK (2026-08-17) ----
     `⏳` emojisi vardı; ikon dosyasının en başındaki kural tam da onu
     yasaklıyor (her platformda başka çizilir, koyu arayüzde renk uyumu yok).
     ⚠️ ETİKET DENENDİ VE ÖLÇÜLDÜ, SIĞMADI: "SÜRE/KALAN/KELİME" eklenince
     şerit 26 pxden 48 pxe, tek satırdan İKİ satıra çıkıyor (390 ve 360 pxte
     aynı) ve hız hapına biniyor. Bu satır, bir dahakine aynı denemeyi
     ölçmeden yapmayı engellesin diye burada. */
  ok('durum şeridinde emoji yok', !/#hRem'\)\.textContent='⏳/.test(kod2) &&
     !/id="hRem"[^>]*>⏳/.test(src2));
  ok('kalan süre ikonu SVG (jeton sisteminden)',
     /<svg class="hudIk"[^>]*><use href="#i-kalan"\/><\/svg>/.test(src2) &&
     /<symbol id="i-kalan"/.test(src2));
  /* Değer İÇ SPANE yazılır: `#hRem`in kendisine `textContent` yazmak yanındaki
     ikonu siler ve ikon bir kez çizilip kaybolan bir süs olurdu. */
  ok('kalan süre değeri iç span\'e yazılıyor',
     /\$\('#hRemV'\)\.textContent=clock\(/.test(kod2) &&
     !/\$\('#hRem'\)\.textContent=/.test(kod2));
  /* İkon metinle aynı ölçekte; `inline-flex` + 1,05em hâli şeridi 3 px
     yükseltmişti ve çubuğun sığma aritmetiği o yüksekliğe bağlı. */
  ok('şerit ikonu satır içi akışta (yüksekliği değiştirmiyor)',
     /\.hudIk\{width:\.92em;height:\.92em;/.test(src2) &&
     !/#hRem\{display:inline-flex/.test(src2));
}

/* ---------- ÇUBUK YÜKSEKLİĞİ TEK KAYNAKTAN (2026-08-17) ----------
   Üstteki katmanlar (durum şeridi, hız hapı) `--barH` jetonuna göre
   konumlanıyor. Etiketler eklenirken çubuğun ALT İÇ KENARINI 14 → 30 px
   yaptım ama `--barH`i güncellemedim: çubuk büyüdü, üstündeki katman yerinde
   kaldı ve durum şeridi çubuğun İÇİNE girdi. Mağaza kare aracı bunu ölçtü
   (5 çakışan kumanda çifti, 430 px'te 10 px örtüşme).

   Kural: iç kenar ile yükseklik AYNI jetondan okunur, ikisi ayrışamaz.
   Ölçüm sonrası 430/390/360 px'te çakışan çift 0. */
{
  const src3 = esnek(oku(telefonYolu()));
  ok('çubuğun alt iç kenarı jetondan geliyor',
     /--barAlt:calc\(\d+px \+ env\(safe-area-inset-bottom\)\)/.test(src3));
  /* Desen `[^)]*` ile yazılmıştı ve ifadenin içindeki `calc(...)`in kendi
     parantezinde takılıyordu — ürün doğruyken kırmızı. */
  ok('yükseklik aynı jetonu kullanıyor', /--barH:calc\([\s\S]{0,60}?var\(--barAlt\)/.test(src3));
  ok('çubuk da aynı jetonu kullanıyor', /padding:10px 10px var\(--barAlt\)/.test(src3));
  /* Ayrışmayı KANITLA: iki bildirimde de ham piksel kalmamalı, yoksa kural
     yazılı ama uygulanmamış olur. */
  ok('çubuk iç kenarında ham piksel yok',
     !/#bar\{[^}]*padding:10px 10px calc\(\d+px \+ env/.test(src3));
}

/* ---------- YATAY EKRANDA ÇAKIŞMA (2026-08-17, ölçülerek bulundu) ----------
   Telefonu yan çevirince (844×390) talimat yazısı HIZ HAPININ TAM ÜSTÜNE
   biniyordu: not `bottom: 22% + 78px` ile konumlanıyordu ve yatayda yüzde
   küçüldüğü için hapın üstüne düşüyordu. Kapı görmedi, çünkü çakışma
   dedektörünün listesinde `.tapnote` YOKTU — ölçmeyen dedektör gerçek kusuru
   kaçırır.

   İki düzeltme: (1) not artık alt yığının yüksekliğine göre konumlanıyor,
   yani çubuk büyüyünce kendiliğinden yukarı kayıyor; (2) çok kısa ekranda
   (≤430 px yükseklik) not hiç gösterilmiyor — orada yer yok ve göstermek
   onu suflenin üstüne bindirmek olurdu.
   Ölçüldü: 844×390, 932×430, 390×844, 430×932 → çakışan çift 0. */
{
  const src4 = esnek(oku(telefonYolu()));
  ok('talimat yazısı yığın yüksekliğine göre konumlanıyor',
     /\.tapnote\{position:absolute;bottom:calc\(var\(--barH\) \+ \d+px\)/.test(src4));
  ok('yüzdeye dayalı eski konum geri gelmedi',
     !/\.tapnote\{position:absolute;bottom:calc\(\d+% /.test(src4));
  ok('kısa ekranda not gizleniyor',
     /@media \(max-height:\d+px\)\{ \.tapnote\{display:none\} \}/.test(src4));
  /* Dedektör de düzeltildi: aynı sınıf bir daha sessiz kalmasın. */
  const ekranPy = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'ekran.py'), 'utf8');
  ok('çakışma dedektörü talimat yazısını da ölçüyor',
     /#speedCtl,#hud,#hud>span,#bar,#audBadge,#recFrame,\.tapnote/.test(ekranPy));
}
