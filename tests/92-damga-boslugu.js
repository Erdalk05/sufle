const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* I7 — capTimes KELİME ATLAMADA BOŞLUK BIRAKIYOR MU: BIRAKMIYOR (çürüdü).

   Sufle her karede tek tek ilerlemiyor: hızlı akışta, dokunarak atlamada,
   satır atlamada ve sesle takibin sıçramasında okuma çizgisi birkaç kelimeyi
   birden geçiyor. Damgalama bunu biliyor ve ARADAKİ HER KELİMEYİ dolduruyor.
   Doldurmasaydı .srt dosyasında o kelimeler hiç görünmezdi — yani kişinin
   söylediği cümlenin ortası altyazıdan düşerdi.

   ÖLÇÜLEN (gerçek damgalama döngüsü, 12 kelimelik metin):
     düz okuma 0,1,2,3            -> boşluk YOK
     ileri sıçrama 0 -> 5         -> aradaki 1-4 dolduruldu, boşluk YOK
     geri sarma 5 -> 2 -> sonra 7 -> boşluk YOK, eski damgalar KORUNDU
     tek atlamada 0 -> 9          -> onunun onu da dolu
   Ürün kodu değişmedi; bu tur davranışı kilitliyor.

   İKİ İNCE KURAL ÖLÇÜLDÜ:
     · Geri sarınca damga YENİLENMİYOR (`capTimes[i]==null` koşulu) — kelime
       ilk okunduğu ana ait kalmalı, yoksa tekrar okuma altyazıyı geriye atar.
     · Geriye hareket hiç damgalamıyor (döngü ters yönde çalışmıyor). */

const m=kod.match(/if\(recT && idx>=0\)\{[\s\S]*?\n    \}/);
ok('damgalama çıkarılabildi', !!m);
if(!m) return;
const damga=m[0];

function kur(n=12){
  return new Function('__n', `
    const recT=1; let activeIdx=-1; let saat=0;
    const capTimes=new Array(__n).fill(null);
    const recElapsed=()=>saat;
    const at=(idx,t)=>{ saat=t; ${damga} activeIdx=idx; };
    return { at, get d(){ return capTimes.slice(); }, get a(){ return activeIdx; } };
  `)(n);
}
/* Damgalı aralıkta delik var mı: ilk damgalı ile son damgalı arasında
   null kalmamalı. */
function delikVar(d){
  const ilk=d.findIndex(x=>x!=null);
  if(ilk<0) return false;
  let son=-1; d.forEach((x,i)=>{ if(x!=null) son=i; });
  for(let i=ilk;i<=son;i++) if(d[i]==null) return true;
  return false;
}

/* ---------- BOŞLUK BIRAKMIYOR ---------- */
{
  const r=kur(); [[0,1],[1,2],[2,3],[3,4]].forEach(([i,t])=>r.at(i,t));
  ok('düz okumada boşluk yok', !delikVar(r.d));
  ok('düz okumada her kelime kendi anını alıyor',
     JSON.stringify(r.d.slice(0,4))==='[1,2,3,4]');
}
{
  const r=kur(); [[0,1],[5,2]].forEach(([i,t])=>r.at(i,t));
  ok('ileri sıçramada boşluk yok', !delikVar(r.d));
  ok('atlanan kelimeler sıçrama anıyla dolduruluyor',
     JSON.stringify(r.d.slice(0,6))==='[1,2,2,2,2,2]');
  ok('sıçramanın ötesi damgalanmıyor', r.d[6]===null);
}
{
  const r=kur(); [[0,1],[9,2]].forEach(([i,t])=>r.at(i,t));
  ok('tek seferde 9 kelime atlanınca da boşluk yok', !delikVar(r.d));
  ok('onunun onu da dolu', r.d.slice(0,10).every(x=>x!=null));
}

/* ---------- GERİ SARMA ---------- */
{
  const r=kur(); [[0,1],[5,2],[2,3]].forEach(([i,t])=>r.at(i,t));
  ok('geriye hareket yeni damga atmıyor',
     JSON.stringify(r.d.slice(0,6))==='[1,2,2,2,2,2]');
  /* İlk okunduğu an korunmalı: yenilenirse aynı cümle altyazıda geriye kayar. */
  ok('geri sarınca eski damgalar KORUNUYOR', r.d[2]===2 && r.d[3]===2);
  r.at(7,4);
  ok('geri sardıktan sonra ileri gidince boşluk yok', !delikVar(r.d));
  ok('yeni kelimeler yeni anı alıyor', r.d[6]===4 && r.d[7]===4);
  ok('eski kelimeler hâlâ eski anında', r.d[2]===2);
}

/* ---------- KAYIT SÜRMÜYORKEN DAMGA YOK ---------- */
{
  const yok=new Function(`
    const recT=0; let activeIdx=-1; let saat=5;
    const capTimes=new Array(6).fill(null);
    const recElapsed=()=>saat;
    const idx=3; ${damga}
    return capTimes;
  `)();
  ok('kayıt yokken hiç damgalanmıyor', yok.every(x=>x==null));
}
{
  /* idx negatifken (hiçbir kelime çizgide değil) de damga olmamalı. */
  const yok=new Function(`
    const recT=1; let activeIdx=-1; let saat=5;
    const capTimes=new Array(6).fill(null);
    const recElapsed=()=>saat;
    const idx=-1; ${damga}
    return capTimes;
  `)();
  ok('çizgide kelime yokken damgalanmıyor', yok.every(x=>x==null));
}

/* ---------- KAYNAK DÜZEYİ ---------- */
ok('aradaki kelimeler dolduruluyor (döngü var)', /for\(let i=Math\.max\(0,activeIdx<0\?0:activeIdx\);i<=idx;i\+\+\)/.test(damga));
ok('var olan damga korunuyor', /if\(capTimes\[i\]==null\) capTimes\[i\]=t;/.test(damga));
ok('damga kayıt ve geçerli kelime koşuluna bağlı', /if\(recT && idx>=0\)/.test(damga));
ok('damga video zamanını kullanıyor', /const t=recElapsed\(\);/.test(damga));
/* Doldurma birden çok kelimeyi AYNI ana damgalıyor; bu tek başına çakışan
   altyazı üretirdi. I3teki sıraya dizme bunu topluyor — bağ kopmasın. */
ok('kuyruklar sıraya diziliyor (I3 koruması duruyor)',
   /if\(cues\[n\]\.start < onceki\.end\)/.test(kod));
