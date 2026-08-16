const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path');
const {telefonYolu,oku,repoOku,REPO}=require('./kaynak');
const tel=oku(telefonYolu());

/* MAĞAZA KABUĞU — DERLENEBİLİR KALSIN.

   Erdal "mağazaya evet" dedi ama Apple hesabı henüz yok. Bu ikisi arasındaki
   mesafenin KOD tarafında sıfır olduğu ölçüldü: kabuk simülatörde derlenip
   açılıyor ve içinde GERÇEK uygulama koşuyor (9.15, ekran görüntüsüyle
   kanıtlandı). Bu dosya o mesafenin sessizce açılmasını engelliyor.

   En sinsi kusur SÜRÜM SAPMASI olurdu: uygulama 9.15 iken kabuk 9.11 diyordu
   ve kimse bakmıyordu — mağazaya yanlış sürüm numarasıyla çıkmak, kullanıcının
   gördüğü sürümle bizim konuştuğumuz sürümün ayrışması demek. (Bu depoda aynı
   sınıf telefon-Mac arasında bir kez yaşandı ve kapıya bağlanmıştı.) */

const PLIST=repoOku('ios-kabuk/Kabuk-Info.plist','SUFLE_KABUK_PLIST');
const SWIFT=repoOku('ios-kabuk/kabuk.swift','SUFLE_KABUK_SWIFT');
const BETIK=repoOku('ios-kabuk/kabuk-derle.sh','SUFLE_KABUK_BETIK');

/* ---------- 1) SÜRÜM SAPMASI YOK ---------- */
{
  const ver=(tel.match(/VER='([\d.]+)'/)||[])[1];
  const pver=(PLIST.match(/CFBundleShortVersionString<\/key><string>([\d.]+)<\/string>/)||[])[1];
  ok('uygulama sürümü okunabildi', !!ver);
  ok('kabuk sürümü okunabildi', !!pver);
  ok('kabuk ve uygulama aynı sürümde (uygulama '+ver+' · kabuk '+pver+')', ver===pver);
  /* Derleme betiği bu denetimi KENDİSİ de yapmalı: kapı koşmadan derleyen
     biri sapmayı ancak orada görür. */
  ok('derleme betiği sürümü kendi de denetliyor', /sürüm sapması/.test(BETIK));
  ok('sapmada derleme duruyor', /exit 1/.test(BETIK));
}

