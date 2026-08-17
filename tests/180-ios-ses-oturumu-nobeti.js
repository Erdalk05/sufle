const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku} = require('./kaynak.js');

/* iOS SES OTURUMU NÖBETİ — v9.23 düzeltmesinin GERİ GELMEMESİ için
   (2026-08-17 akşamı; bulguyu dedektöre çevirme turu)

   v9.23te iPhone çekimlerinin görüntüsünün donma sebebi bulundu: iOSta ses
   oturumu TEKTİR ve kayıt sürerken onu yeniden kuran her şey YAKALAMA
   oturumunu da yeniden kurduruyor — görüntü donuyor, ses akmaya devam ediyor.
   Suçlu, kayıt sürerken kendini yeniden başlatan konuşma tanımaydı.

   DÜZELTMEYİ TEK VAKAYA BAĞLAMAK YETMEZ. Bu depoda aynı sınıf DEFALARCA
   tekrarladı (mikrofon izi temizliği iki ayrı özellikte, ön koşullu ayar üç
   ayrı yerde). Sesle takip düzeltildikten SONRA bütün dosya tarandı ve iOSta
   ses oturumuna dokunan yedi yol çıktı; altısı zaten korunuyordu:

     startMeter          → IS_WK ise hiç kurulmuyor (mikrofon ölçer)
     startAudioMonitor   → yalnız !IS_WK dalında çağrılıyor
     makeFxTrack         → fxOn() = !IS_WK && ... , iOSta null dönüyor
     sesBaglamiIsit      → yalnız fxOn() doğruyken çağrılıyor
     vadBaslat           → vadCalisir() kayıt sürerken iOSta false
     müzik yatağı        → muzikDurum(iosMu) ilk satırda kapatıyor
     openCam             → boğaz noktasında kayıt koruması var

   Bu dosya iki şeyi birden ölçüyor:
     1) ENVANTER — yukarıdaki korumaların her biri hâlâ yerinde mi (adıyla).
     2) SAYIM — riskli çağrı sayısı arttı mı. Yeni bir özellik ses oturumuna
        dokunursa envanterde görünmez ama SAYIM onu yakalar ve yazarın
        korumayı yazıp envantere eklemesini zorlar.
   Yalnız envanter yazsaydım, yarın eklenen bir özellik aynı donmayı sessizce
   geri getirirdi; yalnız sayım yazsaydım, bir koruma sökülünce sayı değişmez
   ve kapı susardı. İkisi birlikte kapanıyor. */

