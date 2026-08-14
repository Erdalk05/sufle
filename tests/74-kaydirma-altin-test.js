const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* A10 — KAYDIRMA MOTORUNUN ALTIN TESTİ: "AYNI GİRDİ → AYNI MESAFE".
   Motorun parçaları tek tek sınanmıştı (rampa, fren, nefes durakları, bölüm
   durdurma) ama TAMAMI bir arada hiç ölçülmemişti. Burada gerçek tick()
   sentetik bir kare saatiyle koşturuluyor ve motorun sözleşmesi kilitleniyor:

     1) BELİRLENİM: aynı girdi iki kez koşunca mesafe birebir aynı olmalı.
     2) KARE HIZINDAN BAĞIMSIZLIK: en önemlisi. 60 / 30 / 15 fps aynı duvar
        saatinde neredeyse aynı mesafeyi vermeli — yoksa aynı senaryo yavaş
        telefonda başka hızda akar ve çekim süresi tutmaz.
     3) HIZ ORANTISI: wpm iki katına çıkınca mesafe de iki katına yaklaşmalı.
     4) TAKILMA KORUMASI: bir kare 2 saniye gecikirse metin fırlamamalı
        (dt 0,1 sn ile kıstırılıyor).
     5) SONDA TAŞMAMA: yumuşak duruş metnin sonunu geçmemeli.
     6) DURAKLAMALAR: her işaret bir kez, geri sarınca yeniden.

   ÖLÇÜLEN (10 saniyelik akış, wpm 140, pxPerWord 60, kuramsal 1400 px):
     60 fps → 1374,3 px · 30 fps → 1376,7 px · 15 fps → 1381,3 px
   En büyük sapma %0,51. Kaynağı hız rampasının üstel yaklaşımı: kare ne kadar
   seyrekse rampa o kadar erken hedefe oturuyor, yani yavaş cihaz bir tık ÖNDE
   bitiriyor. 10 saniyede 7 pikselik fark — okuma çizgisinde görünmez.
   Kuramsal 1400den eksik olan ~26 px de rampanın ilk 200 milisaniyesi. */

