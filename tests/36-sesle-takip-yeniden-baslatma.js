const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cikar}=require('./kaynak');
const tel=oku(telefonYolu());

/* SESLE TAKİP — SONSUZ YENİDEN BAŞLATMA
   SpeechRecognition kendiliğinden düşer, o yüzden v5.8'de otomatik yeniden
   başlatma eklendi: en fazla 5 deneme, artan gecikmeyle. Koruma DURUYORDU
   ama ÇALIŞMIYORDU.

   Sebep: sayaç `sr.start()` istisna atmadan dönünce sıfırlanıyordu. Oysa
   start()'ın başarılı dönmesi tanımanın çalıştığını göstermez — tanıyıcı
   hemen onend verirse her turda sayaç sıfırlanır, 5 sınırına HİÇ ulaşılmaz.
   Ölçüldü: 176 yeniden başlatma turundan sonra srFails hâlâ 0.

   Sonuç: 250 ms'de bir sonsuz döngü. Mikrofon açık kalır, pil tükenir,
   rozet "açık" görünür ama metin hiç takip etmez — kullanıcı sebebini
   göremez. Sessiz ölüm sınıfının en pahalı hâli.

   Düzeltme: sayaç yalnız GERÇEKTEN çalıştığında sıfırlanır — ya sonuç geldi
   (onresult) ya da oturum kayda değer süre yaşadı (uzun sessizlik arıza değil). */

/* İMZA DEĞİŞTİ (2026-08-15): `restartVoice` artık sağlıklı/arızalı ayrımını
   parametre olarak alıyor, çünkü iPhone tanımayı her sessizlikte kapatıyor ve
   eski mantık bunu arıza sayıp özelliği altıncı duraklamada kapatıyordu
   (bkz. tests/147). Desen parametreye kapalı yazıldığı için çıkarım çöküyordu —
   iddia değil ÇIKARIM güncellendi. */
const restart = cikar(tel, /function restartVoice\([^)]*\)\{[\s\S]*?\n\}/, 'restartVoice');

/* Gerçek restartVoice'u sahte zamanlayıcıyla koşturur.
   hemenOlur=true → tanıyıcı her başlatmada anında onend veriyor (arıza).
   yasaMs      → oturumun yaşadığı süre; SR_SAGLIKLI_MS üstü sağlıklı sayılmalı.
   NOT: saat start() içinde DEĞİL, start ile onend ARASINDA ilerlemeli — ilk
   yazımda içeride ilerletmiştim ve sağlıklı oturum hiç sağlıklı sayılmadı.
   Kodun değil simülasyonun kusuruydu. */
function kos({hemenOlur=true, sonucGeliyor=false, yasaMs=0, tavan=400}={}){
  const iz={tur:0, durdu:false, uyari:false};
  new Function('__iz','__hemen','__sonuc','__yasa','__tavan', `
    let voiceOn=true, sr={}, srFails=0, srRetryT=null, srBasladi=0;
    /* 2026-08-17: restartVoice artık kayıt sürerken iOSta tanımayı yeniden
       başlatmıyor (ses oturumunu yeniden kurmak çekimin GÖRÜNTÜSÜNÜ
       donduruyordu). Bu tezgâh kayıt YOKKEN davranışı ölçüyor; kayıt
       dalı ayrıca aşağıda sınanıyor. */
    let __kayitta=false;
    const sesleKayittaYasak=()=>__kayitta;
    let srKayittaSon=0; const rec=null; const logNot=()=>{};
    const recElapsed=()=>0;
    /* T54'te eklenen sessiz olum nobetcisi stopVoice icinde temizleniyor;
       bu tezgah yeniden BASLATMAYI siniyor, nobetciyi degil. */
    let sesGeldi=false, sessizNobet=null;
    const SR_SAGLIKLI_MS=3000;
    const SR_HIZLI_MS=150;   // sağlıklı bitişte hızlı dönüş (bkz. tests/147)
    let saat=0;
    const performance={ now:()=>saat };
    const clearTimeout=()=>{};
    const setTimeout=(f)=>{ f(); return 1; };
    const toast=()=>{ __iz.uyari=true; };
    const m=k=>k;
    const logErr=()=>{};
    const stopVoice=()=>{ voiceOn=false; __iz.durdu=true; };
    ${restart}
    /* Tanıyıcı taklidi: start() HATA ATMIYOR (gerçek arızada da atmıyor),
       ama oturum __yasa kadar yaşayıp bitiyor. */
    sr.start=()=>{};
    const onend=()=>{
      saat+=__yasa;                       // oturum start ile onend ARASINDA yaşar
      /* Gerçek onend ile aynı karar: sağlık ÜRETİME ya da kayda değer süreye
         bakar; sağlıklıysa sayaç sıfırlanır ve restartVoice bunu bilir.
         (Gerçek onend'in kendisi tests/147'de kaynaktan çıkarılıp koşuyor.) */
      const saglikli = __sonuc || (srBasladi && performance.now()-srBasladi >= SR_SAGLIKLI_MS);
      if(saglikli) srFails=0;
      if(voiceOn && __iz.tur<__tavan){ __iz.tur++; restartVoice(saglikli); }
    };
    restartVoice(false);
    while(voiceOn && __iz.tur<__tavan && __hemen) onend();
    __iz.srFails=srFails;
  `)(iz, hemenOlur, sonucGeliyor, yasaMs, tavan);
  return iz;
}

