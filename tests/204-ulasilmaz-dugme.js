const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {repoOku,esnek,macYolu,oku}=require('./kaynak');

/* ULAŞILAMAYAN ÜST ÇUBUK DÜĞMELERİ (2026-08-20).

   BULGU — çizilmiş ekranda, gerçek tarayıcıda ölçüldü: masaüstünün üst
   çubuğu `flex-wrap` TAŞIMIYORDU ve satır yüksekliği sabit 56 px idi.
   Düğmeler pencerenin sağ DIŞINA düşüyor, sayfa yatay da kaymadığı için
   onlara **hiçbir yolla ulaşılamıyordu**:

     1440 px  "Otomatik yedekten dön · Tam Ekran · ⇔ Sade" dışarıda
     1152 px  aynısı
     1000 px  "⬆︎ Senaryolar" da dışarıda
      900 px  **ÇEKİMLERİM** de dışarıda — arşive ulaşmanın tek yolu

   820 pikselin altında `flex-wrap` ZATEN vardı. Yani kör nokta tam da
   sıradan bir MacBook penceresiydi ve kapı orayı hiç ölçmüyordu: masaüstü
   YALNIZ 1440 pikselde ölçülüyordu. **Ölçülmeyen genişlik, denetlenmemiş
   genişliktir** — bu deponun kendi hata sınıfı, bu kez çözünürlükte.

   Ölçülen bedel: çubuk iki satıra çıkınca sahne yüksekliği 744 → 704 px.
   Bir düğmeye ulaşamamanın bedeliyle kıyaslanamaz. */

const mac=esnek(oku(macYolu()));
const K=repoOku('kontrast.py','SUFLE_KONTRAST');

/* ---------- 1) ÇUBUK SARIYOR VE SATIRI İÇERİĞE GÖRE ---------- */
{
  const tb=(mac.match(/#topbar\{[^}]*\}/)||[''])[0];
  ok('üst çubuk bulundu', !!tb);
  ok('üst çubuk ögeler arasında satır kırabiliyor', /flex-wrap:wrap/.test(tb));
  /* Sarmak tek başına yetmiyordu: ızgara satırı SABİT 56 px olduğu sürece
     ikinci satır kırpılırdı. İki kural birlikte anlamlı. */
  const app=(mac.match(/#app\{[^}]*\}/)||[''])[0];
  ok('uygulama ızgarası bulundu', !!app);
  ok('üst çubuk satırı içeriğe göre (sabit yükseklik değil)',
     /grid-template-rows:auto 1fr/.test(app));
  ok('çubuk bugünkü yüksekliğini koruyor (her şey sığdığında)',
     /min-height:56px/.test(tb));
}

/* ---------- 2) ÇUBUKTAKİ HER DÜĞME HÂLÂ ORADA ----------
   "Sığmıyorsa gizle" de bir çözüm olurdu; o zaman kapı yeşile döner ama
   kullanıcı yine düğmeye ulaşamazdı. Ölçülen şey düğmelerin VARLIĞI. */
for(const k of ['takesBtn','scExport','fsBtn','hideBtn','pipBtn','readyBtn'])
  ok('üst çubukta "'+k+'" duruyor', new RegExp('id="'+k+'"').test(mac));

/* ---------- 3) ÇİZİLMİŞ EKRAN NÖBETÇİSİ ---------- */
ok('çizilmiş ekran ulaşılamayan çubuk düğmesini ölçüyor', /ulasilmaz\.push\(/.test(K));
ok('ulaşılamayan düğme MUTLAK kural (tabana bağlanmamış)',
   /ekranın dışına düşen %d çubuk düğmesi/.test(K));
/* Kapsam DAR olmalı: yan paneller kapalıyken kasıtlı olarak ekran dışına
   ötelenir; geniş tarama dedektörü yalancı yapardı. */
ok('tarama yalnız çubuklarla sınırlı', /const CUBUK = '#topbar,#statusbar/.test(K));
ok('kapsam sınırı gerekçesiyle yazılı', /KAPSAM BİLEREK DAR/.test(K));

/* ---------- 4) DAR MASAÜSTÜ GENİŞLİĞİ GERÇEKTEN ÖLÇÜLÜYOR ----------
   Kusur bir gün boyunca görünmedi çünkü masaüstü yalnız 1440 pikselde
   ölçülüyordu ve orada her şey sığıyordu. Nöbetçi, dar pencere ölçülmezse
   ölü kalır. */
{
  const satirlar=[...K.matchAll(/\('mac-[a-z]+',\s*MAC,\s*(\d+),/g)].map(m=>+m[1]);
  ok('masaüstü yüzeyleri sayılabildi ('+satirlar.join('/')+')', satirlar.length>=2);
  ok('en az bir dar masaüstü genişliği ölçülüyor (<1200 px)',
     satirlar.some(x=>x<1200));
}
