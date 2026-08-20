const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku,cekirdekOku}=require('./kaynak');
/* Kaydırma eğrisi cekirdek/akis.jse taşındı (2026-08-20): tezgâh onu da
   yüklemezse çıkarılan tick tanımsız fonksiyon çağırır. */
const AKIS=cekirdekOku('akis.js','SUFLE_AKIS');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* H8 — KAYIT SÜRESİ DURAKLATMALARDA BİRİKİMLİ DOĞRU MU: DOĞRU (hipotez çürüdü).
   Gerçek `recElapsed` bir sahte saatle koşturuldu:
     10 sn kayıt → 10,0 · 5 sn duraklama → 10,0 (donuyor) · 10 sn daha → 20,0
     3 sn durak + 5 sn → 25,0 · duraklamışken durdur → 25,0
   Çoklu duraklama birikiyor, duraklamışken sayaç donuyor, duraklamışken
   durdurmak açık duraklamayı kapatıyor. Hepsi kilitlendi.

   AMA AYNI YERDE GERÇEK BİR KUSUR ÇIKTI — İKİ DÖNGÜ AYNI `pos`u SÜRÜYOR.
   Kodun kendi ilkesi net: `startVoice` zamanlı akışı durduruyor ve sesli
   "başla" komutu `if(voiceOn){...} else if(!running) start()` diye ayırıyor.
   Ama KAYIT BAŞLATMA koşulsuz `start()` çağırıyordu; duraklamadan dönüş de.
   Yani sesle takiple çekim yapan kişide `tick` ve `easeLoop` aynı anda koşuyor.

   ÖLÇÜLEN (konuşan sustu, hedef 600 px sabit, 10 sn, 60 fps):
     yalnız sesle takip      → 599,4 px (hedefte duruyor)
     zamanlı akış da açıkken → 629,6 px
   Kalıcı kayma, hızla büyüyor: wpm 100 → 22 px · 140 → 30 px (yarım kelime)
   200 → 43 px · 300 → 64 px (bir kelimeden fazla). Denge noktası: zamanlı
   akışın ittiği ile sesli takibin geri çektiği eşitleniyor.
   Dahası `tick` bu sırada bölüm-durdurmayı ve nefes duraklarını da işletiyor —
   sesle takip ederken çekim kendiliğinden durabiliyordu.
   Ayrıca duraklat-devam et, HİÇ AÇILMAMIŞ zamanlı akışı açıyordu (elle okuyan
   ya da sesle takip eden kullanıcı için de). */