/* ---------- ASIL HATA: HEMEN ÖLEN TANIYICI ---------- */
{
  const r = kos({hemenOlur:true, yasaMs:0});
  ok('hemen ölen tanıyıcı sonsuza kadar denenmiyor', r.durdu === true);
  ok('deneme sayısı sınırlı kalıyor ('+r.tur+' tur)', r.tur < 20);
  ok('vazgeçince kullanıcıya söyleniyor', r.uyari === true);
}

/* ---------- SAĞLIKLI OTURUM SAYACI SIFIRLAMALI ----------
   Uzun sessizlikte de onend gelir; bu bir arıza değil. Oturum kayda değer
   süre yaşadıysa yeniden başlatma sonsuza kadar sürebilmeli. */
{
  const r = kos({hemenOlur:true, yasaMs:5000, tavan:60});
  ok('sağlıklı oturumdan sonra yeniden başlatma sürüyor (sessizlik arıza değil)',
     r.durdu === false && r.tur >= 60);
}

/* ---------- SONUÇ GELİYORSA DA SÜRMELİ ---------- */
{
  const r = kos({hemenOlur:true, sonucGeliyor:true, yasaMs:0, tavan:60});
  ok('tanıma sonuç üretiyorsa sayaç sıfırlanıyor', r.durdu === false && r.tur >= 60);
}

