const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* DİSK DOLUNCA — İKİ AYRI DELİK
   1) KAYIT ORTADA ÖLÜRSE ARAYÜZ KAYITTA KALIYORDU.
      rec.onerror yalnızca tek satır uyarı veriyordu. MediaRecorder ölüyor ama
      kırmızı nokta yanmaya, sufle akmaya, sayaç ilerlemeye devam ediyordu —
      ekran kilitliyse kullanıcı uyarıyı hiç görmüyor ve hiçbir şey
      kaydedilmezken konuşmayı sürdürüyordu. En sık sebebi disk dolması.

   2) YER UYARISI ÇOK GEÇ GELİYORDU.
      "Depo dolu" ancak çekim BİTİP arşivlenemeyince söyleniyordu; o noktada
      çekim yalnız bellekte ve kullanıcı paylaşmayı unutursa kayıp. Hazırlık
      panelinde ışık/ses/süre kontrol ediliyordu ama YER kontrol edilmiyordu.

   MB kimseye bir şey anlatmaz: kalan yer DAKİKAYA çevriliyor ve hesap
   mbPerMin() ile aynı kaynaktan geliyor — çözünürlük/bit hızı değişince
   tahmin de değişiyor. */

const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* ---------- 1) KAYIT ÖLÜNCE ÇEKİM DÜZGÜN BİTİYOR MU ---------- */
const doStart = cikar(kod, /function doStartRec\(\)\{[\s\S]*?\n\}/, 'doStartRec');
const onerror = cikar(doStart, /rec\.onerror=ev=>\{[\s\S]*?\n  \};/, 'rec.onerror');

function kos({kayitUide=true}={}){
  const iz=[];
  new Function('__iz','__u', `
    let pendingDur=0;
    const recElapsed=()=>18.25;
    const logErr=(w,e)=>__iz.push('log:'+w);
    const toast=k=>__iz.push('toast:'+k);
    const buzz=()=>__iz.push('titresim');
    const m=k=>k;
    const body={ classList:{ contains:c=>__u && c==='rec' } };
    const stopRec=()=>__iz.push('CEKIM BITIRILDI');
    const rec={};
    ${onerror}
    rec.onerror({error:{name:'QuotaExceededError'}});
    __iz.sure = pendingDur;
  `)(iz, kayitUide);
  return iz;
}
{
  const iz = kos();
  ok('kayıt ölünce çekim düzgün bitiriliyor (arayüz kayıtta kalmıyor)',
     iz.includes('CEKIM BITIRILDI'));
  ok('kullanıcıya söyleniyor', iz.some(x=>/toast:recDied/.test(x)));
  ok('titreşimle de uyarılıyor (ekran kilitliyse uyarıyı göremez)', iz.includes('titresim'));
  ok('hata günlüğe yazılıyor', iz.some(x=>/log:rec/.test(x)));
  /* Süre ÖNCE ölçülmeli: onstop hangi sırada gelirse gelsin doğru süre yazılsın.
     stopRec çağrısından sonra ölçülse recT sıfırlanmış olabilirdi. */
  ok('süre, çekim bitirilmeden ÖNCE ölçülüyor', iz.sure === 18.25);
  ok('süre ölçümü stopRec çağrısından önce',
     onerror.indexOf('pendingDur=recElapsed()') < onerror.indexOf('stopRec()'));
}
{
  /* Çekim zaten bitmişse ikinci kez bitirmeye çalışma — sonuç ekranı açıkken
     stopRec çağırmak sayaçları ve bölüm işaretlerini yeniden karıştırırdı. */
  const iz = kos({kayitUide:false});
  ok('çekim zaten bitmişse tekrar bitirilmiyor', !iz.includes('CEKIM BITIRILDI'));
  ok('çekim bitmiş olsa da hata yine bildiriliyor', iz.some(x=>/toast:recDied/.test(x)));
}
ok('mesaj elde kalanı söylüyor (kullanıcı her şeyi kaybettiğini sanmasın)',
   /recDied:'[^']*duruyor/.test(tel));

