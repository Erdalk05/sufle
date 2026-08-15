const ok=(n,c)=>{ console.log((c?'✓ ':'✗ HATA ')+n); if(!c) process.exitCode=1; };
const {telefonYolu,macYolu,oku,blokKes,cekirdekOku,REPO}=require('./kaynak');
const path=require('path');
const telHam=oku(telefonYolu()), macHam=oku(macYolu());
const yorumsuz=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const tel=yorumsuz(telHam), mac=yorumsuz(macHam);
const YON=cekirdekOku('yon.js','SUFLE_YON');
const CEK=YON+'\n'+cekirdekOku('altyazi.js','SUFLE_ALTYAZI');

/* G.2 — ALTYAZI GÖRÜNÜM PAKETİ.

   ÖLÇÜLEN BAŞLANGIÇ: uygulamanın TEK bir altyazı görünümü vardı. "Sade /
   Sosyal" seçeneği çizimi hiç değiştirmiyor, yalnız punto ve konumu
   ayarlıyordu (st.capStyle çizimde bir kez bile okunmuyor). Mac tarafında
   ise punto ve konum SABİTTİ (42 / alt) ve sözlükte capSize/capPos
   anahtarları duruyordu — çevrilmiş ama hiçbir yere bağlanmamış ÖLÜ ÇEVİRİ.

   BU TEST ÜÇ ŞEYİ KİLİTLİYOR:
   ① her tema OKUNUR (zemini yoksa konturu ya da gölgesi var)
   ② varsayılan tema eski görünümü BİREBİR koruyor (sessiz gerileme yok)
   ③ iki kabuk aynı girdide AYNI çizimi üretiyor (parite) */

/* ---------- 1) ÇEKİRDEK: tema tablosu ---------- */
const cekirdek=(()=>{
  const f=new Function(CEK+'\nreturn {ALTYAZI_TEMA, ALTYAZI_TEMA_SIRA, altyaziTema, altyaziOkunur, kkAnim, altyaziKonumOrani, altyaziMerkezY};');
  return f();
})();
{
  const {ALTYAZI_TEMA, ALTYAZI_TEMA_SIRA, altyaziTema, altyaziOkunur}=cekirdek;
  const adlar=Object.keys(ALTYAZI_TEMA);
  ok('en az 6 tema var ('+adlar.length+')', adlar.length>=6);
  ok('tema sırası tabloyla birebir', ALTYAZI_TEMA_SIRA.length===adlar.length &&
     ALTYAZI_TEMA_SIRA.every(a=>adlar.indexOf(a)>=0));
  ok('varsayılan tema listenin başında', ALTYAZI_TEMA_SIRA[0]==='sade');
  ok('bilinmeyen tema sadeye düşüyor', altyaziTema('yokboyle')===ALTYAZI_TEMA.sade);
  ok('tema adı verilmezse sade', altyaziTema(undefined)===ALTYAZI_TEMA.sade);

  /* OKUNURLUK KURALI — bu testin asıl işi. Video her renkte olabilir;
     zeminsiz ve kontursuz beyaz yazı beyaz duvarda kaybolur. */
  for(const ad of adlar)
    ok('tema okunur: '+ad, altyaziOkunur(ALTYAZI_TEMA[ad]));
  ok('kural ayırt ediyor: zeminsiz+kontursuz tema reddediliyor',
     !altyaziOkunur({zemin:'yok', konturOran:0, golgeOran:0, vurguZemin:false}));
  ok('kural ayırt ediyor: zemini olan tema kabul',
     altyaziOkunur({zemin:'kutu', konturOran:0, golgeOran:0}));
  ok('boş tema reddediliyor', !altyaziOkunur(null));

  /* Zemin saydamlığı tek başına yetmez: gerçek videonun rengi bilinmiyor.
     Ölçüt "zemin varsa VE alfa yüksekse" ya da "kontur/gölge var". */
  const lin=c=>{ c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); };
  const oran=(L1,L2)=>(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
  for(const ad of adlar){
    const t=ALTYAZI_TEMA[ad];
    if(t.zemin==='yok') continue;
    /* EN KÖTÜ DURUM: bembeyaz video. Siyah zemin alfa kadar karartır. */
    const zeminL=(1-t.zeminAlfa)*lin(255);
    const k=oran(lin(255), zeminL);
    console.log('   '+ad+': beyaz video üstünde zemin kontrastı '+k.toFixed(2)+':1'+
                (t.konturOran?' (+kontur)':'')+(t.golgeOran?' (+gölge)':''));
    ok('tema en kötü videoda da okunur: '+ad, k>=4.5 || t.konturOran>0 || t.golgeOran>0);
  }
}