/* ---------- 2) İZİN METİNLERİ — APPLE BUNLARI AYNEN GÖSTERİYOR ---------- */
{
  const IZIN=['NSCameraUsageDescription','NSMicrophoneUsageDescription','NSSpeechRecognitionUsageDescription'];
  for(const k of IZIN){
    const m=PLIST.match(new RegExp('<key>'+k+'</key>\\s*<string>([^<]+)</string>'));
    ok('izin metni var: '+k, !!m);
    if(!m) continue;
    /* SEBEP YAZMAK ZORUNLU: Apple "kamera erişimi gerekiyor" gibi döngüsel
       metinleri reddediyor, ama asıl sebep kullanıcı: neye izin verdiğini
       anlamalı. Ölçüt uzunluk değil, CÜMLE olması ve "için" ile bitmesi. */
    ok('izin metni sebep söylüyor: '+k, m[1].length>40 && /için/.test(m[1]));
    ok('izin metni jargonsuz: '+k, !/API|WKWebView|getUserMedia|permission/i.test(m[1]));
  }
  /* Uygulama gerçekten bu üç izni kullanıyor mu — kullanmadığı bir izni
     istemek mağaza reddi sebebi ve kullanıcı güvenini de düşürür. */
  ok('uygulama kamerayı gerçekten kullanıyor', /getUserMedia/.test(tel));
  ok('uygulama mikrofonu gerçekten kullanıyor', /getAudioTracks|audio:\s*\{/.test(tel));
  ok('uygulama konuşma tanımayı gerçekten kullanıyor', /SpeechRecognition/.test(tel));
  /* İstenmeyen izin YOK: konum, kişiler, takvim, fotoğraf kitaplığı. */
  for(const k of ['NSLocationWhenInUseUsageDescription','NSContactsUsageDescription',
                  'NSCalendarsUsageDescription','NSPhotoLibraryUsageDescription'])
    ok('gereksiz izin istenmiyor: '+k, !PLIST.includes(k));
}

/* ---------- 3) KABUK GERÇEK UYGULAMAYI AÇIYOR ---------- */
{
  /* Kabuk paketin içindeki dosyayı açıyor: internet gerekmiyor, ilk açılış
     anında çalışıyor ve mağaza incelemesi çevrimdışı da yapabiliyor. */
  ok('kabuk paketten yüklüyor', /loadFileURL/.test(SWIFT));
  ok('kabuk hangi sayfayı açtığını tek yerde tutuyor', /BUNDLE_SAYFA/.test(SWIFT));
  /* Sufle tam ekran akıyor: video satır içinde oynamazsa iOS kendi tam ekran
     oynatıcısını açıyor ve METİN GÖRÜNMEZ oluyor (ölçülmüş kusur sınıfı). */
  ok('video satır içinde oynuyor', /allowsInlineMediaPlayback = true/.test(SWIFT));
  ok('önizleme dokunuş beklemiyor', /mediaTypesRequiringUserActionForPlayback = \[\]/.test(SWIFT));
  /* Senaryolar ve çekim arşivi kalıcı depoya bağlı: varsayılan olmayan bir
     depo seçilirse uygulama her açılışta BOŞ gelir. */
  ok('kalıcı depolama açık', /WKWebsiteDataStore\.default\(\)/.test(SWIFT));
  /* Derleme betiği GERÇEK uygulamayı gömüyor mu (ölçüm sayfasını değil). */
  ok('betik gerçek uygulamayı gömüyor', /cp index\.html "\$APP\/index\.html"/.test(BETIK));
  ok('betik ölçüm sayfasını da seçebiliyor', /olcum-kabuk\.html/.test(BETIK));
}

/* ---------- 4) BETİK NE YAPMADIĞINI DA SÖYLÜYOR ---------- */
{
  /* Yayın protokolü net: imza ve mağaza gönderimi Erdal kararına bağlı.
     Betik bunu KENDİ içinde yazmalı, yoksa biri "derledim, gönderdim" sanır. */
  ok('betik imzalamadığını söylüyor', /imzalamaz|İMZA YOK/i.test(BETIK));
  ok('betik mağazaya göndermediğini söylüyor', /App Store'a hiçbir şey göndermez/.test(BETIK));
  ok('betik simülatör derlemesi olduğunu söylüyor', /SİMÜLATÖR/i.test(BETIK));
  ok('betik yalnız simülatör hedefi kuruyor', /iphonesimulator/.test(BETIK));
  /* Gerçek cihaza kurma ya da mağaza gönderimi komutu KESİNLİKLE olmamalı. */
  ok('betikte cihaza kurma yok', !/devicectl|ios-deploy/.test(BETIK));
  ok('betikte mağaza gönderimi yok', !/altool|notarytool|xcrun altool|App Store Connect/i.test(BETIK));
}

/* ---------- 5) ÖLÇÜM KAYDI DURUYOR ---------- */
{
  /* Kabuğun en riskli varsayımı (paketten file:// ile açılınca kamera, mikrofon
     ve kalıcı depolama çalışır mı) bir kez ÖLÇÜLDÜ. Kayıt silinirse aynı soru
     yeniden "bilinmiyor" olur. */
  ok('ölçüm sayfası depoda', fs.existsSync(path.join(REPO,'ios-kabuk','olcum-kabuk.html')));
  ok('ölçüm sonucu (ekran görüntüsü) depoda',
     fs.existsSync(path.join(REPO,'ios-kabuk','sonuc-kabuk.png')));
  const olcum=repoOku('ios-kabuk/olcum-kabuk.html','SUFLE_KABUK_OLCUM');
  for(const y of ['getUserMedia','MediaRecorder','indexedDB','localStorage'])
    ok('ölçüm sayfası '+y+' yeteneğini sınıyor', olcum.includes(y));
}
