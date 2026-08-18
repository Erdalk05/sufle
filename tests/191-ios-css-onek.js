const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), os=require('os'), {execFileSync}=require('child_process');
const REPO=path.join(__dirname,'..');
const {oku,telefonYolu,macYolu}=require('./kaynak.js');
const denetimPy=(()=>{ const a=process.env.SUFLE_DENETIM;
  if(a && !fs.existsSync(a)) throw new Error('yok: '+a); return a || path.join(REPO,'denetim.py'); })();

/* iOS ÖNEKSİZ CSS = SESSİZ ÖLÜ ÖZELLİK (2026-08-18, gerçek cihaz bulgusu).
   Erdal iPhone'da "cam/şeffaf değişiklik hiçbirinde yok" dedi. Ölçüldü:
   telefon kabuğunda 18 `backdrop-filter` kuralının yalnız 4'ünde `-webkit-`
   öneki vardı. iOS Safari öneksiz kuralı UYGULAMIYOR ve hata da vermiyor —
   yani v9.29'un cam ayar paneli onun telefonunda hiç cam olmadı.
   KAPININ KÖR NOKTASI: çizilmiş arayüz adımı Chrome'da koşuyor, Chrome
   öneksizi destekliyor, bu yüzden kapı yeşil kalıyordu. Cihaz farkını
   yalnız KAYNAK ölçümü yakalayabilir. */

const kos=(css)=>{
  const f=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'sufle-onek-')),'x.html');
  fs.writeFileSync(f,'<!doctype html><style>'+css+'</style><body><div id="a"></div><script>const I18N={tr:{},en:{}};const MSG={tr:{},en:{}};</script></body>');
  try{ execFileSync('python3',[denetimPy,f],{cwd:REPO,encoding:'utf8'}); return ''; }
  catch(e){ return String(e.stdout||'')+String(e.stderr||''); }
};

ok('öneksiz backdrop-filter YAKALANIYOR', /öneksiz CSS/.test(kos('.a{backdrop-filter:blur(8px)}')));
ok('önekli yazım temiz geçiyor', !/öneksiz CSS/.test(kos('.a{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}')));
ok('önek bir üst satırda olsa da kabul', !/öneksiz CSS/.test(kos('.a{\n-webkit-backdrop-filter:blur(8px);\nbackdrop-filter:blur(8px)}')));
ok('öneksiz mask-image YAKALANIYOR', /öneksiz CSS/.test(kos('.a{mask-image:linear-gradient(#000,#0000)}')));
ok('öneksiz user-select YAKALANIYOR', /öneksiz CSS/.test(kos('.a{user-select:none}')));
ok('rapor hangi özellik olduğunu yazıyor', /backdrop-filter/.test(kos('.a{backdrop-filter:blur(8px)}')));

/* Asıl korunan şey ÜRÜN: iki kabukta da öneksiz kural kalmamalı. */
for(const [ad,yol] of [['telefon',telefonYolu()],['Mac',macYolu()]]){
  const src=oku(yol);
  const satirlar=src.split('\n');
  const eksik=[];
  satirlar.forEach((s,i)=>{
    if(!/(?<![-\w])backdrop-filter\s*:/.test(s)) return;
    const komsu=satirlar.slice(Math.max(0,i-1),i+2).join(' ');
    if(!komsu.includes('-webkit-backdrop-filter')) eksik.push(i+1);
  });
  ok(ad+' kabuğunda öneksiz backdrop-filter yok (bulunan: '+eksik.join(',')+')', eksik.length===0);
  ok(ad+' kabuğunda cam yüzey gerçekten tanımlı', /backdrop-filter\s*:\s*blur/.test(src));
}
