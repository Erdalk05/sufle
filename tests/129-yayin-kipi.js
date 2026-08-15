const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {macYolu, oku, cikar}=require('./kaynak.js');

/* D.5 — YAYIN (OBS) KİPİ.

   ÖLÇÜLEN GERÇEK: matris "Entegrasyonlar (Zoom/OBS/yayın)" kaleminde SUFLE 1,
   lider 5 alıyordu. Ama Zoom/Teams tarafı ZATEN çözülmüştü: Mac'teki
   "🪟 Yüzen Sufle" (Document Picture-in-Picture) sufleyi her uygulamanın
   üstüne koyuyor. Eksik olan YAYIN YAZILIMI yoluydu.

   SANAL KAMERA YAZILMADI VE YAZILAMAZ: tarayıcı işletim sistemine kamera
   aygıtı kaydedemez; bunun için imzalı bir sistem eklentisi gerekir.
   "Yakında" diye söz vermek yerine gerçekten yapılabilen yol açıldı:
   ?obs=1 ile şeffaf zeminli bir sayfa. OBS/vMix "Tarayıcı Kaynağı" bunu
   olduğu gibi bindiriyor.

   HİKÂYE TAMAMLANIYOR çünkü kontrol zaten vardı: aynı sunucudan beslenen
   telefon kumandası bu pencereyi de sürüyor.

   Gerçek sunucudan doğrulandı (Chrome, localhost:8080/?obs=1): obs sınıfı
   uygulandı, zemin şeffaf (rgba(0,0,0,0)), üst çubuk + iki panel + durum
   çubuğu gizli, metin görünür ve gölgeli. */

const mac = oku(macYolu());
const kod = (mac.match(/<script>([\s\S]*)<\/script>/) || ['',''])[1];

/* ---------- KİP GERÇEKTEN AÇILIYOR MU ---------- */
{
  ok('?obs=1 okunuyor', /new URLSearchParams\(location\.search\)\.get\('obs'\)==='1'/.test(kod));
  ok('kip gövdeye sınıf olarak uygulanıyor', /if\(obsKip\) document\.body\.classList\.add\('obs'\)/.test(mac));
  /* Zemin ŞEFFAF olmalı: OBS tarayıcı kaynağı sayfanın kendi zeminini
     olduğu gibi alır, siyah kalırsa kamerayı tümden örter. */
  ok('zemin şeffaf', /body\.obs\{background:transparent!important\}/.test(mac));
}

/* ---------- KABUK TÜMÜYLE GİDİYOR MU ---------- */
{
  const kural = (mac.match(/body\.obs #topbar[\s\S]*?\}/) || [''])[0];
  for (const id of ['#topbar','#left','#right','#statusbar','#recResult']) {
    ok('yayında gizleniyor: ' + id, kural.includes(id));
  }
  /* Çerçeve ve güvenli alan kılavuzları da gitmeli: bunlar çekim yardımcısı,
     yayına basılacak şey değil. */
  ok('çerçeve kılavuzu da gizleniyor', kural.includes('#frame') && kural.includes('#safe'));
  /* Sahne ve sufle kabı da şeffaflaşmalı, yoksa gövde şeffaf olsa bile
     içteki siyah kutu kamerayı örter — sessiz kusurun tipik yeri. */
  ok('sahne ve sufle kabı da şeffaf',
     /body\.obs #stageWrap,body\.obs #prompt\{background:transparent!important\}/.test(mac));
  /* Metin her zemin üstünde okunmalı: yayında arka plan her renk olabilir. */
  ok('metne gölge veriliyor (her zeminde okunsun)',
     /body\.obs #scroller\{text-shadow:/.test(mac));
}

/* ---------- ADRES KUTUSU DOĞRU YERDE Mİ ---------- */
{
  const blok = cikar(kod, /\(function\(\)\{\s*const kutu=\$\('#obsBox'\);[\s\S]*?\}\)\(\);/, 'obs kutusu');
  ok('adres kutusu işaretlemede', /id="obsBox"/.test(mac));
  ok('açıklama sözlüğe bağlı (iki dilli)',
     /data-i18n="mObsTitle"/.test(mac) && /data-i18n="mObsHint"/.test(mac));
  /* YAYIN PENCERESİNİN KENDİSİNDE kutu görünmemeli: kullanıcı OBS'te
     kendi talimatını okumaz, sahnede talimat metni belirir. */
  ok('yayın penceresinde kutu gizleniyor', /if\(obsKip \|\| !location\.protocol\.startsWith\('http'\)\)/.test(blok));
  /* file:// altında OBS sayfayı zaten yükleyemez ve üretilecek adres yok;
     göstermek ölü bir talimat olurdu. */
  ok('file:// altında kutu gizleniyor (ölü talimat olmasın)',
     /!location\.protocol\.startsWith\('http'\)/.test(blok));
  ok('adres sunucunun kendi kaynağından üretiliyor', /location\.origin\+'\/\?obs=1'/.test(blok));
  ok('kopyalama hatası sessiz değil', /toast\('Kopyalanamadı — adresi elle seçebilirsin'\)/.test(blok));
  ok('hata günlüğe yazılıyor', /logErr\('obs',e\)/.test(blok));
}

/* ---------- ZOOM/TEAMS TARAFI GERİLEMEDİ Mİ ---------- */
{
  /* Yüzen Sufle bu kipin tamamlayıcısı: biri yayın yazılımı için, öbürü
     doğrudan görüşme için. İkisi de durmalı. */
  ok('Yüzen Sufle duruyor', /id="pipBtn"/.test(mac) && /documentPictureInPicture/.test(kod));
}