/* ---------- 2) ÇEKİMDEN ÖNCE YER UYARISI ---------- */
const kalanDk = cikar(kod, /function kalanDk\(\)\{[\s\S]*?\n\}/, 'kalanDk');
function dk(quota, usage, mbdk){
  return new Function('__q','__u','__m', `
    const kota={quota:__q, usage:__u};
    const mbPerMin=()=>__m;
    ${kalanDk}
    return kalanDk();
  `)(quota,usage,mbdk);
}
/* 1 GB boş, dakikada 68 MB (1080p/mid) → ~15 dk */
ok('kalan yer dakikaya çevriliyor', Math.round(dk(2*1073741824, 1073741824, 68)) === 15);
ok('daha yüksek bit hızında süre kısalıyor (hesap gerçekten bit hızına bağlı)',
   dk(2*1073741824, 1073741824, 136) < dk(2*1073741824, 1073741824, 68));
ok('depo dolu ise sıfır (negatif süre yazmıyor)', dk(1000, 900000, 68) === 0);
ok('kota bilinmiyorsa satır hiç çıkmıyor (uydurma sayı yok)', dk(0, 0, 68) === null);
ok('dakika başı boyut ölçülemezse satır çıkmıyor', dk(2*1073741824, 0, 0) === null);

const ready = cikar(kod, /function readyChecks\(\)\{[\s\S]*?\n\}/, 'readyChecks');
/* Kaynak düzeyi önce: satır tümüyle kaldırılırsa aşağıdaki çıkarım çöker ve
   çökmüş test ADI OLAN tek bir iddia bile basmaz — çıkış kodu doğru olsa da
   rapor okunmaz. */
ok('hazırlık panelinde yer kontrolü var', /const kdk=kalanDk\(\);/.test(ready));
function satir(kdkDeger){
  const out=new Function('__k', `
    const out=[];
    const L='tr';
    const kalanDk=()=>__k;
    ${cikar(ready, /const kdk=kalanDk\(\);[\s\S]*?\n  \}/, 'yer satırı')}
    return out;
  `)(kdkDeger);
  return out[0]||null;
}
{
  const r=satir(1.2);
  ok('3 dakikadan az kalınca ENGEL sayılıyor', r && r.lv==='bad');
  ok('engel satırı ne yapılacağını söylüyor (arşivden sil)', /arşivden çekim sil/.test(r.d));
  ok('engel satırında kalan süre yazıyor', /≈1 dk/.test(r.d));
}
{
  const r=satir(6);
  ok('3-10 dakika arası uyarı (çekim engellenmiyor)', r && r.lv==='warn');
}
{
  const r=satir(40);
  ok('bol yer varken yeşil', r && r.lv==='ok');
  ok('yeşilken de kalan süre gösteriliyor', /≈40 dk/.test(r.d));
}
ok('kota okunamıyorsa satır hiç eklenmiyor', satir(null) === null);

/* Hazırlık paneli asenkron değeri BİR KEZ bekleyip yeniden çiziyor mu —
   yoksa satır ilk açılışta hiç görünmezdi. */
const rr = cikar(kod, /function renderReady\(\)\{[\s\S]*?\n\}/, 'renderReady');
ok('ilk açılışta kota ölçülüp panel yeniden çiziliyor',
   /if\(!kota\.t\) kotaTazele\(\)\.then\(v=>\{ if\(v\) renderReady\(\); \}\);/.test(rr));
ok('sonsuz döngü yok: yeniden çizim yalnız değer YOKKEN tetikleniyor',
   /else if\(Date\.now\(\)-kota\.t>10000\) kotaTazele\(\);/.test(rr));

/* ---------- ESKİ KORUMA DURUYOR MU ----------
   Arşivleme başarısız olsa bile çekim gösterilmeli (v9.4 düzeltmesi). */
/* Desen KODUN METNİNE değil İDDİAYA bağlı olmalı: buraya sonradan bayrak
   kurma gibi satırlar eklenebiliyor (J3'te eklendi) ve birebir metne kilitli
   desen, davranış bozulmadığı hâlde kapıyı kırmızıya çeviriyor. Korunan iddia
   şu: arşivleme hata verse bile showResult MUTLAKA çağrılıyor. */
const zincir = cikar(kod, /autoSaveTake\(\)\s*\.catch\([\s\S]*?showResult\(lastBlob\)\);/, 'arşivleme zinciri');
ok('arşivlenemeyen çekim yine de gösteriliyor',
   /\.catch\(/.test(zincir) && /\.then\(\(\)=>showResult\(lastBlob\)\);/.test(zincir));
ok('hata yakalandığında arşiv kimliği bırakılıyor (ölü kimlikle devam edilmiyor)',
   /curTakeId=null/.test(zincir));
ok('arşiv hatası mesajı videonun elde olduğunu söylüyor', /archFail:'[^']*video elinde/.test(tel));
