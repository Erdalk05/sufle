const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* H2 — DURAKLAT/DEVAM SONRASI SÜRE VE ALTYAZI ZAMANLARI: DOĞRU ÇIKTI.

   Bu, üç ayrı parçanın birlikte doğru olmasını gerektiren bir zincir ve
   parçaların hiçbiri tek başına yeterli değil:
     1) `recElapsed()` duraklamayı düşüyor (H8de ölçüldü),
     2) altyazı damgası `recElapsed()` kullanıyor — yani damgalar VİDEO
        zamanında, duvar saatinde değil,
     3) MediaRecorder duraklamada kare yazmıyor, yani videonun kendisi de
        o süreyi içermiyor.
   Üçü aynı hizada olmazsa altyazı videodan kayar ve bu ancak yayımladıktan
   sonra fark edilir.

   ÖLÇÜLEN (gerçek fonksiyonlar, sahte saat): 1 sn ve 2 sn okundu, 5 SANİYE
   duraklandı, sonra devam edildi:
     damgalar: 1,00 | 2,00 | ... | 3,00 | 4,00
   Yani duraklamada geçen 5 saniye damgalara HİÇ girmiyor — video da onu
   içermediği için altyazı hizada kalıyor.

   YAN ETKİ ÖLÇÜLDÜ VE ZARARSIZ: duraklamışken metni elle sürüklersen o
   kelimeler donmuş damgayı alır (hepsi aynı ana yığılır). Bu tek başına
   çakışan altyazı üretirdi; I3te eklenen sıraya dizme onu topluyor.
   Uçtan uca ölçüldü: 4 kuyruk, ÇAKIŞAN 0. */

