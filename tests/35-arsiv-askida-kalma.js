const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* ÇEKİM BİTTİ, EKRANDA HİÇBİR ŞEY OLMUYOR
   Erdal 2026-08-13'te iPhone'da bildirdi: kamera açılıyor, kayıt bitiyor,
   sonuç ekranı HİÇ gelmiyor ve tek satır açıklama çıkmıyor.

   Zincir şuydu:  rec.onstop → autoSaveTake() → dbPut → openDB
   IndexedDB'nin ÜÇÜNCÜ hâli "hiç cevap vermemek": iOS Safari'de
   indexedDB.open() ve işlemler bazen ne onsuccess ne onerror üretiyor
   (PWA'da, arka plandan dönüşte, depo baskısında). O zaman söz hiç
   çözülmez — try/catch bunu YAKALAMAZ, ortada hata yok, cevapsızlık var.
   autoSaveTake askıda kalır ve showResult hiç çağrılmaz.

   Çekim aslında elde (lastBlob) duruyordu; kullanıcı kaybettiğini sanıyordu.

   İki koruma eklendi ve ikisi de burada ölçülüyor:
     1. sozZamanAsimi — cevapsız kalan her IndexedDB işi belirli sürede düşer
     2. rec.onstop zincirinde .catch — arşivleme başarısız olsa bile sonuç
        ekranı yine açılır */

/* TESTİN KENDİSİ ASILI KALMAMALI.
   Sınadığımız şey "asılı kalmama"; koruma kaldırılırsa sınanan söz hiç
   çözülmez ve bu dosya sessizce donar. kos.js execFileSync ile beklediği
   için KAPI da donardı — kırmızı bile veremezdi. Her bekleyiş kendi
   tavanıyla yarıştırılıyor; tavan dolarsa iddia KIRILIR. */
const ASILI = Symbol('asili');
const bekle = (soz, ms=3000) =>
  Promise.race([soz, new Promise(r=>setTimeout(()=>r(ASILI), ms))]);

const yardimci = cikar(tel, /function sozZamanAsimi\([\s\S]*?\n\}/, 'sozZamanAsimi');
const kur = () => { const iz=[];
  const f = new Function('__iz', `
    const logErr=(w,e)=>__iz.push(w+':'+String((e&&e.message)||e));
    ${yardimci}
    return sozZamanAsimi;`)(iz);
  return {f, iz};
};

/* ---------- ASIL KORUMA: CEVAPSIZ İŞ DÜŞMELİ ---------- */
(async () => {
{
  const {f, iz} = kur();
  const t0 = Date.now();
  const r = await bekle(f(()=>{ /* hiçbir olay üretmiyor — iOS'taki hâli */ }, 250, 'DUSUS', 'askida'));
  const sure = Date.now()-t0;
  ok('cevap gelmeyen iş sonsuza kadar beklemiyor', r === 'DUSUS');
  ok('düşüş söz verilen süreye yakın ('+sure+' ms)', sure >= 200 && sure < 2000);
  ok('sebep hata günlüğüne yazılıyor (sessiz kalmıyor)',
     iz.some(x => /askida:zaman asimi/.test(x)));
}

/* ---------- NORMAL YOL BOZULMAMALI ---------- */
{
  const {f} = kur();
  ok('normal çözülen iş değerini döndürüyor', await bekle(f(b=>b('deger'), 1000, 'dusus', 'x')) === 'deger');
  const t0=Date.now();
  await bekle(f(b=>b(1), 5000, null, 'y'));
  ok('normal yolda zaman aşımını beklemiyor', Date.now()-t0 < 200);
}

/* ---------- HATA ATAN İŞ ---------- */
{
  const {f, iz} = kur();
  ok('kurulum sırasında atılan hata düşüşe çevriliyor',
     await bekle(f(()=>{ throw new Error('patladi'); }, 300, 'DUSUS2', 'hata')) === 'DUSUS2');
  ok('atılan hata da günlüğe giriyor', iz.some(x => /hata:patladi/.test(x)));
}

/* ---------- ÇİFT ÇÖZÜLME ----------
   Zaman aşımı ateşledikten SONRA gerçek olay gelirse söz iki kez
   çözülmemeli; ilk sonuç kazanmalı. */
{
  const {f} = kur();
  ok('iki kez çözülmeye çalışılırsa ilki kazanıyor',
     await bekle(f(b=>{ b('ilk'); b('ikinci'); }, 300, 'd', 'cift')) === 'ilk');
}
{
  const {f} = kur();
  const r = await bekle(f(b=>{ setTimeout(()=>b('gec gelen'), 400); }, 150, 'ZAMANASIMI', 'gec'));
  await new Promise(r2=>setTimeout(r2,500));
  ok('zaman aşımından sonra gelen cevap sonucu değiştirmiyor', r === 'ZAMANASIMI');
}

/* ---------- IndexedDB YOLLARI KORUNUYOR MU ---------- */
const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');
for (const [ad, fn] of [['openDB','openDB'],['dbPut','dbPut'],['dbAll','dbAll']]) {
  const govde = cikar(kod, new RegExp('(?:async )?function '+fn+'\\([\\s\\S]*?\\n\\}'), fn);
  ok(ad+' zaman aşımıyla korunuyor', /sozZamanAsimi\(/.test(govde));
  /* SÜRE DE ÖLÇÜLMELİ: yalnız "korunuyor mu" diye bakınca 4000 yerine
     999999999 yazılması testten KAÇTI — koruma duruyor ama etkisiz.
     Sabitin varlığı değil, MAKUL olması sınanmalı. */
  const ms = +((govde.match(/\}\s*,\s*(\d+)\s*,/)||[])[1]);
  ok(ad+' zaman aşımı makul ('+ms+' ms)', ms >= 1000 && ms <= 30000);
}
ok('openDB başka sekme kilitlerse de takılmıyor (onblocked)',
   /r\.onblocked=/.test(kod));

/* ---------- SONUÇ EKRANI HER HÂLÜKÂRDA AÇILMALI ----------
   Arşivleme AYRI bir iş. Başarısız olması çekimi görmene engel olmamalı;
   çekim zaten lastBlob'da duruyor. */
const zincir = cikar(tel, /autoSaveTake\(\)\s*\n\s*\.catch[\s\S]*?showResult\(lastBlob\)\);/, 'onstop zinciri');
function zinciriKos(patla){
  const iz=[];
  new Function('__iz','__patla', `
    const lastBlob={};
    const autoSaveTake=async()=>{ if(__patla) throw new Error('depo dolu'); __iz.push('arsivlendi'); };
    const logErr=(w,e)=>__iz.push('hata:'+e.message);
    const toast=()=>__iz.push('uyari'); const m=k=>k; let curTakeId='x';
    const showResult=()=>__iz.push('SONUC');
    ${zincir}
  `)(iz, patla);
  return iz;
}
/* Zincir async: iz'e bakmadan ÖNCE çözülmesini beklemek gerekiyor.
   İlk yazımda beklemeden baktım ve "başarılı" durum yanlışlıkla kırıldı —
   kodun değil testin kusuruydu. */
{
  const a = zinciriKos(false);
  await new Promise(r=>setTimeout(r,30));
  ok('arşivleme başarılıyken sonuç ekranı açılıyor', a.includes('SONUC'));
  ok('arşivleme başarılıyken gereksiz uyarı çıkmıyor', !a.includes('uyari'));
}
{
  const b = zinciriKos(true);
  await new Promise(r=>setTimeout(r,30));
  ok('arşivleme PATLASA BİLE sonuç ekranı açılıyor', b.includes('SONUC'));
  ok('arşivleme hatası kullanıcıya söyleniyor', b.includes('uyari'));
  ok('arşivleme hatası günlüğe yazılıyor', b.some(x=>/^hata:/.test(x)));
}
})();
