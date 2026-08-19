const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu, oku, cikar, repoOku}=require('./kaynak.js');

/* 🔴 SESLE TAKİP SESSİZ ÖLÜYORDU — Erdal bildirdi (T54).

   "Önceden çalışıyordu, şimdi çalışmıyor." Kullanıcı 🎤 basıyor, metin akmıyor
   ve EKRANDA HİÇBİR ŞEY YAZMIYOR. Uygulamanın söyleyecek tek sözü yoktu.

   ÖLÇÜLEN ZEMİN (T54, koddan):
     · `SpeechRecognition` iOS 18.6 Safari VE WKWebView'da VAR (T51'de ölçüldü)
     · Ses işleme zinciri iOS'ta ZATEN KAPALI (`fxOn()` → `!IS_WK`)
     · Ses seviyesi ölçer iOS'ta ZATEN KAPALI (`if(!IS_WK) startAudioMonitor()`)
     · Nefes akışı (vad) varsayılan KAPALI (`vad:false`)
   Yani mikrofonu Web Audio'ya bağlayan bizim kodumuz değil. Geriye en olası
   neden kalıyor: KAMERA mikrofonu tutuyor ve iOS'ta ses oturumu tekil.

   BU YÜZDEN SEBEP TAHMİN EDİLMİYOR, ELEME YAPILIYOR. Nöbetçi "şu bozuk" demiyor;
   "ses gelmiyor, kamera açıksa önce onu dene" diyor ve öz-test kesin cevabı
   veriyor. Yanlış teşhis, teşhissizlikten kötüdür.

   Bu dosya nöbetçinin GARANTİLERİNİ kilitliyor. */

const src = oku(telefonYolu());
const startVoice = cikar(src, /function startVoice\(\)\{[\s\S]*?\n\}/, 'startVoice');

/* ---------- NÖBETÇİ KURULUYOR MU ---------- */
{
  ok('nöbetçi değişkenleri tanımlı', /let sesGeldi=false, sessizNobet=null;/.test(src));
  ok('tanıma başlatıldıktan sonra nöbetçi kuruluyor',
     /sesGeldi=false; clearTimeout\(sessizNobet\);\s*\n\s*sessizNobet=setTimeout\(/.test(startVoice));

  /* Süre makul olmalı: çok kısa olursa konuşmaya başlamadan bağırır, çok uzun
     olursa kullanıcı çoktan vazgeçmiştir. */
  const ms = (startVoice.match(/\}, (\d+)\);/) || [])[1];
  ok('nöbet süresi makul (' + ms + ' ms)', +ms >= 4000 && +ms <= 10000);
}

