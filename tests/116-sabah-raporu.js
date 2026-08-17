const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const REPO=path.join(__dirname,'..');
/* Rapor ORTAM DEĞİŞKENİNE saygılı okunuyor (2026-08-17): kasıtlı bozma turu
   raporun geçici bir kopyasını bozup testi ona karşı koşturabilsin. Doğrudan
   depodan okuyan bir test, raporu bozan bozmayı HİÇ ölçmez ama geçti der —
   yani rapor kapısının kendisi kanıtsız kalır. */
const RAPOR=process.env.SUFLE_RAPOR||path.join(REPO,'SABAH_RAPORU.md');

/* M10 — SABAH RAPORU: ne yapıldı, ne çürüdü, ne bekliyor.
   Rapor gece boyunca her turda güncellendi. Ama bir raporun en tehlikeli
   hâli BAYAT olmasıdır: sayılar ilerler, rapor eski kalır ve Erdal yanlış
   bir tabloya bakarak karar verir. Bu gece tam bu oldu — açılış paragrafı
   "70 commit, 2952 test" derken gerçek 122 ve 3808ti; commit sayısını da
   elle sayıp yanlış dala atfetmiştim (`claude` yazıyordu, oysa `main`).

   Bu test raporun İDDİALARINI ölçülen gerçeğe karşı sınıyor. Sayı
   yazmayan bir rapor yazmak serbest; YANLIŞ sayı yazmak değil. */

ok('rapor dosyası var', fs.existsSync(RAPOR));
const r=require('./kaynak.js').repoOku('SABAH_RAPORU.md','SUFLE_RAPOR');

