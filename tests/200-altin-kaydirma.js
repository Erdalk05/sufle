const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,macMetni,blokKes,cekirdekOku}=require('./kaynak');

/* ALTIN KAYDIRMA — PÜRÜZ ÖLÇÜTÜ (2026-08-20).

   `EKSIKLER` listesinde "altın kaydırma pürüzleri" maddesi aylarca
   **ölçütü tanımsız** diye durdu. Tanımsız bir eksiği kapatmaya çalışmak,
   olmayan bir hatayı onarmaktır; bu yüzden önce ölçüt yazıldı:

     GÖZ, KONUMDAKİ DEĞİL HIZDAKİ ANİ DEĞİŞİMİ GÖRÜR.
     Sabit ayarda akış hızı kare kare sıçramamalı.

   Ölçüt yazılınca üç gerçek kusur çıktı ve üçü de bu dosyada ölçülüyor:
     ① Duraklama işaretleri ve nefes molası akışı TEK KAREDE durdurup TEK
        KAREDE geri başlatıyordu (iki sert basamak, her paragraf sonunda).
     ② Masaüstünde hız rampası hiç yoktu — canlı hız çubuğu sürüklendikçe
        metin zıplıyordu.
     ③ Masaüstünde metin sonundaki yumuşak duruş da yoktu.

   YÖNTEM: kaydırma motoru KAYNAKTAN çıkarılıp sahte saatle koşturuluyor.
   Başsız tarayıcıda requestAnimationFrame donuk olduğu için gerçek çekim
   ölçülemiyor; ama motorun kendisi saf bir zaman fonksiyonu — sahte saat
   onun eğrisini birebir verir. Simülasyon değil, GERÇEK KOD koşuyor. */

const AKIS=cekirdekOku('akis.js','SUFLE_AKIS');
const tel=oku(telefonYolu());
const mac=macMetni();

