const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const REPO=path.join(__dirname,'..');
const RAPOR=path.join(REPO,'SABAH_RAPORU.md');

/* M10 — SABAH RAPORU: ne yapıldı, ne çürüdü, ne bekliyor.
   Rapor gece boyunca her turda güncellendi. Ama bir raporun en tehlikeli
   hâli BAYAT olmasıdır: sayılar ilerler, rapor eski kalır ve Erdal yanlış
   bir tabloya bakarak karar verir. Bu gece tam bu oldu — açılış paragrafı
   "70 commit, 2952 test" derken gerçek 122 ve 3808ti; commit sayısını da
   elle sayıp yanlış dala atfetmiştim (`claude` yazıyordu, oysa `main`).

   Bu test raporun İDDİALARINI ölçülen gerçeğe karşı sınıyor. Sayı
   yazmayan bir rapor yazmak serbest; YANLIŞ sayı yazmak değil. */

ok('rapor dosyası var', fs.existsSync(RAPOR));
const r=fs.readFileSync(RAPOR,'utf8');

/* ---------- ZORUNLU BÖLÜMLER ---------- */
for(const b of ['Tek cümlede','Senden istediğim tek şey','Ne bozuktu',
                'Çürüyen hipotezler','Kendi hatalarım','Sende karar bekleyenler','Sayılar'])
  ok('bölüm var: '+b, new RegExp('##.*'+b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(r));

/* ---------- SAYILAR GERÇEKLE UYUŞUYOR MU ---------- */
function sayi(re){ const m=r.match(re); return m?+m[1].replace(/\./g,''):null; }
{
  /* Test sayısı. Bütün paketi BURADAN koşturmak yanlıştı: test kendi
     içinden kos.js i çağırınca özyineli ve dakikalarca süren bir tur
     oluyor (denedim, 120 saniyeyi aştı). Sayıyı koşturucunun kendi
     tuttuğu tabandan al — orası zaten her turda güncelleniyor.
     Taban koşu SONUNDA yazıldığı için bir tur geriden gelebilir;
     bu yüzden tam eşitlik değil, DAR bir pay aranıyor. */
  const taban=JSON.parse(fs.readFileSync(path.join(REPO,'tests','beklenen.json'),'utf8'));
  const gercek=Object.values(taban).reduce((a,b)=>a+b,0);
  const yazan=sayi(/\*\*(\d+) test\*\* \(gece başında/);
  ok('raporda test sayısı yazıyor', yazan!==null);
  if(yazan!==null){
    console.log('   test: rapor '+yazan+' · taban toplamı '+gercek);
    ok('rapordaki test sayısı güncel (±%1: '+yazan+' vs '+gercek+')',
       Math.abs(yazan-gercek)<=Math.max(20, gercek*0.01));
  }
}
{
  /* Yayınlanmamış commit sayısı: Erdal buna bakıp yayın kararı verecek. */
  let gercek=null;
  try{ gercek=+execFileSync('git',['rev-list','--count','origin/main..HEAD'],
        {cwd:REPO,encoding:'utf8'}).trim(); }catch(_){}
  const yazan=sayi(/\*\*(\d+) commit yayınlanmamış\*\*/);
  ok('raporda yayınlanmamış commit sayısı yazıyor', yazan!==null);
  if(gercek!==null && yazan!==null){
    console.log('   commit: rapor '+yazan+' · gerçek '+gercek);
    /* TAM EŞİTLİK İMKÂNSIZ ve ilk yazışımda bunu göremedim: doğru sayıyı
       rapora yazıp commit edince sayı bir artıyor, yani iddia hiçbir zaman
       sağlanamıyor. Sayının işi Erdala ÖLÇEĞİ vermek; birkaç commitlik
       kayma kararı değiştirmez, on kat sapma değiştirir. */
    ok('rapordaki commit sayısı gerçekçi ('+yazan+' vs '+gercek+', pay ±3)',
       Math.abs(yazan-gercek)<=3);
  }
  /* Dal adı da doğru olmalı — yanlış dal yanlış komut demek. */
  let dal=null;
  try{ dal=execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],
        {cwd:REPO,encoding:'utf8'}).trim(); }catch(_){}
  if(dal) ok('raporda doğru dal adı yazıyor ('+dal+')', r.includes('`'+dal+'` dalında'));
}
{
  /* Kapı adım sayısı. */
  const sh=fs.readFileSync(path.join(REPO,'kapi.sh'),'utf8');
  const adim=[...sh.matchAll(/say "(\d+)\/(\d+) /g)].length;
  const yazan=sayi(/Kapı: (\d+) adım yeşil/);
  ok('raporda kapı adım sayısı yazıyor', yazan!==null);
  if(yazan!==null){
    console.log('   kapı adımı: rapor '+yazan+' · gerçek '+adim);
    ok('rapordaki kapı adım sayısı GÜNCEL ('+yazan+' vs '+adim+')', yazan===adim);
  }
}
{
  /* Yeni test dosyası aralığı: son dosyanın numarası tutmalı. */
  const dosyalar=fs.readdirSync(path.join(REPO,'tests'))
    .filter(f=>/^\d{2,}-.*\.js$/.test(f)).map(f=>parseInt(f,10));
  const enBuyuk=Math.max(...dosyalar);
  const m=r.match(/yeni test dosyası: 39–(\d+)/);
  ok('raporda test dosyası aralığı yazıyor', !!m);
  if(m){
    console.log('   son test dosyası: rapor '+m[1]+' · gerçek '+enBuyuk);
    ok('rapordaki dosya aralığı GÜNCEL ('+m[1]+' vs '+enBuyuk+')', +m[1]===enBuyuk);
  }
}

/* ---------- YAYIN DURUMU DOĞRU ANLATILIYOR MU ---------- */
{
  ok('hiçbir şeyin yayınlanmadığı yazıyor', /Hiçbir şey yayınlanmadı/.test(r));
  ok('yayın kararının Erdalda olduğu yazıyor', /yayın kararı sende/i.test(r));
  /* .son-yayin gerçekten el değmemiş olmalı — rapor bunu iddia ediyor. */
  const sy=path.join(REPO,'.son-yayin');
  if(fs.existsSync(sy)){
    const icerik=fs.readFileSync(sy,'utf8').trim();
    const ver=(fs.readFileSync(path.join(REPO,'index.html'),'utf8').match(/VER='([\d.]+)'/)||[])[1];
    console.log('   .son-yayin: "'+icerik+'" · şu anki sürüm: '+ver);
    ok('.son-yayin şu anki sürümden GERİDE (yani yayın yapılmamış)',
       ver && !icerik.startsWith(ver+' '));
    ok('rapor .son-yayine dokunulmadığını söylüyor', /son-yayin/.test(r));
  }
}

/* ---------- KARAR BEKLEYENLER GERÇEK Mİ ---------- */
{
  const plan=fs.readFileSync(path.join(REPO,'GECE_PLANI_20260813.md'),'utf8');
  const kilitli=[...plan.matchAll(/^\| (\w+) \|[^|]*\| 🔒 \|/gm)].map(m=>m[1]);
  console.log('   planda kilitli görev: '+(kilitli.join(', ')||'yok'));
  ok('planda kilitli görev var (Erdal kararı bekleyenler)', kilitli.length>0);
  /* Raporun karar listesi planla tutarlı olmalı: kilitli her görev
     raporda anılmalı, yoksa Erdal bir kararı hiç görmez. */
  const eksik=kilitli.filter(k=>!new RegExp('\\*\\*'+k+'\\*\\*').test(r));
  ok('kilitli görevlerin hepsi raporda anılıyor'+(eksik.length?' — eksik: '+eksik.join(', '):''),
     eksik.length===0);
}

/* ---------- RAPOR KENDİ SINIRINI SÖYLÜYOR MU ---------- */
ok('cihazda doğrulanmadığı belirtilen madde var (T7)', /T7/.test(r));
ok('çürüyen hipotezler ayrı bölümde', /## Çürüyen hipotezler/.test(r));
ok('kendi hataları saklanmamış', /## Kendi hatalarım/.test(r));
ok('rapor gece boyunca güncellendiğini söylüyor', /gece boyunca güncellendi/.test(r));
