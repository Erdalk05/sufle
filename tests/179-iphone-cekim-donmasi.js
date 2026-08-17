const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku} = require('./kaynak.js');

/* iPHONE ÇEKİMİNİN GÖRÜNTÜSÜ NEDEN DONUYORDU (2026-08-17 akşamı)

   Erdal aylardır aynı şeyi bildiriyordu: iPhone ile çektiği video belirli bir
   süre sonra donuyor, SES tam. Üç ayrı tur bu soruna dokundu ve üçü de
   GÖRÜNÜRLÜK ekledi (kayıtta uyarı, sonuç ekranında "X saniyede donmuş",
   oynatma nabzı) — sebep hiç bulunamadı, sorun hiç çözülmedi.

   KANIT DEPONUN İÇİNDEYDİ. v9.0 commiti Erdalın ölçümünü saklamış:
       "41 saniyelik çekim, ses tam, GÖRÜNTÜ 19. saniyede donuyor"
   ve o tur şöyle demiş: "Sebep kesinleşmedi (bellek baskısı en güçlü aday:
   iOSta timeslice vermiyoruz, tüm kayıt bellekte birikiyor)."
   Bu hipotez ÖLÇÜYLE ÇÜRÜYOR: 19 saniye 1080pde ~20 MB eder (uygulamanın kendi
   bit hızı tablosuna göre 65 MB/dk). 20 MB bellek baskısı yapmaz. Yani sonuç
   ekranının aylardır verdiği öğüt ("720p yap, çekimi kısa tut") kullanıcıyı
   yanlış yere gönderiyordu.

   GERÇEK ZİNCİR kaynakta zaten yazılıydı, ama hiç kayıt yoluna bağlanmamıştı:
     · iOSta ses oturumu TEKTİR.
     · iPhone `continuous` tanımayı SÜRDÜRMEZ: her sessizlikte oturumu kapatır
       (v9.12de sanal saatle ölçülmüştü) ve uygulama onu yeniden başlatır.
     · Her `sr.start()` iOS ses oturumunu yeniden kurar; yakalama oturumu
       yeniden kurulunca GÖRÜNTÜ donar, SES akmaya devam eder.
   Yani donma "bir süre sonra" değil, İLK KONUŞMA ARASINDAN sonra oluyordu —
   19 saniye tam da birkaç cümlelik açılışın ardından gelen ilk duraklama.

   Aynı karar nefesle akış (VAD) için ZATEN alınmıştı: kayıt boyunca kapatılıp
   bitince geri açılıyor. Sesle takibe hiç uygulanmamıştı. Bu dosya o eksik
   simetriyi kilitliyor.

   NEDEN AYAR VAR: özelliği tümden almak yerine anahtar bırakıldı, ama
   varsayılan güvenli taraf. Anahtar masaüstünde ölü olmasın diye kapıya da
   bağlandı (orada tek ses oturumu kısıtı yok). */

