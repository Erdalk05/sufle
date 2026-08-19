const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
/* v9.37: bu fonksiyonların metinleri sözlüğe taşındı; tezgâh GERÇEK
   sözlüğü yükleyip t() ve yer tutucu yardımcısını sağlıyor.
   (Yorumda ters tırnak yok: şablon dizelerinin içine giriyor.) */
const {cekirdekOku:_co3}=require('./kaynak.js');
const SOZ_T=_co3('sozluk.js','SUFLE_SOZLUK').replace(/\/\*[\s\S]*?\*\//g,'')+
  "\nglobalThis.I18N=I18N; globalThis.t=(k)=>I18N[globalThis.L||'tr'][k];"+
  "\nglobalThis.srY=(m,d)=>{ for(const x in (d||{})) m=m.split('{'+x+'}').join(d[x]); return m; };";
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');
const mac=oku(macYolu()).replace(/\/\*[\s\S]*?\*\//g,'');

/* KAMERA İZNİ REDDEDİLİNCE VERİLEN YOL TARİFİ YANLIŞTI
   Mesaj iOS Safari'ye SABİTLENMİŞTİ:
     "📷 Kamera izni verilmemiş — Ayarlar → Safari → Kamera → İzin ver"
   Ama uygulama Android'de ve masaüstünde de çalışıyor:
     · Android'de "Safari" diye bir şey YOK — kullanıcı tarif edilen yeri
       arayıp bulamıyor.
     · Masaüstünde yol Ayarlar değil, adres çubuğundaki simge.
     · iOS'ta Chrome/Firefox kullanan da "Safari" bölümünde arıyor; oysa o
       tarayıcıların KENDİ Ayarlar girdisi var.

   İzin reddi ilk kullanımda en sık takılma noktası: kamera açılmazsa
   uygulamanın tamamı çalışmıyor. Yanlış yol tarifi, hiç tarif olmamasından
   kötü — kullanıcı denediği yerde bulamayınca "bozuk" deyip bırakıyor.

   (Mac sürümü bunu zaten doğru söylüyordu: "adres çubuğundaki kamera simgesi".
   İki platformu karşılaştırmak yine teşhis aracı oldu.) */

const izinYolu=new Function('navigator','L',
  SOZ_T+'\n'+cikar(kod,/function izinYolu\(\)\{[\s\S]*?\n\}/,'izinYolu')+'; return izinYolu;');
const yol=(ua,dil='tr')=>{ globalThis.L=dil; return izinYolu({userAgent:ua},dil)(); };

const UA={
  iosSafari :'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Safari/604',
  iosChrome :'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) CriOS/120 Mobile Safari',
  iosFirefox:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) FxiOS/120 Mobile Safari',
  iosEdge   :'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) EdgiOS/120 Mobile Safari',
  ipad      :'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Safari/604',
  android   :'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537 Chrome/120 Mobile Safari',
  macChrome :'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Chrome/120 Safari/537',
  winEdge   :'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120',
};

/* ---------- HER PLATFORM KENDİ YOLUNU ALIYOR ---------- */
ok('iOS Safari: Ayarlar → Safari', /Ayarlar → Safari → Kamera/.test(yol(UA.iosSafari)));
ok('iPad Safari de aynı yolu alıyor', /Ayarlar → Safari → Kamera/.test(yol(UA.ipad)));
ok('iOS Chrome: Ayarlar → Chrome (Safari DEĞİL)',
   /Ayarlar → Chrome → Kamera/.test(yol(UA.iosChrome)) && !/Safari/.test(yol(UA.iosChrome)));
ok('iOS Firefox: Ayarlar → Firefox', /Ayarlar → Firefox → Kamera/.test(yol(UA.iosFirefox)));
ok('iOS Edge: Ayarlar → Edge', /Ayarlar → Edge → Kamera/.test(yol(UA.iosEdge)));

/* ASIL HATA: Android kullanıcısına Safari tarif ediliyordu. */
ok('Android: Safari GEÇMİYOR', !/Safari/i.test(yol(UA.android)));
ok('Android: adres çubuğu/kilit simgesi tarif ediliyor',
   /kilit simgesi/.test(yol(UA.android)) && /İzinler/.test(yol(UA.android)));
ok('macOS: Ayarlar değil adres çubuğu', !/Ayarlar/.test(yol(UA.macChrome)) && /adres çubuğu/.test(yol(UA.macChrome)));
ok('Windows: adres çubuğu', /adres çubuğu/.test(yol(UA.winEdge)));

/* ---------- HER TARİF EYLEM İÇERİYOR ---------- */
for(const [ad,ua] of Object.entries(UA)){
  const y=yol(ua);
  ok(ad+': tarif boş değil', y.trim().length>10);
  ok(ad+': sayfayı yenilemesi söyleniyor', /yenile/.test(y));
}

/* ---------- İKİ DİLDE ---------- */
ok('İngilizcede iOS yolu', /Settings → Safari → Camera/.test(yol(UA.iosSafari,'en')));
ok('İngilizcede Android yolu', /lock icon/.test(yol(UA.android,'en')));
ok('İngilizcede de Android\'e Safari denmiyor', !/Safari/i.test(yol(UA.android,'en')));
ok('İngilizce tarifte de yenileme var', /reload/.test(yol(UA.macChrome,'en')));

/* ---------- MESAJ ARTIK YOLU SABİTLEMİYOR ---------- */
ok('camDenied metni sabit platform yolu içermiyor',
   !/camDenied:'[^']*Safari/.test(tel) && !/camDenied:'[^']*Settings →/.test(tel));
ok('camDenied iki dilde tanımlı', (tel.match(/camDenied:'/g)||[]).length >= 2);

/* ---------- BAĞLI MI ----------
   "Yazıldı ama çağrılmıyor" olursa kullanıcı yine eski çıplak mesajı görür. */
const openCam=cikar(kod,/async function openCam\(\)\{[\s\S]*?\n\}/,'openCam');
/* İDDİA: izin reddi mesajına yol tarifi EKLENİYOR. Mesaja üçüncü bir
   parça eklemek (ör. tarayıcı adı) iddiayı bozmaz — bu gece tests/37
   tam bu yüzden boşuna kırmızı vermişti. */
ok('izin reddinde yol tarifi mesaja ekleniyor',
   /toast\([^\n]*m\('camDenied'\)[^\n]*izinYolu\(\)/.test(openCam));
ok('diğer kamera hataları bozulmadı',
   /camBusy/.test(openCam) && /camNone/.test(openCam));

/* ---------- MAC ZATEN DOĞRUYDU, BOZULMASIN ---------- */
ok('Mac izin reddinde adres çubuğunu tarif ediyor',
   /Kamera izni verilmemiş[^']*adres çubuğundaki kamera simgesi/.test(mac));
ok('Mac kullanıcısına Ayarlar → Safari denmiyor', !/Ayarlar → Safari → Kamera/.test(mac));