/* ---------- 0) EĞRİ TEK KAYNAKTAN GELİYOR ---------- */
for(const [ad,src] of [['telefon',tel],['Mac',mac]]){
  ok(ad+': akış çekirdeği kabuğa gömülü',
     /==CEKIRDEK:akis\.js==[\s\S]*duraklamaCarpani/.test(src));
  ok(ad+': duraklama zarfı kaydırmada kullanılıyor',
     /duraklamaCarpani\(/.test(src.replace(/==CEKIRDEK:akis\.js==[\s\S]*?==\/CEKIRDEK:akis\.js==/,'')));
  ok(ad+': hız rampası kaydırmada kullanılıyor',
     /hizRampasi\(/.test(src.replace(/==CEKIRDEK:akis\.js==[\s\S]*?==\/CEKIRDEK:akis\.js==/,'')));
  ok(ad+': yumuşak duruş kaydırmada kullanılıyor',
     /frenCarpani\(/.test(src.replace(/==CEKIRDEK:akis\.js==[\s\S]*?==\/CEKIRDEK:akis\.js==/,'')));
}

/* ---------- TEZGÂH: GERÇEK tick() SAHTE SAATLE ---------- */
const PPS=100;                       // px/sn — sabit hız
function telefonMotoru(o){
  const tick=blokKes(tel,'function tick(now){');
  const durakla=blokKes(tel,'function durakla(now,ms){');
  if(!tick||!durakla) return null;
  return new Function('AKIS','o', AKIS+`
    let running=true, raf=null, pos=0, activeIdx=-1, lastT=0, holdT0=-1e9, holdSure=0,
        lastParaIdx=-1, elapsed=0, lastHud=0, curPPS=0, tempoWords=0, curSec=0;
    const st=o.st, maxPos=o.maxPos, paraEnds=o.paraEnds, holdPoints=o.holdPoints, sections=[];
    const recT=null;
    function pxPerSec(){ return o.pps; }
    function eyeOff(){ return 0; }
    function H(){ return 800; }
    function setPos(p){ pos=p; }
    function stop(){ running=false; }
    function toast(){} function m(){ return ''; }
    function updateHud(){} function showRecTime(){}
    function requestAnimationFrame(){ return 0; }
    function t(){ return ''; }
    `+durakla+`
    `+tick+`
    return { adim(now){ tick(now); return pos; }, konum(){ return pos; } };`)(AKIS,o);
}
function macMotoru(o){
  const tick=blokKes(mac,'function tick(ts){');
  const durakla=blokKes(mac,'function durakla(ts,ms){');
  if(!tick||!durakla) return null;
  const kutu={style:{},textContent:'',classList:{contains:()=>false}};
  return new Function('AKIS','o','kutu', AKIS+`
    let running=true, raf=null, pos=0, lastTs=0, holdT0=-1e9, holdSure=0,
        elapsed=0, curPPS=0, startTime=0;
    const maxPos=o.maxPos, holdPoints=o.holdPoints, state={speed:0,_base:0};
    const scroller=kutu;
    function $(){ return kutu; }
    function pxPerSec(){ return o.pps; }
    function eyeOff(){ return 0; }
    function frameH(){ return 800; }
    function stop(){ running=false; }
    function toast(){} function m(){ return ''; }
    function fmtTime(){ return ''; }
    function showRecTime(){} function highlightAt(){}
    function requestAnimationFrame(){ return 0; }
    `+durakla+`
    `+tick+`
    return { adim(now){ tick(now); return pos; }, konum(){ return pos; } };`)(AKIS,o,kutu);
}

/* Sahte saat: kare süresi ms cinsinden verilir. */
function kostur(motor, kareler){
  const yol=[]; let t=0;
  for(const ms of kareler){ t+=ms; yol.push({t, pos:motor.adim(t)}); }
  return yol;
}
const sabitKare=(sn,ms=16.7)=>Array(Math.round(sn*1000/ms)).fill(ms);

const varsayilan=(ek)=>Object.assign({
  pps:PPS, maxPos:1e6, paraEnds:[], holdPoints:[],
  st:{breathe:false, stopAtSection:false}
}, ek||{});

/* ---------- 1) HIZDA BASAMAK YOK ---------- */
for(const [ad,yap] of [['telefon',telefonMotoru],['Mac',macMotoru]]){
  const o=varsayilan(ad==='telefon'
    ? {st:{breathe:true,stopAtSection:false}, paraEnds:[300]}
    : {holdPoints:[{y:300,ms:420,used:false}]});
  const mtr=yap(o);
  ok(ad+': kaydırma motoru kaynaktan çıkarılabildi', !!mtr);
  if(!mtr) continue;
  const yol=kostur(mtr, sabitKare(8));
  /* Kare başına hız (px/sn) ve ardışık kareler arasındaki DEĞİŞİM. */
  let enBuyukSicrama=0, duraklamaGorundu=false;
  for(let i=2;i<yol.length;i++){
    const v1=(yol[i-1].pos-yol[i-2].pos)/((yol[i-1].t-yol[i-2].t)/1000);
    const v2=(yol[i].pos-yol[i-1].pos)/((yol[i].t-yol[i-1].t)/1000);
    if(v2 < PPS*0.05) duraklamaGorundu=true;
    /* Rampanın ilk karesi hariç: hız 0'dan başlıyor ve ilk kare doğal
       olarak en büyük değişimi taşıyor — ölçülen şey SABİT ayarda
       sıçrama olmaması. */
    if(yol[i].t>800) enBuyukSicrama=Math.max(enBuyukSicrama, Math.abs(v2-v1));
  }
  ok(ad+': duraklama gerçekten oldu (ölçüm ölü değil)', duraklamaGorundu);
  /* EŞİK: tam hızın dörtte biri. Sert duruşta bu oran 1.0 olurdu
     (tek karede tam hızdan sıfıra); zarfla 160 ms'lik pencerede
     60 Hz'de kare başına en fazla ~%16. */
  ok(ad+': hızda kare-kare basamak yok (en büyük sıçrama %'+
     Math.round(enBuyukSicrama/PPS*100)+' ≤ %25)', enBuyukSicrama < PPS*0.25);
}

/* ---------- 2) DURAKLAMANIN ÖLÜ SÜRESİ KORUNUYOR ----------
   `cekirdek/tempo.js` süre tahminini duraklamaları TOPLAYARAK yapıyor.
   Zarf ölü süreyi kısaltsaydı tahmin ile gerçek çekim her işarette biraz
   daha ayrışırdı — telefonda ölçülüp düzeltilmiş bir kusurun geri gelmesi. */
for(const [ad,yap,ms] of [['telefon',telefonMotoru,420],['Mac',macMotoru,800]]){
  const duraklamali=yap(varsayilan(ad==='telefon'
    ? {st:{breathe:true,stopAtSection:false}, paraEnds:[300]}
    : {holdPoints:[{y:300,ms,used:false}]}));
  const duraksiz=yap(varsayilan());
  if(!duraklamali||!duraksiz) continue;
  const a=kostur(duraklamali, sabitKare(9)).pop().pos;
  const b=kostur(duraksiz,    sabitKare(9)).pop().pos;
  const oluSn=(b-a)/PPS;
  ok(ad+': duraklamanın ölü süresi korunuyor ('+Math.round(oluSn*1000)+
     ' ms ≈ '+ms+' ms)', Math.abs(oluSn*1000-ms) < ms*0.08);
}

/* ---------- 3) KARE HIZINDAN BAĞIMSIZ ----------
   Kare süresi dalgalandığında (gerçek cihazda her zaman dalgalanır)
   metin AYNI yerde olmalı. Kare başına sabit piksel ekleyen bir motor
   burada sapardı — Mac'te bir kez tam bu kusur yaşandı (120 Hz ProMotion). */
for(const [ad,yap] of [['telefon',telefonMotoru],['Mac',macMotoru]]){
  const duz=yap(varsayilan()), dalgali=yap(varsayilan());
  if(!duz||!dalgali) continue;
  const a=kostur(duz, sabitKare(6)).pop();
  /* 6 saniyeyi toplamı aynı ama süreleri 8–33 ms arasında değişen
     karelerle doldur (rastgelelik yok: yeniden koşan aynı sonucu alsın). */
  const kareler=[]; let toplam=0, i=0;
  while(toplam < a.t){ const ms=[8,33,12,25,16,20][i++%6]; kareler.push(ms); toplam+=ms; }
  const b=kostur(dalgali, kareler).pop();
  const sapma=Math.abs(b.pos-a.pos)/a.pos;
  ok(ad+': dalgalı kare hızında konum sapması %'+(sapma*100).toFixed(2)+' < %1',
     sapma<0.01);
}

/* ---------- 4) UZUN DONMADAN SONRA SIÇRAMA YOK ----------
   Sekme arka plandan dönünce iki kare arası saniyeler olabilir. Sınırsız
   bir motor metni ekran boyu ileri fırlatır ve kullanıcı yerini kaybeder. */
for(const [ad,yap] of [['telefon',telefonMotoru],['Mac',macMotoru]]){
  const mtr=yap(varsayilan());
  if(!mtr) continue;
  kostur(mtr, sabitKare(3));
  const once=mtr.konum();
  const sonra=mtr.adim(3000+2500);            // 2,5 saniyelik donma
  ok(ad+': 2,5 sn donmadan sonra tek karede sıçrama ≤ 0,1 sn ('+
     ((sonra-once)/PPS).toFixed(3)+' sn)', (sonra-once) <= PPS*0.1+0.01);
}

/* ---------- 5) HIZ RAMPASI: YUMUŞAK AMA GEÇ KALMIYOR ---------- */
{
  const R=new Function('AKIS', AKIS+'; return {hizRampasi,duraklamaCarpani,duraklamaSuresi,frenCarpani,AKIS_GECIS};')(AKIS);
  let v=0; for(let i=0;i<Math.round(0.6/0.0167);i++) v=R.hizRampasi(v,100,0.0167);
  ok('rampa 0,6 sn içinde hedefin %95ine ulaşıyor ('+v.toFixed(1)+')', v>95 && v<=100);
  /* Kare süresi ne olursa olsun AYNI zaman sabiti: tek 0,1 sn'lik kare ile
     altı adet 0,0167 sn'lik kare aynı yere varmalı. Eski doğrusal yaklaşım
     (dt/0.2) burada %50 ileri fırlıyordu. */
  let a=0; a=R.hizRampasi(a,100,0.1);
  let b=0; for(let i=0;i<6;i++) b=R.hizRampasi(b,100,0.1/6);
  ok('rampa kare süresinden bağımsız ('+a.toFixed(1)+' ≈ '+b.toFixed(1)+')',
     Math.abs(a-b)<1.5);
  /* Zarfın uçları TAM 1: duraklamadan sonra kalıcı bir yavaşlama kalmamalı. */
  const s=R.duraklamaSuresi(420);
  ok('zarf duraklamadan önce tam hız', R.duraklamaCarpani(-1,s)===1);
  ok('zarf duraklamadan sonra tam hız', R.duraklamaCarpani(s,s)===1);
  ok('zarf duraklamanın ortasında tam durgun', R.duraklamaCarpani(s/2,s)===0);
  /* Çok kısa duraklamada pencere süreye sığmaz; yine de basamak olmamalı. */
  const k=R.duraklamaSuresi(40);
  let enb=0, onceki=R.duraklamaCarpani(0,k);
  for(let g=1;g<=k;g++){ const c=R.duraklamaCarpani(g,k); enb=Math.max(enb,Math.abs(c-onceki)); onceki=c; }
  ok('40 ms duraklamada da zarf sürekli (ms başına en fazla '+enb.toFixed(3)+')', enb<0.2);
  /* GEÇİŞ EĞRİSİNİN KENDİSİ (yumusakAdim). Doğrusal bir geçiş kullansaydım
     basamak konumdan HIZA taşınırdı — pürüz yer değiştirir, kaybolmaz.
     Kilitlenen şey: uçlarda türev sıfır, ortada simetrik, hep artan. */
  const S=new Function('AKIS', AKIS+'; return yumusakAdim;')(AKIS);
  ok('eğri 0da 0, 1de 1', S(0)===0 && S(1)===1);
  ok('eğri ortada simetrik', Math.abs(S(0.5)-0.5)<1e-12);
  ok('eğri sınırların dışında kıstırılıyor', S(-5)===0 && S(5)===1);
  {
    let artan=true, oncekiD=null, ucTurev=0;
    for(let i=1;i<=100;i++){
      const a=S((i-1)/100), b=S(i/100);
      if(b<a) artan=false;
      if(i===1) ucTurev=Math.max(ucTurev,(b-a)*100);
      if(i===100) ucTurev=Math.max(ucTurev,(b-a)*100);
      oncekiD=b-a;
    }
    ok('eğri hep artıyor', artan);
    /* Uçlardaki eğim, doğrusal geçişin eğiminden (1,0) belirgin küçük olmalı:
       tam da bu yüzden hızda basamak kalmıyor. */
    ok('eğrinin uçlarında eğim yumuşak ('+ucTurev.toFixed(3)+' < 0,1)', ucTurev<0.1);
  }
  /* Fren: metin sonunda sıfıra inmiyor — inseydi son satır hiç gelmezdi. */
  ok('fren tam durdurmuyor', R.frenCarpani(0,60)===0.18);
  ok('fren uzakta etkisiz', R.frenCarpani(500,60)===1);
}