const parca=(re,ad)=>{ const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sEl   = parca(/function recElapsed\(\)\{[\s\S]*?\n  return \(performance\.now\(\)-recT-recPausedMs-extra\)\/1000; \}/,'recElapsed');
const sDamga= parca(/if\(recT && idx>=0\)\{[\s\S]*?\n    \}/,'damgalama');
const sCues = parca(/function buildCues\(\)\{[\s\S]*?\n\}/,'buildCues');
const sBasla= parca(/recT=performance\.now\(\); recPausedMs=0; recPaused=false;/,'kayıt başlangıcı');
const sDur  = parca(/recPaused=true; pauseStart=performance\.now\(\);/,'duraklatma');
const sDev  = parca(/recPausedMs\+=performance\.now\(\)-pauseStart; recPaused=false;\n    body\.classList\.remove\('recpaused'\);/,'devam etme');
if(!sEl||!sDamga||!sCues||!sBasla||!sDur||!sDev) return;

function kur(saat, adet){
  return new Function('__s','__n', `
    let recT=0,recPausedMs=0,pauseStart=0,recPaused=false;
    const performance={now:()=>__s.t};
    const body={classList:{remove:()=>{},add:()=>{}}};
    ${sEl}
    const capTimes=new Array(__n).fill(null);
    const words=Array.from({length:__n},(_,i)=>({textContent:'k'+i}));
    let activeIdx=-1;
    const damgala=(idx)=>{ ${sDamga} activeIdx=idx; };
    return { basla:()=>{ ${sBasla} }, durakla:()=>{ ${sDur} }, devam:()=>{ ${sDev} },
             oku:(i)=>damgala(i), sure:()=>recElapsed(), get damgalar(){ return capTimes; } };
  `)(saat, adet);
}

/* ---------- DURAKLAMA ALTYAZI ZAMANINA GİRMİYOR ---------- */
{
  const s={t:1000}, r=kur(s,12);
  r.basla();
  s.t+=1000; r.oku(0);
  s.t+=1000; r.oku(1);
  r.durakla(); s.t+=5000;              // 5 saniye duraklama
  r.devam();
  s.t+=1000; r.oku(5);
  s.t+=1000; r.oku(6);
  const d=r.damgalar;
  ok('ilk kelime 1,00 sn damgalandı', Math.abs(d[0]-1)<0.001);
  ok('ikinci kelime 2,00 sn damgalandı', Math.abs(d[1]-2)<0.001);
  /* EN KRİTİK: duraklamadan sonraki kelime 8,00 DEĞİL 3,00 olmalı — video da
     o 5 saniyeyi içermiyor. 8,00 olsaydı altyazı videodan 5 sn kayardı. */
  ok('duraklamadan sonraki kelime 3,00 (8,00 değil)', Math.abs(d[5]-3)<0.001);
  ok('sonraki kelime 4,00', Math.abs(d[6]-4)<0.001);
  ok('kayıt süresi de aynı hizada', Math.abs(r.sure()-4)<0.001);
  ok('damgalar hiç geriye gitmiyor',
     d.filter(x=>x!=null).every((x,i,a)=>i===0||x>=a[i-1]));
}
{
  /* İKİ duraklama üst üste: birikimli olmalı. */
  const s={t:1000}, r=kur(s,12);
  r.basla();
  s.t+=2000; r.oku(0);
  r.durakla(); s.t+=3000; r.devam();
  s.t+=2000; r.oku(1);
  r.durakla(); s.t+=4000; r.devam();
  s.t+=2000; r.oku(2);
  const d=r.damgalar;
  ok('iki duraklamada da doğru (2,00 · 4,00 · 6,00)',
     Math.abs(d[0]-2)<0.001 && Math.abs(d[1]-4)<0.001 && Math.abs(d[2]-6)<0.001);
}
{
  /* Duraklamışken elle sürükleme: donmuş damga alır. Bu YANLIŞ değil —
     o kelimeler videoda o anda ekrandaydı — ama yığılma yaratıyor. */
  const s={t:1000}, r=kur(s,12);
  r.basla();
  s.t+=1000; r.oku(0);
  r.durakla(); s.t+=5000;
  r.oku(4);                            // duraklamışken metni elle sürükledi
  const d=r.damgalar;
  ok('duraklamışken sürüklenen kelimeler donmuş damgayı alıyor',
     Math.abs(d[2]-1)<0.001 && Math.abs(d[4]-1)<0.001);
  ok('duraklamada damga İLERLEMİYOR (video da ilerlemiyor)', Math.abs(d[4]-1)<0.001);
}

/* ---------- UÇTAN UCA: YIĞILMA ÇAKIŞAN ALTYAZI ÜRETMİYOR ---------- */
{
  const cues=new Function('__t', `
    const st={capOffset:0}; const CAP_MAXCH=42, CAP_MAXSEC=3.6, CAP_GAP=0.08;
    /* buildCues artik cekimin anlik goruntusunu tercih ediyor (I6). */
    const cekimAltyazi=null;
    const capMaxW=()=>3; const sentenceEnd=()=>false;
    const words=__t.map((_,i)=>({textContent:'k'+i}));
    const wordLine=__t.map(()=>0); const capTimes=__t.slice();
    ${sCues}
    return buildCues();
  /* GİRDİ GERÇEKTEN YIĞILMALI: ilk denememde [1,2,2,2,2,3,...] kullandım ve
     kuyruk sınırı (3 kelime) yığılmayı zaten bölüyordu — iddia hiçbir şeyi
     ayırt etmiyordu (sıraya dizmeyi kaldıran bozma YAKALANMADI). Uzun bir
     duraklamada elle sürükleme kuyruk sınırından ÇOK daha fazla kelimeyi aynı
     ana damgalar; ölçülmesi gereken bu. */
  `)([1, 2,2,2,2,2,2,2,2, 3,4,5]);
  let cak=0; for(let i=0;i+1<cues.length;i++) if(cues[i].end>cues[i+1].start+1e-9) cak++;
  ok('yığılmış damgalardan ÇAKIŞAN kuyruk çıkmıyor ('+cues.length+' kuyruk)', cak===0);
  ok('kuyruklar artan sırada', cues.every((x,i)=>i===0||x.start>=cues[i-1].start));
  ok('her kuyruğun bitişi başlangıcından sonra', cues.every(x=>x.end>x.start));
  ok('hiçbir metin kaybolmadı', cues.map(x=>x.text).join(' ').split(' ').length===12);
}

/* ---------- ZİNCİRİN PARÇALARI YERİNDE Mİ ----------
   Biri değişirse yukarıdaki hizalama sessizce bozulur. */
ok('damga VİDEO zamanını kullanıyor (duvar saatini değil)', /const t=recElapsed\(\);/.test(sDamga));
ok('damga yalnız kayıt sürerken atılıyor', /if\(recT && idx>=0\)/.test(sDamga));
ok('bir kelime iki kez damgalanmıyor', /if\(capTimes\[i\]==null\) capTimes\[i\]=t;/.test(sDamga));
ok('süre duraklamayı düşüyor', /recPausedMs/.test(sEl) && /recPaused \? \(performance\.now\(\)-pauseStart\) : 0/.test(sEl));
ok('duraklamada sufle de duruyor (yeni kelime damgalanmasın)',
   /rec\.pause\(\);[\s\S]{0,200}if\(running\) stop\(\);/.test(kod));
ok('kayıt bitince damgalar sıfırlanıyor (sonraki çekime taşmasın)',
   /capTimes=new Array\(words\.length\)\.fill\(null\)/.test(kod));
