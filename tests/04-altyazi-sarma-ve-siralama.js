const ok=(n,c)=>{ console.log((c?'✓':'✗ HATA')+' '+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku}=require('./kaynak');
const src=oku(telefonYolu());
const grab=re=>{ const m=src.match(re); if(!m) throw new Error('bulunamadı: '+re); return m[0]; };

// ---- 9.9 satıra sığdırma (gerçek kod) ----
eval(grab(/function wrapLines\(measure, txt, maxW\)\{[\s\S]*?\n\}/));
const M=s=>s.length*10;                       // her harf 10 px
ok('kısa metin tek satır', JSON.stringify(wrapLines(M,'bir iki',100))==='["bir iki"]');
ok('normal sarma', JSON.stringify(wrapLines(M,'bir iki uc dort',80))==='["bir iki","uc dort"]');
const uzun=wrapLines(M,'elektroansefalografi',100);
ok('TEK UZUN KELİME BÖLÜNÜYOR', uzun.length>1);
ok('hiçbir satır taşmıyor', uzun.every(l=>M(l)<=100));
ok('bölünen kelime kayıpsız', uzun.join('')==='elektroansefalografi');
const karma=wrapLines(M,'kisa cokcokcokcokuzunbirkelime son',100);
ok('karma metinde de taşma yok', karma.every(l=>M(l)<=100));
ok('karma metin kayıpsız', karma.join(' ').replace(/ /g,'')==='kisacokcokcokcokuzunbirkelimeson');
ok('boş metin çökertmiyor', JSON.stringify(wrapLines(M,'',100))==='[""]');
ok('çok dar alanda sonsuz döngü yok', wrapLines(M,'abcdef',10).length===6);

// ---- 8.3 duraklat/devam: süre duraklamayı saymamalı ----
function recElapsed({t0,now,pausedMs,paused,pauseStart}){
  const extra = paused ? (now-pauseStart) : 0;
  return (now-t0-pausedMs-extra)/1000;
}
ok('duraksız süre doğru', recElapsed({t0:0,now:10000,pausedMs:0,paused:false})===10);
ok('duraklama düşülüyor', recElapsed({t0:0,now:10000,pausedMs:3000,paused:false})===7);
ok('duraklıyorken de doğru', recElapsed({t0:0,now:10000,pausedMs:1000,paused:true,pauseStart:8000})===7);

// ---- 9.6 altyazı zamanları duraklamadan etkilenmemeli ----
// kelime damgaları recElapsed ile alınıyor: duraklama boyunca zaman ilerlememeli
const stamps=[];
let t0=0,pausedMs=0;
[[1000,false],[2000,false],[/*duraklat*/5000,true],[6000,true],[/*devam*/7000,false]].forEach(([now,paused])=>{
  if(!paused) stamps.push(+recElapsed({t0,now,pausedMs:paused?pausedMs:(now>=7000?4000:0),paused:false}).toFixed(1));
});
ok('duraklama altyazıyı kaydırmıyor', JSON.stringify(stamps)==='[1,2,3]');

// ---- 9.10 kuyruk bölme kuralları (gerçek sabitler) ----
// CAP_MAXW artık sabit değil, ayardan geliyor (9.4) — test de ona göre.
var C=grab(/const CAP_MAXCH=\d+, CAP_MAXSEC=[\d.]+, CAP_GAP=[\d.]+;/);
eval(C.replace('const ','var '));
var st={capMaxW:null};
eval(grab(/function capMaxW\(\)\{[\s\S]*?\}/).replace('function','var _cmw=function').replace('_cmw=function capMaxW','capMaxW=function'));
var CAP_MAXW=capMaxW();
eval(grab(/function sentenceEnd\(s\)\{[\s\S]*?\n\}/));
ok('nokta cümle sonu', sentenceEnd('bitti.')===true);
ok('tırnaklı nokta da', sentenceEnd('bitti."')===true);
ok('normal kelime değil', sentenceEnd('devam')===false);
ok('üç nokta cümle sonu', sentenceEnd('belki…')===true);
ok('kuyruk sınırları makul', CAP_MAXW<=8 && CAP_MAXCH<=45 && CAP_MAXSEC<=4);

// ---- 10.2 sıralama: yıldızlılar her zaman üstte ----
eval(grab(/function sortTakes\(list\)\{[\s\S]*?\n\}/).replace('takeSort','TS'));
let TS='new';
const L2=[{id:1,fav:false,created:5,size:10,dur:9},{id:2,fav:true,created:1,size:1,dur:1},{id:3,fav:false,created:9,size:99,dur:2}];
TS='new';  ok('yıldızlı üstte (yeni)',  sortTakes(L2)[0].id===2);
TS='big';  ok('yıldızlı üstte (büyük)', sortTakes(L2)[0].id===2);
TS='big';  ok('büyük sıralama doğru',   sortTakes(L2)[1].id===3);
TS='long'; ok('uzun sıralama doğru',    sortTakes(L2)[1].id===1);
TS='new';  ok('kaynak dizi bozulmuyor', (sortTakes(L2), L2[0].id===1));