/* ---------- 2) ÇEKİRDEK: animasyon ---------- */
{
  const {kkAnim}=cekirdek;
  const d=kkAnim('yok',50);
  ok('animasyon kapalıyken hiçbir dönüşüm yok', d.olcek===1 && d.alfa===1 && d.kayma===0);
  ok('bilinmeyen animasyon türü durgun', kkAnim('bilinmez',50).olcek===1);
  ok('negatif süre çökertmiyor', kkAnim('sicra',-5).olcek===1);
  ok('sayı olmayan süre çökertmiyor', kkAnim('sicra',NaN).olcek===1);
  {
    const a0=kkAnim('yumusak',0), a1=kkAnim('yumusak',75), a2=kkAnim('yumusak',150), a3=kkAnim('yumusak',5000);
    ok('yumuşak: başta saydam', a0.alfa===0);
    ok('yumuşak: alfa artıyor', a1.alfa>a0.alfa && a2.alfa>a1.alfa);
    ok('yumuşak: 150 msde tamamlanıyor', a2.alfa===1 && a2.kayma===0);
    ok('yumuşak: süre geçince sabit kalıyor', a3.alfa===1 && a3.kayma===0);
    ok('yumuşak: kayma azalıyor', kkAnim('yumusak',0).kayma>kkAnim('yumusak',100).kayma);
    ok('yumuşak: ölçek değiştirmiyor', a1.olcek===1);
  }
  {
    const s0=kkAnim('sicra',0), s1=kkAnim('sicra',90), s2=kkAnim('sicra',180);
    ok('sıçra: başta büyük', s0.olcek>1);
    ok('sıçra: küçülerek yerine oturuyor', s1.olcek<s0.olcek && s2.olcek===1);
    ok('sıçra: saydamlık oynamıyor', s0.alfa===1 && s1.alfa===1);
    /* Büyüme SINIRLI olmalı: aşırı ölçek kelimeyi kadraj dışına taşırır. */
    ok('sıçra: büyüme %25i geçmiyor ('+((s0.olcek-1)*100).toFixed(0)+'%)', s0.olcek<=1.25);
  }
  {
    /* Animasyon SÜRESİ bir sonraki kelime gelmeden bitmeli: 180 kelime/dakika
       en hızlı gerçekçi tempo ve kelime başına 333 ms düşüyor. */
    ok('animasyon en hızlı temponun (333 ms) altında bitiyor',
       kkAnim('yumusak',333).alfa===1 && kkAnim('sicra',333).olcek===1);
  }
}

/* ---------- 3) ÇEKİRDEK: konum ---------- */
{
  const {altyaziKonumOrani, altyaziMerkezY}=cekirdek;
  const Hh=1920, blok=200;
  /* GERİLEME KORUMASI: alt ve orta, eski koddaki hesabın birebir aynısı
     olmalı. Eski: baseY = Hh - Hh*0.16 - blockH/2 (alt) ve Hh*0.5 (orta). */
  ok('alt konum eski hesapla birebir',
     Math.abs(altyaziMerkezY('bottom',Hh,blok) - (Hh - Hh*0.16 - blok/2))<1e-9);
  ok('orta konum eski hesapla birebir',
     Math.abs(altyaziMerkezY('middle',Hh,blok) - (Hh*0.5))<1e-9);
  ok('alan dışı konum adı alta düşüyor',
     altyaziMerkezY('yokboyle',Hh,blok)===altyaziMerkezY('bottom',Hh,blok));
  const ust=altyaziMerkezY('top',Hh,blok);
  ok('üst konum kadrajın üst yarısında', ust<Hh*0.5);
  ok('üst konumda blok kadrajın İÇİNDE kalıyor', ust-blok/2>=0);
  /* Satır sayısı artınca blok kadraj dışına DEĞİL içeri doğru büyümeli. */
  ok('üstte blok büyüyünce içeri doğru büyüyor',
     altyaziMerkezY('top',Hh,400)>altyaziMerkezY('top',Hh,200));
  ok('altta blok büyüyünce içeri doğru büyüyor',
     altyaziMerkezY('bottom',Hh,400)<altyaziMerkezY('bottom',Hh,200));
  ok('üç konum da farklı yer gösteriyor',
     new Set([altyaziKonumOrani('top'),altyaziKonumOrani('middle'),altyaziKonumOrani('bottom')]).size===3);
}

