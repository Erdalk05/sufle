const ok=(ad,k)=>{ console.log((k?'✓ ':'✗ HATA ')+ad); if(!k) process.exitCode=1; };
const {oku,telefonYolu}=require('./kaynak.js');
const src=oku(telefonYolu());

/* SESLİ TAKİP ROZETİ DESTEKLENMEYEN BİR HAREKETİ TARİF EDİYORDU (2026-08-18).
   `setVoiceBadge('lost')` başlığı "okuduğun yeri parmakla göster" / "tap where
   you are" diyor, ama kelimeye dokunmanın tek karşılığı zamanlı akışı
   açıp kapatmaktı. Sürükleyerek sarma zaten `syncVoicePtr()` çağırıyordu;
   eksik olan TEK DOKUNUŞ yoluydu. Bu kapı hem vaadi hem karşılığını tutar. */

const fn=src.slice(src.indexOf('function voiceResyncAt(el){'), src.indexOf('function endDrag(){'));
ok('yeniden senkron fonksiyonu var', fn.includes('function voiceResyncAt') && fn.includes('function tekDokunus'));

// ① rozet vaadi hâlâ duruyor (vaat silinerek "düzeltilmesin")
ok('rozet kayıpken parmakla göstermeyi öneriyor', /okuduğun yeri parmakla göster/.test(src));
ok('İngilizce rozet de aynı şeyi öneriyor', /tap where you are/.test(src));

// ② dokunuş gerçekten hizalıyor
ok('dokunulan kelime basış anında alınıyor', /dokunulanKelime = \(e\.target && e\.target\.closest\)/.test(src));
ok('kelime konumuna gidiliyor', /setPos\(Math\.max\(0, Math\.min\(maxPos, wordTops\[wi\]-eyeOff\(\)\)\)\)/.test(fn));
ok('takip işaretçisi yeni konuma kuruluyor', /syncVoicePtr\(\);/.test(fn));
ok('kaldığın yer kaydediliyor', /rememberPos\(\);/.test(fn));
ok('kayıp sayacı sıfırlanıyor', /lastHitAt=performance\.now\(\)/.test(fn));
ok('rozet yeniden "takip ediyor" oluyor', /setVoiceBadge\('ok'\)/.test(fn));
ok('sıçrama yutma sayacı sıfırlanıyor', /jumpSwallow=0;/.test(fn));
ok('zorlanma haritası uydurma yavaşlık üretmiyor', /vPrev=\{i:-1,t:0\};/.test(fn));

// ③ geri bildirim: hangi kelimeyi işaretlediğin görünür
ok('işaretlenen kelime vurgulanıyor', /el\.classList\.add\('resync'\)/.test(fn));
ok('vurgu kendiliğinden sönüyor', /el\.classList\.remove\('resync'\)/.test(fn));
ok('vurgunun görsel karşılığı CSS\'te var', /#scroller \.w\.resync\{[^}]*outline/.test(src));
ok('sebep bildirimle de söyleniyor', /toast\(m\('voiceResync'\)\)/.test(fn));
for(const a of ['voiceResync'])
  ok(a+' anahtarı TR ve EN sözlüklerde var',(src.match(new RegExp(a+":'",'g'))||[]).length>=2);

// ④ ESKİ DAVRANIŞ KORUNUYOR — bu düzeltmenin bedeli olmamalı
ok('sesle takip kapalıyken tek dokunuş yine akışı açıp kapatıyor', /if\(voiceOn && voiceResyncAt\(dokunulanKelime\)\) return;\s*\n\s*toggle\(\);/.test(fn));
ok('kelimeye denk gelmeyen dokunuş eski yoluna gidiyor', /if\(wi<0 \|\| wordTops\[wi\]==null\) return false;/.test(fn));
ok('çift dokunuş kilidi tek dokunuştan ÖNCE değerlendiriliyor',
   src.indexOf('setLock(!body.classList.contains') < src.indexOf('if(!anySheet()) tekDokunus()'));
ok('sürükleyerek sarma yolu hâlâ senkronluyor', /if\(voiceOn\) syncVoicePtr\(\);\s+\/\/ takip yeni konumdan devam etsin/.test(src));
