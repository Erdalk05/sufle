const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const src=oku(telefonYolu());

// --- shader kaynağı tutarlı mı (GLSL derlenemeden önce yapısal kontrol) ---
const fsSrc=(src.match(/const FS_SRC=[\s\S]*?;\n/)||[''])[0];
ok('mask uniform tanımlı', /uniform float mask;/.test(fsSrc));
ok('mask kullanılıyor', /mask>0\.5/.test(fsSrc));
ok('mask erken dönüşü var', /return; \}'\+/.test(fsSrc));
const uniforms=[...fsSrc.matchAll(/uniform \w+ (\w+);/g)].map(m=>m[1]);
const setU=[...src.matchAll(/getUniformLocation\(comp\.pr,'(\w+)'\)/g)].map(m=>m[1]);
const unset=uniforms.filter(u=>!setU.includes(u) && u!=='tex' && u!=='bg');
ok('her uniform JS tarafından besleniyor', unset.length===0 || (console.log('  beslenmeyen:',unset),false));
const extra=[...new Set(setU)].filter(u=>!uniforms.includes(u));
ok('olmayan uniform ayarlanmıyor', extra.length===0 || (console.log('  fazladan:',extra),false));

// --- 7.5 arka plan "cover" matematiği: oran korunuyor mu ---
function cover(iw,ih,tw,th){ const sA=iw/ih,tA=tw/th; let cw=iw,ch=ih;
  if(sA>tA) cw=ih*tA; else ch=iw/tA; return {cw,ch,sx:(iw-cw)/2,sy:(ih-ch)/2}; }
let r=cover(4000,3000,1080,1920);         // yatay foto -> dikey hedef
ok('yatay foto dikey hedefte kırpılıyor', Math.abs(r.cw/r.ch-1080/1920)<0.001);
ok('kırpma ortalanmış', r.sx>0 && Math.abs(r.sx*2+r.cw-4000)<0.01);
r=cover(1080,1920,1080,1920);
ok('aynı oranda kırpma yok', Math.abs(r.cw-1080)<0.01 && Math.abs(r.ch-1920)<0.01);
r=cover(1000,4000,1080,1920);             // çok uzun dikey
ok('aşırı dikey de doğru', Math.abs(r.cw/r.ch-1080/1920)<0.001 && r.cw<=1000 && r.ch<=4000);

// --- 8.9 bit hızı tablosu ve boyut kestirimi ---
const st={};
eval(src.match(/function vBitrate\(\)\{[\s\S]*?\n\}/)[0]);
eval(src.match(/function mbPerMin\(\)\{[\s\S]*?\}/)[0]);
const set=(q,m)=>{ st.quality=q; st.bitrate=m; };
set('1080','mid'); const mid=vBitrate();
set('1080','low'); const low=vBitrate();
set('1080','high'); const high=vBitrate();
ok('düşük < dengeli < yüksek', low<mid && mid<high);
set('720','high'); const h720=vBitrate(); set('4k','low'); const l4k=vBitrate();
ok('4K düşük bile 720 yüksekten büyük', l4k>h720);
set('1080','mid'); ok('dakikalık boyut makul (~65 MB)', mbPerMin()>50 && mbPerMin()<90);
set('720','low');  ok('küçük dosya gerçekten küçük', mbPerMin()<25);
st.quality='bilinmeyen'; ok('bilinmeyen çözünürlükte çökmüyor', vBitrate()>0);

// --- 7.3 renk ölçümü: ortalama doğru mu ---
function avg(pixels){ let r=0,g=0,b=0; const px=pixels.length/4;
  for(let i=0;i<pixels.length;i+=4){ r+=pixels[i]; g+=pixels[i+1]; b+=pixels[i+2]; }
  return '#'+[r/px,g/px,b/px].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''); }
ok('düz yeşilden yeşil çıkıyor', avg([0,177,64,255, 0,177,64,255])==='#00b140');
ok('iki rengin ortalaması', avg([0,0,0,255, 255,255,255,255])==='#808080');
ok('tek haneli değerler sıfırla dolduruluyor', avg([1,2,3,255])==='#010203');