const parca=(re,ad)=>{ const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sEl   = parca(/function recElapsed\(\)\{[\s\S]*?\n  return \(performance\.now\(\)-recT-recPausedMs-extra\)\/1000; \}/,'recElapsed');
const sTick = parca(/function tick\(now\)\{[\s\S]*?\n\}/,'tick');
const sEase = parca(/function easeLoop\(ts\)\{[\s\S]*?\n\}/,'easeLoop');
const sPos  = parca(/function setPos\(p\)\{[\s\S]*?\n\}/,'setPos');
const sPps  = parca(/function pxPerSec\(\)\{[^\n]*\}/,'pxPerSec');
const sDur  = parca(/function durakla\(now,ms\)\{[^\n]*\}/,'durakla');
if(!sEl || !sTick || !sEase || !sPos || !sPps || !sDur) return;

/* ---------- H8: SÜRE ARİTMETİĞİ ----------
   DUR: muhasebe satırlarını KOPYALAMA, kaynaktan ÇIKAR. İlk yazışımda
   durakla/devam/durdur adımlarını elle yazmıştım; kasıtlı bozma turunda
   "duraklama birikmiyor" ve "durdurmada açık duraklama kapanmıyor"
   bozmalarının ikisi de YAKALANMADI, çünkü tezgâh ürünün değil kendi
   kopyasının davranışını ölçüyordu. Şimdi üç satırın üçü de kaynaktan
   çıkarılıyor; biri silinirse test bunu görür. */
const sBasla  = parca(/recT=performance\.now\(\); recPausedMs=0; recPaused=false;/,'kayıt başlangıcı');
const sDurakla= parca(/recPaused=true; pauseStart=performance\.now\(\);/,'duraklatma');
const sDevam  = parca(/recPausedMs\+=performance\.now\(\)-pauseStart; recPaused=false;\n    body\.classList\.remove\('recpaused'\);/,'devam etme');
/* I6da araya altyazı anlık görüntüsü satırı girdi. İlk düzeltmemde deseni
   genişlettim ve ARADAKİ satırı da yutup tezgâhı kırdım (`words` tanımsız).
   Doğrusu: iki ifadeyi AYRI çıkarıp aradakini hiç almamak. Korunan iddia
   ikisinin varlığı ve sırası; aralarında ne olduğu bu testin konusu değil. */
const sDurKapat = parca(/if\(recPaused\)\{ recPausedMs\+=performance\.now\(\)-pauseStart; recPaused=false; \}/,'durdurmada duraklama kapatma');
const sDurOlc   = parca(/pendingDur=recElapsed\(\);            \/\/ <-- recT/,'durdurmada süre ölçümü');
const sDurdur   = (sDurKapat && sDurOlc) ? sDurKapat+'\n  pendingDur=recElapsed();' : null;
if(sDurKapat && sDurOlc) ok('duraklama kapatma süre ölçümünden ÖNCE',
   kod.indexOf(sDurKapat) < kod.indexOf('pendingDur=recElapsed();            // <-- recT'));
if(!sBasla || !sDurakla || !sDevam || !sDurdur) return;

function saatKur(saat){
  return new Function('__s', `
    let recT=0,recPausedMs=0,pauseStart=0,recPaused=false,pendingDur=0;
    const performance={now:()=>__s.t};
    const body={classList:{remove:()=>{},add:()=>{}}};
    ${sEl}
    return {
      el:recElapsed,
      basla:()=>{ ${sBasla} },
      durakla:()=>{ ${sDurakla} },
      devam:()=>{ ${sDevam} },
      dur:()=>{ ${sDurdur} return pendingDur; },
      get durdu(){ return recPaused; }
    };
  `)(saat);
}
{
  const s={t:1000}, r=saatKur(s);
  ok('kayıt başlamadan süre sıfır', r.el()===0);
  r.basla(); s.t+=10000;
  ok('10 sn kayıt = 10,0 sn', Math.abs(r.el()-10)<0.001);
  r.durakla(); s.t+=5000;
  ok('duraklamışken sayaç DONUYOR', Math.abs(r.el()-10)<0.001);
  r.devam(); s.t+=10000;
  ok('devam edince birikiyor (20,0)', Math.abs(r.el()-20)<0.001);
  r.durakla(); s.t+=3000; r.devam(); s.t+=5000;
  ok('İKİNCİ duraklama da düşülüyor (25,0)', Math.abs(r.el()-25)<0.001);
  r.durakla(); s.t+=7000;
  ok('duraklamışken DURDURMAK açık duraklamayı kapatıyor (25,0)', Math.abs(r.dur()-25)<0.001);
  ok('durdurma sonrası duraklama bayrağı temiz', r.durdu===false);
}
{
  /* Hiç duraklamayan çekim: kayıp yok.
     Saat 0dan başlatılmaz: `if(!recT) return 0` kaydın başlamadığını böyle
     anlıyor, yani recT tam 0 olursa sayaç hiç ilerlemez. Tarayıcıda
     performance.now() o anda hiç 0 olmadığı için ürün etkilenmiyor; ama
     tezgâhı 0dan kurunca kendi testim yanlış kırmızı verdi. */
  const s={t:5000}, r=saatKur(s);
  r.basla(); s.t+=63000;
  ok('duraklamasız 63 sn tam ölçülüyor', Math.abs(r.el()-63)<0.001);
}
{
  /* Arka arkaya on kısa duraklama: yuvarlama birikmemeli. */
  const s={t:5000}, r=saatKur(s);
  r.basla();
  for(let i=0;i<10;i++){ s.t+=1000; r.durakla(); s.t+=500; r.devam(); }
  ok('on kısa duraklamada sapma yok (10,0)', Math.abs(r.el()-10)<0.001);
}

/* ---------- ASIL BULGU: İKİ DÖNGÜ ÇAKIŞMASI ---------- */
function akis({wpm, zamanliAcik, voiceOn=true, kare=600}){
  return new Function('__w','__on','__v','__k', AKIS+`
    const st={wpm:__w,breathe:false,stopAtSection:false};
    let pxPerWord=60,maxPos=100000,pos=0,curPPS=0,running=__on,lastT=0,elapsed=0,holdT0=-1e9,holdSure=0;
    let lastParaIdx=-1,tempoWords=0,activeIdx=-1,lastHud=-1e9,recT=null,curSec=null;
    let paraEnds=[],holdPoints=[],sections=[];
    let voiceOn=__v,voicePaused=false,vTarget=600,vLast=0,vRaf=0;
    const VOICE_MAX_PXS=1100;
    const eyeOff=()=>200,H=()=>800;
    const scroller={style:{}}; const $=()=>({style:{}});
    const highlight=()=>{},sectionAt=()=>null,stop=()=>{running=false};
    const toast=()=>{},updateHud=()=>{},showRecTime=()=>{},m=x=>x;
    let raf=0; const requestAnimationFrame=()=>0;
    ${sPps}
    ${sDur}
    ${sPos}
    ${sTick}
    ${sEase}
    let t=0;
    for(let i=0;i<__k;i++){ t+=1000/60; if(running) tick(t); if(voiceOn) easeLoop(t); }
    return pos;
  `)(wpm, zamanliAcik, voiceOn, kare);
}
{
  const yalniz=akis({wpm:140, zamanliAcik:false});
  ok('yalnız sesle takip hedefte duruyor (599 px)', Math.abs(yalniz-600)<2);
  const ikisi=akis({wpm:140, zamanliAcik:true});
  ok('iki döngü açıkken metin hedefin ÖNÜNE geçiyor (kusurun kanıtı)', ikisi-yalniz>20);
  /* Kayma hızla büyüyor: kullanıcının okuma çizgisi konuştuğunun önünde kalır. */
  const yuksek=akis({wpm:300, zamanliAcik:true})-akis({wpm:300, zamanliAcik:false});
  ok('kayma hızla büyüyor (wpm 300te bir kelimeden fazla, ölçülen '+(yuksek/60).toFixed(2)+')',
     yuksek/60 > 1);
}

/* ---------- DÜZELTME: ZAMANLI AKIŞ SESLE TAKİPTE BAŞLAMIYOR ---------- */
/* Asıl gövde `doStartRec` içinde; `startRec` yalnız geri sayım sarmalayıcısı.
   İlk yazışımda startRecı çıkardım ve iddia boşa düştü. */
const mStartRec=kod.match(/function doStartRec\([\s\S]*?\n\}/);
ok('doStartRec çıkarılabildi', !!mStartRec);
const mPause=kod.match(/function togglePauseRec\(\)\{[\s\S]*?\n\}/);
ok('togglePauseRec çıkarılabildi', !!mPause);
if(mStartRec) ok('kayıt başlarken sesle takip varsa zamanlı akış açılmıyor',
   /if\(!running && !voiceOn\) start\(\)/.test(mStartRec[0]));
if(mPause) ok('duraklamadan dönüşte de aynı ayrım var',
   /if\(!running && !voiceOn\) start\(\)/.test(mPause[0]));
ok('koşulsuz start çağrısı kalmadı (bu iki yolda)',
   !(mStartRec && /if\(!running\) start\(\)/.test(mStartRec[0])) &&
   !(mPause && /if\(!running\) start\(\)/.test(mPause[0])));

/* Kodun kendi ilkesi: bu üç yerin üçü de aynı ayrımı gözetmeli. */
ok('sesle takip başlarken zamanlı akışı durduruyor',
   /function startVoice\(\)\{[\s\S]*?if\(running\) stop\(\);/.test(kod));
ok('sesli başla komutu da ayrımı gözetiyor',
   /if\(c==='play'\)\{ if\(voiceOn\)\{[\s\S]*?\} else if\(!running\) start\(\); \}/.test(kod));
ok('duraklatma zamanlı akışı durduruyor',
   /rec\.pause\(\);[\s\S]{0,200}if\(running\) stop\(\);/.test(kod));

/* ---------- SESLE TAKİP KAPALIYKEN ESKİ DAVRANIŞ SÜRÜYOR ---------- */
{
  /* Zamanlı akış tek başına: kayıt başlatınca metin akmalı. Düzeltme bunu
     bozmamalı — yoksa kumandasız kullanıcı kaydı başlatıp metnin durduğunu
     görür ve bu daha büyük bir kusur olurdu. */
  const tek=akis({wpm:140, zamanliAcik:true, voiceOn:false});
  ok('sesle takip KAPALIYKEN zamanlı akış normal akıyor', tek>1300);
}