const tel = oku(telefonYolu());
const kod = tel.replace(/\/\*[\s\S]*?\*\//g, '');

/* ---------- 1. YASAK KOŞULU: ÜÇ ŞART BİRDEN ---------- */
const mYasak = kod.match(/function sesleKayittaYasak\(\)\{[\s\S]*?\n\}/);
ok('sesleKayittaYasak çıkarılabildi', !!mYasak);
if(mYasak){
  const kos=(wk,ayar,durum)=>new Function('__wk','__a','__s', `
    const IS_WK=__wk; const st={sesKayitta:__a}; const rec=__s?{state:__s}:null;
    ${mYasak[0]}
    return sesleKayittaYasak();`)(wk,ayar,durum);
  ok('iOS + ayar kapalı + kayıt sürüyor → YASAK', kos(true,false,'recording')===true);
  /* Üç şartın her biri tek başına yasağı kaldırmalı; biri unutulursa
     özellik gereksiz yere ölür ya da koruma hiç çalışmaz. */
  ok('masaüstünde yasak yok (tek ses oturumu kısıtı orada yok)',
     kos(false,false,'recording')===false);
  ok('ayar açıkken yasak yok (kullanıcı riski kabul etti)',
     kos(true,true,'recording')===false);
  ok('kayıt yokken yasak yok', kos(true,false,null)===false);
  ok('duraklatılmış kayıtta yasak yok', kos(true,false,'paused')===false);
}

/* ---------- 2. KAYIT BAŞLARKEN DURAKLATILIYOR ---------- */
ok('kayıt başlarken sesle takip duraklatılıyor',
   /if\(IS_WK && !st\.sesKayitta && voiceOn\)\{\s*\n?\s*sesleGeriAl=true; stopVoice\(\); toast\(m\('voiceOffRec'\)\); \}/.test(kod));
/* NEFESLE AKIŞLA AYNI YERDE: iki koruma ayrı yerlere dağılırsa biri
   taşınırken diğeri unutulur. Simetri kasıtlı. */
{
  const iVad=kod.indexOf("vadDurdur(); toast(m('vadOffRec'))");
  const iSes=kod.indexOf("stopVoice(); toast(m('voiceOffRec'))");
  ok('iki koruma da kayıt başlangıcında', iVad>0 && iSes>0);
  ok('sesle takip koruması nefesle akışın hemen ardında', iSes>iVad && iSes-iVad<1400);
}

/* ---------- 3. KAYIT BİTİNCE KENDİLİĞİNDEN GERİ GELİYOR ----------
   Geri getirme OLMAZSA bu bir düzeltme değil, özelliğin sessizce
   kaldırılması olurdu: kullanıcı bir çekim yapıyor ve sesle takip bir daha
   hiç açılmıyor, sebebi de görünmüyor. */
ok('kayıt bitince sesle takip geri açılıyor',
   /if\(sesleGeriAl\)\{ sesleGeriAl=false; setTimeout\(\(\)=>\{ if\(!voiceOn\) startVoice\(\); \},400\); \}/.test(kod));
ok('geri açma bayrağı sıfırlanıyor (iki kez açılmasın)',
   /sesleGeriAl=false; setTimeout/.test(kod));
ok('zaten açıksa yeniden açılmıyor', /if\(!voiceOn\) startVoice\(\)/.test(kod));
{
  /* Gecikme nefesle akışla aynı: kayıt kapanırken ses oturumu daha yerine
     oturmamış oluyor. İki farklı sayı olsaydı biri ölçülmemiş demektir. */
  /* `vadBaslat` iki yerden çağrılıyor (kamera yenilenince 300 ms, kayıt
     bitince 400 ms). Ölçülmesi gereken KAYIT BİTİŞİ olanı — ilk eşleşmeyi
     almak yanlış sayıyı karşılaştırıyordu. */
  const vadMs=(kod.match(/if\(st\.vad\) setTimeout\(vadBaslat,(\d+)\);\s*\/\/ kayıt bitti/)||[])[1];
  const sesMs=(kod.match(/if\(!voiceOn\) startVoice\(\); \},(\d+)\)/)||[])[1];
  ok('iki geri getirme aynı gecikmeyi kullanıyor ('+vadMs+' / '+sesMs+')',
     !!vadMs && vadMs===sesMs);
}

/* ---------- 4. KAYIT SÜRERKEN ELLE DE AÇILAMIYOR ----------
   Duraklatma yetmez: kullanıcı çekim sürerken 🎤 düğmesine basabilir.
   Sessizce reddetmek yasak — sebebi ve ayarın yeri söyleniyor. */
ok('kayıt sürerken elle açma reddediliyor',
   /if\(sesleKayittaYasak\(\)\)\{ toast\(m\('voiceRecBlock'\)\); buzz\(40\); return; \}/.test(kod));
{
  /* Reddin startVoice'un BAŞINDA olması şart: aşağıda `sr.start()` zaten
     çağrılmış olurdu ve ses oturumu yeniden kurulurdu — koruma da bir işe
     yaramazdı. Ölçüt: red, tanıyıcı kurulmadan önce. */
  const i=kod.indexOf('function startVoice()');
  const iRed=kod.indexOf("m('voiceRecBlock')", i);
  const iKur=kod.indexOf('sr=new SR()', i);
  ok('red tanıyıcı kurulmadan ÖNCE', iRed>i && iKur>iRed);
}

/* ---------- 5. NÖBETÇİ: BEKLEYEN YENİDEN BAŞLATMA ---------- */
ok('restartVoice kayıt sürerken tanımayı kapatıyor',
   /if\(sesleKayittaYasak\(\)\)\{ stopVoice\(\); return; \}/.test(kod));