const tel = oku(telefonYolu());
const kod = tel.replace(/\/\*[\s\S]*?\*\//g, '');

/* ---------- 1. ENVANTER: her korumanın kendisi ---------- */
ok('mikrofon ölçer iOSta hiç kurulmuyor',
   /if\(IS_WK\)\{ \/\/ iPhone: mikrofonu Web Audio'ya bağlamak kaydı sessizleştiriyor/.test(tel));
ok('kayıt sırasındaki ses gözcüsü yalnız masaüstünde',
   /if\(!IS_WK\)\{ micTouched=true; startAudioMonitor\(\); \}/.test(kod));
ok('Ses Stüdyosu zinciri iOSta hiç kurulmuyor (fxOn)',
   /function fxOn\(\)\{ return !IS_WK &&/.test(kod));
ok('ses bağlamı ısıtması yalnız fxOn doğruyken', /if\(fxOn\(\)\) sesBaglamiIsit\(\);/.test(kod));
ok('nefesle akış kayıt sürerken iOSta çalışmıyor',
   /function vadCalisir\(\)\{ return !!st\.vad && !\(IS_WK && rec && rec\.state==='recording'\); \}/.test(kod));
ok('nefesle akış kayıt başlarken durduruluyor',
   /if\(IS_WK && st\.vad && vad\.ctx\)\{ vadDurdur\(\);/.test(kod));
ok('müzik yatağı iOSta ilk satırda kapanıyor',
   /function muzikDurum\(iosMu, hamSes, dosyaVar, fxKapali\)\{\s*\n\s*if\(iosMu\) return \{calisir:false, sebep:'ios'\};/.test(kod));
ok('kamera yeniden açma kayıt sürerken engelli (boğaz noktası)',
   /function kameraDegisebilir\(\)\{\s*\n\s*if\(rec && rec\.state==='recording'\)\{ toast\(m\('camBusyRec'\)\); return false; \}/.test(kod));
/* v9.23ün kendi koruması — üç katman, üçü de burada. */
ok('sesle takip kayıt başlarken duraklatılıyor', /sesleGeriAl=true; stopVoice\(\);/.test(kod));
ok('sesle takip kayıt sürerken elle açılamıyor', /if\(sesleKayittaYasak\(\)\)\{ toast\(m\('voiceRecBlock'\)\)/.test(kod));
ok('bekleyen yeniden başlatma nöbetçisi duruyor',
   /if\(sesleKayittaYasak\(\)\)\{ stopVoice\(\); return; \}/.test(kod));

/* ---------- 2. SAYIM: yeni bir dokunuş eklendi mi ----------
   Ölçüt ÇAĞRI SAYISI. Taban ölçülerek konuldu; artarsa yeni bir yol
   eklenmiş demektir ve o yolun korumasının yazılması gerekir. */
/* TABANLAR TAHMİN DEĞİL, TEK TEK SAYILIP DOĞRULANDI. İlk yazışımda tahmin
   ettim ve ikisi tutmadı — sayım kapısı ancak sayısı gerçekten ölçülmüşse
   bir şey ifade eder.
   AudioContext kuran 6 yerin her biri açıldı ve iOS güvenliği tek tek
   doğrulandı:
     startMeter        IS_WK ise fonksiyon erken dönüyor
     startAudioMonitor yalnız !IS_WK dalından çağrılıyor
     sesBaglamiIsit    yalnız fxOn() doğruyken çağrılıyor (fxOn iOSta false)
     makeFxTrack       ilk satırda fxOn() kontrolü, iOSta null
     probeAudio        çekim BİTTİKTEN sonra, blob üzerinde koşuyor
     vadBaslat         ilk satırda vadCalisir(), kayıt sürerken iOSta false
   getUserMedia çağıran 3 yerin üçü de openCam içinde ve openCam kayıt
   sürerken boğaz noktasında engelli. */
const RISK = [
  ['SpeechRecognition başlatma', /(?<![\w.])sr\.start\(\)/g,                 2],
  ['AudioContext kurma',         /new\s+AC\(\)/g,                            6],
  ['MediaStreamSource kurma',    /createMediaStreamSource\(/g,               4],
  ['getUserMedia çağrısı',       /navigator\.mediaDevices\.getUserMedia\(/g, 3],
];
let toplam=0;
for(const [ad, re, taban] of RISK){
  const n=(kod.match(re)||[]).length;
  toplam+=n;
  /* Sayı DÜŞERSE de haber ver: bir koruma değil, dokunuşun KENDİSİ
     kaldırılmış olabilir ve o zaman taban bayatlar.
     ⚠️ BU SAYI ARTTIYSA TABANI BÜYÜTEREK SUSTURMA. Yeni dokunuşun iOSta
     kayıt sürerken erişilemez olduğunu KANITLA, korumasını yaz, envantere
     bir iddia ekle; ancak ondan sonra tabanı güncelle. */
  ok(ad+': '+n+' (taban '+taban+')', n===taban);
}
ok('toplam riskli dokunuş 15', toplam===15);

/* ---------- 3. YENİ DOKUNUŞ EKLENİRSE NE OLACAĞI YAZILI ----------
   Sayım kırmızıya döndüğünde onu gören kişi ne yapacağını bilmeli; aksi
   hâlde tabanı büyütüp susturur (bu depoda daha önce olmuş bir şey). */
ok('kaynakta iOS ses oturumu kuralı yazılı',
   /iOSta ses oturumu TEKTİR/.test(tel) || /iOS(?:'|)ta ses oturumu TEKTİR/.test(tel));

/* ---------- 4. SESLE TAKİP KORUMASI GERÇEKTEN KOŞUYOR ----------
   Envanter desenleri kaynağa bakar; bu blok davranışı koşturuyor. */
const mYasak = kod.match(/function sesleKayittaYasak\(\)\{[\s\S]*?\n\}/);
ok('yasak fonksiyonu çıkarılabildi', !!mYasak);
if(mYasak){
  const kos=(wk,ayar,durum)=>new Function('__w','__a','__s',`
    const IS_WK=__w; const st={sesKayitta:__a}; const rec=__s?{state:__s}:null;
    ${mYasak[0]} return sesleKayittaYasak();`)(wk,ayar,durum);
  /* Nefesle akışın kuralıyla AYNI mantık: iOS + kayıt sürüyor. Tek fark
     sesle takipte kullanıcıya bırakılan anahtar. İkisi ayrışırsa biri
     yanlış demektir. */
  const vadKos=(wk,durum)=>new Function('__w','__s',`
    const IS_WK=__w; const st={vad:true}; const rec=__s?{state:__s}:null;
    function vadCalisir(){ return !!st.vad && !(IS_WK && rec && rec.state==='recording'); }
    return !vadCalisir();`)(wk,durum);
  ok('iOSta kayıt sürerken ikisi de kapalı',
     kos(true,false,'recording')===true && vadKos(true,'recording')===true);
  ok('masaüstünde ikisi de açık',
     kos(false,false,'recording')===false && vadKos(false,'recording')===false);
  ok('kayıt yokken ikisi de açık',
     kos(true,false,null)===false && vadKos(true,null)===false);
}