/* ---------- 4) GERÇEK ÇİZİM: tema tema ---------- */
function tezgah(k){
  const mW=k.match(/function wrapLines\([\s\S]*?return out\.length\?out:\[txt\|\|.{2}\];\s*\n\s*\}/);
  const mP=[blokKes(k,'function kkParcala(')];
  const mR=k.match(/function kkRenk\(\)\{[\s\S]*?\n\s*\}/);
  const mV=blokKes(k,'function kkVurguMetin()');
  const mD=blokKes(k,'function drawCaption(','let capOnbellek=');
  if(!mW||!mP||!mR||!mV||!mD) return null;
  return (d)=>new Function('__d', [
    CEK,
    'let kkRenkOnb="", kkVurguMetinOnb="";',
    mW[0], mP[0], mR[0], mV,
    'const st=__d.st||{}; const state=st;',
    'const document={documentElement:{}};',
    'const getComputedStyle=()=>({getPropertyValue:(ad)=>(__d.jetonlar||{})[ad]||""});',
    'const logErr=()=>{};',
    'const performance={now:()=>__d.saat?__d.saat():0};',
    mD,
    'const c={ font:"", textAlign:"center", textBaseline:"", fillStyle:"", strokeStyle:"",',
    '  globalAlpha:1, shadowColor:"", shadowBlur:0, shadowOffsetY:0, lineWidth:0, lineJoin:"",',
    '  measureText:s=>({width:String(s).length*20}),',
    '  save(){ __d.iz.push({t:"save"}); }, restore(){ __d.iz.push({t:"restore"}); },',
    '  translate:(x,y)=>__d.iz.push({t:"tasi", x:x, y:y}),',
    '  scale:(x,y)=>__d.iz.push({t:"olcek", x:x}),',
    '  beginPath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, closePath(){},',
    '  rect:(x,y,w,h)=>__d.iz.push({t:"yol", x:x, y:y, w:w, h:h, r:0}),',
    '  fill(){ __d.iz.push({t:"zeminDolgu", renk:c.fillStyle}); },',
    '  fillRect:(x,y,w,h)=>__d.iz.push({t:"bant", x:x, y:y, w:w, h:h}),',
    '  strokeText:(t,x,y)=>__d.iz.push({t:"kontur", s:t, kalinlik:c.lineWidth}),',
    '  fillText:(t,x,y)=>__d.iz.push({t:"yazi", s:t, x:x, y:y, renk:c.fillStyle, alfa:c.globalAlpha, golge:c.shadowBlur}) };',
    'const liveCue=()=>__d.metin;',
    'drawCaption(c, __d.W||1080, __d.H||1920);',
    'return {hiza:c.textAlign, renk:c.fillStyle};'
  ].join('\n'))(d);
}
const JETONLAR={'--r-warn':'#FFB020','--on-warn':'#231704'};
const METIN='bugun sizlere yeni bir konudan';
const DURUM=(ek)=>Object.assign({capSize:42, capPos:'bottom', capKaraoke:true, capAnim:'yok'}, ek||{});

