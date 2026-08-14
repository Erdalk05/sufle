const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* F1 — IŞIK DENETÇİSİ 32x48 ÖRNEKLEMESİ KAYIT SIRASINDA PAHALI MI:
   DEĞİL (hipotez çürüdü). Ölçülen:

     · örnek boyu SABİT 32x48 = 1536 piksel — kamera 4K da olsa aynı,
       çünkü drawImage kareyi bu boyuta küçültüyor
     · piksel döngüsü 20.000 çağrıda ortalama ~4 mikrosaniye
     · KAYIT SIRASINDA aralık 20 saniye -> dakikada 3 örnek
       (10 dakikalık çekimde 30 örnekleme, toplam ~0,12 ms JS işi)
     · ayar sayfası açıkken aralık 1,5 saniye -> dakikada 40 örnek,
       ama o sırada kullanıcı çekim değil ayar yapıyor

   Yani kayıt sırasındaki maliyet ölçülebilir bir yük değil. Asıl maliyet
   kalemi JS değil `getImageData` geri okuması; onu ucuzlatan karar zaten
   verilmiş: bağlam `willReadFrequently:true` ile alınıyor. Bu testin işi
   BÜTÇEYİ KİLİTLEMEK — örnek boyu, aralık ya da o bayrak sessizce
   değişirse kapı kırmızıya dönsün.

   Aynı blok F9un sorusunu da cevaplıyor: uyarı çekim başına EN FAZLA BİR
   KEZ çıkıyor (`lightWarned`), duraklamada hiç çıkmıyor ve çekim bitince
   sayaç sıfırlanıyor. */

/* ---------- ÖRNEK BOYU SABİT ---------- */
const mSample=kod.match(/function sampleFrame\(\)\{[\s\S]*?\n\}/);
ok('sampleFrame çıkarılabildi', !!mSample);
if(!mSample) return;
const sf=mSample[0];

ok('tuval 32x48 kuruluyor', /lightCv\.width=32; lightCv\.height=48;/.test(sf));
ok('kare bu boyuta KÜÇÜLTÜLEREK çiziliyor (4K de olsa 1536 piksel)',
   /drawImage\(cam,0,0,32,48\)/.test(sf));
ok('okuma da yalnız bu alandan', /getImageData\(0,0,32,48\)/.test(sf));
/* Geri okuma maliyetini asıl belirleyen karar: bayrak düşerse her çağrı
   GPU senkronu olur ve maliyet ölçülemez şekilde artar. */
ok('bağlam willReadFrequently ile alınıyor',
   /getContext\('2d',\{willReadFrequently:true\}\)/.test(sf));
/* Tuval bir kez kurulup saklanıyor: her karede yeni tuval ayırmak asıl
   pahalı olan şey olurdu. */
ok('tuval yeniden kullanılıyor (her seferinde yeni tuval yok)',
   /if\(!lightCv\)\{ lightCv=document\.createElement\('canvas'\)/.test(sf));

/* ---------- GERÇEK DÖNGÜ: KAÇ PİKSEL, NE KADAR SÜRÜYOR ---------- */
const mGovde=sf.match(/let all=0[\s\S]*?return \{mean[^}]*\};/);
ok('piksel döngüsü çıkarılabildi', !!mGovde);
if(!mGovde) return;
const olc=new Function('d', mGovde[0]);

/* Sentetik kare sistemin KENDİ luma formülüyle doğrulanıyor:
   0.2126R+0.7152G+0.0722B — gri pikselde (R=G=B=v) sonuç tam v olmalı.
   Bu denklik sağlanmazsa aşağıdaki bütün sayılar anlamsız olurdu. */
function kare(merkez, kenar){
  const d=new Uint8ClampedArray(32*48*4);
  for(let y=0;y<48;y++) for(let x=0;x<32;x++){
    const i=(y*32+x)*4;
    const v=(x>=8&&x<24 && y>=8&&y<34) ? merkez : kenar;
    d[i]=v; d[i+1]=v; d[i+2]=v; d[i+3]=255;
  }
  return d;
}
{
  const r=olc(kare(84,84));
  ok('denklik: gri 84 karede ortalama da 84 (luma formülü tutuyor)', Math.abs(r.mean-84)<0.001);
  ok('denklik: merkez ve kenar ayrı ayrı doğru ölçülüyor',
     Math.abs(r.center-84)<0.001 && Math.abs(r.edge-84)<0.001);
  const r2=olc(kare(120,40));
  ok('merkez ile kenar gerçekten ayrışıyor', Math.abs(r2.center-120)<0.001 && Math.abs(r2.edge-40)<0.001);
}
{
  /* İşin SABİT olduğu buradan görünüyor: `n` her zaman 1536. */
  const say=new Function('d', mGovde[0].replace('return {mean','return {n, mean'));
  ok('her örnekte tam 1536 piksel geziliyor', say(kare(84,84)).n===32*48);
}
{
  /* Süre ölçümü makineye göre oynar; bu yüzden CÖMERT bir tavan konuyor.
     Tavanın işi "ölçülemez yük" iddiasını korumak: 1536 pikselin işi tek
     haneli mikrosaniyede bitiyor, 2 ms tavan 500 katı bir pay bırakıyor. */
  const d=kare(84,60);
  for(let i=0;i<2000;i++) olc(d);            // ısınma
  const KEZ=20000;
  const t0=process.hrtime.bigint();
  for(let i=0;i<KEZ;i++) olc(d);
  const us=Number(process.hrtime.bigint()-t0)/1000/KEZ;
  console.log('   ölçülen: '+us.toFixed(1)+' mikrosaniye/örnek');
  ok('bir örnekleme 2 milisaniyenin altında ('+us.toFixed(1)+' µs)', us<2000);
}