/* ---------- 6. AYAR ÖLÜ DEĞİL: MASAÜSTÜNDE SEBEBİ YAZIYOR ----------
   Anahtar iOS dışında hiçbir şey yapmıyor. Kapıya bağlanmasaydı deponun
   3 numaralı kuralına düşerdi: açıyorsun, hiçbir şey olmuyor. */
ok('anahtar HTMLde var', /data-t="sesKayitta"/.test(tel));
ok('anahtar varsayılan KAPALI (güvenli taraf)',
   /voiceCmd:true, sesKayitta:false,/.test(kod) && !/data-t="sesKayitta"[^>]*class="sw on"/.test(tel));
ok('anahtar kapıda, koşulu iOS', /\['sesKayitta', \(\)=>IS_WK,/.test(kod));
ok('masaüstünde sebebi yazılı', /yalnız iPhone için \(masaüstünde bu kısıt yok\)/.test(kod));

/* ---------- 7. TEŞHİS: DONMA SEBEBİ İLİŞKİLENDİRİLİYOR ----------
   Ayarı açan kullanıcıda koruma yok; o zaman en azından donma olduğunda
   SEBEBİ söylenmeli. Ayrıca kayıttaki her yeniden başlatma damgalanıyor ki
   bir daha olursa hangi saniyede olduğu kayıtta dursun. */
/* DESEN KOŞULU DA KAPSAMALI. İlk yazışımda yalnız atamayı arıyordu ve
   koşulu `if(false)` yapan kasıtlı bozma YAKALANMADI: damga hiç basılmıyordu
   ama satır yerinde durduğu için test yeşil kalıyordu. Ölçülen şey damganın
   KAYITTAYKEN basılması. */
{
  /* DAMGA İKİ YOLDA DA OLMALI: tanıma hem elle (startVoice) hem kendiliğinden
     (restartVoice) başlıyor ve kaydı donduran şey İKİSİ DE. Tek eşleşme
     aramak yetmiyordu — koşulu `if(false)` yapan kasıtlı bozma diğer yolda
     eşleşme bulup testi yeşil geçiriyordu (bozma turu yakaladı). */
  const n=(kod.match(/if\(rec && rec\.state==='recording'\)\{ srKayittaSon=recElapsed\(\);/g)||[]).length;
  ok('kayıttaki başlatma İKİ yolda da damgalanıyor ('+n+'/2)', n===2);
}
ok('damga günlüğe de yazılıyor', /tanıma KAYITTA yeniden başladı @/.test(kod));
ok('sonuç ekranı sesle takip açıksa sebebi söylüyor',
   /\(cekimSesle && IS_WK\) \? m\('vidDonduSes'\)/.test(kod));
ok('sebep metni ayarın yerini de söylüyor',
   /vidDonduSes:'[^']*Kayıt sırasında sesle takip/.test(tel));

/* ---------- 8. ESKİ YANLIŞ ÖĞÜT GERİ GELMESİN ----------
   19 saniyelik donmayı belleğe bağlayan öğüt ölçüyle çürüdü. Geri gelirse
   kullanıcı yine yanlış yere gönderilir. */
ok('bellek öğüdü kullanıcıya gösterilen metinde yok',
   !/belleği tüketebiliyor/.test(kod));
/* Öğüt metni bir dize; yorum ayıklaması onu bozmuyor ama kaynağın kendisine
   bakmak daha dürüst: kullanıcıya GÖSTERİLEN metin ölçülüyor. */
ok('yeni öğüt ses oturumunu adıyla anıyor',
   /ses oturumunun yeniden kurulması/.test(tel));

/* ---------- 9. İKİ DİL ---------- */
for(const k of ['voiceOffRec','voiceRecBlock','vidDonduSes']){
  ok('mesaj TRde var: '+k, new RegExp(k+":'[^']+'").test(tel));
  /* EN karşılığı ayrı bir dizede olmalı; aynı metin iki dilde de çıkarsa
     çeviri unutulmuş demektir. */
  const hepsi=[...tel.matchAll(new RegExp(k+":'([^']+)'",'g'))].map(x=>x[1]);
  ok('mesaj iki dilde AYRI: '+k, hepsi.length===2 && hepsi[0]!==hepsi[1]);
}