for(const [ad,k] of [['telefon',tel],['masaüstü',mac]]){
  const kos=tezgah(k);
  ok(ad+': çizim tezgâhı kurulabildi', !!kos);
  if(!kos) continue;

  const ciz=(ek)=>{ const iz=[]; kos({metin:METIN, iz, jetonlar:JETONLAR, st:DURUM(ek)}); return iz; };

  {
    /* VARSAYILAN TEMA ESKİ GÖRÜNÜM: tam genişlik tek bant. */
    const iz=ciz({capTema:'sade'});
    const bant=iz.filter(x=>x.t==='bant');
    ok(ad+': sade tema tam genişlik tek bant çiziyor', bant.length===1 && bant[0].x===0 && bant[0].w===1080);
    ok(ad+': sade temada satır arkası kutu yok', iz.filter(x=>x.t==='zeminDolgu').length===0);
    ok(ad+': sade temada kontur var', iz.some(x=>x.t==='kontur' && x.kalinlik>0));
  }
  {
    const iz=ciz({capTema:'kutu'});
    ok(ad+': kutu teması bant çizmiyor', iz.filter(x=>x.t==='bant').length===0);
    ok(ad+': kutu teması satır arkasına zemin çiziyor', iz.filter(x=>x.t==='zeminDolgu').length>=1);
    const yol=iz.find(x=>x.t==='yol');
    ok(ad+': kutu zemini satırdan geniş', !!yol && yol.w>METIN.length*20);
  }
  {
    const iz=ciz({capTema:'seritsiz'});
    ok(ad+': şeritsiz temada hiç zemin yok',
       iz.filter(x=>x.t==='bant'||x.t==='zeminDolgu').length===0);
    ok(ad+': şeritsiz temada kontur KALIN', iz.some(x=>x.t==='kontur' && x.kalinlik>=42*0.19));
  }
  {
    const iz=ciz({capTema:'golge'});
    ok(ad+': gölge temasında kontur yok', iz.filter(x=>x.t==='kontur').length===0);
    ok(ad+': gölge temasında gölge var', iz.some(x=>x.t==='yazi' && x.golge>0));
  }
  {
    /* VURGU HAPI: vurgulanan kelimenin arkasına jeton renginde dolu zemin,
       kelimenin kendisi jetonun EŞİ olan koyu renkle yazılıyor. */
    const iz=ciz({capTema:'vurguHap'});
    const zemin=iz.filter(x=>x.t==='zeminDolgu');
    ok(ad+': vurgu hapı tek zemin çiziyor', zemin.length===1);
    ok(ad+': vurgu hapı jeton renginde', zemin[0] && zemin[0].renk===JETONLAR['--r-warn']);
    const son=iz.filter(x=>x.t==='yazi').pop();
    ok(ad+': hapın üstündeki kelime koyu renkte', !!son && son.renk===JETONLAR['--on-warn']);
    ok(ad+': hapın üstündeki kelimeye kontur çizilmiyor',
       iz.filter(x=>x.t==='kontur').every(x=>x.s!=='konudan'));
  }
  {
    /* KONUM: üç seçenek de farklı y üretiyor ve kadrajın içinde. */
    const y=(pos)=>{ const iz=ciz({capPos:pos}); const ilk=iz.find(x=>x.t==='yazi'); return ilk?ilk.y:null; };
    const alt=y('bottom'), orta=y('middle'), ust=y('top');
    ok(ad+': üç konum üç farklı yer ('+[alt,orta,ust].map(v=>Math.round(v)).join(' / ')+')',
       new Set([alt,orta,ust]).size===3);
    ok(ad+': üst konum ortadan yukarıda', ust<orta);
    ok(ad+': alt konum ortadan aşağıda', alt>orta);
    ok(ad+': hepsi kadrajın içinde', [alt,orta,ust].every(v=>v>0 && v<1920));
  }
  {
    /* ANİMASYON: kapalıyken hiç dönüşüm yok, açıkken YALNIZ vurgulanan
       kelime için dönüşüm kuruluyor ve geri alınıyor. */
    const kapali=ciz({capAnim:'yok'});
    ok(ad+': animasyon kapalıyken ölçek çağrısı yok', kapali.filter(x=>x.t==='olcek').length===0);
    const iz=[]; kos({metin:METIN, iz, jetonlar:JETONLAR, st:DURUM({capAnim:'sicra'}), saat:()=>0});
    ok(ad+': sıçra açıkken tek kelime için ölçekleniyor', iz.filter(x=>x.t==='olcek').length===1);
    const o=iz.find(x=>x.t==='olcek');
    ok(ad+': ölçek 1den büyük başlıyor', !!o && o.x>1);
    /* save/restore dengeli olmalı: dengesiz kalırsa sonraki kareler bozulur. */
    ok(ad+': save ve restore dengeli',
       iz.filter(x=>x.t==='save').length===iz.filter(x=>x.t==='restore').length);
    const iz2=[]; kos({metin:METIN, iz:iz2, jetonlar:JETONLAR, st:DURUM({capAnim:'yumusak'}), saat:()=>0});
    const sonYazi=iz2.filter(x=>x.t==='yazi').pop();
    ok(ad+': yumuşak açıkken vurgulanan kelime saydam başlıyor', !!sonYazi && sonYazi.alfa===0);
    ok(ad+': diğer kelimeler tam görünür', iz2.filter(x=>x.t==='yazi').slice(0,-1).every(x=>x.alfa===1));
  }
  {
    /* KARAOKE KAPALIYKEN tema yine çalışmalı: iki ayar birbirine bağlı değil. */
    const iz=ciz({capTema:'kutu', capKaraoke:false});
    ok(ad+': karaoke kapalıyken de tema uygulanıyor', iz.filter(x=>x.t==='zeminDolgu').length>=1);
  }
}