/* ---------- YANLIŞ ALARM VERMİYOR MU ---------- */
{
  /* ① Sonuç gelirse nöbetçi susmalı — yoksa tanıma ÇALIŞIRKEN hata basardı. */
  ok('sonuç gelince nöbetçi iptal ediliyor',
     /sesGeldi=true; clearTimeout\(sessizNobet\); sessizNobet=null;/.test(src));
  /* ② Kullanıcı kapatırsa nöbetçi susmalı. */
  ok('sesle takip kapanınca nöbetçi iptal ediliyor',
     /function stopVoice\(\)\{ voiceOn=false; clearTimeout\(sessizNobet\);/.test(src));
  /* ③ Nöbet dolduğunda hâlâ açık ve hâlâ sessiz mi diye YENİDEN bakmalı:
     ikisi de değişmiş olabilir. */
  ok('nöbet dolunca durum yeniden sınanıyor',
     /if\(!voiceOn \|\| sesGeldi\) return;/.test(startVoice));
}

/* ---------- MESAJ ELEME YAPIYOR MU ---------- */
{
  /* Kamera açıkken ve kapalıyken FARKLI mesaj: aynı metni basmak kullanıcıyı
     yanlış yere gönderir. */
  ok('kamera durumu ölçülüyor',
     /const kamera=!!\(stream && stream\.getAudioTracks && stream\.getAudioTracks\(\)\.length\);/.test(startVoice));
  ok('kameraya göre farklı mesaj seçiliyor',
     /toast\(kamera \? m\('voiceSilentCam'\) : m\('voiceSilent'\)\);/.test(startVoice));
  /* Olay günlüğe de düşmeli: kullanıcı bize ekran görüntüsü gönderdiğinde
     "Son hatalar" listesinde görünsün. */
  ok('olay hata günlüğüne yazılıyor', /logErr\('voice','sonuc gelmedi/.test(startVoice));

  /* Mesajlar İKİ DİLDE ve yol gösterici olmalı — "bir şeyler ters gitti"
     demek hiçbir işe yaramaz. */
  const {REPO} = require('./kaynak.js');
  const fs = require('fs'), path = require('path');
  const msg = repoOku('cekirdek/mesajlar.js','SUFLE_MESAJ');
  for (const k of ['voiceSilentCam', 'voiceSilent']) {
    ok('mesaj tanımlı: ' + k, new RegExp(k + ":'").test(msg));
    const kacKez = (msg.match(new RegExp(k + ":'", 'g')) || []).length;
    ok('mesaj iki dilde de var: ' + k + ' (' + kacKez + ')', kacKez === 2);
  }
  /* Kamera mesajı SOMUT çıkış yolu göstermeli. */
  ok('kamera mesajı kamerasız kipi öneriyor', /Kamerasız sadece sufle/.test(msg));
  ok('diğer mesaj öz-testi işaret ediyor', /Mikrofonu ve tanımayı sına/.test(msg));
}

/* ---------- ÖZ-TEST DE KAMERAYI SÖYLÜYOR MU ---------- */
{
  /* Öz-test "hiç ses alınmadı" derken kameradan bahsetmezse, kullanıcı
     izinlerle uğraşıp doğru yeri hiç denemez. */
  const test = src.slice(src.indexOf("$('#voiceTest').onclick"));
  ok('öz-test bloğu ayrılabildi (ölçmeyen kapı değil)', test.length > 800);
  ok('öz-test kamera durumunu ölçüyor',
     /const kamera=!!\(stream && stream\.getAudioTracks/.test(test));
  /* v9.36: cümle sözlüğe taşındı; ölçüt aynı — öz-test kamerayı kapatıp
     tekrar denemeyi SÖYLÜYOR mu — ama artık doğru yerde aranıyor. Ayrıca
     kabuğun o cümleyi gerçekten okuduğu da ölçülüyor: yalnız sözlüğe bakan
     iddia, çağrı kalksa bile yeşil kalırdı. */
  ok('öz-test kamerayı kapatıp TEKRAR denemeyi söylüyor',
     /* `[^']*` YETMİYOR: Türkçe değerde kaçışlı kesme işareti var
        (iPhone\\'da) ve desen orada duruyordu — İngilizce geçip Türkçe
        kalıyordu, yani iddia yarım ölçüyordu. */
     /vtKamera:'(?:[^'\\]|\\.)*tekrar çalıştır/.test(src) &&
     /vtKamera:'(?:[^'\\]|\\.)*run this test again/.test(src) &&
     /kamera\?t\('vtKamera'\):t\('vtIzinBelki'\)/.test(test));
  /* Sonuç cümlesindeki sayı ve duyulan metin gerçekten yerine oturmalı:
     yer tutucu doldurulmazsa ekranda süslü parantez görünür ve öz-test
     "çalışıyor" derken kaç kelime duyduğunu söylemez. */
  ok('öz-test kaç kelime duyduğunu söylüyor',
     /srY\(t\('vtCalisiyor'\),\{n:w, s:esc\(heard\)\}\)/.test(test));
}

/* ---------- ÖLÇÜLEN ZEMİN HÂLÂ GEÇERLİ Mİ ---------- */
{
  /* Teşhis şu üçünün iOS'ta KAPALI olmasına dayanıyor. Biri açılırsa
     teşhis de değişir — o yüzden kilitleniyor. */
  ok('ses işleme iOS\'ta kapalı', /function fxOn\(\)\{ return !IS_WK/.test(src));
  ok('ses ölçer iOS\'ta kapalı', /if\(!IS_WK\)\{ micTouched=true; startAudioMonitor\(\); \}/.test(src));
  ok('nefes akışı varsayılan kapalı', /vad:false/.test(src));
}