/* ---------- KAYIT SIRASINDAKİ ARALIK ---------- */
const mWatch=kod.match(/clearInterval\(lightWatch\);\s*\n\s*lightWatch=setInterval\(\(\)=>\{[\s\S]*?\},(\d+)\);/);
ok('kayıt nöbetçisi çıkarılabildi', !!mWatch);
if(!mWatch) return;
const aralik=+mWatch[1];
console.log('   kayıt sırasında aralık: '+aralik+' ms · dakikada '+(60000/aralik).toFixed(0)+' örnek');
ok('kayıt sırasında aralık 20 saniye', aralik===20000);
ok('dakikada en çok 3 örnek alınıyor', 60000/aralik<=3);
/* Panel aralığı ayrı: ayar sayfası açıkken hızlı, çekimde değil. */
const mPanel=kod.match(/lightIv=setInterval\(renderLight,(\d+)\);/);
ok('panel aralığı çıkarılabildi', !!mPanel);
ok('panel aralığı 1,5 saniye', mPanel && +mPanel[1]===1500);
ok('panel çekim aralığından en az 10 kat sık (ikisi ayrı bütçe)',
   mPanel && aralik/+mPanel[1]>=10);

/* ---------- NÖBETÇİ NE ZAMAN ÇALIŞMIYOR ---------- */
const govdeW=mWatch[0];
ok('kayıt yokken hiç ölçmüyor', /if\(!rec\|\|rec\.state!=='recording'\|\|recPaused\) return;/.test(govdeW));
ok('duraklamada da ölçmüyor', /recPaused\) return;/.test(govdeW));
ok('yalnız engel seviyesindeki bulgu uyarıya dönüyor', /filter\(o=>o\.lv==='bad'\)/.test(govdeW));
ok('çekim başına EN FAZLA bir uyarı (F9)', /if\(bad\.length && !lightWarned\)\{ lightWarned=true;/.test(govdeW));

{
  /* Nöbetçiyi gerçekten koştur: 10 dakikalık bir çekimde kaç kez uyarır? */
  const f=new Function('__d', `
    const iz=[];
    let lightWarned=false;
    let durum=__d.durum;
    const rec={ get state(){ return durum; } };
    let recPaused=__d.duraklat;
    const lightCheck=()=>__d.bulgu;
    const toast=t=>iz.push(t); const buzz=()=>{};
    const tik=()=>{ ${govdeW.match(/setInterval\(\(\)=>\{([\s\S]*?)\},\d+\);/)[1]} };
    for(let i=0;i<30;i++) tik();      // 10 dk / 20 sn = 30 tik
    return iz;
  `);
  const kotu=[{lv:'bad',t:'Yüzün karanlık'},{lv:'bad',t:'Arkadan ışık geliyor'}];
  const r=f({durum:'recording', duraklat:false, bulgu:kotu});
  ok('10 dakikalık çekimde 30 örnekleme yapılıyor ama uyarı 1 kez', r.length===1);
  ok('uyarı ilk engeli söylüyor', /Yüzün karanlık/.test(r[0]||''));
  ok('kayıt duraklıyken hiç uyarmıyor',
     f({durum:'recording', duraklat:true, bulgu:kotu}).length===0);
  ok('kayıt yokken hiç uyarmıyor',
     f({durum:'inactive', duraklat:false, bulgu:kotu}).length===0);
  ok('ışık iyiyken hiç uyarmıyor',
     f({durum:'recording', duraklat:false, bulgu:[{lv:'ok',t:'iyi'}]}).length===0);
}

/* ---------- ÇEKİM BİTİNCE BIRAKILIYOR MU ---------- */
const mStop=kod.match(/function stopRec\(\)\{[\s\S]*?\n\}/);
ok('stopRec çıkarılabildi', !!mStop);
ok('çekim bitince nöbetçi durduruluyor (sonsuza kadar örneklemesin)',
   mStop && /clearInterval\(lightWatch\); lightWatch=0; lightWarned=false;/.test(mStop[0]));
ok('uyarı sayacı da sıfırlanıyor (sonraki çekim yine uyarabilsin)',
   mStop && /lightWarned=false;/.test(mStop[0]));
ok('panel sayfa kapanınca durduruluyor',
   /function closeSheets\(\)\{[^}]*stopLight\(\);/.test(kod));
ok('panel yalnız kamera sekmesinde koşuyor',
   /if\(b\.dataset\.tab==='cam'\)\{ startMeter\(\); startLight\(\); \} else \{ stopMeter\(\); stopLight\(\); \}/.test(kod));
