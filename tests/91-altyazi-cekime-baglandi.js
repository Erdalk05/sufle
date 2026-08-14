const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,oku}=require('./kaynak');
const tel=oku(telefonYolu());
const kod=tel.replace(/\/\*[\s\S]*?\*\//g,'');

/* I6 — ALTYAZI İKİNCİ SÜRÜMDE DOĞRU METNİ ALIYOR MU: ALMIYORDU, HEPTEN
   KAYBOLUYORDU.

   `buildContent()` her çağrıldığında `capTimes` sıfırlanıyor ve o fonksiyonun
   kaynakta 19 çağrı yeri var: sürüm değiştirmek, senaryo değiştirmek, metni
   düzenlemek, senaryo sayfasını kapatmak, biyonik okumayı açmak, dili
   değiştirmek, senaryo silmek... Yani ÇEKİMDEN SONRA senaryoya dokunan hemen
   her şey altyazı damgalarını siliyordu.

   Silmenin kendisi DOĞRU: metin değişince eski damgalar başka kelimeleri
   gösterir ve altyazı yanlış kelimelerle üretilirdi — sessizce yanlış çıktı,
   hiç çıktı olmamasından kötüdür. Kusur şuydu: kullanıcı çekiminin altyazısını
   kaybediyor ve sonra "Altyazı yok — kayıt sırasında sufle akmamış" diye
   YANLIŞ bir sebep okuyordu. Sufle akmıştı; damgalar silinmişti.

   ÇÖZÜM C1deki ilkenin aynısı (yayın paketi çekilen sürümü taşıyor): çekim
   biterken altyazı verisinin anlık görüntüsü alınıyor ve altyazı ondan
   üretiliyor. Artık sürüm değiştirmek altyazıyı bozmuyor. */

const parca=(re,ad)=>{ const m=kod.match(re); ok('çıkarılabildi: '+ad, !!m); return m&&m[0]; };
const sCues=parca(/function buildCues\(\)\{[\s\S]*?\n\}/,'buildCues');
if(!sCues) return;

function kos({ekran, damgalar, anlik}){
  return new Function('__e','__d','__a', `
    const st={capOffset:0}; const CAP_MAXCH=42, CAP_MAXSEC=3.6, CAP_GAP=0.08;
    const capMaxW=()=>3; const sentenceEnd=()=>false;
    const words=__e.map(t=>({textContent:t}));
    const wordLine=__e.map(()=>0);
    const capTimes=__d;
    const cekimAltyazi=__a;
    ${sCues}
    return buildCues();
  `)(ekran, damgalar, anlik);
}

/* ---------- ANLIK GÖRÜNTÜ YOKKEN ESKİ DAVRANIŞ ---------- */
{
  const c=kos({ekran:['bir','iki','uc','dort'], damgalar:[1,2,3,4], anlik:null});
  ok('anlık görüntü yokken ekrandaki metinden üretiliyor', c.length>0);
  ok('metin doğru', c.map(x=>x.text).join(' ')==='bir iki uc dort');
  const bos=kos({ekran:['bir','iki'], damgalar:[null,null], anlik:null});
  ok('damga yoksa boş liste (eski davranış)', bos.length===0);
}

/* ---------- ASIL BULGU: SÜRÜM DEĞİŞİNCE ALTYAZI KORUNUYOR ---------- */
{
  /* Çekim Türkçe sürümde yapıldı; kullanıcı sonra İngilizce sürüme geçti.
     Ekrandaki kelimeler artık İngilizce ve capTimes SIFIRLANMIŞ durumda. */
  const anlik=[{s:'merhaba',ln:0,t:1},{s:'dunya',ln:0,t:2},{s:'nasilsin',ln:0,t:3}];
  const c=kos({ekran:['hello','world','how','are','you'], damgalar:[null,null,null,null,null], anlik});
  ok('sürüm değişse de altyazı ÜRETİLİYOR (eskiden boş dönerdi)', c.length>0);
  ok('altyazı ÇEKİLEN metni içeriyor', c.map(x=>x.text).join(' ')==='merhaba dunya nasilsin');
  ok('ekrandaki yeni metin altyazıya SIZMIYOR',
     !c.some(x=>/hello|world|how/.test(x.text)));
  ok('zamanlar çekimden geliyor', Math.abs(c[0].start-1)<0.001);
}
{
  /* Metin düzenlense de aynı: çekimin altyazısı çekimin metnidir. */
  const anlik=[{s:'bir',ln:0,t:1},{s:'iki',ln:0,t:2}];
  const c=kos({ekran:['bambaska','bir','metin'], damgalar:[null,null,null], anlik});
  ok('metin düzenlense de çekimin altyazısı korunuyor',
     c.map(x=>x.text).join(' ')==='bir iki');
}
{
  /* Anlık görüntüde damgasız kelime varsa atlanmalı (kullanıcı metnin
     sonuna varmadan çekimi bitirdi). */
  const anlik=[{s:'bir',ln:0,t:1},{s:'iki',ln:0,t:2},{s:'okunmadi',ln:0,t:null}];
  const c=kos({ekran:['x'], damgalar:[null], anlik});
  ok('okunmayan kelimeler altyazıya girmiyor',
     c.map(x=>x.text).join(' ')==='bir iki');
}
{
  /* Satır bilgisi de anlık görüntüden gelmeli: kuyruk bölmesi ona bakıyor. */
  const anlik=[{s:'a',ln:0,t:1},{s:'b',ln:1,t:2}];
  const c=kos({ekran:[], damgalar:[], anlik});
  ok('satır değişimi kuyruğu bölüyor (satır bilgisi taşınıyor)', c.length===2);
}

/* ---------- KAYNAK DÜZEYİ: ANLIK GÖRÜNTÜ DOĞRU ANDA ALINIYOR MU ---------- */
ok('anlık görüntü değişkeni tanımlı', /let cekimSenaryo=null, cekimAltyazi=null;/.test(kod));
ok('çekim biterken alınıyor',
   /cekimAltyazi = words\.length \? words\.map\(\(w,i\)=>\(\{s:w\.textContent, ln:wordLine\[i\], t:capTimes\[i\]\}\)\) : null;/.test(kod));
/* Sıra önemli: recT sıfırlanmadan ve buildContent çağrılmadan ÖNCE. */
{
  const i=kod.indexOf('cekimAltyazi = words.length');
  const j=kod.indexOf('pendingDur=recElapsed();            // <-- recT');
  ok('anlık görüntü süre ölçümünden önce alınıyor', i>0 && j>0 && i<j);
}
ok('yeni çekim başlarken eski anlık görüntü temizleniyor',
   /capTimes=new Array\(words\.length\)\.fill\(null\); cekimAltyazi=null;/.test(kod));
ok('altyazı üretimi anlık görüntüyü tercih ediyor',
   /const kaynak = cekimAltyazi\s*\?\s*cekimAltyazi/.test(sCues));
ok('anlık görüntü yoksa ekrandan üretmeye devam ediyor',
   /: words\.map\(\(w,i\)=>\(\{s:w\.textContent, ln:wordLine\[i\], t:capTimes\[i\]\}\)\)/.test(sCues));

/* ---------- KUSURUN DAYANAĞI: buildContent GERÇEKTEN SİLİYOR ---------- */
{
  const bc=kod.match(/function buildContent\(\)\{[\s\S]*?\n\}/);
  ok('buildContent çıkarılabildi', !!bc);
  if(bc) ok('buildContent damgaları sıfırlıyor (bulgunun dayanağı)',
     /capTimes=new Array\(words\.length\)\.fill\(null\);/.test(bc[0]));
  const cagri=(kod.match(/buildContent\(\)/g)||[]).length;
  ok('buildContent çok yerden çağrılıyor ('+cagri+' yer) — bu yüzden kayıp sıradandı', cagri>10);
}
/* Yayın paketi zaten çekilen senaryoyu taşıyordu (C1); altyazı da artık
   aynı ilkeye bağlı. İkisi ayrışırsa paketteki metin ile altyazı çelişir. */
ok('yayın paketi de çekim senaryosunu kullanıyor', /const s=cekimSenaryo\|\|active\(\)/.test(kod));
