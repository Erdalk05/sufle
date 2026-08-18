const ok=(ad,k)=>{ console.log((k?'✓ ':'✗ HATA ')+ad); if(!k) process.exitCode=1; };
const {oku,telefonYolu}=require('./kaynak.js');
const src=oku(telefonYolu());

/* SONUÇ EKRANINDAKİ "KAPAT" ARŞİVE YAZILDIĞINI VARSAYIYORDU (2026-08-18).
   `autoSaveTake` başarısız olunca (`arsivHatasi=true`: depo dolu ya da
   tarayıcı deposu kapalı) çekim yalnızca bellektedir ve `closeResult` onu
   bırakır — düğme yine de "Çekimlerim'e kaydedildi" diyordu. Kullanıcı
   videoyu KAYDETTİĞİNİ sanarak siliyordu. Kurtarma kutusu sebebi zaten
   yazıyordu, düğme onu okumuyordu. Bu kapı iki şeyi birden tutar:
   ① yazılamamışsa "kaydedildi" İDDİASI EDİLMEZ, ② kapanış tek dokunuşla
   olmaz. */
const el=src.slice(src.indexOf("let keepArm=0"), src.indexOf("let redoArm=0"));
ok('kapat işleyicisi bulundu', el.length>100 && el.includes("$('#keepBtn').onclick"));

// ① yalan kilidi: "kaydedildi" mesajı yalnız arşiv başarılıyken
const kaydedildi=el.indexOf("m('takeKept')");
const hataDali=el.indexOf('if(arsivHatasi)');
ok('kapat arşiv durumunu okuyor', hataDali>=0);
ok('"kaydedildi" iddiası arşiv hatası dalından SONRA geliyor', kaydedildi>hataDali);
ok('arşiv yazılamamışken sebep söyleniyor', /toast\(m\('keepNotSaved'\)\)/.test(el));
ok('sebep mesajı ilk dokunuşta, kapanıştan ÖNCE veriliyor',
   el.indexOf("m('keepNotSaved')") < el.indexOf('keepIptal(); closeResult();'));

// ② iki adımlı onay
ok('ilk dokunuş kapatmıyor', /if\(!keepArm\)\{[\s\S]*?return;/.test(el));
ok('ikinci dokunuş kapatıyor', /keepIptal\(\); closeResult\(\);/.test(el));
ok('düğme metni kaybı açıkça yazıyor', /textContent=t\('keepLost'\)/.test(el));
ok('onay kendi kendine düşüyor', /keepT=setTimeout\(keepIptal,4000\)/.test(el));
ok('onay düşünce etiket geri geliyor', /b\.textContent=t\('keep'\)/.test(el));
ok('sayaç sıfırlanırken zamanlayıcı da temizleniyor', /keepArm=0; clearTimeout\(keepT\); keepT=null;/.test(el));

// ekran kapanınca onay düşer (redoIptal ile aynı sözleşme)
const cr=src.slice(src.indexOf('function closeResult(){'), src.indexOf('function fileName()'));
ok('ekran kapanınca kapat onayı da düşüyor', /keepIptal\(\)/.test(cr));

// sözlükler
for(const a of ['keepLost','keepNotSaved']){
  ok(a+' anahtarı TR ve EN sözlüklerde var', (src.match(new RegExp(a+":'",'g'))||[]).length>=2);
}
ok('kayıp uyarısı çekimin geri gelmeyeceğini söylüyor', /keepNotSaved:'[^']*geri gelmez/.test(src));
ok('İngilizce uyarı da kaybı söylüyor', /keepNotSaved:'[^']*lost it for good|keepNotSaved:'[^']*loses it for good/.test(src));