/* ---------- KAYNAK DÜZEYİ: ESKİ HATA GERİ GELMESİN ---------- */
const kod = tel.replace(/\/\*[\s\S]*?\*\//g,'');
ok('sayaç start() döndüğünde SIFIRLANMIYOR (eski hata)',
   !/sr\.start\(\);\s*srFails=0/.test(kod));
ok('sayaç sonuç gelince sıfırlanıyor',
   /sr\.onresult=e=>\{\s*\n?\s*srFails=0;/.test(kod));
ok('sağlıklı oturum eşiği tanımlı', /const SR_SAGLIKLI_MS=\d+;/.test(kod));
/* İDDİA AYNI, BİÇİM DEĞİL: "sağlıklı oturum sayacı düşürür". Eskiden bu tek
   satırdı ve desen o satıra kilitliydi; şimdi karar `saglikli` değişkeninde
   toplanıp hem sayaca hem yeniden başlatma hızına besleniyor. */
ok('onend sağlıklı oturumu sayaçtan düşüyor',
   /const saglikli = srSonuc \|\| \(srBasladi && performance\.now\(\)-srBasladi >= SR_SAGLIKLI_MS\);/.test(kod)
   && /if\(saglikli\) srFails=0;/.test(kod));
ok('sağlık ölçütü ARTIK ÜRETİME de bakıyor (iPhone duraklaması arıza değil)',
   /srSonuc \|\|/.test(kod));
ok('deneme sınırı hâlâ var', /\+\+srFails>5/.test(kod));
ok('artan gecikme hâlâ var', /250\*srFails/.test(kod));
ok('vazgeçince özellik gerçekten kapatılıyor',
   /toast\(m\('voiceDied'\)\); stopVoice\(\)/.test(kod));

/* İlk başlatmada da damga kurulmalı, yoksa ilk oturum hep "hemen ölmüş" sayılır. */
ok('ilk başlatmada oturum damgası kuruluyor',
   /sr\.start\(\); srBasladi=performance\.now\(\);/.test(kod));

/* ---------- KAPATMA: BEKLEYEN İŞ DE İPTAL EDİLMELİ ----------
   Kullanıcı sesle takibi kapatıp HEMEN tekrar açarsa, eski yeniden başlatma
   zamanlayıcısı yepyeni ve SAĞLIKLI oturumun üstünde ateşliyordu:
   sr.start() zaten çalışan tanıyıcıda InvalidStateError atıyor, istisna
   restartVoice'a düşüyor ve taze oturumun sayacını şişiriyor.
   ÖLÇÜLDÜ (düzeltmeden önce): tek kapat-aç turunda srFails 4'e çıktı —
   bir arıza daha ve özellik kendini kapatırdı, sebebi de görünmezdi. */
const stopSrc = cikar(tel, /function stopVoice\(\)\{[\s\S]*?vHud'\)\.classList\.add\('hidden'\); toast\(m\('voiceOff'\)\); \}/, 'stopVoice');

function kapatAcTuru(){
  const f = new Function(`
    let voiceOn=false, sr=null, srFails=0, srRetryT=null, srBasladi=0, vRaf=0, vBadge='', vHudT=0;
    let sesGeldi=false, sessizNobet=null;   // T54 nobetcisi stopVoice icinde temizleniyor
    const clearTimeout=()=>{};
    const SR_SAGLIKLI_MS=3000;
    const cancelAnimationFrame=()=>{};
    const $=()=>({classList:{remove(){},add(){}}});
    const toast=()=>{}; const m=k=>k; const logErr=()=>{}; const performance={now:()=>0};
    const sesleKayittaYasak=()=>false;   // bu tur kayıt YOKKEN koşuyor
    let srKayittaSon=0; const rec=null; const logNot=()=>{}; const recElapsed=()=>0;
    ${restart}
    ${stopSrc}
    function startVoice(){ sr={ start(){ if(this.c) throw new Error('InvalidStateError'); this.c=true; } };
      srFails=0; voiceOn=true; sr.start(); }
    startVoice();      // aç
    restartVoice();    // tanıyıcı düştü, yeniden başlatma zamanlandı
    stopVoice();       // KAPAT (zamanlayıcı hâlâ bekliyor olabilir)
    const kapaliDurum = { sr, srRetryT, voiceOn, srFails };
    startVoice();      // hemen tekrar AÇ — bu oturum sağlıklı
    return ()=>({ srFails, kapaliDurum });
  `);
  return f();
}
{
  const oku2 = kapatAcTuru();
  const r = oku2();
  ok('kapat-aç turundan sonra taze oturumun sayacı bozulmuyor', r.srFails === 0);
  ok('kapatınca tanıyıcı bırakılıyor (sr=null)', r.kapaliDurum.sr === null);
  ok('kapatınca bekleyen yeniden başlatma iptal ediliyor', r.kapaliDurum.srRetryT === null);
  ok('kapatınca sayaç sıfırlanıyor', r.kapaliDurum.srFails === 0);
}
const kodStop = stopSrc.replace(/\/\*[\s\S]*?\*\//g,'');
ok('stopVoice zamanlayıcıyı temizliyor', /clearTimeout\(srRetryT\)/.test(kodStop));
ok('stopVoice olay işleyicilerini de bırakıyor',
   /sr\.onresult=null/.test(kodStop) && /sr\.onerror=null/.test(kodStop));


/* ---------- KAYIT SÜRERKEN YENİDEN BAŞLATMA YOK (2026-08-17 akşamı) ----------
   Erdalın aylardır bildirdiği "iPhoneda çekilen video bir süre sonra donuyor"
   sorununun kök nedeni. v9.0 commitindeki ölçüm: 41 saniyelik çekimde görüntü
   19. saniyede donuyor, ses tam. 19 saniye 1080pde ~20 MB eder, yani o turun
   "bellek baskısı" hipotezi ölçüyle çürüyor.
   Gerçek zincir: iOSta ses oturumu TEKTİR · iPhone tanımayı her sessizlikte
   kapatır · uygulama yeniden başlatır · her başlatma ses oturumunu yeniden
   kurar · yakalama oturumu yeniden kurulunca GÖRÜNTÜ donar, ses akar.
   Yani donma "bir süre sonra" değil, İLK KONUŞMA ARASINDAN sonra.
   Bekleyen bir zamanlayıcı kaydın ortasında ateşlerse tam bunu yapardı;
   nöbetçi onu yakalayıp tanımayı KAPATIYOR, yeniden başlatmıyor. */
{
  const iz={baslatildi:0, durduruldu:false};
  const f=new Function('__iz',`
    let voiceOn=true, sr={}, srFails=0, srRetryT=null, srBasladi=0;
    let sesGeldi=false, sessizNobet=null;
    const SR_SAGLIKLI_MS=3000, SR_HIZLI_MS=150;
    const performance={now:()=>0};
    const clearTimeout=()=>{};
    const setTimeout=(fn)=>{ fn(); return 1; };
    const toast=()=>{}; const m=k=>k; const logErr=()=>{}; const logNot=()=>{};
    let srKayittaSon=0; const recElapsed=()=>5;
    const rec={state:'recording'};
    const sesleKayittaYasak=()=>true;          // iOS + ayar kapalı + kayıt sürüyor
    function stopVoice(){ voiceOn=false; __iz.durduruldu=true; }
    sr.start=()=>{ __iz.baslatildi++; };
    ${restart}
    restartVoice(true);
    return { voiceOn };
  `);
  const r=f(iz);
  ok('kayıt sürerken tanıma YENİDEN BAŞLATILMIYOR', iz.baslatildi===0);
  ok('bunun yerine sesle takip kapatılıyor', iz.durduruldu===true && r.voiceOn===false);
}
{
  /* Aynı yol, ayar AÇIKKEN: kullanıcı riski bilerek kabul ettiyse davranış
     eskisi gibi. Yasak koşulsuz olsaydı ayar ölü bir anahtar olurdu. */
  const iz={baslatildi:0, durduruldu:false};
  const f=new Function('__iz',`
    let voiceOn=true, sr={}, srFails=0, srRetryT=null, srBasladi=0;
    let sesGeldi=false, sessizNobet=null;
    const SR_SAGLIKLI_MS=3000, SR_HIZLI_MS=150;
    const performance={now:()=>0};
    const clearTimeout=()=>{};
    const setTimeout=(fn)=>{ fn(); return 1; };
    const toast=()=>{}; const m=k=>k; const logErr=()=>{}; const logNot=()=>{};
    let srKayittaSon=0; const recElapsed=()=>5;
    const rec={state:'recording'};
    const sesleKayittaYasak=()=>false;
    function stopVoice(){ voiceOn=false; __iz.durduruldu=true; }
    sr.start=()=>{ __iz.baslatildi++; };
    ${restart}
    restartVoice(true);
    return { srKayittaSon };
  `);
  const r=f(iz);
  ok('ayar açıkken yeniden başlatma sürüyor', iz.baslatildi===1 && !iz.durduruldu);
  /* Damga şart: donma olursa sonuç ekranı bunu sebeple ilişkilendirebilsin. */
  ok('kayıttaki yeniden başlatma damgalanıyor (teşhis için)', r.srKayittaSon===5);
}