/* ---------- ZORUNLU BÖLÜMLER ---------- */
for(const b of ['Tek cümlede','Ne bozuktu','Çürüyen hipotezler','Kendi hatalarım','Sayılar'])
  ok('bölüm var: '+b, new RegExp('##.*'+b.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(r));
/* Yayın durumu BAŞLIKTA olmalı — ama başlığın metni yayından önce ve sonra
   farklı ("Senden istediğim tek şey" / "v9.5 YAYINLANDI"). İddia başlığın
   ADI değil, durumun göze çarpan bir başlıkta bildirilmesi. */
ok('yayın durumu bir başlıkta bildiriliyor',
   /##[^\n]*(istediğim tek şey|YAYINLANDI)/.test(r));
ok('kararlar bir başlıkta toplanmış',
   /##[^\n]*(karar bekleyenler|bıraktığın kararlar)/.test(r));

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
  /* Yayından SONRA sayı sıfıra iniyor ve rapor artık sayı değil DURUM
     yazıyor ("v9.5 canlıda"). Sayı varsa doğruluğu sınanır; yoksa
     yayın durumunun yazılı olması aranır. */
  const yazan=sayi(/\*\*(\d+) commit yayınlanmamış\*\*/);
  ok('rapor yayın durumunu bildiriyor',
     yazan!==null || /canlıda/.test(r));
  if(gercek!==null && yazan!==null && gercek>0){
    console.log('   commit: rapor '+yazan+' · gerçek '+gercek);
    /* TAM EŞİTLİK İMKÂNSIZ ve ilk yazışımda bunu göremedim: doğru sayıyı
       rapora yazıp commit edince sayı bir artıyor, yani iddia hiçbir zaman
       sağlanamıyor. Sayının işi Erdala ÖLÇEĞİ vermek; birkaç commitlik
       kayma kararı değiştirmez, on kat sapma değiştirir. */
    ok('rapordaki commit sayısı gerçekçi ('+yazan+' vs '+gercek+', pay ±3)',
       Math.abs(yazan-gercek)<=3);
  } else {
    /* İDDİA SAYISI YAYIN DURUMUNA GÖRE DEĞİŞMEMELİ — bu, aynı dosyada bir kez
       daha yaşandı (2026-08-16 sabahı, yayından hemen sonra): yayınlanmamış
       commit sıfıra inince bu iddia hiç koşmadı, sayı 27den 26ya düştü ve kapı
       DAVRANIŞ hiç bozulmadan kırmızı verdi. Sıfır durumunun da ölçülecek bir
       karşılığı var: yayınlanmamış iş yoksa rapor canlı sürümü söylemeli. */
    ok('yayınlanmamış iş yokken rapor canlı sürümü bildiriyor', /canlıda/i.test(r));
  }
  /* Dal adı da doğru olmalı — yanlış dal yanlış komut demek. */
  let dal=null;
  try{ dal=execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],
        {cwd:REPO,encoding:'utf8'}).trim(); }catch(_){}
  /* Dal adı yalnız "yayınlanmamış commit" satırı varken anlamlı; yayından
     sonra rapor sayı değil DURUM yazıyor ve dal adı orada gereksiz. */
  /* Aynı kural burada da: dal adı yalnız bir durumda iddia edilirse sayı
     oynar. Her durumda tek iddia — ya dal adı yazılı ya canlı sürüm. */
  if(dal)
    ok('raporda dal adı ya da yayın durumu yazılı ('+dal+')',
       r.includes('`'+dal+'` dalında') || /canlıda/i.test(r));
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
  /* İddia DURUMA DUYARLI olmalı. İlk yazışımda "hiçbir şey yayınlanmadı
     yazıyor" diye sabitlemiştim; yayın yapılınca o iddia YANLIŞ bir dünyayı
     savunur hâle geldi. Doğru iddia: rapor, gerçekte ne olduysa ONU söylesin.
     Ölçüt `.son-yayin` ile şu anki sürümün karşılaştırması. */
  const sy=path.join(REPO,'.son-yayin');
  /* Sürüm ORTAM DEĞİŞKENİNE saygılı okunuyor: doğrudan depodan okurken
     bozma turu bu iddiaya hiç ulaşamıyordu (2026-08-16 sabahı ölçüldü). */
  const ver=(require('./kaynak.js').oku(require('./kaynak.js').telefonYolu()).match(/VER='([\d.]+)'/)||[])[1];
  const icerik=fs.existsSync(sy)?fs.readFileSync(sy,'utf8').trim():'';
  const yayinlandi=!!ver && icerik.startsWith(ver+' ');
  console.log('   .son-yayin: "'+icerik+'" · şu anki sürüm: '+ver+
              ' · bekleyen yayın: '+(yayinlandi?'yok':'VAR'));
  ok('sürüm okunabildi', !!ver);
  /* İDDİA RAPORUN BAŞINA BAKAR (2026-08-17). Eskiden "dosyanın herhangi bir
     yerinde YAYINLANDI geçiyor mu" diye ölçülüyordu; rapor aylık bir günlük
     olduğu için o kelime onlarca eski turda da geçiyor ve iddia HİÇBİR ŞEYİ
     ayırt etmiyordu (kasıtlı bozma turunda kanıtlanamadı: üstteki durum
     cümlesini bozmak testi kırmıyordu). Erdal raporun BAŞINDAKİ duruma
     bakıp karar veriyor; ölçülmesi gereken de orası. */
  const bas=r.split('\n').slice(0,40).join('\n');
  if(yayinlandi){
    /* Yayınlanmış durumda da iddia sürüm adıyla: "YAYINLANDI" kelimesi eski
       turlarda da geçiyor, ayırt etmiyor. */
    const yayinli=new RegExp('v?'+ver.replace(/\./g,'\\.')+"[^\n]{0,90}(YAYINLANDI|canlıda)",'i');
    ok('yayın yapılmışsa rapor bunu BAŞTA sürüm adıyla söylüyor', yayinli.test(bas));
    ok('yayın canlıdan doğrulandığı yazıyor', /canlıdan doğruland|md5 birebir/i.test(bas));
  } else {
    /* İDDİA SÜRÜM ADIYLA (2026-08-17). "hazır/bekliyor" gibi bir kelimeyi
       raporun herhangi bir cümlesinde aramak ayırt etmiyordu: rapor uzun bir
       günlük, o kelimeler her turda geçiyor. Erdal'ın karar için ihtiyacı
       olan şey NET: hangi sürüm bekliyor. Bu yüzden bekleyen sürümün NUMARASI
       ile bekleme ifadesi AYNI cümlede aranıyor. */
    const bekleyen=new RegExp('v?'+ver.replace(/\./g,'\\.')+
      "[^\n]{0,90}(hazır|bekl|yayın kararı|yayınlanmadı|yayınlanmamış)",'i');
    ok('bekleyen yayın raporun başında SÜRÜM ADIYLA yazılı ('+ver+')', bekleyen.test(bas));
    /* İDDİA SAYISI DURUMA GÖRE DEĞİŞMEMELİ. Eskiden yayınlanmış durumda 2,
       bekleyen durumda 1 iddia koşuyordu; koşturucunun "sayı düşerse kırmızı"
       kuralı bu yüzden HER YAYIN TURUNDA boşuna kırmızı veriyordu (bu gece
       oldu). İki dal artık aynı sayıda iddia koşuyor ve bu ikincisi de gerçek
       bir şey ölçüyor: Erdal sabah HANGİ sürümün onay beklediğini görmeli. */
    ok('bekleyen sürümün numarası raporda yazıyor ('+ver+')',
       new RegExp('v?'+String(ver).replace(/\./g,'\\.')).test(r));
  }
  /* Hangi durumda olursa olsun: yayın kelimesi raporda geçmeli, sessiz
     kalmamalı — Erdalın ilk baktığı şey bu. */
  ok('rapor yayın konusuna değiniyor', /yayın/i.test(r));
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
