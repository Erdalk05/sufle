const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const mac=oku(macYolu());

/* KOMPOZİT BAĞLAM KAYBI — KAYIT SÜRERKEN
   Kompozit (yeşil ekran / kırpma / gömülü altyazı) açıkken kayıt KAMERADAN
   DEĞİL TUVALDEN besleniyor: compRecStream() comp.cv.captureStream(30).

   WebGL bağlamı telefon belleği sıkışınca kaybolur. Bağlam kaybolunca çizim
   döngüsü duruyor ama tuvalin video izi "canlı" kalıyor — MediaRecorder
   donmuş kareyi yazmaya DEVAM ediyor. "Video izi öldü" gözcüsü de hiç
   ateşlenmiyor, çünkü iz ölmedi; sadece beslenmiyor.

   Eskiden yalnız "⚠️ Kompozit koptu — kompoziti kapatıp aç" deniyordu.
   Kullanıcı bunu bir GÖRÜNTÜ sorunu sanıp konuşmaya devam ediyor ve
   dakikalarca donmuş kare kaydediyordu; ancak çekimi izleyince anlıyordu.

   Artık kayıt sürerken bağlam koparsa çekim hemen bitiriliyor: o ana kadarki
   kısım sağlam ve arşive giriyor. */

const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');
const isleyici = cikar(kod, /cv\.addEventListener\('webglcontextlost',ev=>\{[\s\S]*?\n    \}\);/, 'contextlost');

function kos(kayitta){
  const iz=[];
  new Function('__iz','__k', `
    const rec = __k ? {state:'recording'} : null;
    const comp = {on:true, raf:7};
    const body = { classList:{ remove:(...a)=>__iz.push('sinif:'+a.join(',')) } };
    const cancelAnimationFrame=()=>__iz.push('rafIptal');
    const logErr=(w,e)=>__iz.push('log:'+e);
    const toast=m=>__iz.push('toast:'+m);
    const buzz=()=>__iz.push('titresim');
    const m=k=>k;
    const recElapsed=()=>12.3;
    const stopRec=()=>__iz.push('KAYIT DURDURULDU');
    const cv={ addEventListener:(t,f)=>{ __f=f; }, dataset:{} };
    let __f=null;
    ${isleyici}
    __f({ preventDefault(){ __iz.push('varsayilanEngellendi'); } });
    __iz.compOn = comp.on;
  `)(iz, kayitta);
  return iz;
}

/* ---------- KAYIT YOKKEN: eski davranış korunmalı ---------- */
{
  const iz = kos(false);
  ok('kayıt yokken kompozit kapatılıyor', iz.compOn === false);
  ok('kayıt yokken çizim döngüsü iptal ediliyor', iz.includes('rafIptal'));
  ok('kayıt yokken normal uyarı veriliyor', iz.some(x=>/toast:glLost$/.test(x)));
  ok('kayıt yokken kayıt durdurulmuyor', !iz.includes('KAYIT DURDURULDU'));
  ok('tarayıcının varsayılan davranışı engelleniyor (geri gelebilsin)',
     iz.includes('varsayilanEngellendi'));
}

/* ---------- ASIL DÜZELTME: KAYIT SÜRERKEN ---------- */
{
  const iz = kos(true);
  ok('kayıt sürerken çekim BİTİRİLİYOR (donmuş kare yazılmaya devam etmiyor)',
     iz.includes('KAYIT DURDURULDU'));
  ok('kayıt sürerken AYRI mesaj veriliyor (görüntü sorunu sanılmasın)',
     iz.some(x=>/toast:glLostRec/.test(x)));
  ok('kayıt sürerken normal mesaj verilmiyor', !iz.some(x=>/toast:glLost$/.test(x)));
  ok('titreşimle de uyarılıyor (ekrana bakmıyor olabilir)', iz.includes('titresim'));
  ok('kopma anı saniyesiyle günlüğe yazılıyor',
     iz.some(x=>/log:kayıt sırasında koptu @12\.3s/.test(x)));
  /* Durdurmadan ÖNCE kompozit kapatılmalı, yoksa stopRec ölü tuvalden
     okumaya çalışır. */
  ok('kompozit, kayıt durdurulmadan önce kapatılıyor',
     iz.indexOf('rafIptal') < iz.indexOf('KAYIT DURDURULDU'));
}

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('işleyici kayıt durumunu kontrol ediyor',
   /const kayitta = !!\(rec && rec\.state==='recording'\)/.test(isleyici));
ok('iki mesaj da iki dilde tanımlı',
   (tel.match(/glLostRec:'/g)||[]).length >= 2 && (tel.match(/glLost:'/g)||[]).length >= 2);
ok('kayıt mesajı çekimin arşivde olduğunu söylüyor',
   /glLostRec:'[^']*arşivde/.test(tel));

/* Bağlam geri gelince kompozit yeniden kurulmalı — bu koruma bozulmasın. */
ok('bağlam geri gelince kompozit yeniden kuruluyor',
   /webglcontextrestored[\s\S]{0,120}?startComp\(\)/.test(kod));

/* ---------- KAYIT KAYNAĞI GERÇEKTEN TUVAL Mİ ----------
   Bu düzeltmenin gerekçesi buna dayanıyor; kaynak değişirse gerekçe de değişir. */
const crs = cikar(kod, /function compRecStream\(\)\{[\s\S]*?\n\}/, 'compRecStream');
ok('kompozit kaydı tuvalden besleniyor (düzeltmenin dayanağı)',
   /captureStream\(30\)/.test(crs) && /comp\.cv/.test(crs));
ok('ses kameradan alınmaya devam ediyor', /stream\.getAudioTracks\(\)/.test(crs));

/* ---------- MAC PARİTESİ ----------
   Mac'te de kırpma boru hattı rAF ile dönüyor ve bağlam kaybı yakalanıyor. */
ok('Mac bağlam kaybını yakalıyor', /webglcontextlost/.test(mac));