/* ---------- 4b) YUVARLAK KUTU GEOMETRİSİ (hapYolu) ---------- */
for(const [ad,k] of [['telefon',tel],['masaüstü',mac]]){
  const govde=blokKes(k,'function hapYolu(');
  ok(ad+': hapYolu çıkarılabildi', !!govde);
  if(!govde) continue;
  const kos=(x,y,w,h,r)=>{
    const iz=[];
    const c={ beginPath(){iz.push('bas');}, rect:(...a)=>iz.push('kutu:'+a.join(',')),
      moveTo:()=>iz.push('git'), lineTo:()=>iz.push('cizgi'),
      quadraticCurveTo:()=>iz.push('kavis'), closePath:()=>iz.push('kapat') };
    new Function('ctx','x','y','w','h','r', govde+'\nhapYolu(ctx,x,y,w,h,r);')(c,x,y,w,h,r);
    return iz;
  };
  ok(ad+': yarıçap 0 iken düz kutu çiziliyor', kos(0,0,100,40,0).some(x=>/^kutu:/.test(x)));
  const yuvarlak=kos(0,0,100,40,8);
  ok(ad+': yarıçap varken dört köşe kavisli', yuvarlak.filter(x=>x==='kavis').length===4);
  ok(ad+': yuvarlak yolda düz kutu çağrısı yok', !yuvarlak.some(x=>/^kutu:/.test(x)));
  /* Yarıçap kutudan büyük verilirse taşmamalı — hap yüksekliğin yarısında durur. */
  ok(ad+': aşırı yarıçap kırpılıyor (çökmüyor)', kos(0,0,100,40,999).filter(x=>x==='kavis').length===4);
  ok(ad+': negatif yarıçap düz kutuya düşüyor', kos(0,0,100,40,-5).some(x=>/^kutu:/.test(x)));
  ok(ad+': her yol beginPath ile başlıyor', kos(0,0,100,40,8)[0]==='bas');

  /* ZAMAN KAYNAĞI: performance yoksa Date.now yedeği devreye girmeli.
     Eski WebViewde performance.now olmayabiliyor ve animasyon zamanı
     NaN olursa vurgu hiç görünmezdi. */
  const mS=k.match(/const simdiMs=\(\)=>[^;]+;/);
  ok(ad+': simdiMs çıkarılabildi', !!mS);
  if(mS){
    const yok=new Function('Date', 'const performance=undefined;'+mS[0]+'return simdiMs();')({now:()=>4242});
    ok(ad+': performance yokken Date.now kullanılıyor', yok===4242);
    const var_=new Function('performance','Date', mS[0]+'return simdiMs();')({now:()=>7},{now:()=>4242});
    ok(ad+': performance varken o kullanılıyor', var_===7);
  }
}