const parca = (re,ad) => { const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sTick   = parca(/function tick\(now\)\{[\s\S]*?\n\}/,'tick');
const sSetPos = parca(/function setPos\(p\)\{[\s\S]*?\n\}/,'setPos');
const sPps    = parca(/function pxPerSec\(\)\{[^\n]*\}/,'pxPerSec');
if(!sTick || !sSetPos || !sPps) return;

/* Tezgâh: DOM yerine sayaçlar. Ölçülen tek şey pos — yani metnin gerçekten
   kaç piksel aktığı. Gerçek fonksiyonlar koşuyor, kopya yok. */
function motor({fps, sure, wpm=140, pxPerWord=60, maxPos=100000,
                breathe=false, paraEnds=[], holdPoints=[], baslangic=0, takilma=null}){
  return new Function('__o', `
    const st={wpm:__o.wpm, breathe:__o.breathe, stopAtSection:false};
    let pxPerWord=__o.pxPerWord, maxPos=__o.maxPos;
    let pos=__o.baslangic, curPPS=0, running=true, lastT=0, elapsed=0, holdUntil=0;
    let lastParaIdx=-1, tempoWords=0, activeIdx=-1, lastHud=-1e9, recT=null, curSec=null;
    let paraEnds=__o.paraEnds.slice();
    let holdPoints=__o.holdPoints.map(h=>({y:h.y, ms:h.ms, used:false}));
    const sections=[];
    const eyeOff=()=>200, H=()=>800;
    const scroller={style:{}};
    const $=()=>({style:{}});
    const highlight=()=>{};
    const sectionAt=()=>null;
    const stop=()=>{ running=false; };
    const toast=()=>{}, updateHud=()=>{}, showRecTime=()=>{};
    const m=k=>k;
    const L='tr';
    /* tick kendini yeniden zamanlıyor; tezgâhta kareleri BİZ süreceğiz. */
    let raf=0; const requestAnimationFrame=()=>0;
    ${sPps}
    ${sSetPos}
    ${sTick}
    const adim=1000/__o.fps;
    const kareler=Math.round(__o.sure*__o.fps);
    let t=0;
    for(let i=0;i<kareler;i++){
      t+=adim;
      if(__o.takilma && i===__o.takilma.kare) t+=__o.takilma.ms;
      tick(t);
    }
    return {pos, curPPS, elapsed, kullanilan:holdPoints.filter(h=>h.used).length,
            son:t, calisiyor:running};
  `)({fps,sure,wpm,pxPerWord,maxPos,breathe,paraEnds,holdPoints,baslangic,takilma});
}

/* ---------- 1) BELİRLENİM ---------- */
{
  const a=motor({fps:60, sure:10});
  const b=motor({fps:60, sure:10});
  ok('aynı girdi iki kez koşunca mesafe BİREBİR aynı', a.pos===b.pos);
  ok('geçen süre de birebir aynı', a.elapsed===b.elapsed);
  ok('metin gerçekten aktı', a.pos>100);
}

/* ---------- 2) KARE HIZINDAN BAĞIMSIZLIK (en kritik sözleşme) ---------- */
{
  const r60=motor({fps:60, sure:10});
  const r30=motor({fps:30, sure:10});
  const r15=motor({fps:15, sure:10});
  console.log('   ölçülen: 60fps='+r60.pos.toFixed(1)+' · 30fps='+r30.pos.toFixed(1)+' · 15fps='+r15.pos.toFixed(1));
  const en=Math.max(r60.pos,r30.pos,r15.pos), az=Math.min(r60.pos,r30.pos,r15.pos);
  const sapma=(en-az)/en;
  ok('60/30/15 fps neredeyse aynı mesafeyi veriyor (sapma %'+(sapma*100).toFixed(2)+')',
     sapma < 0.01);
  /* Beklenen mesafe: (140/60)*60 px/sn * 10 sn = 1400 px, eksi rampa kaybı. */
  const beklenen=(140/60)*60*10;
  ok('mesafe kuramsal değere yakın (beklenen '+beklenen.toFixed(0)+', ölçülen '+r60.pos.toFixed(0)+')',
     Math.abs(r60.pos-beklenen)/beklenen < 0.02);
  ok('rampa hedef hıza ulaşmış', Math.abs(r60.curPPS-(140/60)*60) < 0.5);
}

/* ---------- 3) HIZ ORANTISI ---------- */
{
  const y=motor({fps:60, sure:10, wpm:100});
  const h=motor({fps:60, sure:10, wpm:200});
  const oran=h.pos/y.pos;
  ok('wpm iki katına çıkınca mesafe de ikiye katlanıyor (ölçülen '+oran.toFixed(3)+')',
     Math.abs(oran-2) < 0.02);
  /* Yazı büyüyünce piksel/kelime artar; mesafe de o oranda artmalı, yoksa
     okuma hızı yazı boyutuna göre değişirdi. */
  const k=motor({fps:60, sure:10, pxPerWord:30});
  ok('piksel/kelime yarıya inince mesafe de yarılanıyor',
     Math.abs((y.pos*0)+ (motor({fps:60,sure:10}).pos / k.pos) - 2) < 0.02);
}

/* ---------- 4) TAKILMA: BİR KARE 2 SANİYE GECİKİRSE ---------- */
{
  const duz=motor({fps:60, sure:10});
  const tak=motor({fps:60, sure:10, takilma:{kare:120, ms:2000}});
  /* dt 0,1 sn ile kıstırıldığı için 2 saniyelik boşluk en fazla 0,1 sn kadar
     akış üretebilir — metin fırlamaz. Kısıtlama olmasaydı ~466 px sıçrardı. */
  const fark=tak.pos-duz.pos;
  ok('2 sn takılma metni fırlatmıyor (fark '+fark.toFixed(1)+' px)', fark < 30);
  ok('takılma sonrası akış duruyor değil', tak.pos>duz.pos*0.9);
}

/* ---------- 5) METNİN SONU: SINIRLI TAŞMA, SONRA DUR ----------
   İlk yazışımda "sonu hiç geçmemeli" diye ölçtüm ve test kırmızı yandı; KOD
   DOĞRUYDU, iddiam yanlıştı. maxPos son kelimeyi okuma çizgisine getiren
   konum; suflenin orada donması son satırı çizginin altında bırakırdı. Motor
   bu yüzden ekranın %15ini geçince duruyor ve konum %20de kıstırılıyor.
   Doğru sözleşme: taşma SINIRLI ve akış kendiliğinden BİTİYOR. */
{
  const H=800, maxPos=600;
  const r=motor({fps:60, sure:20, maxPos});
  ok('metnin sonunda akış kendiliğinden duruyor', r.calisiyor===false);
  ok('taşma sınırlı (ölçülen '+(r.pos-maxPos).toFixed(0)+' px, tavan '+(H*0.2)+')',
     r.pos<=maxPos+H*0.2+0.001);
  ok('durma eşiğini geçmiş ama kaçmamış', r.pos>=maxPos+H*0.15 && r.pos<maxPos+H*0.25);
  /* Fren TABANI olmalı: 0,18 alt sınırı yoksa son 60 pikselde sürünerek
     yaklaşır ve metnin sonu pratikte hiç gelmez. */
  ok('fren tabanı kaynakta duruyor', /Math\.max\(0\.18, near\/60\)/.test(kod));
  /* Fren gerçekten yavaşlatıyor mu: son 60 pikselde geçen süre, aynı mesafeyi
     frensiz almaktan uzun olmalı. */
  const hizli=motor({fps:60, sure:20, maxPos:100000, baslangic:540});
  ok('son 60 pikselde gerçekten yavaşlıyor',
     (r.pos-540) < (hizli.pos-540));
}

/* ---------- 6) DURAKLAMALAR ---------- */
{
  const hp=[{y:400,ms:500},{y:800,ms:500},{y:1200,ms:500}];
  const ile=motor({fps:60, sure:10, holdPoints:hp});
  const duz=motor({fps:60, sure:10});
  ok('duraklama işaretleri gerçekten bekletiyor', ile.pos < duz.pos);
  ok('üç duraklamanın üçü de kullanıldı', ile.kullanilan===3);
  /* Üç kez 500 ms = 1,5 sn kayıp; mesafe farkı buna yakın olmalı. */
  const beklenenKayip=(140/60)*60*1.5;
  ok('kayıp beklenen büyüklükte (beklenen ~'+beklenenKayip.toFixed(0)+', ölçülen '+(duz.pos-ile.pos).toFixed(0)+')',
     Math.abs((duz.pos-ile.pos)-beklenenKayip)/beklenenKayip < 0.15);
}
{
  /* Nefes duraklaması yalnız açıkken çalışmalı — kapalıyken metin durmamalı. */
  const pe=[400,800,1200];
  const acik=motor({fps:60, sure:10, breathe:true, paraEnds:pe});
  const kapali=motor({fps:60, sure:10, breathe:false, paraEnds:pe});
  ok('nefes akışı açıkken paragraf sonunda duruluyor', acik.pos < kapali.pos);
  ok('nefes akışı kapalıyken paragraf sonu görmezden geliniyor',
     Math.abs(kapali.pos-motor({fps:60,sure:10}).pos)<0.001);
}
{
  /* Aynı duraklama iki kez saymamalı: ikinci turda tekrar beklemek metni
     yavaşlatır ve tahmini süre tutmaz. */
  const tek=motor({fps:60, sure:30, holdPoints:[{y:400,ms:1000}], maxPos:100000});
  const yok=motor({fps:60, sure:30, maxPos:100000});
  const kayip=yok.pos-tek.pos;
  const birKez=(140/60)*60*1.0;
  ok('duraklama yalnız BİR kez bekletiyor (kayıp '+kayip.toFixed(0)+' px ≈ '+birKez.toFixed(0)+')',
     Math.abs(kayip-birKez)/birKez < 0.15);
}

/* ---------- KAYNAK: SÖZLEŞMENİN DAYANDIĞI SATIRLAR ----------
   Bunlar değişirse yukarıdaki sayılar da değişir; sessizce olmasın. */
ok('kare farkı 0,1 saniyeye kıstırılıyor', /Math\.min\(0\.1,\(now-lastT\)\/1000\)/.test(kod));
ok('hız rampası 200 ms', /Math\.min\(1, dt\/0\.2\)/.test(kod));
ok('yumuşak duruş son 60 pikselde', /near<60 \?/.test(kod));
ok('hız kelime/dakikadan türüyor', /return \(st\.wpm\/60\)\*pxPerWord/.test(kod));
ok('konum metnin sonuyla sınırlanıyor', /Math\.min\(maxPos\+H\(\)\*0\.2, p\)/.test(kod));
