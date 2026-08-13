const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* KAYIT SÜRERKEN KOMPOZİT AÇIP KAPATMAK
   Kayıt kaynağı çekim BAŞLARKEN bir kez seçiliyor (doStartRec):
     kompozit açıksa TUVAL (compRecStream), değilse HAM KAMERA.
   Çekim sürerken anahtar iki yönde de bozuyordu:

   · KAPATMAK — stopComp(), MediaRecorder'ın beslendiği tuval izini durduruyor.
     Çekimin görüntüsü o saniyede ölüyor.
   · AÇMAK — kayda hiç yansımıyor (kaynak zaten seçildi) ama ÖNİZLEME yeşil
     ekranı gösteriyor. Kullanıcı arka planın değiştiğini sanarak bütün çekimi
     tamamlıyor, oysa kayıtta ham arka plan var. Bu yön HİÇBİR UYARI vermiyordu
     — F4'teki "ayar değişti ama uygulanmadı" sınıfının aynısı.

   Kompozit ZATEN açıkken kırpma/gömülü altyazı değiştirmek kayda anında
   yansıyor ve doğru çalışıyor; orada engel yok — çalışan bir yeteneği
   gereksiz yere kapatmıyoruz. */

const sw=cikar(kod,/\$\$\('\.sw'\)\.forEach\(s=>s\.onclick=async\(\)=>\{[\s\S]*?\n\}\);/,'anahtar işleyicisi');

function tikla(anahtar,{kayitta=true, kompozitAcik=false}={}){
  const iz=[];
  /* Yalnız kapı bölümünü koştur: gerisi DOM'a bağlı. */
  const parca=cikar(sw,/const k=s\.dataset\.t;[\s\S]*?st\[k\]=!st\[k\];/,'kapı bölümü');
  const f=new Function('__iz','__k','__kayitta','__comp', `
    const s={dataset:{t:__k}};
    const rec = __kayitta ? {state:'recording'} : null;
    const comp = {on:__comp};
    const st={}; st[__k]=false;
    const apply=()=>{}, save=()=>{};
    const toast=x=>__iz.push('toast:'+x);
    const m=x=>x;
    const kameraDegisebilir=()=>{ if(rec&&rec.state==='recording'){ __iz.push('toast:camBusyRec'); return false; } return true; };
    ${parca.replace(/st\[k\]=!st\[k\];$/, '__iz.push("DEGISTI");')}
  `);
  f(iz,anahtar,kayitta,kompozitAcik);
  return iz;
}
const degisti=iz=>iz.includes('DEGISTI');

/* ---------- KOMPOZİT ANAHTARI ---------- */
{
  const iz=tikla('comp',{kayitta:true});
  ok('kayıt sürerken kompozit DEĞİŞMİYOR', !degisti(iz));
  ok('kayıt sürerken sebebi söyleniyor', iz.some(x=>/compBusyRec/.test(x)));
}
{
  const iz=tikla('comp',{kayitta:false});
  ok('kayıt yokken kompozit normal değişiyor', degisti(iz));
  ok('kayıt yokken gereksiz uyarı yok', !iz.some(x=>/BusyRec/.test(x)));
}
/* Kompozit AÇIKKEN kapatmak da, KAPALIYKEN açmak da engellenmeli — iki yön de
   bozuyordu ve biri hiç uyarı vermiyordu. */
{
  ok('kompozit açıkken de kapatılamıyor', !degisti(tikla('comp',{kayitta:true, kompozitAcik:true})));
  ok('kompozit kapalıyken de açılamıyor', !degisti(tikla('comp',{kayitta:true, kompozitAcik:false})));
}

/* ---------- KOMPOZİT GEREKTİREN ANAHTARLAR ---------- */
for(const k of ['burnCaps','chroma']){
  ok(k+': kompozit KAPALIYKEN kayıt sürerken engelleniyor (sessizce kompozit başlatırdı)',
     !degisti(tikla(k,{kayitta:true, kompozitAcik:false})));
  /* Kompozit zaten açıksa değişiklik kayda anında yansıyor — çalışıyor, engelleme. */
  ok(k+': kompozit AÇIKKEN kayıt sürerken serbest (kayda yansıyor)',
     degisti(tikla(k,{kayitta:true, kompozitAcik:true})));
  ok(k+': kayıt yokken serbest', degisti(tikla(k,{kayitta:false})));
}

/* ---------- İLGİSİZ ANAHTARLAR ETKİLENMEDİ ---------- */
for(const k of ['bionic','wake','hicon'])
  ok(k+': kayıt sürerken serbest (kayıt boru hattıyla ilgisi yok)',
     degisti(tikla(k,{kayitta:true})));
/* Kamera anahtarları kendi kapısını kullanmaya devam ediyor (tests/53). */
for(const k of ['backCam','rawAudio','safeAudio']){
  const iz=tikla(k,{kayitta:true});
  ok(k+': kayıt sürerken hâlâ engelleniyor', !degisti(iz));
  ok(k+': kamera kapısının mesajını veriyor', iz.some(x=>/camBusyRec/.test(x)));
}

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('kompozit kapısı durum değişmeden ÖNCE',
   sw.indexOf("k==='comp' && rec") < sw.indexOf('st[k]=!st[k]'));
ok('mesaj iki dilde tanımlı', (tel.match(/compBusyRec:'/g)||[]).length >= 2);
ok('mesaj sebebi açıklıyor (kaynak çekim başında belirleniyor)',
   /compBusyRec:'[^']*çekim başında belirleniyor/.test(tel));

/* ---------- GEREKÇE HÂLÂ GEÇERLİ Mİ ----------
   Bu kapının dayanağı: kaynak çekim başlarken BİR KEZ seçiliyor. Kaynak seçimi
   dinamikleşirse kapının gerekçesi de değişir. */
const ds=cikar(kod,/function doStartRec\(\)\{[\s\S]*?\n\}/,'doStartRec');
ok('kayıt kaynağı çekim başında bir kez seçiliyor',
   /if\(st\.comp && comp\.on\)\{[\s\S]{0,160}?compRecStream\(\)/.test(ds));
ok('kompozit kurulamazsa ham akışa dönülüyor (bu davranış korunuyor)',
   /else toast\(m\('compFallback'\)\)/.test(ds));
