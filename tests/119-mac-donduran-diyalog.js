const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {macYolu,telefonYolu,oku}=require('./kaynak');
const mac=oku(macYolu());
const macKod=mac.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=oku(telefonYolu());

/* MASAÜSTÜNDE ENGELLEYİCİ DİYALOG SUFLEYİ DONDURUYORDU (T15in Mac tarafı).
   `alert()` açıkken tarayıcı SAYFAYI TÜMÜYLE DURDURUR: sufle akmaz, kamera
   önizlemesi donar, sesle takip çalışmaz, geri sayım takılı görünür.

   ÖLÇÜLDÜ (tarayıcıda, gerçek dosyayla): dosya açıldıktan sonra sayfaya
   yapılan DOM sorgusu 45 saniyede cevap vermedi ve tarayıcı eklentisinin
   bağlantısı koptu — açık bir yerel diyaloğun sayfayı bloke ettiğinin
   kanıtı. Aynı ölçüm telefon sayfasında anında dönüyordu.

   Telefonda bu sınıf T15te kapatılmıştı; Mac tarafına taşınmamıştı.
   Dört bilgilendirme diyaloğu (hata günlüğü, hazırlık raporu, sürüm notu,
   hoş geldin) sayfayı durdurmayan bir panele taşındı. */

ok('bilgilendirme için engelleyici alert KALMADI', !/\balert\(/.test(macKod));
ok('yerine panel işlevi var', /function bilgiGoster\(baslik, metin\)\{/.test(macKod));
ok('panelin kapatma yolu var', /function bilgiKapat\(\)\{/.test(macKod));
ok('panel HTMLde tanımlı', /<div id="bilgi" role="dialog"/.test(mac));
ok('panelin başlığı ve metni ayrı', /id="bilgiBas"/.test(mac) && /id="bilgiMetin"/.test(mac));
ok('kapatma düğmesi var', /id="bilgiKapat"/.test(mac));
ok('kapatma düğmesi bağlı', /\$\('#bilgiKapat'\)\.onclick=bilgiKapat;/.test(macKod));
ok('dışarı tıklayınca kapanıyor', /if\(e\.target\.id==='bilgi'\) bilgiKapat\(\);/.test(macKod));
ok('Escape ile de kapanıyor', /e\.key==='Escape' && \$\('#bilgi'\)\.classList\.contains\('open'\)/.test(macKod));
ok('açılınca odak kapatma düğmesine gidiyor', /\$\('#bilgiKapat'\)\.focus\(\);/.test(macKod));
ok('panel ekran okuyucuya diyalog olarak bildiriliyor', /role="dialog" aria-modal="true"/.test(mac));

/* Dört çağrının dördü de panele taşınmış olmalı. */
/* İDDİA BİÇİME DEĞİL YOLA BAĞLI. Desenler önce başlıkları BİREBİR TÜRKÇE
   arıyordu; Tur 42'de o başlıklar sözlüğe bağlanınca (İngilizce kullanıcı
   Türkçe pencere görüyordu) dördü birden kırıldı — oysa davranış hiç
   değişmemişti. Aranan şey: her çağrının PANELDEN geçmesi. */
for(const [ad,desen] of [
  ['hata günlüğü', /bilgiGoster\(t\('mDlgErr'\)/],
  ['hazırlık raporu', /bilgiGoster\(t\('mDlgReady'\)/],
  ['sürüm notu', /bilgiGoster\('Sufle v'\+k/],
  ['hoş geldin', /bilgiGosterK\('mDlgWelcome'/],
]) ok(ad+' panele taşındı', desen.test(macKod));
/* alert() geri gelmesin: panelin varlık sebebi buydu. */
ok('hiçbir çağrı alert()e dönmedi', !/\balert\(/.test(macKod));

/* Panel SAYFAYI DURDURMAMALI: sınıf ekleyip çıkarmaktan ibaret olmalı,
   döngü ya da bekleme içermemeli. */
{
  const m=macKod.match(/function bilgiGoster\(baslik, metin\)\{[\s\S]*?\n  \}/);
  ok('panel işlevi çıkarılabildi', !!m);
  if(m){
    ok('panel yalnız DOM yazıyor (bekleme yok)', !/while\s*\(|await |alert\(|confirm\(|prompt\(/.test(m[0]));
    ok('panel sınıfla açılıyor', /classList\.add\('open'\)/.test(m[0]));
  }
}

/* Kalan tek engelleyici çağrı: arşiv listesi girdi istiyor. Bilinerek
   bırakıldı ama SAYILIYOR ki sessizce çoğalmasın. */
{
  const kalan=(macKod.match(/\bprompt\(|\bconfirm\(/g)||[]).length;
  console.log('   kalan engelleyici çağrı: '+kalan+' (arşiv listesi girdi istiyor)');
  ok('kalan engelleyici çağrı en fazla 1 ('+kalan+')', kalan<=1);
  ok('o çağrı kayıt sırasında zaten engelleniyor', /function diyalogKapisi\(\)\{[\s\S]*?kayitSuruyor\(\)/.test(macKod));
}

/* Telefon tarafında bu sınıf zaten kapalı — parite. */
ok('telefonda da bilgilendirme alerti yok', !/\balert\(/.test(tel.replace(/\/\*[\s\S]*?\*\//g,'')));

/* ---------- AÇIK PENCERE DİLLE TAZELENİYOR MU (Tur 42) ----------
   ÖLÇÜLDÜ (tarayıcı, TR→EN): metin sözlükten gelse bile çizim BİR KEZ
   yapılıyordu; açık karşılama penceresi dil değiştikten sonra da Türkçe
   kalıyordu ve İngilizce açan yeni kullanıcı Türkçe talimat okuyordu.
   Tazeleme sökülünce denetim bunu 0 → 2 çevrilmemiş metinle yakalıyor. */
{
  ok('açık pencereyi tazeleyen fonksiyon var', /function bilgiTazele\(\)\{/.test(macKod));
  /* Anahtarlar saklanmazsa yeniden çizim neyi yazacağını bilemez. */
  ok('gösterilen anahtarlar saklanıyor', /let bilgiAnahtar=null;/.test(macKod));
  /* Anahtarsız çağrılar (üretilmiş metin taşıyanlar) saklamayı TEMİZLEMELİ,
     yoksa sonraki dil değişimi pencereye YANLIŞ metni yazar. */
  ok('anahtarsız gösterim saklamayı temizliyor',
     /function bilgiGoster\(baslik, metin\)\{\s*\n\s*bilgiAnahtar=null;/.test(macKod));
  /* Yalnız AÇIKKEN yazmalı: kapalı pencereye yazmak sonraki açılışta eski
     içeriği bir an gösterirdi. */
  ok('yalnız açık pencereye yazıyor',
     /bilgiAnahtar && \$\('#bilgi'\)\.classList\.contains\('open'\)/.test(macKod));
  ok('dil değişiminde çağrılıyor (applyLang)', /\n\s*bilgiTazele\(\);/.test(macKod));
}