/* ---------- 5) İKİ KABUK AYNI ÇİZİMİ ÜRETİYOR MU (parite) ---------- */
{
  const t=tezgah(tel), m=tezgah(mac);
  ok('iki tezgâh da kuruldu', !!t && !!m);
  if(t&&m){
    for(const tema of cekirdek.ALTYAZI_TEMA_SIRA){
      for(const pos of ['bottom','middle','top']){
        const a=[], b=[];
        const durum=DURUM({capTema:tema, capPos:pos, capAnim:'sicra'});
        t({metin:METIN, iz:a, jetonlar:JETONLAR, st:durum, saat:()=>0});
        m({metin:METIN, iz:b, jetonlar:JETONLAR, st:durum, saat:()=>0});
        if(JSON.stringify(a)!==JSON.stringify(b)){
          ok('parite: '+tema+' / '+pos, false);
        }
      }
    }
    ok('iki kabuk 6 tema × 3 konumda AYNI çizimi üretiyor', true);
  }
}

/* ---------- 6) AYAR, SÖZLÜK, ÖLÜ ÇEVİRİNİN CANLANMASI ---------- */
{
  const sozluk=oku(path.join(REPO,'cekirdek','sozluk.js'));
  const anahtarlar=['capTema','ctSade','ctKutu','ctHap','ctSeritsiz','ctVurguHap','ctGolge',
                    'capAnim','kaYok','kaYumusak','kaSicra','cpTop'];
  for(const a of anahtarlar){
    const bulunan=[...sozluk.matchAll(new RegExp(a+":'([^']*)'",'g'))].map(x=>x[1]);
    ok('sözlükte '+a+' TR+EN var', bulunan.length===2);
    ok('sözlükte '+a+' çevrilmiş', bulunan.length===2 && bulunan[0]!==bulunan[1]);
  }
}
for(const [ad,ham,kod,dev] of [['telefon',telHam,tel,'st'],['masaüstü',macHam,mac,'state']]){
  /* G.3 ile tema seçimi düğme şeridinden ÖNİZLEME KARTLARINA geçti; iddia
     "seg var mı" değil "tema seçilebiliyor mu" olmalı. Kartların kendi
     davranışı tests/152de ölçülüyor. */
  ok(ad+': tema seçici arayüzde', /id="capTemaKart"/.test(ham));
  ok(ad+': animasyon seçici arayüzde', /id="capAnimSeg"/.test(ham));
  ok(ad+': üst konum düğmesi var', /data-cp="top"/.test(ham));
  ok(ad+': tema seçenekleri çekirdek listesinden geliyor', /ALTYAZI_TEMA_SIRA/.test(kod));
  ok(ad+': tema durumdan okunuyor', new RegExp(dev+'\\.capTema').test(kod));
  ok(ad+': animasyon durumdan okunuyor', new RegExp(dev+'\\.capAnim').test(kod));
  ok(ad+': okunmaz tema çizilmiyor', /altyaziOkunur\(tema\)/.test(kod));
  ok(ad+': konum çekirdekten hesaplanıyor', /altyaziMerkezY\(/.test(kod));
}
{
  /* ÖLÜ ÇEVİRİ CANLANDI: Mac sözlüğünde capSize/capPos anahtarları vardı ama
     hiçbir denetime bağlı değildi ve çizim 42/alt değerlerine SABİTLENMİŞTİ. */
  ok('Mac punto denetimi artık var', /id="capSize"/.test(macHam));
  ok('Mac konum seçici artık var', /id="capPosSeg"/.test(macHam));
  ok('Mac çizimi punto ayarını okuyor', /state\.capSize\|\|42/.test(mac));
  ok('Mac çizimi sabit 42 puntoya dönmedi', !/const size=Math\.round\(42\*/.test(mac));
}