/* ---------- KOPYA BLOKLARIN GERÇEK KARŞILIĞI ----------
   ÖLÇÜLDÜ (2026-08-16): bu dosyadaki `cover()` ve `avg()` KOPYAYDI — kaynak
   değişse bu test yine yeşil kalırdı (aynı sınıf `tests/02`de yakalandı ve
   orada hata günlüğü tavanı sökülmesine rağmen test geçmişti).
   Aşağıdaki iki blok kuralı KAYNAKTAN çıkarıp koşturuyor. */
{
  const {blokKes}=require('./kaynak');
  const kod=src.replace(/\/\*[\s\S]*?\*\//g,'');

  /* ① ARKA PLAN "COVER" KIRPMASI — gerçek kod `bgYukle` içinde. */
  {
    const govde=(kod.match(/const sA=img\.width\/img\.height[\s\S]*?drawImage\(img,[^;]*;/)||[])[0];
    ok('gerçek cover matematiği çıkarılabildi', !!govde);
    if(govde){
      const kes=new Function('__img','__tw','__th', `
        const img=__img, tw=__tw, th=__th; const iz={};
        const x={ drawImage:(im,sx,sy,cw2,ch2)=>{ iz.sx=sx; iz.sy=sy; iz.cw=cw2; iz.ch=ch2; } };
        ${govde}
        return iz;
      `);
      const r1=kes({width:4000,height:3000},1080,1920);
      ok('gerçek: yatay foto dikey hedefte kırpılıyor',
         Math.abs(r1.cw/r1.ch-1080/1920)<0.001);
      ok('gerçek: kırpma ortalanmış', r1.sx>0 && Math.abs(r1.sx*2+r1.cw-4000)<0.01);
      const r2=kes({width:1080,height:1920},1080,1920);
      ok('gerçek: aynı oranda kırpma yok',
         Math.abs(r2.cw-1080)<0.01 && Math.abs(r2.ch-1920)<0.01);
      const r3=kes({width:1000,height:4000},1080,1920);
      ok('gerçek: aşırı dikey de doğru',
         Math.abs(r3.cw/r3.ch-1080/1920)<0.001 && r3.cw<=1000 && r3.ch<=4000);
      /* Kırpma KAYNAK görselin dışına taşmamalı: taşarsa tarayıcı siyah
         kenar çiziyor ve arka plan çerçeveli görünüyor. */
      ok('gerçek: kırpma kaynağın içinde kalıyor',
         r1.sx>=0 && r1.sy>=0 && r1.sx+r1.cw<=4000.01 && r1.sy+r1.ch<=3000.01);
    }
  }

  /* ② YEŞİL EKRAN RENGİNİ ÖRNEKLEME — gerçek kod artık ÇEKİRDEKTE
     (cekirdek/kroma.js), çünkü masaüstü de aynı ölçümü kullanıyor.
     Kabuktan çıkarmaya devam etseydik bu blok, iki platformun ortak
     hesabını değil yalnız telefonun kopyasını ölçerdi. */
  {
    const kroma=require('./kaynak').cekirdekOku('kroma.js','SUFLE_KROMA');
    const govde=(kroma.match(/const px=d\.length\/4;[\s\S]*?join\(''\);/)||[])[0];
    ok('gerçek renk ortalaması çıkarılabildi', !!govde);
    if(govde){
      const ort=new Function('__d', `const d=__d;\n${govde}\nreturn hex;`);
      ok('gerçek: düz yeşilden yeşil çıkıyor', ort([0,177,64,255, 0,177,64,255])==='#00b140');
      ok('gerçek: iki rengin ortalaması', ort([0,0,0,255, 255,255,255,255])==='#808080');
      /* TEK HANELİ DEĞER SIFIRLA DOLDURULMALI: '#123' gibi kısa bir dize CSS'te
         BAŞKA bir renk demek ve yeşil ekran eşiği yanlış yerden ölçerdi. */
      ok('gerçek: tek haneli değerler sıfırla dolduruluyor', ort([1,2,3,255])==='#010203');
      ok('gerçek: çıktı her zaman 7 karakter', ort([9,9,9,255]).length===7);
    }
  }
}
